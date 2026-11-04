(function () {
  'use strict';

  // Персональный магазин Alexgood321. Не использует внешний extensions.json.
  var CONFIG = {
    id: 'alexgood321_personal_store',
    component: 'alexgood321_personal_store',
    version: '1.12.0',
    name: 'Мои плагины',
    catalog: 'https://cdn.jsdelivr.net/gh/Alexgood321/store@91a79b9b39498f5bbb6e728a4632c584f42df67c/my_extensions_v1_9.json'
  };

  if (window.__alexgood321_personal_store_1120_loaded) return;
  window.__alexgood321_personal_store_1120_loaded = true;

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
  var LINK_MAP = {"SURS Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@2c8e9d07ea5673b7fdd958eed1ea5e5637b48e3f/surs.js?v=3.7.2-sidfix","Home Categories Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@main/home_categories.js?v=2.0.0","NUM Series Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@main/num_series.js?v=1.3.0","HDREZKA":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-hdrezka@main/rezka.js?v=1.4.0","Продолжить просмотр":"https://arst113.github.io/lampa-watch-resume/watch_resume.js","Онлайн Мод":"https://nb557.github.io/plugins/online_mod.js","EasyTorrent":"https://darkestclouds.github.io/plugins/easytorrent/easytorrent.min.js","Torrent Styles":"https://cdn.jsdelivr.net/gh/Alexgood321/store@main/torrent_styles_v2.js?v=1.2.1","Приятные мелочи":"http://skaztv.online/js/tricks.js","TraktTV":"https://lampame.github.io/main/trakttv.js","Рейтинг КиноПоиск и IMDb":"https://nb557.github.io/plugins/rating.js","SURS (оригинальный, отключён)":"https://aviamovie.github.io/surs.js","Пиратские плагины (старый магазин)":"https://lampaplugins.github.io/store/store.js","Добавляет пункт \"Парсер\" в меню":"http://cub.red/plugin/etor","Скрытие элементов карточки":"http://skaz.tv/meta.js","Настройка шапки":"https://and7ey.github.io/lampa/head_filter.js"};
  var skinRoot = null, skinObserver = null, skinTimer = null;
  // The native installed row is a snapshot made when Extensions.show() opens.
  // Reopen the custom store after saving a catalog plugin to refresh that row.
  var nativePluginAdd = null;
  var installRefreshTimer = null;
  var reopenAfterInstall = false;
  var skinClass = 'alexgood321-skin-v112';

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

  function refreshSkin() {
    if (!skinRoot || !skinRoot.parentNode) return;
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
    var css = document.getElementById('alexgood321-store-style-v112');
    if (!css) {
      css = document.createElement('style');
      css.id = 'alexgood321-store-style-v112';
      css.textContent = [
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item{background-color:var(--alex-category-fill)!important;color:#17212F!important;box-sizing:border-box;padding:1.1em 1em 1em;transition:background-color .18s ease,box-shadow .18s ease;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-author{padding-right:2.4em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;min-height:1.25em;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-name{padding-right:1.8em;line-height:1.25;margin-bottom:0.7em;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-descr{line-height:1.4;overflow-wrap:anywhere;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item-included{display:none!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item.focus{background-image:linear-gradient(rgba(255,255,255,.11),rgba(255,255,255,.11))!important;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35);}',
        '.extensions.' + skinClass + ' .scroll--mask:not(.scroll--horizontal){-webkit-mask-image:none!important;mask-image:none!important;}',
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
      Lampa.Extensions.show({
        store: CONFIG.catalog,
        with_installed: true,
        onClose: onStoreClose
      });
      attachSkin();
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
