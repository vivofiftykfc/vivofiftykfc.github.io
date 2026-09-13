(function () {
  'use strict';
  let configPromise, current = null, timer;
  const config = () => configPromise || (configPromise = fetch('/data/analytics-config.json').then(r => {
    if (!r.ok) throw Error('config unavailable'); return r.json();
  }).catch(e => { configPromise = null; throw e; }));
  async function request(path) {
    const cfg = await config();
    const server = String(cfg.commentsServer || '').replace(/\/$/, '');
    if (!server) throw Error('评论服务尚未配置');
    let token = ''; try { token = sessionStorage.getItem('hwnote-session:' + server) || ''; } catch {}
    if (!token) throw Object.assign(Error('请先在评论区使用站长 GitHub 账号登录'), {status:401});
    const res = await fetch(server + path, {cache:'no-store', signal:AbortSignal.timeout(8000), headers:{Authorization:'Bearer ' + token}});
    if (!res.ok) throw Object.assign(Error(res.status === 401 || res.status === 403 ? '没有站长访问权限' : '统计服务尚未就绪，请稍后重试'), {status:res.status});
    return res.json();
  }
  function update(user, notify = true) {
    // Analytics opt-out only: this cookie never grants access to private APIs.
    if(user){
      document.cookie='hwnote_owner_analytics=1; Path=/; Max-Age=3600; SameSite=Lax; Secure';
      let lifetime=3600;try{if(localStorage.getItem('hwnote-analytics-optout')==='1')lifetime=31536000;}catch{}
      document.cookie='hwnote_analytics_optout=1; Path=/; Max-Age='+lifetime+'; SameSite=Lax; Secure';
    }else if(current){
      document.cookie='hwnote_owner_analytics=; Path=/; Max-Age=0; SameSite=Lax; Secure';
      let explicit=false;try{explicit=localStorage.getItem('hwnote-analytics-optout')==='1';}catch{explicit=true;}
      if(!explicit)document.cookie='hwnote_analytics_optout=; Path=/; Max-Age=0; SameSite=Lax; Secure';
    }
    current = user;
    document.getElementById('hwnote-owner-nav')?.remove();
    if (user) {
      const list = document.querySelector('#navbarSupportedContent .navbar-nav');
      if (list) {
        const item = document.createElement('li'); item.id = 'hwnote-owner-nav'; item.className = 'nav-item';
        const a = document.createElement('a'); a.href = '/traffic/'; a.className = 'nav-link';
        a.textContent = document.documentElement.dataset.siteLanguage === 'en' ? 'Private traffic' : '私人统计';
        item.append(a); list.append(item);
      }
    }
    if (notify) document.dispatchEvent(new CustomEvent('hwnote:owner-state', {detail:{authorized:!!user}}));
  }
  let revision = 0;
  async function refresh() {
    const attempt = ++revision;
    try {
      const data = await request('/api/me');
      const user = data.user?.admin === true && data.user.id === 'github:152625025' ? data.user : null;
      if (attempt === revision) update(user);
      return user;
    } catch { if (attempt === revision) update(null); return null; }
  }
  window.HWOwner = { refresh, request };
  document.addEventListener('hwnote:session-changed', refresh);
  document.addEventListener('zhw:languageapplied', () => update(current, false));
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  function start() { refresh(); clearInterval(timer); timer = setInterval(refresh, 60000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
