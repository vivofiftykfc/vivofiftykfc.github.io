(function () {
  'use strict';
  function excluded() {
    try { if (localStorage.getItem('umami.disabled') === '1') return true; } catch (_) {}
    return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  }
  if (excluded() || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;

  // Keep campaign attribution, discard unrelated query strings and fragments.
  window.zhwAnalyticsBeforeSend = function (type, payload) {
    if (excluded()) return false;
    if (payload.url) {
      var url = new URL(payload.url, location.origin);
      var query = new URLSearchParams();
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
        if (url.searchParams.has(key)) query.set(key, url.searchParams.get(key).slice(0, 160));
      });
      payload.url = url.pathname + (query.size ? '?' + query.toString() : '');
    }
    if (payload.referrer) {
      try { payload.referrer = new URL(payload.referrer).origin; } catch (_) { payload.referrer = ''; }
    }
    return payload;
  };
  fetch('/data/analytics-config.json').then(function (r) {
    if (!r.ok) throw new Error('config');
    return r.json();
  }).then(function (config) {
    if (!config.enabled || config.hostname !== location.hostname || excluded()) return;
    if (document.querySelector('script[data-website-id]')) return;
    var script = document.createElement('script');
    script.defer = true;
    script.src = config.scriptUrl;
    script.setAttribute('data-website-id', config.websiteId);
    script.setAttribute('data-domains', config.hostname);
    script.setAttribute('data-do-not-track', 'true');
    script.setAttribute('data-exclude-hash', 'true');
    script.setAttribute('data-before-send', 'zhwAnalyticsBeforeSend');
    document.head.appendChild(script);
  }).catch(function () { /* Analytics must never interrupt reading. */ });
})();
