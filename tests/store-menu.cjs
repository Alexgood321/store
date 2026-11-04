'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'my_store_runtime.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'live_catalog.json'), 'utf8'));
const marker = runtime.lastIndexOf('})();');
assert.ok(marker > 0, 'runtime IIFE must exist');

const injected = runtime.slice(0, marker) +
  'window.__menuQA = { addMenu:addMenu, renderStoreTools:renderStoreTools, ' +
  'setGrid:function(grid){installedGrid=grid;} };' +
  runtime.slice(marker);

const visible = {
  alexgood321_personal_store: true,
  alexgood321_store_updates: true,
  alexgood321_store_device: true,
  more: true
};
const notices = [];
const modals = [];
const requests = [];
let settingsUpdates = 0;
const menu = {
  find(selector) {
    const match = selector.match(/data-component="([^"]+)"/);
    const name = match && match[1];
    return {
      length: visible[name] ? 1 : 0,
      remove() { visible[name] = false; },
      after(html) {
        const found = html.match(/data-component="([^"]+)"/);
        if (found) visible[found[1]] = true;
      },
      off() { return this; },
      on() { return this; }
    };
  },
  append(html) {
    const found = html.match(/data-component="([^"]+)"/);
    if (found) visible[found[1]] = true;
  }
};

const Lampa = {
  Settings: { main: () => ({
    render: () => menu,
    update() { settingsUpdates++; }
  }) },
  Lang: { add() {}, translate() { return 'Мои плагины'; } },
  Plugins: { get: () => [], loaded: () => [], save() {} },
  Storage: { get: (key, fallback) => fallback, set() {} },
  Reguest: function () {
    this.silent = function (url, resolve, reject) {
      requests.push(url);
      if (url.includes('live_catalog.json')) return resolve(catalog);
      if (url.includes('/commits?')) {
        const entry = Object.entries(catalog.meta.tracked).find(([name, meta]) =>
          meta.owned && url.includes(meta.repo) &&
          url.includes(encodeURIComponent(meta.path)));
        if (!entry) return reject('Unknown repository');
        return resolve([{sha:entry[1].sha, commit: {
          committer: {date:entry[1].published_at}
        }}]);
      }
      reject('Unexpected network URL');
    };
  },
  Select: { show(args) { modals.push(args); } },
  Noty: { show(message) { notices.push(message); } },
  Extensions: { show() {}, render() { return null; } },
  Listener: { follow() {} },
  Manifest: { plugins: {} }
};

class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.listeners = {};
    this.className = '';
    this.innerHTML = '';
  }
  setAttribute(key, val) { this.attributes[key] = val; }
  addEventListener(name, cb) { this.listeners[name] = cb; }
  insertBefore(child, anchor) {
    const position = anchor ? this.children.indexOf(anchor) : -1;
    this.children.splice(position < 0 ? this.children.length : position, 0, child);
    child.parentNode = this;
  }
  appendChild(child) { this.insertBefore(child, null); }
  querySelector(selector) {
    if (selector === '[data-alex-store-tool]')
      return this.children.find(x => x.attributes['data-alex-store-tool']) || null;
    if (selector === '.extensions__block-add')
      return this.children.find(x => x.className.includes('extensions__block-add')) || null;
    return null;
  }
}

const w = {appready: false};
vm.runInNewContext(injected, {
  window: w, Lampa,
  document: {createElement: name => new Element(name)},
  console, setTimeout: () => 1, clearTimeout() {}
}, {filename: 'my_store_runtime.js'});

w.__menuQA.addMenu();
w.__menuQA.addMenu();
assert.equal(visible.alexgood321_personal_store, true);
assert.equal(visible.alexgood321_store_updates, false);
assert.equal(visible.alexgood321_store_device, false);
assert.equal(settingsUpdates, 1);

const list = new Element('div');
const add = new Element('div');
add.className = 'extensions__block-add selector';
list.appendChild(add);
w.__menuQA.setGrid({querySelector: selector => (
  selector === '.scroll__body' ? list : null
)});
w.__menuQA.renderStoreTools();
w.__menuQA.renderStoreTools();

const actions = list.children.filter(x => x.attributes['data-alex-store-tool']);
assert.equal(actions.length, 2, 'tools must be rendered only once');
assert.deepEqual(actions.map(x => x.attributes['data-alex-store-tool']),
  ['check', 'manage']);
assert.ok(actions.every(x => x.className.includes('selector') &&
  typeof x.listeners['hover:enter'] === 'function' &&
  typeof x.listeners.click === 'function'));

actions[0].listeners['hover:enter']();
assert.equal(modals.length, 0, 'quick check must not open update popup');
assert.equal(notices[0], 'Проверено. Новых версий не найдено.');
assert.ok(requests.filter(x => x.includes('/commits?')).length >= 4);

actions[1].listeners['hover:enter']();
assert.match(modals[0].title, /Обновления плагинов/);
assert.ok(modals[0].items.some(x => x.action === 'rollback'));
assert.ok(modals[0].items.some(x => x.action === 'device'));
assert.ok(modals[0].items.some(x => x.action === 'reload'));

console.log('PASS My Store: single settings entry, two focusable in-store actions, fast check, full management menu');
