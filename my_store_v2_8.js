(function () {
  'use strict';

  // Персональный магазин Alexgood321. Не использует внешний extensions.json.
  var CONFIG = {
    id: 'alexgood321_personal_store',
    component: 'alexgood321_personal_store',
    version: '2.8.0',
    name: 'Мои плагины',
    catalog: 'https://raw.githubusercontent.com/Alexgood321/store/main/live_catalog.json',
    fallback: 'https://cdn.jsdelivr.net/gh/Alexgood321/store@main/live_catalog.json',
    emergency: 'https://cdn.jsdelivr.net/gh/Alexgood321/store@76c6506aa50951e65b3b6edae5c4faf68490dfb8/my_extensions_v1_14.json'
  };

  if (window.__alexgood321_personal_store_2800_loaded) return;
  window.__alexgood321_personal_store_2800_loaded = true;

  var initialized = false;

  function title() {
    try {
      return Lampa.Lang.translate('alexgood321_personal_store_title') || CONFIG.name;
    } catch (e) {
      return CONFIG.name;
    }
  }

  function register() {
    if (Lampa.Lang && typeof Lampa.Lang.add === 'function') {
      Lampa.Lang.add({
        alexgood321_personal_store_title: {
          ru: 'Мои плагины',
          en: 'My plugins',
          uk: 'Мої плагіни'
        }
      });
    }

    Lampa.Manifest = Lampa.Manifest || {};
    Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
    Lampa.Manifest.plugins[CONFIG.id] = {
      type: 'other',
      name: CONFIG.name,
      version: CONFIG.version,
      description: 'Персональный каталог расширений Alexgood321'
    };
  }

  function addMenu() {
    if (!Lampa.Settings || typeof Lampa.Settings.main !== 'function') return;
    var main = Lampa.Settings.main();
    if (!main || typeof main.render !== 'function') return;
    var body = main.render();
    if (!body || typeof body.find !== 'function') return;

    // Скрыть устаревший пункт нашего старого загрузчика.
    var oldMenu = body.find('[data-component="alexgood321_store"]');
    if (oldMenu && typeof oldMenu.remove === 'function') oldMenu.remove();

    if (body.find('[data-component="' + CONFIG.component + '"]').length) {
      addUpdatesMenu(body);
      addDeviceMenu(body);
      return;
    }

    var icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/>' +
      '<rect x="14" y="3" width="7" height="7" rx="1.5"/>' +
      '<rect x="3" y="14" width="7" height="7" rx="1.5"/>' +
      '<rect x="14" y="14" width="7" height="7" rx="1.5"/>' +
      '</svg>';
    var html = '<div class="settings-folder selector" data-component="' +
      CONFIG.component + '" data-static="true"><div class="settings-folder__icon">' +
      icon + '</div><div class="settings-folder__name">' +
      title() + '</div></div>';
    var anchor = body.find('[data-component="more"]');
    if (anchor.length) anchor.after(html);
    else body.append(html);
    addUpdatesMenu(body);
    addDeviceMenu(body);
    if (typeof main.update === 'function') main.update();
  }

  function addUpdatesMenu(body) {
    if (body.find('[data-component="alexgood321_store_updates"]').length) return;
    var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
      '<path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 4v7h-7"/></svg>';
    var html = '<div class="settings-folder selector" data-component="alexgood321_store_updates" data-static="true">' +
      '<div class="settings-folder__icon">' + icon + '</div>' +
      '<div class="settings-folder__name">Обновления плагинов</div></div>';
    var existing = body.find('[data-component="' + CONFIG.component + '"]');
    if (existing.length) existing.after(html);
    else body.append(html);
  }


  function addDeviceMenu(body) {
    if (body.find('[data-component="alexgood321_store_device"]').length) return;
    var html = '<div class="settings-folder selector" data-component="alexgood321_store_device" data-static="true">' +
      '<div class="settings-folder__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
      '<rect x="4" y="2" width="16" height="20" rx="3"/><circle cx="12" cy="17" r="1"/></svg></div>' +
      '<div class="settings-folder__name">Устройство и обновления</div></div>';
    var anchor = body.find('[data-component="alexgood321_store_updates"]');
    if (anchor.length) anchor.after(html);
    else body.append(html);
  }

  // UI v1.8: only the personal extension screen, never the global Lampa UI.
  var COLOR_MAP = {"Мои":"#91A8EA","Главный экран":"#98C6AE","Сериалы":"#B7A6DB","Онлайн-просмотр":"#93BCD8","Торренты":"#D5BA8C","Интерфейс":"#D9ACC1","Системные и ТВ":"#A9B9D0","Рейтинги и сервисы":"#A7C6C8","Архив и служебные":"#92959D"};
  var LINK_MAP = {"SURS Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@02f879c9d18f05b9bee19baf09d1203bae5f0e18/surs.js","Home Categories Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@0741ed1cba12c50c7acab47436577a27f8953335/home_categories.js","NUM Series Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@b8a6411b3cf6c4d67de8e994635598d895e41952/num_series.js","HDREZKA":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-hdrezka@df85a7eb4d5a403a09eda34792fde0205327bf9b/rezka.js","Продолжить просмотр":"https://arst113.github.io/lampa-watch-resume/watch_resume.js","Онлайн Мод":"https://nb557.github.io/plugins/online_mod.js","EasyTorrent":"https://darkestclouds.github.io/plugins/easytorrent/easytorrent.min.js","Torrent Styles":"https://cdn.jsdelivr.net/gh/Alexgood321/store@main/torrent_styles_v2.js?v=1.2.1","Приятные мелочи":"http://skaztv.online/js/tricks.js","TraktTV":"https://lampame.github.io/main/trakttv.js","Рейтинг КиноПоиск и IMDb":"https://nb557.github.io/plugins/rating.js","SURS (оригинальный, отключён)":"https://aviamovie.github.io/surs.js","Пиратские плагины (старый магазин)":"https://lampaplugins.github.io/store/store.js","Добавляет пункт \"Парсер\" в меню":"http://cub.red/plugin/etor","Скрытие элементов карточки":"http://skaz.tv/meta.js","Настройка шапки":"https://and7ey.github.io/lampa/head_filter.js","Navigation Bar":"https://lampaplugins.github.io/store/navigation_bar.js"};
  var skinRoot = null, skinObserver = null, skinTimer = null;
  // The native installed row is a snapshot made when Extensions.show() opens.
  // Reopen the custom store after saving a catalog plugin to refresh that row.
  var nativePluginAdd = null;
  var installRefreshTimer = null;
  var reopenAfterInstall = false;
  var installedGrid = null;
  var focusedGridCard = null;
  var patchedGridControllers = [];
  var skinClass = 'alexgood321-skin-v280';


  // Live manifest is fetched at each opening. Failed sources fall back safely.
  var LIVE_META = {};
  var LIVE_DATA = null;
  var LAST_LIVE_URL = null;
  var UPDATE_BACKUP_KEY = 'alexgood321_store_update_backup';
  var AUTO_KEY = 'alexgood321_store_auto_update';

  function loadLive(callback, force, quietAutoUpdate) {
    if (!force && LIVE_DATA && LAST_LIVE_URL) return callback(LAST_LIVE_URL);
    if (!Lampa.Reguest) return callback(CONFIG.emergency);
    var URLs = [CONFIG.catalog, CONFIG.fallback];
    var request = new Lampa.Reguest();
    function attempt(i) {
      if (i >= URLs.length) return callback(CONFIG.emergency);
      var url = URLs[i] + '?_v=' + Date.now();
      request.silent(url, function (data) {
        if (!data || !Array.isArray(data.results) || !data.results.length ||
            !data.meta || !data.meta.tracked) return attempt(i+1);
        LIVE_DATA = data;
        LAST_LIVE_URL = url;
        LIVE_META = data.meta.tracked;
        for (var g = 0; g < data.results.length; g++) {
          var items = data.results[g].results || [];
          for (var i = 0; i < items.length; i++) LINK_MAP[items[i].name] = items[i].link;
        }
        deviceGet();
        deviceSet({last_catalog_check:Date.now(),catalog_source:url});
        var autoApplied = updateInstalledAutomatically(Boolean(quietAutoUpdate));
        if (skinRoot) refreshSkin();
        callback(url, autoApplied);
      }, function () { attempt(i+1); });
    }
    attempt(0);
  }

  function findInstalled(name, meta) {
    if (!Lampa.Plugins || !Lampa.Plugins.get) return null;
    var rows = Lampa.Plugins.get() || [];
    for (var i = 0; i < rows.length; i++) {
      var item = rows[i];
      if (!item || !item.url) continue;
      if (meta && normalized(item.url) === normalized(meta.link)) return item;
      if (item.name === name) return item;
    }
    return null;
  }

  function isUpdateAvailable(name) {
    var meta = LIVE_META[name];
    if (!meta || !meta.link || !meta.sha) return false;
    var item = findInstalled(name, meta);
    if (!item || item.status === 0 || item.status === false || item.url === meta.link) return false;

    var url = String(item.url);
    var pinned = url.match(/@([a-f0-9]{7,40})\//i);
    // A previous immutable commit is outdated even if no version string is declared.
    if (pinned) return meta.sha.indexOf(pinned[1].toLowerCase()) !== 0;

    // @main/@master, GitHub Pages and other floating URLs can still return a
    // stale JS file from cache. Compare its detected version with the manifest.
    // Unknown or non-semantic versions must not generate a false notification.
    if (normalized(url) !== normalized(meta.link)) return false;
    var currentVersion = installedVersion(url, meta);
    return isVersionNewer(currentVersion, meta.version);
  }

  function notice(message) {
    if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(message);
    else console.log('[My Store] ' + message);
  }

  function replaceInstalled(name, quiet) {
    var meta = LIVE_META[name];
    if (!meta || !Lampa.Plugins || !Lampa.Plugins.save) return false;
    var item = findInstalled(name, meta);
    if (!item || item.url === meta.link || !isUpdateAvailable(name)) return false;
    var old = item.url;
    try {
      item.url = meta.link;
      Lampa.Plugins.save();
      if (Lampa.Storage) Lampa.Storage.set(UPDATE_BACKUP_KEY, {
        name: name, oldUrl: old, newUrl: meta.link
      });
      historyAdd('link_updated', name, old, meta.link);
      deviceSet({last_update_at:Date.now()});
      if (!quiet) notice('Ссылка ' + name + ' обновлена. Перезапустите Lampa.');
      return true;
    } catch (error) {
      item.url = old;
      console.warn('[My Store] Update failed:', error);
      return false;
    }
  }

  function rollbackUpdate() {
    if (!Lampa.Storage || !Lampa.Plugins || !Lampa.Plugins.save) return false;
    var item = Lampa.Storage.get(UPDATE_BACKUP_KEY, null);
    if (!item || !item.oldUrl || !item.newUrl) return false;
    var found = findInstalled(item.name, {link:item.newUrl});
    if (!found || found.url !== item.newUrl) return false;
    found.url = item.oldUrl;
    Lampa.Plugins.save();
    historyAdd('rollback',item.name,item.newUrl,item.oldUrl);
    Lampa.Storage.set(UPDATE_BACKUP_KEY, null);
    notice('Предыдущая ссылка восстановлена. Перезапустите Lampa.');
    return true;
  }

  function updateInstalledAutomatically(quiet) {
    if (!Lampa.Storage) return [];
    var allEnabled = Lampa.Storage.get(AUTO_KEY, false);
    var ownedEnabled = Lampa.Storage.get(AUTO_OWN_KEY, false);
    if (!allEnabled && !ownedEnabled) return [];
    var changed = [];
    for (var name in LIVE_META) {
      if (Object.prototype.hasOwnProperty.call(LIVE_META,name) &&
          (allEnabled || (ownedEnabled && LIVE_META[name].owned)) &&
          isUpdateAvailable(name) && replaceInstalled(name,quiet)) changed.push(name);
    }
    if (changed.length && !quiet)
      notice('Ссылки обновлены: ' + changed.length + '. Нужен перезапуск Lampa.');
    return changed;
  }


  function notifyGitHubCheck(automaticallyUpdated, attempt) {
    // Floating (@main) URLs may require a network request to determine their
    // installed version. Do not prematurely report "no new versions".
    if (Object.keys(versionRequests).length && attempt < 40) {
      setTimeout(function () {
        notifyGitHubCheck(automaticallyUpdated, attempt + 1);
      }, 200);
      return;
    }

    var applied = Array.isArray(automaticallyUpdated) ? automaticallyUpdated : [];
    var appliedLookup = {};
    for (var i = 0; i < applied.length; i++) appliedLookup[applied[i]] = true;

    var available = [];
    var unknown = 0;
    for (var name in LIVE_META) {
      if (!Object.prototype.hasOwnProperty.call(LIVE_META,name)) continue;
      var info = LIVE_META[name];
      var current = findInstalled(name,info);
      if (!info || !current || current.status === 0 || current.status === false) continue;

      // If auto-update just replaced the URL, it must still be included
      // in the report even though it is no longer considered outdated.
      if (appliedLookup[name] || isUpdateAvailable(name)) {
        available.push(name + ' ' + (info.version || ('rev-' + info.sha.slice(0,8))));
      } else {
        var pinned = /@[a-f0-9]{7,40}\//i.test(String(current.url || ''));
        if (!pinned && isVersionNewer('0.0', info.version) &&
            cachedSourceVersion(current.url) === '') unknown++;
      }
    }

    if (available.length) {
      var visible = available.slice(0,4);
      var remainder = available.length - visible.length;
      var suffix = remainder ? ' и ещё ' + remainder : '';
      var autoMessage = applied.length ? ' · ссылки обновлены автоматически, нужен перезапуск Lampa' : '';
      notice('Найдены обновления (' + available.length + '): ' +
        visible.join(', ') + suffix + autoMessage);
    } else if (unknown) {
      notice('Проверка GitHub завершена. Обновлений не обнаружено; ' +
        'не удалось определить версию ' + unknown + ' плагинов.');
    } else {
      notice('Проверено. Новых версий не найдено.');
    }
  }


  // Manual live GitHub check (four first-party plugins). Unlike the generated
  // manifest, this is independent of GitHub Actions' scheduler.
  function checkOwnSourcesLive(finished) {
    var names = [];
    for (var name in LIVE_META) {
      if (Object.prototype.hasOwnProperty.call(LIVE_META,name) && LIVE_META[name] &&
          LIVE_META[name].owned && LIVE_META[name].repo && LIVE_META[name].path) {
        names.push(name);
      }
    }
    if (!names.length) return finished({checked:0,failed:[],changed:[]});
    if (!Lampa.Reguest) return finished({checked:0,failed:names.slice(),changed:[]});

    var cursor = 0, active = 0, checked = 0, failed = [], changed = [];
    function finishOne(name,failedOne) {
      if (failedOne) failed.push(name);
      else checked++;
      active--;
      next();
    }
    function next() {
      while (active < 2 && cursor < names.length) {
        (function(name) {
          var meta = LIVE_META[name];
          active++;
          var api = 'https://api.github.com/repos/' + meta.repo +
            '/commits?sha=' + encodeURIComponent(meta.ref || 'main') +
            '&path=' + encodeURIComponent(meta.path) + '&per_page=1&_v=' + Date.now();
          var req;
          try {
            req = new Lampa.Reguest();
            req.silent(api, function(payload) {
              try {
                var list = typeof payload === 'string' ? JSON.parse(payload) : payload;
                var latest = list && list[0];
                var sha = latest && latest.sha;
                if (!/^[a-f0-9]{40}$/i.test(String(sha || ''))) return finishOne(name,true);
                if (sha.toLowerCase() === String(meta.sha || '').toLowerCase())
                  return finishOne(name,false);

                // Check actual source before offering to replace the installed URL.
                var rawURL='https://raw.githubusercontent.com/' + meta.repo + '/' +
                  sha + '/' + meta.path + '?_v=' + Date.now();
                if (typeof req.native !== 'function') return finishOne(name,true);
                req.native(rawURL, function(source) {
                  try {
                    var version = parseSourceVersion(source);
                    if (!version) return finishOne(name,true);
                    var oldSHA = meta.sha;
                    var newLink = 'https://cdn.jsdelivr.net/gh/' + meta.repo +
                      '@' + sha + '/' + meta.path;
                    var stamp = latest.commit && latest.commit.committer &&
                      latest.commit.committer.date;
                    meta.sha = sha;
                    meta.version = version;
                    meta.link = newLink;
                    if (stamp) meta.published_at = stamp;
                    if (LIVE_DATA && Array.isArray(LIVE_DATA.results)) {
                      for (var g=0;g<LIVE_DATA.results.length;g++) {
                        var cards=LIVE_DATA.results[g].results || [];
                        for (var c=0;c<cards.length;c++) if (cards[c].name === name) {
                          cards[c].link=newLink;
                          cards[c].version=version;
                        }
                      }
                    }
                    LINK_MAP[name] = newLink;
                    changed.push({name:name,version:version,from:oldSHA,to:sha});
                    finishOne(name,false);
                  } catch(e) { finishOne(name,true); }
                }, function() { finishOne(name,true); },
                false, {dataType:'text', timeout:9000});
              } catch(e) { finishOne(name,true); }
            }, function() { finishOne(name,true); });
          } catch(e) { finishOne(name,true); }
        })(names[cursor++]);
      }
      if (cursor >= names.length && active === 0) {
        finished({checked:checked,failed:failed,changed:changed});
      }
    }
    next();
  }

  function showUpdateCenter(forceRefresh, reportResult) {
    loadLive(function (resolvedUrl, autoApplied) {
      if (reportResult) {
        if (!resolvedUrl || resolvedUrl === CONFIG.emergency) {
          notice('Не удалось проверить GitHub. Нет свежего каталога.');
          showUpdateCenter(false,false);
          return;
        }
        checkOwnSourcesLive(function(result) {
          var applied = Array.isArray(autoApplied) ? autoApplied.slice() : [];
          // Auto-update remains opt-in; a live source check can discover
          // revisions newer than those in the scheduled catalog.
          var additionallyApplied = updateInstalledAutomatically(true);
          if (additionallyApplied && additionallyApplied.length)
            applied = applied.concat(additionallyApplied);
          if (result.failed.length) {
            var newInfo = result.changed.length ?
              ' Найдено новых коммитов: ' +
              result.changed.map(function(e) { return e.name + ' ' + e.version; }).join(', ') + '.' : '';
            notice('Проверка GitHub неполная: ' + result.failed.join(', ') +
              ' не проверены.' + newInfo);
          } else {
            notifyGitHubCheck(applied,0);
          }
          showUpdateCenter(false,false);
        });
        return;
      }
      if (!Lampa.Select || typeof Lampa.Select.show !== 'function') {
        return notice('Меню обновлений недоступно');
      }
      var rows = [];
      var count = 0;
      for (var name in LIVE_META) {
        if (!Object.prototype.hasOwnProperty.call(LIVE_META, name)) continue;
        var info = LIVE_META[name], installed = findInstalled(name, info);
        if (!installed) continue;
        var outdated = isUpdateAvailable(name);
        if (outdated) count++;
        var floating = /@(main|master|dev|latest)\//i.test(String(installed.url));
        var currentVersion = installedVersion(String(installed.url), info);
        var currentLabel = currentVersion === null ? 'проверяется' : (currentVersion || 'не определена');
        rows.push({
          title: name,
          subtitle: outdated ?
            'Установлена: ' + currentLabel + ' · Доступна: ' + info.version + ' · обновить ссылку' :
            floating && currentVersion === null ?
              'Проверяется версия JS · при обновлении ветки может потребоваться перезапуск' :
              'Установлена: ' + currentLabel + ' · Актуальная: ' + info.version,
          name: name, canUpdate: outdated
        });
      }
      if (rows.length === 0) rows.push({title:'Установленных отслеживаемых плагинов нет', action:'none'});
      var enabled = Boolean(Lampa.Storage && Lampa.Storage.get(AUTO_KEY, false));
      rows.push({title:'Автообновление ссылок: ' + (enabled ? 'включено' : 'выключено'),
        subtitle:'По умолчанию отключено. При включении требуется перезапуск Lampa.',
        action:'auto'});
      rows.push({title:'Откат последней замены ссылки',action:'rollback'});
      rows.push({title:'Проверить GitHub повторно',action:'refresh'});
      rows.push({title:'Обновить мои и перезапустить',action:'apply_owned'});
      rows.push({title:'Данные этого устройства и журнал',action:'device'});
      rows.push({title:'Перезапустить Lampa без очистки кэша',action:'reload'});
      Lampa.Select.show({
        title: 'Обновления плагинов' + (count ? ' (' + count + ')' : ''),
        items: rows,
        onSelect: function (row) {
          if (row.action === 'auto') {
            if (Lampa.Storage) Lampa.Storage.set(AUTO_KEY, !enabled);
            if (!enabled) updateInstalledAutomatically();
            notice('Автообновление ' + (!enabled ? 'включено' : 'выключено'));
          } else if (row.action === 'rollback') {
            if (!rollbackUpdate()) notice('Нет ссылки для отката');
          } else if (row.action === 'refresh') {
            showUpdateCenter(true, true);
          } else if (row.action === 'apply_owned') {
            applyOwnedAndReload();
          } else if (row.action === 'device') {
            showThisDevice(true);
          } else if (row.action === 'reload') {
            confirmReload();
          } else if (row.canUpdate) {
            var selected = row.name;
            Lampa.Select.show({
              title: 'Обновить ' + selected + '?',
              items: [{title:'Заменить установленную ссылку',action:'confirm'},
                      {title:'Отмена',action:'cancel'}],
              onSelect: function (decision) {
                if (decision.action === 'confirm') {
                  if (!replaceInstalled(selected)) notice('Обновление не удалось');
                }
              }
            });
          } else if (row.action !== 'none') {
            notice('Обновление не требуется');
          }
        }
      });
    }, Boolean(forceRefresh), Boolean(reportResult));
  }


  // Device inventory v2.4: local observations, not proof of executed JS version.
  var DEVICE_KEY = 'alexgood321_device_record_v1';
  var HISTORY_KEY = 'alexgood321_device_history_v1';
  var BATCH_BACKUP_KEY = 'alexgood321_batch_backup_v1';
  var AUTO_OWN_KEY = 'alexgood321_auto_own_v1';
  var deviceCache = null;
  var catalogRefreshBusy = false;

  function deviceGet() {
    if (deviceCache) return deviceCache;
    var record = null;
    try {
      if (Lampa.Storage) record = Lampa.Storage.get(DEVICE_KEY, null);
    } catch (e) {}
    if (!record || !record.id || typeof record !== 'object') {
      var randomPart = '';
      try {
        if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
          var bytes = new Uint8Array(16);
          window.crypto.getRandomValues(bytes);
          for (var n=0; n<bytes.length; n++)
            randomPart += ('0' + bytes[n].toString(16)).slice(-2);
        }
      } catch (error) {}
      if (!randomPart) randomPart=String(Math.random()).slice(2, 12)+String(Math.random()).slice(2, 10);
      record = {id: randomPart, created_at: Date.now(), name: ''};
    }
    if (!record.name) {
      var suggested = '';
      try { suggested = Lampa.Storage.get('device_name',''); } catch(e) {}
      record.name = suggested && String(suggested).trim() ? String(suggested).trim() : 'Это устройство';
    }
    deviceCache = record;
    deviceSet({last_store_start: Date.now()});
    return deviceCache;
  }

  function deviceSet(properties) {
    var device = deviceCache || deviceGet();
    for (var key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties,key)) device[key]=properties[key];
    }
    if (Lampa.Storage) Lampa.Storage.set(DEVICE_KEY,device);
  }

  function localHistory() {
    var entries = [];
    try { if (Lampa.Storage) entries = Lampa.Storage.get(HISTORY_KEY,[]) || []; } catch(e){}
    return Array.isArray(entries) ? entries : [];
  }

  function historyAdd(event, plugin, oldUrl, newUrl) {
    var entries = localHistory();
    entries.unshift({
      time: Date.now(), event: event, plugin: plugin || '',
      from: oldUrl || '', to: newUrl || ''
    });
    if (entries.length > 80) entries.length = 80;
    if (Lampa.Storage) Lampa.Storage.set(HISTORY_KEY, entries);
  }

  function displayTime(value) {
    if (!value) return 'нет данных';
    try { return new Date(value).toLocaleString('ru-RU'); }
    catch (e) { return 'нет данных'; }
  }

  function loadedUrls() {
    try {
      return Lampa.Plugins && typeof Lampa.Plugins.loaded === 'function' ?
        (Lampa.Plugins.loaded() || []) : [];
    } catch(e) {return [];}
  }

  function snapshotThisDevice() {
    var result = {};
    try {
      var installed = Lampa.Plugins && Lampa.Plugins.get ? Lampa.Plugins.get() : [];
      var loaded = loadedUrls();
      for (var i = 0; i < installed.length; i++) {
        var item = installed[i];
        if (!item || !item.url) continue;
        var ref = metadataForURL(item.url);
        var name = ref ? ref.name : (item.name || 'Без названия');
        result[item.url] = {
          name: name,
          version: installedVersion(item.url, ref && ref.latest) || '',
          enabled: item.status === 1,
          loaded_url: loaded.indexOf(item.url) !== -1
        };
      }
      deviceSet({inventory:result,last_inventory_check:Date.now()});
      var log = localHistory(), changed = false;
      for (var j = 0; j < log.length; j++) {
        var entry=log[j];
        if (entry.event === 'link_updated' && !entry.loaded_at &&
            entry.to && loaded.indexOf(entry.to) !== -1) {
          entry.loaded_at=Date.now();
          changed=true;
        }
      }
      if (changed && Lampa.Storage) Lampa.Storage.set(HISTORY_KEY,log);
    } catch (e) {
      console.warn('[My Store] Device snapshot:',e);
    }
  }

  function rebootLampa() {
    historyAdd('reload_requested','','','');
    if (typeof window !== 'undefined' && window.location &&
        typeof window.location.reload === 'function') {
      setTimeout(function () { window.location.reload(); }, 450);
      return true;
    }
    notice('Автоматический перезапуск в этой сборке Lampa недоступен');
    return false;
  }

  function confirmReload() {
    if (!Lampa.Select || !Lampa.Select.show) return rebootLampa();
    Lampa.Select.show({
      title:'Перезапустить Lampa?',
      items:[
        {title:'Перезапустить без очистки кэша',action:'do_reload'},
        {title:'Отмена',action:'cancel'}
      ],
      onSelect:function(item) {
        if (item.action === 'do_reload') rebootLampa();
      }
    });
  }

  function applyOwnedBatch() {
    var records = Lampa.Plugins && Lampa.Plugins.get ? Lampa.Plugins.get() : [];
    var changed = [];
    for (var name in LIVE_META) {
      if (!Object.prototype.hasOwnProperty.call(LIVE_META,name)) continue;
      var meta = LIVE_META[name];
      if (!meta || !meta.owned || !meta.link) continue;
      var installed = findInstalled(name,meta);
      if (!installed || !installed.url || installed.status === 0 ||
          installed.status === false || installed.url === meta.link) continue;
      changed.push({name:name,item:installed,oldUrl:installed.url,newUrl:meta.link});
    }
    if (!changed.length) return 0;
    try {
      for (var i=0; i<changed.length; i++) changed[i].item.url=changed[i].newUrl;
      Lampa.Plugins.save();
      if (Lampa.Storage) Lampa.Storage.set(BATCH_BACKUP_KEY, {
        at:Date.now(), items:changed.map(function(e) {
          return {name:e.name,from:e.oldUrl,to:e.newUrl};
        })
      });
      for (var j=0; j<changed.length; j++)
        historyAdd('link_updated',changed[j].name,changed[j].oldUrl,changed[j].newUrl);
      deviceSet({last_update_at:Date.now()});
      return changed.length;
    } catch (e) {
      for (var k=0; k<changed.length; k++) changed[k].item.url=changed[k].oldUrl;
      try {Lampa.Plugins.save()}catch(ignored){}
      console.warn('[My Store] Batch update rejected:',e);
      return -1;
    }
  }

  function rollbackOwnedBatch() {
    if (!Lampa.Storage || !Lampa.Plugins || !Lampa.Plugins.save) return false;
    var previous = Lampa.Storage.get(BATCH_BACKUP_KEY,null);
    if (!previous || !Array.isArray(previous.items) || !previous.items.length) return false;
    var restored=[];
    for (var i=0; i<previous.items.length;i++) {
      var item=previous.items[i];
      var installed=findInstalled(item.name,{link:item.to});
      if (installed && installed.url===item.to){
        installed.url=item.from;
        restored.push(item);
      }
    }
    if (!restored.length) return false;
    Lampa.Plugins.save();
    for(var j=0;j<restored.length;j++)
      historyAdd('rollback',restored[j].name,restored[j].to,restored[j].from);
    Lampa.Storage.set(BATCH_BACKUP_KEY,null);
    return true;
  }

  function applyOwnedAndReload() {
    loadLive(function(url) {
      if (url === CONFIG.emergency) return notice('Нет актуального каталога. Обновление отменено.');
      if (!Lampa.Select || !Lampa.Select.show) return;
      var candidates = Object.keys(LIVE_META).filter(function(name){
        var meta=LIVE_META[name], item=findInstalled(name,meta);
        return meta && meta.owned && item && item.status !== 0 && item.status !== false &&
          item.url !== meta.link;
      });
      if (!candidates.length) return notice('Мои плагины уже используют актуальные ссылки.');
      Lampa.Select.show({
        title:'Обновить '+candidates.length+' и перезапустить?',
        items:[{title:'Применить и перезапустить',action:'apply'},
               {title:'Отмена',action:'cancel'}],
        onSelect:function(choice) {
          if (choice.action !== 'apply') return;
          var count = applyOwnedBatch();
          if(count>0){notice('Обновлено ссылок: '+count);rebootLampa();}
          else notice('Замена ссылок не выполнена');
        }
      });
    },true);
  }

  function showLocalHistory() {
    if (!Lampa.Select || !Lampa.Select.show) return;
    var names = {
      link_updated:'Ссылка обновлена',
      rollback:'Откат ссылки',
      reload_requested:'Запрошен перезапуск'
    };
    var events=localHistory().slice(0,40).map(function(e){
      return {title:(names[e.event] || e.event) + (e.plugin?' · '+e.plugin:''),
        subtitle:displayTime(e.time) + (e.loaded_at?' · адрес загружен: '+displayTime(e.loaded_at):'')};
    });
    if (!events.length) events.push({title:'Журнал пока пуст'});
    Lampa.Select.show({title:'Журнал обновлений · это устройство',items:events});
  }

  function showThisDevice(force) {
    loadLive(function(url){
      if (!Lampa.Select || !Lampa.Select.show) return;
      snapshotThisDevice();
      var device=deviceGet(), latest=LIVE_META;
      var entries=[
        {title:device.name + ' · ' + device.id.slice(0,8),
         subtitle:'Данные хранятся локально. Другие устройства пока не подключены.'},
        {title:'Последняя проверка каталога',subtitle:displayTime(device.last_catalog_check)},
        {title:'Последнее изменение ссылок',subtitle:displayTime(device.last_update_at)}
      ];
      var own=Object.keys(latest).filter(function(name){return latest[name].owned});
      for(var i=0;i<own.length;i++){
        var name=own[i], meta=latest[name], current=findInstalled(name,meta);
        if (!current) continue;
        var version=installedVersion(current.url,meta);
        var label=version===null?'проверяется':(version||'не определена');
        var isLoaded=loadedUrls().indexOf(current.url)!==-1;
        var changes=localHistory().filter(function(e){
          return e.plugin===name && e.event==='link_updated';
        });
        var lastChange=changes.length?changes[0]:null;
        var published=meta.published_at ? Date.parse(meta.published_at) : 0;
        entries.push({title:name,
          subtitle:'Установлена: '+label+' · Доступна: '+meta.version+
            ' · '+(isUpdateAvailable(name)?'есть обновление':'ссылка актуальна')+
            ' · '+(isLoaded?'URL загружен':'загрузка URL не подтверждена')+
            ' · GitHub: '+displayTime(published)+
            ' · Изменено на устройстве: '+displayTime(lastChange && lastChange.time)});
      }
      entries.push({title:'Проверить актуальные версии сейчас',action:'refresh'});
      entries.push({title:'Обновить мои и перезапустить',action:'apply'});
      entries.push({title:'Перезапустить Lampa без очистки кэша',action:'reload'});
      entries.push({title:'Журнал изменений',action:'history'});
      entries.push({title:'Откатить последнее групповое обновление',action:'rollback'});
      var ownAuto=Boolean(Lampa.Storage && Lampa.Storage.get(AUTO_OWN_KEY,false));
      entries.push({title:'Автообновление моих: '+(ownAuto?'включено':'выключено'),
        subtitle:'Меняет URL собственных плагинов. Код обновится после следующего запуска Lampa.',
        action:'auto_owned'});
      Lampa.Select.show({
        title:'My Store · это устройство',
        items:entries,
        onSelect:function(option){
          if (option.action==='refresh') showThisDevice(true);
          if (option.action==='apply') applyOwnedAndReload();
          if (option.action==='reload') confirmReload();
          if (option.action==='history') showLocalHistory();
          if (option.action==='rollback') {
            if (rollbackOwnedBatch()) notice('Ссылки восстановлены. Перезапустите Lampa.');
            else notice('Доступного группового отката нет');
          }
          if (option.action==='auto_owned') {
            if (Lampa.Storage) Lampa.Storage.set(AUTO_OWN_KEY,!ownAuto);
            notice('Автообновление моих '+(!ownAuto?'включено':'выключено'));
          }
        }
      });
    },Boolean(force));
  }

  function periodicCatalogCheck() {
    if (catalogRefreshBusy) return;
    catalogRefreshBusy=true;
    loadLive(function(){
      catalogRefreshBusy=false;
      snapshotThisDevice();
    },true);
  }

  function normalized(url) {
    return String(url || '').trim().toLowerCase()
      .replace(/^http:\/\//, 'https://')
      .replace(/[?#].*$/, '')
      .replace(/^(https:\/\/cdn\.jsdelivr\.net\/gh\/[^/]+\/[^/@]+)@[^/]+\//, '$1/');
  }

  function installedStatus(url) {
    var target = normalized(url), i, data, entry, ref;
    if (!target) return 'missing';
    try {
      if (Lampa.Plugins && typeof Lampa.Plugins.get === 'function') {
        data = Lampa.Plugins.get() || [];
        for (i = 0; i < data.length; i++) {
          entry = data[i];
          ref = typeof entry === 'string' ? entry : entry && entry.url;
          if (normalized(ref) === target) {
            return entry && (entry.status === 0 || entry.status === '0' || entry.status === false)
              ? 'disabled' : 'installed';
          }
        }
      }
      if (Lampa.Plugins && typeof Lampa.Plugins.loaded === 'function') {
        data = Lampa.Plugins.loaded() || [];
        for (i = 0; i < data.length; i++) {
          if (normalized(data[i]) === target) return 'installed';
        }
      }
    } catch (e) { console.warn('[My Store] status:', e); }
    return 'missing';
  }

  function setStatus(el, status) {
    var kinds = ['installed','disabled','missing'];
    for (var i = 0; i < kinds.length; i++) {
      var cls = 'alex-status-' + kinds[i];
      var needed = kinds[i] === status;
      if (el.classList.contains(cls) !== needed) el.classList.toggle(cls, needed);
    }
  }


  // This custom store shows the native installed list as a wrapped vertical grid.

  var VERSION_CACHE_KEY = 'alexgood321_installed_version_cache_v1';
  var sourceVersionCache = null;
  var versionTasks = [];
  var versionRequests = {};
  var versionActive = 0;
  var versionLimit = 2;

  function savedVersions() {
    if (sourceVersionCache) return sourceVersionCache;
    var old = {};
    try {
      if (Lampa.Storage && typeof Lampa.Storage.get === 'function')
        old = Lampa.Storage.get(VERSION_CACHE_KEY, {}) || {};
    } catch (e) {}
    sourceVersionCache = old && typeof old === 'object' && !Array.isArray(old) ? old : {};
    return sourceVersionCache;
  }

  function putVersion(url, value) {
    var cache = savedVersions();
    cache[url] = {version: value || '', time: Date.now()};
    var urls = Object.keys(cache);
    if (urls.length > 65) {
      urls.sort(function (a,b) { return (cache[b].time || 0) - (cache[a].time || 0); });
      for (var i=65; i<urls.length; i++) delete cache[urls[i]];
    }
    try {
      if (Lampa.Storage && typeof Lampa.Storage.set === 'function')
        Lampa.Storage.set(VERSION_CACHE_KEY, cache);
    } catch (e) {}
  }

  function isFloatingURL(url) {
    return /@(main|master|dev|latest)\//i.test(url) ||
      !/@[a-f0-9]{7,40}\//i.test(url);
  }

  function cachedSourceVersion(url) {
    var cache = savedVersions();
    var entry = cache[url];
    if (!entry) return null;
    var ttl = entry.version ? (isFloatingURL(url) ? 15*60*1000 : 30*24*60*60*1000) : 20*60*1000;
    return Date.now() - (entry.time || 0) < ttl ? entry.version : null;
  }

  function parseSourceVersion(raw) {
    if (typeof raw !== 'string' || !raw) return '';
    var header = raw.slice(0, 36000);
    var rules = [
      /(?:^|\n)\s*(?:\/\*+\s*)?(?:\*\s*)?(?:Версия|Version)\s*:\s*v?(\d+(?:\.\d+){1,3})\b/im,
      /\b(?:var|const|let)\s+VERSION\s*=\s*['"]v?(\d+(?:\.\d+){1,3})['"]/i,
      /\bversion\s*:\s*['"]v?(\d+(?:\.\d+){1,3})['"]/i,
      /\bversion\s*=\s*['"]v?(\d+(?:\.\d+){1,3})['"]/i
    ];
    for (var i=0; i<rules.length; i++) {
      var found = header.match(rules[i]);
      if (found) return found[1];
    }
    return '';
  }

  function requestVersion(url) {
    if (Object.prototype.hasOwnProperty.call(versionRequests,url) ||
        cachedSourceVersion(url) !== null ||
        !/^https?:\/\/[^ ]+\/[^ ]+\.js(?:[?#]|$)/i.test(url) ||
        !Lampa.Reguest) return;
    versionRequests[url] = true;
    versionTasks.push(url);
    runVersionTasks();
  }

  function runVersionTasks() {
    while (versionActive < versionLimit && versionTasks.length) {
      (function (url) {
        versionActive++;
        var finished = false;
        function finish(version) {
          if (finished) return;
          finished = true;
          delete versionRequests[url];
          versionActive--;
          putVersion(url, version);
          if (skinRoot) queueSkin();
          runVersionTasks();
        }
        try {
          var request = new Lampa.Reguest();
          if (!request || typeof request.native !== 'function') return finish('');
          request.native(url, function (body) {
            finish(parseSourceVersion(body));
          }, function () { finish(''); }, false, {dataType:'text', timeout:7500});
        } catch (e) { finish(''); }
      })(versionTasks.shift());
    }
  }

  function actualInstalledRecord(displayedUrl) {
    if (!Lampa.Plugins || typeof Lampa.Plugins.get !== 'function') return null;
    var records = Lampa.Plugins.get() || [];
    var safe = String(displayedUrl || '').replace(/^http:\/\//i,'https://');
    for (var i=0; i<records.length; i++) {
      var item = records[i];
      if (item && item.url &&
          String(item.url).replace(/^http:\/\//i,'https://') === safe) return item;
    }
    for (var j=0; j<records.length; j++) {
      var possible = records[j];
      if (possible && possible.url && normalized(possible.url) === normalized(displayedUrl))
        return possible;
    }
    return null;
  }

  function metadataForURL(url) {
    var key = normalized(url);
    for (var name in LIVE_META) {
      if (Object.prototype.hasOwnProperty.call(LIVE_META, name) &&
          LIVE_META[name] && normalized(LIVE_META[name].link) === key)
        return {name:name, latest:LIVE_META[name]};
    }
    return null;
  }

  function installedVersion(url, info) {
    var sha = String(url || '').match(/@([a-f0-9]{7,40})\//i);
    if (info && info.sha && sha && info.sha.indexOf(sha[1].toLowerCase()) === 0)
      return info.version || '';
    var cached = cachedSourceVersion(url);
    if (cached === null) requestVersion(url);
    return cached;
  }

  function isVersionNewer(older, newer) {
    if (!/^\d+(?:\.\d+){1,3}$/.test(String(older || '')) ||
        !/^\d+(?:\.\d+){1,3}$/.test(String(newer || ''))) return false;
    var a = older.split('.'), b = newer.split('.');
    for (var i=0; i<4; i++) {
      var av = Number(a[i] || 0), bv = Number(b[i] || 0);
      if (bv > av) return true;
      if (bv < av) return false;
    }
    return false;
  }

  function inferVersionFromURL(url) {
    var match = String(url || '').match(/[?&]v=v?(\d+(?:\.\d+){1,3})(?:[&#]|$)/i);
    return match ? match[1] : '';
  }

  function versionText(url, label) {
    var match = metadataForURL(url);
    var available = match && match.latest;
    var found = installedVersion(url, available);
    var guessed = found === null ? inferVersionFromURL(url) : '';
    var installed = found === null ? 'проверяется…' : (found || 'не определена');
    var text = 'Установлена: ' + installed;
    if (found === null && guessed) text += ' (в ссылке указано ' + guessed + ')';
    var newer = false;
    if (available && available.version) {
      var pin = String(url).match(/@([a-f0-9]{7,40})\//i);
      var pinnedOld = pin && available.sha && available.sha.indexOf(pin[1].toLowerCase()) !== 0;
      newer = Boolean(pinnedOld || isVersionNewer(found, available.version));
      if (newer) text += ' · Доступна: ' + available.version;
    }
    return {text:text, update:newer};
  }


  // Identify our own extensions by publisher/path rather than visible card title.
  // This works with @main, old SHA-pinned URLs and anonymous installed cards.
  function installedGithubKey(url) {
    var text=String(url || '').trim().toLowerCase()
      .replace(/^http:\/\//,'https://').replace(/[?#].*$/,'');
    var jsdelivr=text.match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/([a-z0-9_.-]+\/[a-z0-9_.-]+)(?:@[^/]+)?\/(.+\.js)$/);
    if (jsdelivr) return jsdelivr[1]+'/'+jsdelivr[2];
    var raw=text.match(/^https:\/\/raw\.githubusercontent\.com\/([a-z0-9_.-]+\/[a-z0-9_.-]+)\/[^/]+\/(.+\.js)$/);
    if (raw) return raw[1]+'/'+raw[2];
    return '';
  }

  function isOwnInstalledPlugin(url) {
    var key=installedGithubKey(url);
    var clean=normalized(url);
    if (!clean) return false;
    // The manager itself is also ours, despite not being listed in category "Мои".
    if (/^alexgood321\/store\/(?:my_store_live|my_store_v\d+(?:_\d+)*|my_store|alex_store|store)\.js$/.test(key))
      return true;

    var known={
      'alexgood321/lampa-plugins/surs.js':1,
      'alexgood321/lampa-plugins/home_categories.js':1,
      'alexgood321/lampa-plugins/num_series.js':1,
      'alexgood321/lampa-hdrezka/rezka.js':1
    };
    if (key && known[key]) return true;

    // Future first-party catalog additions require no hand-edited color list.
    var ownSection=null;
    if (LIVE_DATA && Array.isArray(LIVE_DATA.results)) {
      for (var i=0; i<LIVE_DATA.results.length; i++) {
        if (LIVE_DATA.results[i].title==='Мои') {
          ownSection=LIVE_DATA.results[i].results || [];
          break;
        }
      }
    }
    if (ownSection) {
      for (var j=0; j<ownSection.length; j++) {
        var member=ownSection[j];
        if ((key && installedGithubKey(member.link)===key) ||
            (member.link && normalized(member.link)===clean)) return true;
      }
    }
    // Allowlisted first-party metadata includes the same plugin across categories.
    for (var name in LIVE_META) {
      if (!Object.prototype.hasOwnProperty.call(LIVE_META,name)) continue;
      var meta=LIVE_META[name];
      if (!meta || !meta.owned) continue;
      if ((key && installedGithubKey(meta.link)===key) ||
          (meta.link && normalized(meta.link)===clean)) return true;
    }
    return false;
  }

  function refreshInstalledVersions() {
    if (!installedGrid) return;
    var cards = installedGrid.querySelectorAll('.extensions__item');
    // The Lampa built-in installed row uses Plugins.get().reverse() and appends
    // one .extensions__item per record. Its visible URL is populated lazily on
    // the "visible" event, so text-based matching alone can skip every card.
    var snapshot = [];
    try {
      if (Lampa.Plugins && typeof Lampa.Plugins.get === 'function')
        snapshot = (Lampa.Plugins.get() || []).slice().reverse();
    } catch (error) {
      console.warn('[My Store] Installed snapshot failed:',error);
    }
    var orderedSnapshot = snapshot.length === cards.length;
    for (var i=0; i<cards.length; i++) {
      var card = cards[i];
      var descr = card.querySelector('.extensions__item-descr');
      var visibleURL = descr ? String(descr.textContent || '').trim() : '';
      var installed = /^https?:\/\//i.test(visibleURL)
        ? actualInstalledRecord(visibleURL) : null;
      if (!installed && orderedSnapshot) installed = snapshot[i];
      if (!installed || !installed.url) continue;
      var own = isOwnInstalledPlugin(installed.url);
      if (card.classList.contains('alex-installed-own') !== own)
        card.classList.toggle('alex-installed-own',own);
      var info = versionText(installed.url, installed.name);
      var mark = card.querySelector('.alex-installed-version');
      if (!mark) {
        mark = document.createElement('div');
        mark.className = 'alex-installed-version';
        var footer = card.querySelector('.extensions__item-footer');
        if (footer) card.insertBefore(mark, footer);
        else card.appendChild(mark);
      }
      if (mark.textContent !== info.text) mark.textContent = info.text;
      mark.classList.toggle('alex-installed-version--update', Boolean(info.update));
    }
  }

  function markInstalledGrid() {
    if (!skinRoot) return;
    var first = skinRoot.querySelector('.extensions__block');
    if (!first) return;
    var heading = first.querySelector('.extensions__block-title');
    var label = heading ? String(heading.textContent || '').trim() : '';
    var expected = '';
    try { expected = Lampa.Lang.translate('extensions_from_memory'); } catch (e) {}
    if (label !== expected && label !== 'Установленные в память') return;
    if (installedGrid !== first) {
      installedGrid = first;
      focusedGridCard = null;
    }
    first.classList.add('alex-installed-grid');
    refreshInstalledVersions();
    var cards = first.querySelectorAll('.scroll__body > .selector');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].__alexGrid2800) continue;
      cards[i].__alexGrid2800 = true;
      cards[i].addEventListener('hover:focus', function () {
        focusedGridCard = this;
        enableGridArrows();
      });
    }
    enableGridArrows();
  }

  function enableGridArrows() {
    if (!installedGrid || !Lampa.Controller ||
        typeof Lampa.Controller.enabled !== 'function') return;
    var active = Lampa.Controller.enabled();
    var controller = active && active.controller;
    if (!active || active.name !== 'extensions_line' || !controller ||
        !controller.link || controller.link.html !== installedGrid ||
        controller.__alexGrid2800) return;
    var originalUp = controller.up;
    var originalDown = controller.down;
    controller.__alexGrid2800 = true;
    patchedGridControllers.push({value:controller, up:originalUp, down:originalDown});
    controller.up = function () {
      if (!moveGridRow(-1) && typeof originalUp === 'function') originalUp.apply(this, arguments);
    };
    controller.down = function () {
      if (!moveGridRow(1) && typeof originalDown === 'function') originalDown.apply(this, arguments);
    };
  }

  function moveGridRow(direction) {
    if (!installedGrid || !Lampa.Controller ||
        typeof Lampa.Controller.collectionFocus !== 'function') return false;
    var cards = Array.prototype.slice.call(installedGrid.querySelectorAll('.scroll__body > .selector'));
    var selected = focusedGridCard;
    if (!selected || cards.indexOf(selected) === -1) {
      selected = installedGrid.querySelector('.scroll__body > .selector.focus');
    }
    if (!selected || typeof selected.getBoundingClientRect !== 'function') return false;
    var rect = selected.getBoundingClientRect();
    var centerX = (rect.left + rect.right) / 2;
    var centerY = (rect.top + rect.bottom) / 2;
    var minimum = Math.max(8, rect.height * 0.35);
    var closest = null;
    var bestY = Infinity;
    var bestX = Infinity;
    for (var j = 0; j < cards.length; j++) {
      var card = cards[j];
      if (card === selected || card.classList.contains('hide') ||
          typeof card.getBoundingClientRect !== 'function') continue;
      var next = card.getBoundingClientRect();
      var distanceY = direction * ((next.top + next.bottom) / 2 - centerY);
      if (distanceY <= minimum) continue;
      var distanceX = Math.abs((next.left + next.right) / 2 - centerX);
      if (distanceY < bestY - 6 ||
          (Math.abs(distanceY - bestY) <= 6 && distanceX < bestX)) {
        closest = card;
        bestY = distanceY;
        bestX = distanceX;
      }
    }
    if (!closest) return false;
    try {
      Lampa.Controller.collectionFocus(closest, installedGrid);
      focusedGridCard = closest;
      // Lampa uses a transform-based vertical scroll on Android TV.
      var scroll = skinRoot && skinRoot.querySelector('.extensions__body > .scroll');
      if (scroll && scroll.Scroll && typeof scroll.Scroll.update === 'function') {
        var viewport = scroll.getBoundingClientRect();
        var nextRect = closest.getBoundingClientRect();
        if (nextRect.bottom > viewport.bottom - 12 || nextRect.top < viewport.top + 12) {
          scroll.Scroll.update(closest, false);
        }
      }
      return true;
    } catch (e) {
      console.warn('[My Store] Grid navigation:', e);
      return false;
    }
  }

  function refreshSkin() {
    if (!skinRoot || !skinRoot.parentNode) return;
    markInstalledGrid();
    var groups = skinRoot.querySelectorAll('.extensions__block');
    for (var i = 0; i < groups.length; i++) {
      var group = groups[i], titleNode = group.querySelector('.extensions__block-title');
      var title = titleNode ? (titleNode.textContent || '').trim() : '';
      if (!Object.prototype.hasOwnProperty.call(COLOR_MAP, title)) continue;
      if (!group.classList.contains('alex-colored-category')) group.classList.add('alex-colored-category');
      if (titleNode.style.borderLeftColor !== COLOR_MAP[title]) {
        titleNode.style.borderLeftColor = COLOR_MAP[title];
      }
      // One solid matte pastel fill per category; the installed row remains untouched.
      if (group.style && typeof group.style.setProperty === 'function' &&
          group.style.getPropertyValue('--alex-category-fill') !== COLOR_MAP[title]) {
        group.style.setProperty('--alex-category-fill', COLOR_MAP[title]);
      }
      var cards = group.querySelectorAll('.extensions__item');
      for (var j = 0; j < cards.length; j++) {
        var nameNode = cards[j].querySelector('.extensions__item-name');
        var name = nameNode ? (nameNode.textContent || '').trim() : '';
        if (Object.prototype.hasOwnProperty.call(LINK_MAP, name)) {
          setStatus(cards[j], installedStatus(LINK_MAP[name]));
          var available = isUpdateAvailable(name);
          cards[j].classList.toggle('alex-update-available', available);
          var note = cards[j].querySelector('.alex-update-label');
          if (available && !note) {
            note = document.createElement('div');
            note.className = 'alex-update-label';
            cards[j].appendChild(note);
          }
          if (note) {
            var newText = available ? 'Обновление ' + (LIVE_META[name].version || '') : '';
            var visibility = available ? '' : 'none';
            if (note.textContent !== newText) note.textContent = newText;
            if (note.style.display !== visibility) note.style.display = visibility;
          }
        }
      }
    }
  }

  function hasCatalogUrl(url) {
    var target = normalized(url);
    for (var name in LINK_MAP) {
      if (Object.prototype.hasOwnProperty.call(LINK_MAP, name) &&
          normalized(LINK_MAP[name]) === target) return true;
    }
    return false;
  }

  function refreshInstalledRow(attempt) {
    if (!skinRoot || !skinRoot.parentNode) return;
    if (!Lampa.Controller || typeof Lampa.Controller.enabled !== 'function' ||
        typeof Lampa.Controller.run !== 'function') return;

    var active = Lampa.Controller.enabled();
    var name = active && active.name;
    if (name === 'extensions' || name === 'extensions_line') {
      reopenAfterInstall = true;
      try {
        // Native extensions.onBack() destroys the current screen before onClose.
        Lampa.Controller.run('back');
      } catch (error) {
        reopenAfterInstall = false;
        console.warn('[My Store] Could not refresh installed row:', error);
      }
    } else if (attempt < 5) {
      installRefreshTimer = setTimeout(function () {
        installRefreshTimer = null;
        refreshInstalledRow(attempt + 1);
      }, 200);
    }
  }

  function watchInstalls() {
    if (!Lampa.Plugins || typeof Lampa.Plugins.add !== 'function' || nativePluginAdd) return;
    nativePluginAdd = Lampa.Plugins.add;

    Lampa.Plugins.add = function (plugin) {
      var saved = nativePluginAdd.apply(this, arguments);
      var url = plugin && plugin.url;
      if (skinRoot && url && hasCatalogUrl(url)) {
        var persisted = false;
        try {
          var installed = Lampa.Plugins.get() || [];
          persisted = installed.some(function (item) {
            return normalized(item && item.url) === normalized(url) && item.status !== 0;
          });
        } catch (error) {
          console.warn('[My Store] Could not confirm saved plugin:', error);
        }
        if (persisted) {
          if (installRefreshTimer !== null) clearTimeout(installRefreshTimer);
          installRefreshTimer = setTimeout(function () {
            installRefreshTimer = null;
            refreshInstalledRow(0);
          }, 180);
        }
      }
      return saved;
    };
  }

  function onStoreClose() {
    var reopen = reopenAfterInstall;
    reopenAfterInstall = false;
    releaseSkin();
    if (reopen) setTimeout(openStore, 0);
  }

  function queueSkin() {
    if (skinTimer !== null) clearTimeout(skinTimer);
    skinTimer = setTimeout(function () { skinTimer = null; refreshSkin(); }, 80);
  }

  function releaseSkin() {
    for (var i = 0; i < patchedGridControllers.length; i++) {
      var patch = patchedGridControllers[i];
      patch.value.up = patch.up;
      patch.value.down = patch.down;
      delete patch.value.__alexGrid2800;
    }
    patchedGridControllers = [];
    if (installedGrid) installedGrid.classList.remove('alex-installed-grid');
    installedGrid = null;
    focusedGridCard = null;
    if (nativePluginAdd && Lampa.Plugins && typeof Lampa.Plugins.add === 'function') {
      Lampa.Plugins.add = nativePluginAdd;
      nativePluginAdd = null;
    }
    if (installRefreshTimer !== null) {
      clearTimeout(installRefreshTimer);
      installRefreshTimer = null;
    }
    if (skinObserver) { skinObserver.disconnect(); skinObserver = null; }
    if (skinTimer !== null) { clearTimeout(skinTimer); skinTimer = null; }
    if (skinRoot) skinRoot.classList.remove(skinClass);
    skinRoot = null;
  }

  function attachSkin() {
    if (!Lampa.Extensions || typeof Lampa.Extensions.render !== 'function') return;
    var root = Lampa.Extensions.render(true);
    if (!root || !root.classList || !root.classList.contains('extensions')) return;
    releaseSkin();
    skinRoot = root;
    root.classList.add(skinClass);
    watchInstalls();
    var css = document.getElementById('alexgood321-store-style-v280');
    if (!css) {
      css = document.createElement('style');
      css.id = 'alexgood321-store-style-v280';
      css.textContent = [
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item{background-color:var(--alex-category-fill)!important;color:#17212F!important;box-sizing:border-box;padding:1.1em 1em 1em;transition:background-color .18s ease,box-shadow .18s ease;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-author{padding-right:2.4em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;min-height:1.25em;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-name{padding-right:1.8em;line-height:1.25;margin-bottom:0.7em;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-descr{line-height:1.4;overflow-wrap:anywhere;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-included{display:none!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item.focus{background-image:linear-gradient(rgba(255,255,255,.11),rgba(255,255,255,.11))!important;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35);}',
        '.extensions.' + skinClass + ' .scroll--mask:not(.scroll--horizontal){-webkit-mask-image:none!important;mask-image:none!important;}',
        ".extensions.alexgood321-skin-v280 .alex-installed-grid .scroll--horizontal{overflow:visible!important;mask-image:none!important;-webkit-mask-image:none!important;}",
        ".extensions.alexgood321-skin-v280 .alex-installed-grid .scroll--horizontal>.scroll__content{width:100%!important;max-width:100%!important;box-sizing:border-box;}",
        ".extensions.alexgood321-skin-v280 .alex-installed-grid .scroll--horizontal>.scroll__content>.scroll__body{display:flex!important;flex-wrap:wrap!important;gap:1em!important;align-items:stretch!important;width:100%!important;-webkit-transform:none!important;transform:none!important;transition:none!important;}",
        ".extensions.alexgood321-skin-v280 .alex-installed-grid .scroll__body>.selector{flex:0 1 20em!important;max-width:100%!important;box-sizing:border-box;margin:0!important;}",

        '.extensions.' + skinClass + ' .alex-installed-grid .extensions__block-title:after{content:"  ·  My Store v2.8.0";font-size:.63em;font-weight:400;color:#A5B4C9;white-space:nowrap;margin-left:.5em;}',
        '.extensions.' + skinClass + ' .alex-installed-grid .extensions__item{height:auto!important;min-height:11.5em;box-sizing:border-box;}',
        '.extensions.' + skinClass + ' .alex-installed-grid .extensions__item.alex-installed-own{background:#E5D49E!important;background-image:none!important;color:#2C2A24!important;}',
        '.extensions.' + skinClass + ' .alex-installed-grid .extensions__item.alex-installed-own .extensions__item-author{color:#695B3E!important;}',
        '.extensions.' + skinClass + ' .alex-installed-grid .extensions__item.alex-installed-own .extensions__item-name{color:#27241C!important;}',
        '.extensions.' + skinClass + ' .alex-installed-grid .extensions__item.alex-installed-own .extensions__item-descr{color:#3E392D!important;}',
        '.extensions.' + skinClass + ' .alex-installed-grid .extensions__item.alex-installed-own .extensions__item-status{color:#5F5848!important;}',
        '.extensions.' + skinClass + ' .alex-installed-grid .extensions__item.alex-installed-own .alex-installed-version{color:#69552B!important;}',
        '.extensions.' + skinClass + ' .alex-installed-grid .extensions__item.alex-installed-own .alex-installed-version--update{color:#92520D!important;}',
        '.extensions.' + skinClass + ' .alex-installed-grid .extensions__item.alex-installed-own.focus{box-shadow:inset 0 0 0 2px rgba(255,255,255,.4);}',
        '.extensions.' + skinClass + ' .alex-installed-grid .alex-installed-version{font-size:.77em;line-height:1.35;margin-top:.45em;margin-bottom:.3em;color:#B4C7E6;overflow-wrap:anywhere;}',
        '.extensions.' + skinClass + ' .alex-installed-grid .alex-installed-version--update{color:#EDC37C;font-weight:700;}',

        "@media(max-width:640px){.extensions.alexgood321-skin-v280 .alex-installed-grid .scroll__body>.selector{flex:1 1 100%!important;width:100%!important;}}",
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-author{color:#3E4A5B!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-name{color:#17212F!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-descr{color:#283548!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-status{color:#344458!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-code.success{color:#235837!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-code.error{color:#8C3529!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__block-title{color:var(--alex-category-fill);}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__block-title{border-left:0.23em solid transparent;padding-left:0.65em;line-height:1.35;}',
        '.extensions.' + skinClass + ' .extensions__block:not(.alex-colored-category) .extensions__item-included:not(.hide){background:#3569B4!important;}',
        '.extensions.' + skinClass + ' .extensions__item-disabled:not(.hide){color:#885318!important;background:rgba(127,77,18,.09)!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item:before{position:absolute;right:0.7em;top:0.7em;width:1.5em;height:1.5em;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:0.85em;pointer-events:none;}',
        '.extensions.' + skinClass + ' .alex-status-installed:before{content:"✓";color:#fff;background:#3569B4;}',
        '.extensions.' + skinClass + ' .alex-status-disabled:before{content:"–";color:#885318;background:rgba(127,77,18,.09);border:1px solid #885318;}',
        '.extensions.' + skinClass + ' .alex-status-missing:before{content:"+";color:#344458;border:1px solid #50637A;background:rgba(255,255,255,.17);}',
        '.extensions.' + skinClass + ' .alex-update-available:before{content:"↑";background:#926016;color:#fff;}',
        '.extensions.' + skinClass + ' .alex-update-label{margin-top:auto;padding-top:.6em;font-size:.79em;font-weight:700;color:#704512;}'
      ].join('\n');
      document.head.appendChild(css);
    }
    refreshSkin();
    if (typeof MutationObserver !== 'undefined') {
      skinObserver = new MutationObserver(queueSkin);
      skinObserver.observe(root, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
    }
    setTimeout(refreshSkin, 300);
    setTimeout(refreshSkin, 1100);
  }

  function openStore() {
    if (Lampa.Extensions && typeof Lampa.Extensions.show === 'function') {
      loadLive(function (url) {
        Lampa.Extensions.show({
          store: url,
          with_installed: true,
          onClose: onStoreClose
        });
        attachSkin();
      }, true);
    } else {
      console.error('[Alexgood321 Store] Lampa.Extensions.show unavailable');
    }
  }

  function onSettingsOpen(event) {
    if (!event || event.name !== 'main') return;
    addMenu();

    var body = event.body;
    if (!body || typeof body.find !== 'function') return;
    var menu = body.find('[data-component="' + CONFIG.component + '"]');
    if (!menu || !menu.length) return;
    menu.off('hover:enter.alexgood321_personal_store');
    menu.on('hover:enter.alexgood321_personal_store', openStore);
    var device = body.find('[data-component="alexgood321_store_device"]');
    if (device && device.length) {
      device.off('hover:enter.alexgood321_store_device');
      device.on('hover:enter.alexgood321_store_device',function(){showThisDevice(true)});
    }
    var updates = body.find('[data-component="alexgood321_store_updates"]');
    if (updates && updates.length) {
      updates.off('hover:enter.alexgood321_store_updates');
      updates.on('hover:enter.alexgood321_store_updates', function () { showUpdateCenter(true); });
    }
  }

  function ready() {
    if (initialized) return;
    initialized = true;
    register();
    addMenu();
    deviceGet();
    setTimeout(snapshotThisDevice,5000);
    setTimeout(periodicCatalogCheck,12000);
    if (typeof setInterval === 'function') setInterval(periodicCatalogCheck,5*60*1000);
    if (Lampa.Settings && Lampa.Settings.listener && typeof Lampa.Settings.listener.follow === 'function') {
      Lampa.Settings.listener.follow('open', onSettingsOpen);
    }
    console.log('[Alexgood321 Store] ready v' + CONFIG.version);
  }

  if (typeof Lampa !== 'undefined') {
    if (window.appready) ready();
    else if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      Lampa.Listener.follow('app', function (event) {
        if (event && event.type === 'ready') ready();
      });
    }
  }
})();
