(function () {
  'use strict';

  // Независимый магазин плагинов Lampa. Исходный проект: lampaplugins/store.
  var CONFIG = {
    id: 'alexgood321_store',
    component: 'alexgood321_store',
    name: 'Alexgood321 Plugins',
    version: '1.3.1',
    catalog: 'https://cdn.jsdelivr.net/gh/Alexgood321/store@main/alex_extensions.json?v=20261104-4'
  };

  if (window.__alexgood321_store_loaded) return;
  window.__alexgood321_store_loaded = true;

  function storeTitle() {
    try {
      return Lampa.Lang.translate('alexgood321_store_title') || CONFIG.name;
    } catch (error) {
      return CONFIG.name;
    }
  }

  function registerTranslations() {
    if (!Lampa.Lang || typeof Lampa.Lang.add !== 'function') return;
    Lampa.Lang.add({
      alexgood321_store_title: {
        ru: 'Плагины Alexgood321',
        en: 'Alexgood321 Plugins',
        uk: 'Плагіни Alexgood321'
      }
    });
  }

  function registerManifest() {
    if (!Lampa.Manifest) return;
    Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
    Lampa.Manifest.plugins[CONFIG.id] = {
      type: 'other',
      name: CONFIG.name,
      version: CONFIG.version,
      description: 'Независимый каталог расширений Alexgood321 для Lampa'
    };
  }

  function addStoreMenu() {
    if (!Lampa.Settings || typeof Lampa.Settings.main !== 'function') return;
    var main = Lampa.Settings.main();
    if (!main || typeof main.render !== 'function') return;

    var body = main.render();
    if (!body || typeof body.find !== 'function') return;
    if (body.find('[data-component="' + CONFIG.component + '"]').length) return;

    var icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/>' +
      '<rect x="14" y="3" width="7" height="7" rx="1.5"/>' +
      '<rect x="3" y="14" width="7" height="7" rx="1.5"/>' +
      '<rect x="14" y="14" width="7" height="7" rx="1.5"/>' +
      '</svg>';

    var field = '<div class="settings-folder selector" data-component="' + CONFIG.component + '" data-static="true">' +
      '<div class="settings-folder__icon">' + icon + '</div>' +
      '<div class="settings-folder__name">' + storeTitle() + '</div>' +
      '</div>';

    var anchor = body.find('[data-component="more"]');
    if (anchor.length) anchor.after(field);
    else body.append(field);

    if (typeof main.update === 'function') main.update();
  }

  function openStore() {
    if (Lampa.Extensions && typeof Lampa.Extensions.show === 'function') {
      Lampa.Extensions.show({
        store: CONFIG.catalog,
        with_installed: true
      });
    } else {
      console.error('[Alexgood321 Store] Lampa.Extensions.show is unavailable');
    }
  }

  function bindSettingsEvents() {
    if (!Lampa.Settings || !Lampa.Settings.listener || typeof Lampa.Settings.listener.follow !== 'function') return;
    Lampa.Settings.listener.follow('open', function (event) {
      if (!event || event.name !== 'main' || !event.body || typeof event.body.find !== 'function') return;
      var item = event.body.find('[data-component="' + CONFIG.component + '"]');
      item.off('hover:enter.alexgood321_store');
      item.on('hover:enter.alexgood321_store', openStore);
    });
  }

  function ready() {
    registerTranslations();
    registerManifest();
    addStoreMenu();
    bindSettingsEvents();
  }

  function init() {
    if (typeof Lampa === 'undefined') return;
    if (window.appready) {
      ready();
    } else if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      Lampa.Listener.follow('app', function (event) {
        if (event && event.type === 'ready') ready();
      });
    }
    console.log('[Alexgood321 Store] v' + CONFIG.version);
  }

  init();
})();
