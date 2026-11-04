(function (window, document) {
  'use strict';

  // My Store bootstrap: install this fixed URL once. This file is intentionally
  // independent of the changing store runtime and never clears Lampa storage.
  if (window.__alexgood_store_bootstrap_loaded) return;
  window.__alexgood_store_bootstrap_loaded = true;

  var REPO = 'Alexgood321/store';
  var RUNTIME_PATH = 'my_store_runtime.js';
  var INITIAL_SHA = '207a8689835759ce145ebb62e9b8d37f62a818f0';
  var LAST_GOOD_KEY = 'alexgood321_store_boot_last_good_v1';
  var PRIOR_GOOD_KEY = 'alexgood321_store_boot_prior_good_v1';
  var state = {loader_version:'1.0.0',status:'starting',sha:'',version:'',
    source:'',checked_at:0,last_error:''};
  var active = null;
  var attemptID = 0;
  var completed = false;

  function isSHA(value) {
    return typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
  }

  function storageGet(key) {
    try {
      return typeof Lampa !== 'undefined' && Lampa.Storage &&
        typeof Lampa.Storage.get === 'function' ? Lampa.Storage.get(key, null) : null;
    } catch (error) {return null;}
  }

  function storageSet(key, value) {
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Storage &&
          typeof Lampa.Storage.set === 'function') Lampa.Storage.set(key, value);
    } catch (error) {console.warn('[My Store bootstrap] Saving state failed:', error);}
  }

  function notify(message) {
    if (typeof Lampa !== 'undefined' && Lampa.Noty &&
        typeof Lampa.Noty.show === 'function') Lampa.Noty.show(message);
    else console.log('[My Store bootstrap] ' + message);
  }

  function requestJSON(url, onSuccess, onFailure) {
    var finished = false;
    function ok(body) {
      if (finished) return;
      finished = true;
      try {onSuccess(typeof body === 'string' ? JSON.parse(body) : body);}
      catch (error) {onFailure(error);}
    }
    function fail(error) {
      if (finished) return;
      finished = true;
      onFailure(error);
    }
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Reguest) {
        var request = new Lampa.Reguest();
        request.silent(url, ok, fail, false, {timeout:9000});
      } else if (typeof XMLHttpRequest !== 'undefined') {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 9000;
        xhr.onreadystatechange = function () {
          if (xhr.readyState !== 4) return;
          if (xhr.status >= 200 && xhr.status < 300) ok(xhr.responseText);
          else fail('HTTP ' + xhr.status);
        };
        xhr.onerror = function () {fail('Network error');};
        xhr.ontimeout = function () {fail('Request timeout');};
        xhr.send();
      } else fail('No available JSON transport');
    } catch (error) {fail(error);}
  }

  function latestCommit(done) {
    state.checked_at = Date.now();
    var url = 'https://api.github.com/repos/' + REPO +
      '/commits?sha=main&path=' + encodeURIComponent(RUNTIME_PATH) +
      '&per_page=1&_v=' + Date.now();
    requestJSON(url, function (body) {
      var sha = body && body[0] && body[0].sha;
      if (isSHA(sha)) return done({sha:sha.toLowerCase(),source:'github-api'});
      manifestFallback(done);
    }, function () {manifestFallback(done);});
  }

  function manifestFallback(done) {
    var url = 'https://raw.githubusercontent.com/' + REPO +
      '/main/my_store_release.json?_v=' + Date.now();
    requestJSON(url, function (data) {
      var entry = data && data.runtime;
      if (entry && entry.path === RUNTIME_PATH && isSHA(entry.sha)) {
        done({sha:entry.sha.toLowerCase(),source:'release-manifest',
          version:entry.version || ''});
      } else done(null);
    }, function () {done(null);});
  }

  function listCandidates(primary) {
    var result = [];
    function add(sha,source) {
      if (!isSHA(sha)) return;
      sha = sha.toLowerCase();
      if (!result.some(function (entry) {return entry.sha === sha;}))
        result.push({sha:sha,source:source});
    }
    if (primary) add(primary.sha,primary.source);
    var stored = storageGet(LAST_GOOD_KEY);
    if (stored && stored.sha) add(stored.sha,'last-good');
    var prior = storageGet(PRIOR_GOOD_KEY);
    if (prior && prior.sha) add(prior.sha,'previous-good');
    add(INITIAL_SHA,'built-in-fallback');
    return result;
  }

  function finishSuccess(runtime) {
    if (completed || !active || runtime.sha !== active.sha ||
        runtime.ready !== true) return;
    completed = true;
    state.status = 'ready';
    state.sha = runtime.sha;
    state.version = runtime.version || '';
    state.source = active.source;
    state.last_error = '';
    var previous = storageGet(LAST_GOOD_KEY);
    if (previous && isSHA(previous.sha) && previous.sha !== runtime.sha)
      storageSet(PRIOR_GOOD_KEY, previous);
    storageSet(LAST_GOOD_KEY, {sha:runtime.sha,version:runtime.version,
      initialized_at:Date.now()});
    console.log('[My Store bootstrap] Runtime ready ' + state.version +
      ' (' + runtime.sha.slice(0,12) + ') via ' + active.source);
  }

  window.__AlexgoodStoreBootReady = finishSuccess;

  function runtimeURL(sha, alternative) {
    return alternative ?
      'https://raw.githubusercontent.com/' + REPO + '/' + sha +
        '/' + RUNTIME_PATH + '?build=' + sha.slice(0,12) :
      'https://cdn.jsdelivr.net/gh/' + REPO + '@' + sha +
        '/' + RUNTIME_PATH + '?build=' + sha.slice(0,12);
  }

  function loadCandidate(candidates, position, alternative) {
    if (completed) return;
    if (position >= candidates.length) {
      state.status = 'error';
      state.last_error = 'Failed to start latest and backup runtime builds';
      notify('My Store: не удалось загрузить ядро. Настройки Lampa не изменены.');
      return;
    }
    var candidate = candidates[position];
    var run = ++attemptID;
    active = {sha:candidate.sha,source:candidate.source};
    state.status = 'loading';
    window.__AlexgoodStoreBootCandidate = {sha:candidate.sha};
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = runtimeURL(candidate.sha,alternative);
    var processed = false;

    function nextCandidate(reason) {
      if (processed || completed || run !== attemptID) return;
      processed = true;
      state.last_error = String(reason || 'unknown loading error');
      try {if (script.parentNode) script.parentNode.removeChild(script);}
      catch (ignore) {}
      if (!alternative) loadCandidate(candidates,position,true);
      else {
        // A failed runtime must not block the previous known-good build.
        if (!window.__AlexgoodStoreRuntime || !window.__AlexgoodStoreRuntime.ready) {
          window.__alexgood321_personal_store_runtime_loaded = false;
          window.__AlexgoodStoreRuntime = null;
        }
        loadCandidate(candidates,position+1,false);
      }
    }

    script.onerror = function () {nextCandidate('Cannot download ' + script.src);};
    script.onload = function () {
      if (completed || processed || run !== attemptID) return;
      var runtime = window.__AlexgoodStoreRuntime;
      if (!runtime || !runtime.version || runtime.sha !== candidate.sha) {
        nextCandidate('Runtime did not report its expected build');
        return;
      }
      if (runtime.ready) return finishSuccess(runtime);
      // Lampa may still be starting up. The runtime will acknowledge readiness
      // through __AlexgoodStoreBootReady after it registers with Lampa.
      var elapsed = 0;
      function checkReady() {
        if (completed || processed || run !== attemptID) return;
        var current = window.__AlexgoodStoreRuntime;
        if (current && current.ready && current.sha === candidate.sha) {
          finishSuccess(current);
          return;
        }
        if (!window.appready || elapsed < 15000) {
          if (window.appready) elapsed += 500;
          setTimeout(checkReady, 500);
        } else nextCandidate('Runtime was evaluated but did not initialize');
      }
      setTimeout(checkReady, 500);
    };
    var target = document.head || document.body;
    if (!target || typeof target.appendChild !== 'function') {
      nextCandidate('No script insertion target');
      return;
    }
    try {target.appendChild(script);}
    catch (error) {nextCandidate(error);}
  }

  function startup() {
    if (!document || typeof document.createElement !== 'function') {
      state.status = 'error'; state.last_error = 'No DOM';
      return;
    }
    state.status = 'checking';
    latestCommit(function (latest) {
      if (completed) return;
      var candidates = listCandidates(latest);
      loadCandidate(candidates,0,false);
    });
  }

  window.AlexgoodStoreBootstrap = {
    version: state.loader_version,
    state: state,
    check: function (showNotice) {
      latestCommit(function (latest) {
        if (!showNotice) return;
        if (!latest) {
          notify('My Store: GitHub недоступен, используется последняя проверенная сборка.');
        } else if (state.status === 'ready' && latest.sha === state.sha) {
          notify('My Store ' + state.version + ': установлена последняя сборка.');
        } else {
          notify('Доступна новая сборка My Store (' + latest.sha.slice(0,12) +
            '). Для её загрузки перезапустите Lampa.');
        }
      });
    }
  };

  startup();
})(window, document);
