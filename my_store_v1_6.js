(function () {
  'use strict';

  // Персональный магазин Alexgood321. Не использует внешний extensions.json.
  var CONFIG = {
    id: 'alexgood321_personal_store',
    component: 'alexgood321_personal_store',
    version: '1.6.0',
    name: 'Мои плагины',
    catalog: 'https://cdn.jsdelivr.net/gh/Alexgood321/store@a8dc03887bf30a48b294ea7c84c7d2a85f8392dc/my_extensions_v1_6.json'
  };

  if (window.__alexgood321_personal_store_160_loaded) return;
  window.__alexgood321_personal_store_160_loaded = true;

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

  function openStore() {
    if (Lampa.Extensions && typeof Lampa.Extensions.show === 'function') {
      Lampa.Extensions.show({
        store: CONFIG.catalog,
        with_installed: true
      });
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
