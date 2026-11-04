#!/usr/bin/env python3
"""Sync an allowlisted set of GitHub-hosted Lampa plugins into live_catalog.json.

No dynamic code is executed. Failed requests preserve the previous known-good pin.
Only content changes cause an output change; no checked_at timestamps are written.
"""
from __future__ import annotations

import copy
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_JS_BYTES = 2_000_000


def read_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def fetch_text(url: str, limit: int = MAX_JS_BYTES) -> str:
    headers = {"User-Agent": "Alexgood321-Lampa-Store-Sync/1.0",
               "Accept": "application/vnd.github+json"}
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token and url.startswith("https://api.github.com/"):
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as response:
        body = response.read(limit + 1)
    if len(body) > limit:
        raise ValueError("Response exceeds size limit: " + url)
    return body.decode("utf-8")


def latest_path_commit(repo: str, ref: str, path: str) -> str:
    query = urllib.parse.urlencode({"sha": ref, "path": path, "per_page": 1})
    url = "https://api.github.com/repos/" + repo + "/commits?" + query
    result = json.loads(fetch_text(url, 500_000))
    if not isinstance(result, list) or not result:
        raise ValueError("GitHub returned no matching commit for " + repo + "/" + path)
    sha = result[0].get("sha", "")
    if not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise ValueError("Invalid Git commit SHA")
    return sha


VERSION_PATTERNS = [
    re.compile(r"(?im)^\s*\*?\s*(?:версия|version)\s*:\s*v?(\d+(?:\.\d+){1,3})\b"),
    re.compile(r"(?im)^\s*(?:(?:var|const|let)\s+)?VERSION\s*=\s*['\"](\d+(?:\.\d+){1,3})['\"]"),
    re.compile(r"(?im)\bversion\s*:\s*['\"](\d+(?:\.\d+){1,3})['\"]"),
]


def extract_version(js: str) -> str | None:
    header = js[:35000]
    for pattern in VERSION_PATTERNS:
        match = pattern.search(header)
        if match:
            return match.group(1)
    return None


def sync() -> int:
    config = read_json("sync_sources.json")
    seed = read_json("catalog_seed.json")
    previous = read_json("live_catalog.json")
    if config.get("schema") != 1 or not isinstance(config.get("tracked"), dict):
        raise ValueError("Invalid source configuration")
    if not isinstance(seed.get("results"), list) or len(seed["results"]) < 1:
        raise ValueError("Invalid canonical catalog")

    catalog = copy.deepcopy(seed)
    tracked = {}
    old_tracked = previous.get("meta", {}).get("tracked", {})
    names = {p.get("name") for group in catalog["results"] for p in group.get("results", [])}
    for name, item in config["tracked"].items():
        if name not in names:
            raise ValueError("Tracked plugin missing from catalog: " + name)
        repo, path, ref = item["repo"], item["path"], item.get("ref", "main")
        if not re.fullmatch(r"[\w.-]+/[\w.-]+", repo) or not re.fullmatch(r"[\w./-]+\.js", path):
            raise ValueError("Invalid source repo/path: " + name)
        old = old_tracked.get(name, {})
        publisher_link = next(
            (p["link"] for g in seed["results"] for p in g.get("results", [])
             if p.get("name") == name), None)
        try:
            sha = latest_path_commit(repo, ref, path)
            unchanged = (
                sha == old.get("sha")
                and old.get("repo") == repo
                and old.get("path") == path
                and old.get("ref") == ref
                and bool(old.get("owned")) == bool(item.get("owned"))
                and old.get("version")
                and old.get("link")
                and (bool(item.get("owned")) or old.get("link") == publisher_link)
            )
            if unchanged:
                tracked[name] = old
                print(name + ": unchanged @ " + sha[:12])
                continue
            raw = fetch_text("https://raw.githubusercontent.com/" + repo + "/" + sha + "/" + path)
            if len(raw) < 30 or not re.search(r"\b(function|const|var|let|Lampa)\b", raw):
                raise ValueError("Remote source is not recognizable JavaScript")
            version = extract_version(raw) or ("rev-" + sha[:8])
            # Keep original publisher URLs for third-party plugins: origin,
            # CORS, and relative asset paths may be significant to their JS.
            # Our own plugins get immutable links to the verified Git commit.
            link = ("https://cdn.jsdelivr.net/gh/" + repo + "@" + sha + "/" + path
                    if item.get("owned") else publisher_link)
            if not link:
                raise ValueError("No publisher link for " + name)
            tracked[name] = {"repo": repo, "path": path, "ref": ref,
                             "owned": bool(item.get("owned")), "sha": sha,
                             "version": version, "link": link}
            print(name + ": " + version + " @ " + sha[:12])
        except (ValueError, UnicodeError, OSError, urllib.error.HTTPError) as exc:
            if old.get("sha") and old.get("link"):
                tracked[name] = old
                print("WARNING: " + name + ": retained previous version (" + str(exc) + ")", file=sys.stderr)
            else:
                print("WARNING: " + name + ": not synced (" + str(exc) + ")", file=sys.stderr)

    for group in catalog["results"]:
        for plugin in group.get("results", []):
            info = tracked.get(plugin.get("name"))
            if info:
                plugin["link"] = info["link"]
                plugin["version"] = info["version"]
    catalog["schema"] = 2
    catalog["meta"] = {"tracked": tracked, "auto_update_installed": False}

    output = json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"
    target = ROOT / "live_catalog.json"
    if output == target.read_text(encoding="utf-8"):
        print("No changes")
        return 0
    target.write_text(output, encoding="utf-8")
    print("Updated live_catalog.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(sync())
