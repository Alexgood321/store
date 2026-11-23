'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '../my_store_loader.js'), 'utf8');
const selectedSHA = 'a'.repeat(40);
const scripts = [];
const head = {
  appendChild(script) {
    script.parentNode = this;
    scripts.push(script);
  },
  removeChild(script) {
    if (script.parentNode === this) script.parentNode = null;
  }
};
const document = {
  head,
  createElement(tag) {
    assert.equal(tag, 'script');
    return {};
  }
};
const window = { appready: true };
const Lampa = {
  Storage: {
    get(key, fallback) {
      if (key === 'alexgood321_store_boot_checked_release_v1')
        return { sha: selectedSHA, version: '99.0.0' };
      return fallback;
    },
    set() {}
  },
  Reguest: function () {
    this.silent = (_url, _ok, fail) => fail('offline');
  },
  Noty: { show() {} }
};
vm.runInNewContext(code, { window, document, Lampa, console, Date, setTimeout, clearTimeout });
assert.equal(scripts.length, 1);
assert.match(scripts[0].src, /^https:\/\/cdn\.jsdelivr\.net\/gh\/Alexgood321\/store@a{40}\/my_store_runtime\.js/);
scripts[0].onerror();
assert.equal(scripts.length, 2);
assert.match(scripts[1].src, /^https:\/\/rawcdn\.githack\.com\/Alexgood321\/store\/a{40}\/my_store_runtime\.js/);
assert.equal(window.AlexgoodStoreBootstrap.version, '1.1.1');
scripts[1].onerror();
assert.equal(scripts.length, 3);
assert.ok(scripts[2].src.includes('cdn.jsdelivr.net'));
console.log('PASS My Store: MIME-safe fallback, SHA pinning and prior-build recovery');
