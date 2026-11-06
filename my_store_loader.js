(function (window, document) {
  'use strict';

  // My Store bootstrap: install this fixed URL once. This file is intentionally
  // independent of the changing store runtime and never clears Lampa storage.
  if (window.__alexgood_store_bootstrap_loaded) return;
  window.__alexgood_store_bootstrap_loaded = true;

  var REPO = 'Alexgood321/store';
  var RUNTIME_PATH = 'my_store_runtime.js';
  var INITIAL_SHA = '2301bef4065000cf4cb71ab2502fcc4e368091e3';
  var LAST_GOOD_KEY = 'alexgood321_store_boot_last_good_v1';
  var PRIOR_GOOD_KEY = 'alexgood321_store_boot_prior_good_v1';
  var NEXT_RELEASE_KEY = 'alexgood321_store_boot_checked_release_v1';
  var state = {loader_version:'1.1.0',status:'starting',sha:'',version:'',
    source:'',checked_at:0,last_error:'',catalog_fresh:false,catalog_checked_at:'',
    available_sha:'',available_version:'',
    metrics:{started_at:Date.now(),catalog_ms:0,runtime_ms:0,boot_ms:0,fallback_attempts:0}};
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
    var catalogStart = Date.now();
    // This is a plain JSON fetch, not an unauthenticated GitHub REST call.
    // All devices share the same server-generated version catalog.
    var url = 'https://raw.githubusercontent.com/' + REPO +
      '/main/live_catalog.json?_v=' + Date.now();
    requestJSON(url, function (body) {
      state.metrics.catalog_ms = Date.now() - catalogStart;
      var meta = body && body.meta;
      var entry = meta && meta.tracked && meta.tracked['My Store'];
      var sha = entry && entry.sha;
      if (entry && entry.path === RUNTIME_PATH && isSHA(sha)) {
        // Reuse the verified JSON in runtime: no second request at startup.
        window.__AlexgoodStoreCatalogSnapshot = {
          data:body, url:url, received_at:Date.now()
        };
        var checked = Date.parse(meta.last_checked_at || '');
        var fresh = isFinite(checked) && checked > 0 &&
          Date.now() >= checked && Date.now() - checked <= 2 * 60 * 60 * 1000;
        // Keep working when Actions is delayed, but distinguish freshness.
        state.catalog_fresh = fresh;
        state.catalog_checked_at = meta.last_checked_at || '';
        return done({sha:sha.toLowerCase(),source:fresh?'central-catalog':'stale-catalog',
          version:entry.version || ''});
      }
      manifestFallback(done);
    }, function () {state.metrics.catalog_ms = Date.now() - catalogStart; manifestFallback(done);});
  }

  function manifestFallback(done) {
    var url = 'https://raw.githubusercontent.com/' + REPO +
      '/main/my_store_release.json?_v=' + Date.now();
    requestJSON(url, function (data) {
      var entry = data && data.runtime;
      if (entry && entry.path === RUNTIME_PATH && isSHA(entry.sha)) {
        state.catalog_fresh = false;
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
    state.metrics.runtime_ms = Date.now() - (state.metrics.runtime_started_at || Date.now());
    state.metrics.boot_ms = Date.now() - state.metrics.started_at;
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
    state.metrics.runtime_started_at = Date.now();
    if (alternative || position > 0) state.metrics.fallback_attempts++;
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
    var latestCached = storageGet(NEXT_RELEASE_KEY);
    var lastGood = storageGet(LAST_GOOD_KEY);
    var primary = null;
    // A previously confirmed release is tried before last-good, with a
    // fallback to the last successfully initialized build.
    if (latestCached && isSHA(latestCached.sha) &&
        (!lastGood || !lastGood.version || !latestCached.version ||
         !/^\d+(?:\.\d+){1,3}$/.test(String(lastGood.version)) ||
         !/^\d+(?:\.\d+){1,3}$/.test(String(latestCached.version)) ||
         compareVersions(latestCached.version,lastGood.version) >= 0))
      primary = {sha:latestCached.sha,source:'cached-verified-catalog',
        version:latestCached.version || ''};
    else if (lastGood && isSHA(lastGood.sha))
      primary = {sha:lastGood.sha,source:'cached-last-good',
        version:lastGood.version || ''};

    function rememberLatest(latest) {
      if (!latest || !isSHA(latest.sha)) return;
      // A cached newer version is applied on next app launch, never injected
      // over a currently executing store runtime.
      var runtime = window.__AlexgoodStoreRuntime;
      var current = runtime && runtime.ready ? runtime : storageGet(LAST_GOOD_KEY);
      if (current && current.version && latest.version &&
          compareVersions(latest.version,current.version) < 0) return;
      storageSet(NEXT_RELEASE_KEY,{sha:latest.sha,version:latest.version});
      state.available_sha = latest.sha;
      state.available_version = latest.version || '';
    }

    if (primary) {
      loadCandidate(listCandidates(primary),0,false);
      latestCommit(function (latest) { rememberLatest(latest); });
    } else {
      latestCommit(function (latest) {
        rememberLatest(latest);
        if (!completed) loadCandidate(listCandidates(latest),0,false);
      });
    }
  }

  function compareVersions(a,b) {
    var aa=String(a || '').split('.'), bb=String(b || '').split('.');
    for (var i=0;i<4;i++) {
      var left=Number(aa[i] || 0), right=Number(bb[i] || 0);
      if (left > right) return 1;
      if (left < right) return -1;
    }
    return 0;
  }

  window.AlexgoodStoreBootstrap = {
    version: state.loader_version,
    state: state,
    check: function (showNotice) {
      latestCommit(function (latest) {
        if (!showNotice) return;
        if (!latest) {
          notify('My Store: общий каталог недоступен, используется резервная сборка.');
        } else if (state.status === 'ready' && latest.sha === state.sha) {
          notify(state.catalog_fresh ?
            'My Store ' + state.version + ': актуальная версия подтверждена каталогом.' :
            'My Store ' + state.version + ': версия совпадает, но каталог устарел.');
        } else {
          notify('Доступна новая сборка My Store (' + latest.sha.slice(0,12) +
            '). Для её загрузки перезапустите Lampa.');
        }
      });
    }
  };

  startup();
})(window, document);
