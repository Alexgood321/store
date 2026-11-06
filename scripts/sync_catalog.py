#!/usr/bin/env python3
"""Sync an allowlisted set of GitHub-hosted Lampa plugins into live_catalog.json.

No dynamic code is executed. Failed requests preserve the previous known-good pin.
Only content changes cause an output change; no checked_at timestamps are written.
"""
from __future__ import annotations

import copy
import concurrent.futures
import datetime
import json
import os
import re
import sys
import time
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


def latest_path_commit(repo: str, ref: str, path: str) -> tuple[str, str]:
    query = urllib.parse.urlencode({"sha": ref, "path": path, "per_page": 1})
    url = "https://api.github.com/repos/" + repo + "/commits?" + query
    result = json.loads(fetch_text(url, 500_000))
    if not isinstance(result, list) or not result:
        raise ValueError("GitHub returned no matching commit for " + repo + "/" + path)
    sha = result[0].get("sha", "")
    if not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise ValueError("Invalid Git commit SHA")
    details = result[0].get("commit", {})
    published_at = (details.get("committer") or {}).get("date") or (
        details.get("author") or {}).get("date") or ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", published_at):
        published_at = ""
    return sha, published_at


VERSION_PATTERNS = [
    # Shield Ads uses a named version in the opening JS comment.
    re.compile(r"(?im)^\s*\*\s*Lampa Shield Ads\s+v(\d+(?:\.\d+){1,3})\b"),
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



def expand_registries(config: dict, catalog: dict, previous: dict) -> tuple[dict, dict, bool]:
    """Allowlisted per-repository manifests: register a plugin once, track forever.

    On temporary GitHub failures retain last-known registered cards and pinned code.
    No arbitrary third-party repositories or client-side GitHub API calls.
    """
    tracked = copy.deepcopy(config["tracked"])
    remembered = previous.get("meta", {}).get("registered", {})
    registered = {}
    verified = True
    categories = {group["title"]: group for group in catalog["results"]}
    names = {item["name"] for group in catalog["results"] for item in group.get("results", [])}
    registries = config.get("registries", [])
    if not isinstance(registries, list):
        raise ValueError("registries must be a list")

    for source in registries:
        repo = source["repo"]
        ref = source.get("ref", "main")
        manifest = source["manifest"]
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo) or (
            not re.fullmatch(r"[A-Za-z0-9_./-]+\.json", manifest)
            or ".." in manifest or not re.fullmatch(r"[A-Za-z0-9_.-]+", ref)
        ):
            raise ValueError("Invalid registry source: " + str(source))
        try:
            raw = fetch_text("https://raw.githubusercontent.com/" + repo + "/" + ref +
                             "/" + manifest, 300_000)
            data = json.loads(raw)
            if data.get("schema") != 1 or not isinstance(data.get("plugins"), list) or (
                len(data["plugins"]) > 50
            ):
                raise ValueError("Invalid plugin manifest in " + repo)
            plugins = data["plugins"]
        except (ValueError, KeyError, TypeError, OSError, UnicodeError,
                urllib.error.HTTPError, json.JSONDecodeError) as exc:
            verified = False
            plugins = [item for item in remembered.values() if item.get("repo") == repo]
            print("WARNING: " + repo + ": using previous registry (" + str(exc) + ")",
                  file=sys.stderr)

        seen = set()
        for plugin in plugins:
            name = plugin.get("name")
            path = plugin.get("path")
            groups = plugin.get("categories", ["Мои"])
            if not isinstance(name, str) or not 1 <= len(name) <= 80 or (
                re.search(r"[<>]", name)
            ) or not isinstance(path, str) or not re.fullmatch(
                r"[A-Za-z0-9_./-]+\.js", path
            ) or ".." in path or not isinstance(groups, list) or not groups or (
                len(groups) > 5
            ) or any(c not in categories for c in groups) or "Мои" not in groups:
                raise ValueError("Invalid plugin registration in " + repo + ": " + str(name))
            if name in seen:
                raise ValueError("Duplicate registry name: " + name)
            seen.add(name)
            # Already listed legacy plugins remain canonical in catalog_seed.json.
            if name in tracked:
                old = tracked[name]
                if old.get("repo") != repo or old.get("path") != path:
                    raise ValueError("Conflicting tracked plugin identity: " + name)
                continue
            if name in names or name in registered:
                raise ValueError("Duplicate catalog plugin: " + name)
            author = plugin.get("author", "Alexgood321")
            descr = plugin.get("descr", "Плагин Lampa")
            if not isinstance(author, str) or len(author) > 100 or not isinstance(
                descr, str
            ) or len(descr) > 500 or re.search(r"[<>]", author + descr):
                raise ValueError("Invalid plugin description: " + name)
            record = {"name": name, "repo": repo, "path": path, "ref": ref,
                      "author": author, "descr": descr, "categories": groups}
            registered[name] = record
            tracked[name] = {"repo": repo, "path": path, "ref": ref,
                             "owned": True, "strict_version": True}
            link = "https://cdn.jsdelivr.net/gh/" + repo + "@" + ref + "/" + path
            for category in groups:
                categories[category]["results"].append({
                    "name": name, "author": author, "descr": descr, "link": link
                })
            names.add(name)
    return tracked, registered, verified

def sync() -> int:
    started = time.monotonic()
    config = read_json("sync_sources.json")
    seed = read_json("catalog_seed.json")
    previous = read_json("live_catalog.json")
    if config.get("schema") != 1 or not isinstance(config.get("tracked"), dict):
        raise ValueError("Invalid source configuration")
    if not isinstance(seed.get("results"), list) or len(seed["results"]) < 1:
        raise ValueError("Invalid canonical catalog")

    catalog = copy.deepcopy(seed)
    tracking, registered, registry_verified = expand_registries(config, catalog, previous)
    tracked = {}
    old_meta = previous.get("meta", {})
    old_tracked = old_meta.get("tracked", {})
    critical_ok = registry_verified
    critical_names = {name for name, item in tracking.items()
                      if item.get("owned") or name == "My Store"}
    names = {p.get("name") for group in catalog["results"] for p in group.get("results", [])}
    # Resolve independent repository/path commits concurrently, but preserve
    # deterministic output order and known-good fallback for individual errors.
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        commit_futures = {
            name: executor.submit(latest_path_commit, item["repo"],
                                  item["ref"] if "ref" in item else "main",
                                  item["path"])
            for name, item in tracking.items()
        }
        latest = {}
        for name, future in commit_futures.items():
            try:
                latest[name] = (future.result(), None)
            except Exception as error:
                latest[name] = (None, error)
    for name, item in tracking.items():
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
            result, failure = latest[name]
            if failure is not None:
                raise failure
            sha, published_at = result
            unchanged = (
                sha == old.get("sha")
                and old.get("repo") == repo
                and old.get("path") == path
                and old.get("ref") == ref
                and bool(old.get("owned")) == bool(item.get("owned"))
                and old.get("version")
                and old.get("link")
                and old.get("published_at", "") == published_at
                and (bool(item.get("owned")) or old.get("link") == publisher_link)
            )
            if unchanged:
                tracked[name] = old
                print(name + ": unchanged @ " + sha[:12])
                continue
            raw = fetch_text("https://raw.githubusercontent.com/" + repo + "/" + sha + "/" + path)
            if len(raw) < 30 or not re.search(r"\b(function|const|var|let|Lampa)\b", raw):
                raise ValueError("Remote source is not recognizable JavaScript")
            version = extract_version(raw)
            if not version and item.get("strict_version"):
                raise ValueError("Registered plugins must declare a semantic JS version: " + name)
            version = version or ("rev-" + sha[:8])
            # Keep original publisher URLs for third-party plugins: origin,
            # CORS, and relative asset paths may be significant to their JS.
            # Our own plugins get immutable links to the verified Git commit.
            link = ("https://cdn.jsdelivr.net/gh/" + repo + "@" + sha + "/" + path
                    if item.get("owned") else publisher_link)
            if not link:
                raise ValueError("No publisher link for " + name)
            tracked[name] = {"repo": repo, "path": path, "ref": ref,
                             "owned": bool(item.get("owned")), "sha": sha,
                             "version": version, "link": link,
                             "published_at": published_at}
            print(name + ": " + version + " @ " + sha[:12])
        except (ValueError, UnicodeError, OSError, urllib.error.HTTPError) as exc:
            if name in critical_names:
                critical_ok = False
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
    # Keep a bounded semantic history to identify previously installed SHA pins
    # without downloading old JavaScript on each device.
    history = {}
    old_history = old_meta.get("history", {})
    for name, entry in tracked.items():
        versions = list(old_history.get(name, []))[-11:]
        old_entry = old_tracked.get(name)
        if old_entry and old_entry.get("sha") and old_entry.get("version"):
            versions.append({"sha": old_entry["sha"], "version": old_entry["version"],
                             "published_at": old_entry.get("published_at", "")})
        if entry.get("sha") and entry.get("version"):
            versions.append({"sha": entry["sha"], "version": entry["version"],
                             "published_at": entry.get("published_at", "")})
        by_sha = {}
        for version in versions:
            if re.fullmatch(r"[a-f0-9]{40}", str(version.get("sha", ""))):
                by_sha[version["sha"]] = version
        history[name] = list(by_sha.values())[-12:]
    catalog["meta"] = {"tracked": tracked, "registered": registered,
                       "history": history, "auto_update_installed": False}
    # Heartbeat only after all first-party sources were verified by an
    # authenticated Action. Don't produce hundreds of meaningless commits.
    # If scheduling stops, the last_checked_at value becomes stale on clients.
    last_checked = old_meta.get("last_checked_at", "")
    try:
        last_time = datetime.datetime.strptime(last_checked, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=datetime.timezone.utc)
    except (ValueError, TypeError):
        last_time = datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc)
    now = datetime.datetime.now(datetime.timezone.utc)
    previous_revisions = {name: item.get("sha") for name, item in old_tracked.items()}
    updated_revisions = {name: item.get("sha") for name, item in tracked.items()}
    changed_critical = any(
        previous_revisions.get(name) != updated_revisions.get(name)
        for name in critical_names)
    if critical_ok and (changed_critical or (now - last_time).total_seconds() >= 1800):
        last_checked = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    if last_checked:
        catalog["meta"]["last_checked_at"] = last_checked
    if not critical_ok:
        print("WARNING: critical first-party check incomplete; keeping last verified timestamp",
              file=sys.stderr)

    output = json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"
    target = ROOT / "live_catalog.json"
    if output == target.read_text(encoding="utf-8"):
        print("No changes; sync elapsed %.2fs" % (time.monotonic() - started))
        return 0
    target.write_text(output, encoding="utf-8")
    print("Updated live_catalog.json; sync elapsed %.2fs" % (time.monotonic() - started))
    return 0


if __name__ == "__main__":
    raise SystemExit(sync())
