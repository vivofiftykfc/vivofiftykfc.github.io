/* One browser session for comments and owner tools on this site origin. */
(() => {
  'use strict';
  const memory = new Map();
  const normalize = server => new URL(server).origin;
  const key = server => 'hwnote-session:' + normalize(server);
  const valid = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
  function get(server) {
    const storageKey = key(server);
    let shared;
    try { shared = localStorage.getItem(storageKey); } catch {}
    if (shared !== undefined && shared !== null) {
      try { sessionStorage.removeItem(storageKey); } catch {}
      return valid(shared) ? shared : '';
    }
    let legacy = '';
    try { legacy = sessionStorage.getItem(storageKey) || ''; } catch {}
    const token = valid(legacy) ? legacy : memory.get(storageKey) || '';
    if (token) {
      memory.set(storageKey, token);
      try { localStorage.setItem(storageKey, token); sessionStorage.removeItem(storageKey); } catch {}
    }
    return token;
  }
  function set(server, token) {
    if (token !== '' && !valid(token)) throw Error('Invalid comment session');
    server = normalize(server);
    const storageKey = key(server);
    memory.set(storageKey, token);
    // An empty value prevents old tab-local sessions from being migrated again.
    try { localStorage.setItem(storageKey, token); sessionStorage.removeItem(storageKey); }
    catch { try { sessionStorage.setItem(storageKey, token); } catch {} }
    document.dispatchEvent(new CustomEvent('hwnote:session-changed', {detail:{server}}));
  }
  function clear(server, expected) {
    if (expected !== undefined && get(server) !== expected) return;
    set(server, '');
  }
  window.addEventListener('storage', event => {
    if (event.storageArea !== localStorage || (event.key !== null && !event.key.startsWith('hwnote-session:'))) return;
    if (event.key === null) memory.clear();
    else memory.delete(event.key);
    document.dispatchEvent(new CustomEvent('hwnote:session-changed'));
  });
  window.HWCommentSession = {get, set, clear};
})();
