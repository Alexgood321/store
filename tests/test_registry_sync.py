#!/usr/bin/env python3
"""Offline integration tests: discover, upgrade and retain last-known plugins."""
import copy
import datetime
import json
import tempfile
from pathlib import Path
import importlib.util

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("store_sync", REPO / "scripts/sync_catalog.py")
syncer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(syncer)

def fixture():
    temp = tempfile.TemporaryDirectory()
    root = Path(temp.name)
    for filename in ("catalog_seed.json", "live_catalog.json", "sync_sources.json"):
        (root / filename).write_text((REPO / filename).read_text(encoding="utf-8"), encoding="utf-8")
    syncer.ROOT = root
    return temp, root

old_root = syncer.ROOT
old_commit = syncer.latest_path_commit
old_fetch = syncer.fetch_text

try:
    temp, root = fixture()
    with temp:
        repo = "Alexgood321/lampa-plugins"
        plugin = {"name": "Sample Future Plugin", "path": "future/sample.js",
                  "categories": ["Мои", "Системные и ТВ"],
                  "author": "Alexgood321", "descr": "Тестовое расширение"}
        manifest = json.dumps({"schema": 1, "plugins": [plugin]})
        registries = json.loads((root / "sync_sources.json").read_text())["registries"]
        assert any(x["repo"] == "Alexgood321/lampa-sync-pro" and
                   x["manifest"] == "lampa-plugins.json" for x in registries)

        old_meta = json.loads((root / "live_catalog.json").read_text())["meta"]["tracked"]
        current = {"sha": "a" * 40, "version": "1.2.3", "offline": False}
        def fake_commit(remote, ref, path):
            if path == "future/sample.js":
                return current["sha"], "2026-11-06T13:03:01Z"
            return old_meta[next(name for name, entry in old_meta.items()
                     if entry["repo"] == remote and entry["path"] == path)]["sha"], (
                old_meta[next(name for name, entry in old_meta.items()
                         if entry["repo"] == remote and entry["path"] == path)]["published_at"])
        def fake_fetch(url, limit=2_000_000):
            if url.endswith("/lampa-plugins.json"):
                if current["offline"]:
                    raise OSError("simulated network failure")
                if "/lampa-plugins/" not in url:
                    return '{"schema":1,"plugins":[]}'
                return manifest
            if url.endswith("/future/sample.js"):
                return "/*\n * Version: " + current["version"] + "\n */\nfunction demo(){ return Lampa; }"
            raise AssertionError("Unexpected HTTP request " + url)
        syncer.latest_path_commit = fake_commit
        syncer.fetch_text = fake_fetch

        assert syncer.sync() == 0
        first = json.loads((root / "live_catalog.json").read_text())
        assert first["meta"]["tracked"][plugin["name"]]["version"] == "1.2.3"
        assert first["meta"]["registered"][plugin["name"]]["path"] == plugin["path"]
        assert sum(sum(x["name"] == plugin["name"] for x in group["results"])
                   for group in first["results"]) == 2
        current["sha"] = "b" * 40
        current["version"] = "1.2.4"
        assert syncer.sync() == 0
        second = json.loads((root / "live_catalog.json").read_text())
        assert second["meta"]["tracked"][plugin["name"]]["version"] == "1.2.4"
        assert "@" + ("b" * 40) in second["meta"]["tracked"][plugin["name"]]["link"]
        history = second["meta"]["history"][plugin["name"]]
        assert history[-2]["sha"] == "a" * 40
        assert history[-2]["version"] == "1.2.3"
        assert history[-1]["sha"] == "b" * 40
        assert history[-1]["version"] == "1.2.4"
        before = second["meta"]["last_checked_at"]
        current["offline"] = True
        assert syncer.sync() == 0
        third = json.loads((root / "live_catalog.json").read_text())
        assert third["meta"]["tracked"][plugin["name"]]["version"] == "1.2.4"
        assert third["meta"]["last_checked_at"] == before
finally:
    syncer.ROOT = old_root
    syncer.latest_path_commit = old_commit
    syncer.fetch_text = old_fetch
print("PASS registry: automatic catalog onboarding, version upgrade, offline fallback")
