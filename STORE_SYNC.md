# Alexgood321 Lampa Store: automatic GitHub sync

## Permanent installation URL

`https://cdn.jsdelivr.net/gh/Alexgood321/store@main/my_store_loader.js`

Install this URL only once. Do not install the old `my_store_v1_XX.js` alongside it.

## Обновление самого My Store (архитектура 3.0)

`my_store_loader.js` — единственный постоянный установочный URL. Изменять
его при обычных релизах не нужно. Он:

1. При каждом запуске получает новый SHA файла `my_store_runtime.js` через
   GitHub API (без ожидания запланированного GitHub Actions).
2. Загружает код по адресу с SHA, а не по изменяемому `@main`. Старая копия
   JS в кэше CDN не может подменить другой commit-pinned URL.
3. Дожидается регистрации ядра и подтверждения `ready` и только после этого
   записывает SHA в локальный `alexgood321_store_boot_last_good_v1`.
4. При неудаче загрузки пробует raw.githubusercontent.com, последнюю успешно
   запущенную и предыдущую рабочую сборку. Если никакая сборка недоступна,
   настройки и установленные плагины не изменяются.
5. Предоставляет `window.AlexgoodStoreBootstrap.check(true)` для проверки
   новой версии без обновления JS в текущем сеансе. Ядро обновляется при следующем
   запуске Lampa. Никакого общего сброса localStorage/IndexedDB.

`my_store_runtime.js` содержит пользовательский интерфейс магазина,
инвентарь устройства и механизм обнаружения версий. Чтобы выпустить новый
релиз, достаточно обновить этот файл в ветке `main` и увеличить
`CONFIG.version`. Bootstrap увидит свежий commit при следующем запуске.
`my_store_release.json` — резервный указатель, он не заменяет прямую проверку
GitHub и не является обязательным для каждого релиза.

**Миграция со старых версий:** один раз заменить URL установленного магазина
на `my_store_loader.js`; нельзя оставлять рядом вторую копию, иначе два
разных экземпляра могут зарегистрировать одинаковое меню. Другие плагины,
настройки и данные Lampa сохраняются.

**Точность статуса:** загрузчик достоверно сообщает версию ядра, которая
инициализировалась в данном сеансе. Для чужих расширений URL в
`Lampa.Plugins.loaded()` не доказывает, что выполнился именно новый код:
Lampa может использовать резервную копию JS. Это отдельно обозначается в
панели устройства.

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
