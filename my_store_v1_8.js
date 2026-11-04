(function () {
  'use strict';

  // Персональный магазин Alexgood321. Не использует внешний extensions.json.
  var CONFIG = {
    id: 'alexgood321_personal_store',
    component: 'alexgood321_personal_store',
    version: '1.8.0',
    name: 'Мои плагины',
    catalog: 'https://cdn.jsdelivr.net/gh/Alexgood321/store@cd94936db3f0b7b93f3a0c9670ce735948cd23f5/my_extensions_v1_7.json'
  };

  if (window.__alexgood321_personal_store_180_loaded) return;
  window.__alexgood321_personal_store_180_loaded = true;

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
  var COLOR_MAP = {"Мои":"#91A8EA","Главный экран":"#98C6AE","Сериалы":"#B7A6DB","Онлайн-просмотр":"#93BCD8","Торренты":"#D5BA8C","Интерфейс":"#D9ACC1","Рейтинги и сервисы":"#A7C6C8","Архив и служебные":"#92959D"};
  var LINK_MAP = {"SURS Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@2c8e9d07ea5673b7fdd958eed1ea5e5637b48e3f/surs.js?v=3.7.2-sidfix","Home Categories Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@main/home_categories.js?v=2.0.0","NUM Series Pro":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@main/num_series.js?v=1.3.0","HDREZKA":"https://cdn.jsdelivr.net/gh/Alexgood321/lampa-hdrezka@main/rezka.js?v=1.4.0","Продолжить просмотр":"https://arst113.github.io/lampa-watch-resume/watch_resume.js","Онлайн Мод":"https://nb557.github.io/plugins/online_mod.js","EasyTorrent":"https://darkestclouds.github.io/plugins/easytorrent/easytorrent.min.js","Torrent Styles":"https://cdn.jsdelivr.net/gh/Alexgood321/store@main/torrent_styles_v2.js?v=1.2.1","Приятные мелочи":"http://skaztv.online/js/tricks.js","TraktTV":"https://lampame.github.io/main/trakttv.js","Рейтинг КиноПоиск и IMDb":"https://nb557.github.io/plugins/rating.js","SURS (оригинальный, отключён)":"https://aviamovie.github.io/surs.js","Пиратские плагины (старый магазин)":"https://lampaplugins.github.io/store/store.js"};
  var skinRoot = null, skinObserver = null, skinTimer = null;
  var skinClass = 'alexgood321-skin-v18';

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

  function queueSkin() {
    if (skinTimer !== null) clearTimeout(skinTimer);
    skinTimer = setTimeout(function () { skinTimer = null; refreshSkin(); }, 80);
  }

  function releaseSkin() {
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
    var css = document.getElementById('alexgood321-store-style-v18');
    if (!css) {
      css = document.createElement('style');
      css.id = 'alexgood321-store-style-v18';
      css.textContent = [
        '.extensions.' + skinClass + ' .extensions__item{background:#393B40;}',
        '.extensions.' + skinClass + ' .extensions__item-name{padding-right:1.8em;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__block-title{border-left:0.23em solid transparent;padding-left:0.65em;line-height:1.35;}',
        '.extensions.' + skinClass + ' .extensions__item-included:not(.hide){background:#719FE6!important;}',
        '.extensions.' + skinClass + ' .extensions__item-disabled:not(.hide){color:#E6BA75!important;}',
        '.extensions.' + skinClass + ' .alex-colored-category .extensions__item:before{position:absolute;right:0.7em;top:0.7em;width:1.5em;height:1.5em;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:0.85em;pointer-events:none;}',
        '.extensions.' + skinClass + ' .alex-status-installed:before{content:"✓";color:#fff;background:#719FE6;}',
        '.extensions.' + skinClass + ' .alex-status-disabled:before{content:"–";color:#E6BA75;background:rgba(230,186,117,.13);border:1px solid #9B815D;}',
        '.extensions.' + skinClass + ' .alex-status-missing:before{content:"+";color:#95A0B0;border:1px solid #67717E;background:rgba(120,130,145,.08);}'
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
        onClose: releaseSkin
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
