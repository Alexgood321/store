(function () {
  'use strict';

  // Персональный магазин Alexgood321. Не использует внешний extensions.json.
  var CONFIG = {
    id: 'alexgood321_personal_store',
    component: 'alexgood321_personal_store',
    version: '2.0.0',
    name: 'Мои плагины',
    catalog: 'https://raw.githubusercontent.com/Alexgood321/store/main/live_catalog.json',
    fallback: 'https://cdn.jsdelivr.net/gh/Alexgood321/store@main/live_catalog.json',
    emergency: 'https://cdn.jsdelivr.net/gh/Alexgood321/store@76c6506aa50951e65b3b6edae5c4faf68490dfb8/my_extensions_v1_14.json'
  };

  if (window.__alexgood321_personal_store_2000_loaded) return;
  window.__alexgood321_personal_store_2000_loaded = true;

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

    if (body.find('[data-component="' + CONFIG.component + '"]').length) return;

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
    if (typeof main.update === 'function') main.update();
  }


  // UI v1.8: only the personal extension screen, never the global Lampa UI.
  var COLOR_MAP = {"Мои":"#91A8EA","Главный экран":"#98C6AE","Сериалы":"#B7A6DB","Онлайн-просмотр":"#93BCD8","Торренты":"#D5BA8C","Интерфейс":"#D9ACC1","Системные и ТВ":"#A9B9D0","Рейтинги и сервисы":"#A7C6C8","Архив и служебные":"#92959D"};
  var LINK_MAP = {"SURS Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@2c8e9d07ea5673b7fdd958eed1ea5e5637b48e3f/surs.js?v=3.7.2-sidfix","Home Categories Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@main/home_categories.js?v=2.0.0","NUM Series Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@main/num_series.js?v=1.3.0","HDREZKA":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-hdrezka@main/rezka.js?v=1.4.0","Продолжить просмотр":"https://arst113.github.io/lampa-watch-resume/watch_resume.js","Онлайн Мод":"https://nb557.github.io/plugins/online_mod.js","EasyTorrent":"https://darkestclouds.github.io/plugins/easytorrent/easytorrent.min.js","Torrent Styles":"https://cdn.jsdelivr.net/gh/Alexgood321/store@main/torrent_styles_v2.js?v=1.2.1","Приятные мелочи":"http://skaztv.online/js/tricks.js","TraktTV":"https://lampame.github.io/main/trakttv.js","Рейтинг КиноПоиск и IMDb":"https://nb557.github.io/plugins/rating.js","SURS (оригинальный, отключён)":"https://aviamovie.github.io/surs.js","Пиратские плагины (старый магазин)":"https://lampaplugins.github.io/store/store.js","Добавляет пункт \"Парсер\" в меню":"http://cub.red/plugin/etor","Скрытие элементов карточки":"http://skaz.tv/meta.js","Настройка шапки":"https://and7ey.github.io/lampa/head_filter.js","Navigation Bar":"https://lampaplugins.github.io/store/navigation_bar.js"};
  var skinRoot = null, skinObserver = null, skinTimer = null;
  // The native installed row is a snapshot made when Extensions.show() opens.
  // Reopen the custom store after saving a catalog plugin to refresh that row.
  var nativePluginAdd = null;
  var installRefreshTimer = null;
  var reopenAfterInstall = false;
  var installedGrid = null;
  var focusedGridCard = null;
  var patchedGridControllers = [];
  var skinClass = 'alexgood321-skin-v200';


  // Live manifest is fetched at each opening. Failed sources fall back safely.
  var LIVE_META = {};
  var LIVE_DATA = null;
  var LAST_LIVE_URL = null;
  var UPDATE_BACKUP_KEY = 'alexgood321_store_update_backup';
  var AUTO_KEY = 'alexgood321_store_auto_update';

  function loadLive(callback, force) {
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
        updateInstalledAutomatically();
        if (skinRoot) refreshSkin();
        callback(url);
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
    // Branch addresses update on Lampa restart, so no false update badge.
    if (/@(main|master|dev)\//i.test(url)) return false;
    var sha = url.match(/@([a-f0-9]{7,40})\//i);
    if (sha) return meta.sha.indexOf(sha[1].toLowerCase()) !== 0;
    return normalized(url) === normalized(meta.link);
  }

  function notice(message) {
    if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(message);
    else console.log('[My Store] ' + message);
  }

  function replaceInstalled(name) {
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
      notice('Ссылка ' + name + ' обновлена. Перезапустите Lampa.');
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
    Lampa.Storage.set(UPDATE_BACKUP_KEY, null);
    notice('Предыдущая ссылка восстановлена. Перезапустите Lampa.');
    return true;
  }

  function updateInstalledAutomatically() {
    if (!Lampa.Storage || !Lampa.Storage.get(AUTO_KEY, false)) return;
    var count = 0;
    for (var name in LIVE_META) {
      if (Object.prototype.hasOwnProperty.call(LIVE_META,name) &&
          isUpdateAvailable(name) && replaceInstalled(name)) count++;
    }
    if (count) notice('Ссылки обновлены: ' + count + '. Нужен перезапуск Lampa.');
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
    var cards = first.querySelectorAll('.scroll__body > .selector');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].__alexGrid2000) continue;
      cards[i].__alexGrid2000 = true;
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
        controller.__alexGrid2000) return;
    var originalUp = controller.up;
    var originalDown = controller.down;
    controller.__alexGrid2000 = true;
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
      delete patch.value.__alexGrid2000;
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
    var css = document.getElementById('alexgood321-store-style-v200');
    if (!css) {
      css = document.createElement('style');
      css.id = 'alexgood321-store-style-v200';
      css.textContent = [
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item{background-color:var(--alex-category-fill)!important;color:#17212F!important;box-sizing:border-box;padding:1.1em 1em 1em;transition:background-color .18s ease,box-shadow .18s ease;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-author{padding-right:2.4em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;min-height:1.25em;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-name{padding-right:1.8em;line-height:1.25;margin-bottom:0.7em;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-descr{line-height:1.4;overflow-wrap:anywhere;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-included{display:none!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item.focus{background-image:linear-gradient(rgba(255,255,255,.11),rgba(255,255,255,.11))!important;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35);}',
        '.extensions.' + skinClass + ' .scroll--mask:not(.scroll--horizontal){-webkit-mask-image:none!important;mask-image:none!important;}',
        ".extensions.alexgood321-skin-v200 .alex-installed-grid .scroll--horizontal{overflow:visible!important;mask-image:none!important;-webkit-mask-image:none!important;}",
        ".extensions.alexgood321-skin-v200 .alex-installed-grid .scroll--horizontal>.scroll__content{width:100%!important;max-width:100%!important;box-sizing:border-box;}",
        ".extensions.alexgood321-skin-v200 .alex-installed-grid .scroll--horizontal>.scroll__content>.scroll__body{display:flex!important;flex-wrap:wrap!important;gap:1em!important;align-items:stretch!important;width:100%!important;-webkit-transform:none!important;transform:none!important;transition:none!important;}",
        ".extensions.alexgood321-skin-v200 .alex-installed-grid .scroll__body>.selector{flex:0 1 20em!important;max-width:100%!important;box-sizing:border-box;margin:0!important;}",
        "@media(max-width:640px){.extensions.alexgood321-skin-v200 .alex-installed-grid .scroll__body>.selector{flex:1 1 100%!important;width:100%!important;}}",
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
        '.extensions.' + skinClass + ' .alex-status-missing:before{content:"+";color:#344458;border:1px solid #50637A;background:rgba(255,255,255,.17);}'
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
  }

  function ready() {
    if (initialized) return;
    initialized = true;
    register();
    addMenu();
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
