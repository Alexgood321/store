# Alexgood321 Lampa Store: automatic GitHub sync

## Permanent installation URL

`https://cdn.jsdelivr.net/gh/Alexgood321/store@main/my_store_live.js`

Install this URL only once. Do not install the old `my_store_v1_XX.js` alongside it.

## How synchronization works

- `catalog_seed.json` is the curated source catalog and category ordering.
- `sync_sources.json` is an explicit allowlist of GitHub source repositories and JS paths.
- `scripts/sync_catalog.py` checks the newest commit touching each tracked path and extracts a declared version or uses `rev-<short-sha>`.
- `.github/workflows/sync_catalog.yml` runs on push, manually, and every five minutes when scheduled workflows are enabled in GitHub.
- `live_catalog.json` is the generated catalog that Lampa reads each time the store opens. The loader fetches via GitHub raw with a cache-busting query, with jsDelivr and the last known version as fallbacks.
- Sources owned by Alexgood321 are pinned to verified Git commits in the generated catalog. Third-party plugins retain their publisher URLs to avoid breaking origin assumptions, CORS, or relative asset paths.
- A failed source check retains its previous known-good revision. The workflow commits only when content actually changes.

## Updating plugins already installed in Lampa

Open Settings → **Обновления плагинов**.

The store can identify older commit-pinned URLs. Select a plugin, then explicitly confirm the replacement. The last replaced URL is saved as a rollback point. Restart Lampa after updating or rolling back. Automatically replacing installed URLs is **off by default**; it can be enabled in this menu. When enabled, changed links are saved at the next successful sync check, but running JavaScript is not hot-reloaded.

A plugin installed from a floating `@main` URL already follows new commits at the next Lampa launch. The store therefore does not incorrectly flag it as an outdated pinned version.

## Add or remove plugins

Edit `catalog_seed.json` to change the curated sections. For a plugin with a verifiable GitHub repository, also add an explicit `repo`, `path`, `ref`, and `owned` entry in `sync_sources.json`. The workflow will regenerate `live_catalog.json`.

External non-GitHub URLs are left untouched and cannot be given a verified GitHub version without a mapping. Do not edit the generated file directly.

## Recovery

Previous static store: `https://cdn.jsdelivr.net/gh/Alexgood321/store@main/my_store_v1_14.js`

Stable loader source: `my_store_live.js`. Automatic update opt-in and previous URL are stored locally within Lampa.
