(function () {
  'use strict';
  const root = document.getElementById('traffic-dashboard');
  if (!root) return;
  let country = '', scope = 'pages', days = 30, data = null, sequence = 0;
  const t = (zh, en) => document.documentElement.dataset.siteLanguage === 'en' ? en : zh;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = value => Number(value || 0).toLocaleString();
  const types = {
    ai_claimed: ['自报 AI 爬虫','Self-declared AI crawler','#a58ade'],
    bot_verified: ['已验证机器人','Verified bot','#67c5c0'],
    automation_suspected: ['疑似自动化','Suspected automation','#f4b66a'],
    browser_likely: ['浏览器标识（身份未确认）','Browser UA (identity unverified)','#729ff3'],
    unknown: ['未知','Unknown','#aab4c5']
  };
  const typeName = key => types[key] ? t(types[key][0],types[key][1]) : t('未知','Unknown');
  const locationName = row => [row.country, row.region, row.city].filter(Boolean).join(' / ') || t('未知地区','Unknown location');
  function lock(message) {
    data = null;
    root.innerHTML = '<div class="ta-locked"><span class="ta-eyebrow">PRIVATE / OWNER ONLY</span><h2>' + t('此页面仅供站长查看','Owner access only') + '</h2><p>' + escape(message || t('请先在评论区使用你的 GitHub 账号登录。验证成功后，导航栏和评论区才会出现私人统计入口。','Sign in to the comments with the owner GitHub account. The private link appears after verification.')) + '</p><a href="/about/#hwnote-comments">' + t('前往评论区','Go to comments') + '</a></div>';
  }
  function table(headers, rows) {
    if (!rows.length) return '<p class="ta-empty">' + t('暂无记录','No records') + '</p>';
    return '<div class="ta-scroll"><table><thead><tr>' + headers.map(x=>'<th>'+escape(x)+'</th>').join('') + '</tr></thead><tbody>' + rows.map(row=>'<tr>'+row.map(x=>'<td>'+escape(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  function card(kicker, title, body, cls='') {
    return '<section class="ta-card '+cls+'"><span class="ta-eyebrow">'+escape(kicker)+'</span><h3>'+escape(title)+'</h3>'+body+'</section>';
  }
  function audienceView(){
    const a=data.audience;if(!a)return card('READING',t('阅读统计暂不可用','Reading analytics unavailable'),'<p>'+t('请稍后刷新；请求日志不能替代阅读数据。','Refresh later; request logs cannot replace reading data.')+'</p>');
    const m=a.summary,q=a.quality,rate=m.sessions?(m.engaged_sessions/m.sessions*100).toFixed(1)+'%':'—';
    return card('READING / BROWSER EVENTS',t('阅读概览','Reading overview'),'<label>'+t('阅读地区筛选','Reading country filter')+' <select id="reading-country"><option value="">'+t('全部','All')+'</option>'+[...new Set([country,...a.countries.map(r=>r.country)].filter(Boolean))].map(c=>'<option value="'+escape(c)+'"'+(c===country?' selected':'')+'>'+escape(c)+'</option>').join('')+'</select></label><p class="ta-muted">'+t('统计执行了页面脚本、且没有命中当前机器人规则的会话。此处不是确定真人数，也不能与下方请求量相加。','Browser events after current bot rules. These are not verified people; do not add these counts to server requests.')+'</p><div class="ta-metrics">'+[[t('页面打开','Pageviews'),n(m.pageviews)],[t('浏览会话','Sessions'),n(m.sessions)],[t('参与率','Engagement rate'),rate],[t('每会话可见停留','Visible seconds/session'),m.sessions?Math.round(m.active_seconds/m.sessions)+' s':'—']].map(([k,v])=>'<div class="ta-card"><span>'+k+'</span><strong>'+v+'</strong></div>').join('')+
    '<p class="ta-notice">'+t('数据质量：收到页面事件 ','Data quality: page events ')+n(q.total)+t('，规则或地区筛选排除 ','; rules/country filtered ')+n(q.excluded)+t('。浏览器采集开始：','; first event: ')+escape(q.first_seen?new Date(q.first_seen).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):t('等待首条浏览器事件','Awaiting browser events'))+'</p><p class="ta-muted">'+t('参与会话：可见停留达到 10 秒、打开至少 2 页，或发生点击。会话按标签页计，30 分钟无活动后重建；脚本被拦截、退出时上报失败都可能漏记。','Engagement: 10 visible seconds, 2 pages, or a click. Sessions are per tab with 30-minute inactivity expiry. Blocked scripts and failed exit reports cause undercounting.')+'</p>')+
    '<div class="ta-layout"><div>'+card('CONTENT / ENGAGEMENT',t('内容表现','Content performance'),table([t('页面','Page'),t('打开','Views'),t('会话','Sessions'),t('平均可见秒数','Visible seconds'),t('平均滚动深度','Scroll %')],a.pages.map(r=>[r.path,r.pageviews,r.sessions,r.active_seconds,r.scroll+'%']))+'<button id="reading-export">'+t('导出内容 CSV','Export content CSV')+'</button>')+card('ACQUISITION / FIRST TOUCH',t('会话入口来源','Session acquisition'),table([t('来源','Source'),'Medium','Campaign',t('会话','Sessions')],a.sources.map(r=>[r.source||t('直接／未知','Direct / unknown'),r.medium||'—',r.campaign||'—',r.sessions])))+'</div><aside>'+card('AUDIENCE / NETWORK EXIT',t('会话出口地区','Session network locations'),table([t('国家代码','Country'),t('会话','Sessions')],a.countries.map(r=>[r.country||'—',r.sessions]))+'<p class="ta-muted">'+t('代理出口不是实际住址；机房 IP 本身不构成封禁依据。','Proxy exits are not home locations; data center IPs alone are not a reason to block.')+'</p>')+'</aside></div>';
  }
  function extended() {
    const rows = key => data[key] || [];
    const simple = (key, field, zh, en) => card(key.toUpperCase(),t(zh,en),table([t('类型','Type'),t('请求','Requests')],rows(key).map(r=>[r[field],n(r.count)])));
    const peak=Math.max(1,...rows('activity').map(r=>r.count));
    const cells=Array.from({length:7},(_,day)=>'<div class="ta-hours"><span>'+['日','一','二','三','四','五','六'][day]+'</span>'+Array.from({length:24},(_,hour)=>{const count=rows('activity').find(r=>Number(r.weekday)===day&&Number(r.hour)===hour)?.count||0;return '<i style="opacity:'+(0.12+0.88*count/peak)+'" title="'+day+' / '+hour+':00 · '+count+'" aria-label="'+day+' / '+hour+':00 · '+count+'"></i>';}).join('')+'</div>').join('');
    return '<div class="ta-metrics">'+[[t('今日请求','Today requests'),data.today?.requests],[t('今日独立 IP','Today IPs'),data.today?.ips],[t('活跃天数','Active days'),data.summary.activeDays],[t('单日峰值','Daily peak'),data.summary.peak]].map(([label,value])=>'<div class="ta-card"><span>'+label+'</span><strong>'+(value==null?'—':n(value))+'</strong></div>').join('')+'</div>'+
      card('NETWORK / ASN',t('来自哪些网络','Origin networks'),table(['ASN',t('运营商／网络组织','Network organization'),t('请求','Requests')],rows('networks').map(r=>[r.asn?'AS'+r.asn:'—',r.organization||t('未知','Unknown'),n(r.count)]))+'<p class="ta-muted">'+t('网络组织可能是运营商或云服务商，无法据此确定具体服务器、租户或访问者身份。','A network organization may be an ISP or cloud provider; it does not identify a particular server, tenant or visitor.')+'</p>')+
      card('ACTIVITY / BEIJING',t('访客活跃时间','Visitor activity'),'<p class="ta-muted">00:00 → 23:00 · '+t('北京时间','Beijing time')+'</p>'+cells)+
      '<div class="ta-triple">'+simple('devices','device','设备（UA 推测）','Devices (UA hints)')+simple('browsers','browser','浏览器（UA 推测）','Browsers (UA hints)')+simple('systems','os','系统（UA 推测）','OS (UA hints)')+'</div>'+simple('methods','method','访问方法','Request methods')+
      card('COMMUNITY / RECENT',t('最近评论','Recent comments'),table([t('作者','Author'),t('内容','Content'),t('页面','Page')],rows('recentComments').map(r=>[r.author_name,String(r.content).slice(0,140),r.page_key])));
  }
  function render() {
    if (!data) return;
    const total = Number(data.summary.requests);
    const validTypes = Object.keys(types).map(kind=>({kind,count:Number(data.types.find(row=>row.kind===kind)?.count || 0)}));
    let start = 0;
    const colors = validTypes.map(row=>{const end=start+(total ? row.count/total*100:0);const segment=(types[row.kind]?.[2]||'#aab4c5')+' '+start+'% '+end+'%';start=end;return segment;});
    const legend = validTypes.map(row=>'<li><i style="background:'+(types[row.kind]?.[2]||'#aab4c5')+'"></i><span>'+escape(typeName(row.kind))+'</span><b>'+n(row.count)+'</b><small>'+(total?(100*row.count/total).toFixed(1):'0')+'%</small></li>').join('');
    const max = Math.max(1,...data.trend.map(row=>Number(row.count)));
    const coords = data.trend.map((row,i)=>((i/(Math.max(1,data.trend.length-1)))*680+10)+','+(155-Number(row.count)/max*125)).join(' ');
    const graph = '<svg viewBox="0 0 700 180" role="img" aria-label="'+t('每日请求趋势','Daily requests')+'"><path d="M10 155H690 M10 92H690 M10 30H690" stroke="#dfe7f4" fill="none"/><polyline points="'+coords+'" fill="none" stroke="#7a9ff0" stroke-width="3"/>'+data.trend.map((row,i)=>'<circle cx="'+((i/Math.max(1,data.trend.length-1))*680+10)+'" cy="'+(155-Number(row.count)/max*125)+'" r="3" fill="#719df0"><title>'+escape(row.date+': '+row.count)+'</title></circle>').join('')+'</svg>';
    const maxRegion = Math.max(1,...data.regions.map(row=>Number(row.count)));
    const regions = data.regions.slice(0,8).map((row,i)=>'<div class="ta-rank"><span>'+String(i+1).padStart(2,'0')+'</span><div><div class="ta-between"><span>'+escape(locationName(row))+'</span><b>'+n(row.count)+'</b></div><div class="ta-track"><i style="width:'+(Number(row.count)/maxRegion*100)+'%"></i></div></div></div>').join('');
    const ai = validTypes.find(row=>row.kind==='ai_claimed')?.count || 0;
    root.innerHTML='<header class="ta-heading"><div><span class="ta-eyebrow">HWNOTE / PRIVATE ANALYTICS</span><h2>'+t('站点分析','Site analytics')+'</h2><p>'+t('阅读、来源与请求审计，分别统计。','Reading, acquisition, and request audit, measured separately.')+'</p></div><span class="ta-owner">✓ vivofiftykfc</span></header>'+
      audienceView()+'<details class="ta-audit"><summary>'+t('请求审计 · 含机器人、资源和错误响应','Request audit · bots, assets and errors included')+'</summary><p class="ta-notice">'+escape(t('采集起点：','Collection begins: ')+(data.firstSeen?new Date(data.firstSeen).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):t('暂无记录','No records')))+t('。此前没有记录，不代表零访问。当前周期排除的 HTML 错误响应：','; earlier dates are unobserved, not zero. Excluded HTML errors in this period: ')+n(data.excludedHtmlErrors)+t('。浏览器标识、机房位置均不能证明真人身份。','; neither browser identifiers nor network location prove a human identity.')+'</p><div class="ta-toolbar"><div><button data-days="7" aria-pressed="'+(days===7)+'">'+t('近 7 天','7 days')+'</button><button data-days="30" aria-pressed="'+(days===30)+'">'+t('近 30 天','30 days')+'</button></div><button id="ta-refresh">'+t('刷新','Refresh')+'</button></div>'+
      '<div class="ta-metrics">'+[[t('页面请求','Page requests'),total],[t('独立 IP 标识','Distinct IP identifiers'),data.summary.ips],[t('国家／地区代码数','Country / region codes'),data.summary.countries],[t('自报 AI 爬虫请求','Self-declared AI requests'),ai]].map(([label,value])=>'<div class="ta-card"><span>'+label+'</span><strong>'+n(value)+'</strong></div>').join('')+'</div>'+
      (!total?'<p class="ta-notice">'+t('尚无请求记录：可能刚启用，也可能尚未配置入口采集。不会从旧访问量推算来源。','No requests yet: collection may be new or not enabled. Old visit totals cannot reveal past sources.')+'</p>':'')+
      '<div class="ta-layout"><div>'+card('TRAFFIC / TIMELINE',t('访问趋势','Request timeline'),graph+'<div class="ta-between ta-muted"><span>'+escape(data.trend[0]?.date||'')+'</span><span>'+escape(data.trend.at(-1)?.date||'')+'</span></div><details><summary>'+t('查看每日数据','Daily data')+'</summary>'+table([t('日期','Date'),t('请求','Requests')],data.trend.map(row=>[row.date,n(row.count)]))+'</details>')+
      card('SOURCES / REFERRERS',t('从哪里找到这里','How visitors arrive'),table([t('来源域名','Referrer'),t('请求','Requests')],data.sources.map(row=>[row.source===''?t('直接／未知','Direct / unknown'):row.source==='(internal)'?t('站内跳转','Internal navigation'):row.source,n(row.count)])))+
      card('READING / PAGES',t('成功返回的页面路径','Successful page requests'),table([t('页面','Page'),t('请求','Requests')],data.pages.map(row=>[row.path,n(row.count)])))+'</div><aside>'+
      card('VISITORS / TYPE',t('请求特征分类','Request characteristics'),'<div class="ta-donut" style="background:conic-gradient('+(colors.join(',')||'#e4eaf3 0% 100%')+')"><div><strong>'+n(total)+'</strong><small>'+t('请求','requests')+'</small></div></div><ul class="ta-legend">'+legend+'</ul><p class="ta-muted">'+t('分类是线索，不是身份认证。“浏览器”也可能是自动化；AI 名称来自可伪造的 User-Agent。','Classification is evidence, not identity. Browsers can be automated and AI User-Agents can be spoofed.')+'</p>')+
      card('VISITORS / REGIONS',t('IP 地区分布','IP locations'),regions||'<p class="ta-empty">'+t('暂无地区数据','No location data')+'</p>')+'</aside></div>'+
      extended()+card('ERRORS / REQUESTS',t('失败请求与扫描线索','Failed requests and scan indicators'),table([t('路径','Path'),'HTTP',t('次数','Count')],(data.failures||[]).map(r=>[r.path,r.status,n(r.count)]))+'<p class="ta-muted">'+t('404 表示该路径未找到，不代表读到了文件。失败请求不计入默认页面统计；成功请求也不等于真人阅读。','404 means not found, not a disclosed file. Failed requests are excluded from the default page scope; success does not prove a human reader.')+'</p>')+card('ACCESS LOG / LATEST 100',t('最近来访 · IP 与请求详情','Recent visits · IP and request details'),table([t('时间（北京）','Time (Beijing)'),'IP',t('地区／网络','Location / network'),t('分类及依据','Classification / evidence'),t('请求','Request'),'HTTP / TLS',t('响应头耗时','Response headers time')],data.recent.map(row=>[new Date(row.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}),row.ip_masked,locationName(row)+' · '+(row.organization||'—')+' '+(row.asn?'AS'+row.asn:''),typeName(row.kind)+' · '+row.evidence,(row.method||'GET')+' '+row.path,[row.protocol,row.tls,row.status].filter(Boolean).join(' / '),row.elapsed_ms==null?'—':row.elapsed_ms+' ms'])),'ta-log')+
      '<footer class="ta-foot"><p>'+t('IP 默认脱敏，地区来自网络出口，不代表实际住址。同一 IP 可能对应多人，代理也可能改变地区。统计的是 GET 页面请求，包含不执行 JavaScript 的爬虫；不等于真人 UV。','IPs are masked. Locations describe network exits, not home addresses. IPs can be shared or proxied. Counts are GET requests for HTML, including crawlers; not human visitor totals.')+'</p><p>'+t('记录保留 30 天；仅评论服务验证通过的站长可读取。更新时间：','Records are retained for 30 days and readable only by the authenticated owner. Updated: ')+escape(new Date(data.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}))+'</p><a href="/about/#hwnote-comments">'+t('返回评论区／退出登录','Comments / sign out')+'</a></footer></details>';
    root.querySelectorAll('[data-days]').forEach(button=>button.addEventListener('click',()=>{days=Number(button.dataset.days);load();}));
    document.getElementById('ta-refresh').addEventListener('click',load);
    // Keep the period/refresh control above both reports.
    root.querySelector('.ta-heading').after(root.querySelector('.ta-toolbar'));
    document.getElementById('reading-country')?.addEventListener('change',e=>{country=e.target.value;load();});
    document.getElementById('reading-export')?.addEventListener('click',()=>{
      const rows=[['path','pageviews','sessions','visible_seconds','scroll_percent'],...data.audience.pages.map(r=>[r.path,r.pageviews,r.sessions,r.active_seconds,r.scroll])];
      const cell=v=>{let x=String(v??'');if(/^[=+@\-\t\r]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"';};
      const blob=new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='reading-'+days+'days.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    const period=document.createElement('button');period.textContent=t('近 90 天','90 days');period.setAttribute('aria-pressed',String(days===90));period.onclick=()=>{days=90;load();};root.querySelector('.ta-toolbar > div').append(period);
    const filter=document.createElement('select');filter.setAttribute('aria-label',t('请求审计范围（不影响阅读概览）','Audit scope (reading report unchanged)'));filter.title=t('仅影响请求审计','Affects request audit only');filter.innerHTML='<option value="pages">'+t('成功 HTML 请求（2xx）','Successful HTML requests (2xx)')+'</option><option value="all">'+t('全部 HTTP 请求','All HTTP requests')+'</option>';filter.value=scope;filter.onchange=()=>{scope=filter.value;load();};root.querySelector('.ta-toolbar').prepend(filter);
    root.querySelector('.ta-audit .ta-metrics .ta-card span').textContent=scope==='all'?t('全部 HTTP 请求','All HTTP requests'):t('页面请求','Page requests');
    root.querySelectorAll('.ta-log tbody tr').forEach((tr,i)=>{
      const row=data.recent[i];if(!row.id)return;
      const button=document.createElement('button');button.textContent=t('查看完整 IP','Reveal IP');tr.cells[1].append(document.createElement('br'),button);
      button.onclick=async()=>{button.disabled=true;try{const result=await window.HWOwner.request('/api/admin/traffic/ip?id='+row.id);if(!button.isConnected)return;button.textContent=result.ip;setTimeout(()=>{if(button.isConnected){button.textContent=t('查看完整 IP','Reveal IP');button.disabled=false;}},20000);}catch{if(button.isConnected){button.textContent=t('未保存／已过期','Unavailable / expired');button.disabled=false;}}};
    });
    const notes=root.querySelectorAll('.ta-foot p');
    notes[0].textContent=t('默认仅统计成功返回的 HTML 请求（2xx），可切换全部 HTTP 请求（包含错误、资源和其他方法）。独立 IP 不等于真人 UV，地区反映网络出口；仅记录经过入口 Worker 的请求。','Default scope: successful HTML requests (2xx). All HTTP includes assets and other methods. IPs are not human visitor counts; locations describe network exits. Only requests through the Worker are recorded.');
    notes[1].textContent=t('请求明细保留 90 天；完整 IP 可选加密保存 7 天，仅站长按需查看，20 秒后重新遮蔽。更新时间：','Request records: 90 days. Optional encrypted full IPs: 7 days, owner-only reveal, masked again after 20 seconds. Updated: ')+new Date(data.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'});
  }
  async function load() {
    const run=++sequence;
    if (!window.HWOwner) {lock();return;}
    const user=await window.HWOwner.refresh();
    if(run!==sequence)return;
    if(!user){lock();return;}
    root.innerHTML='<p class="ta-notice">'+t('身份已确认，正在读取私人统计…','Identity verified. Loading private statistics…')+'</p>';
    try {
      const result=await window.HWOwner.request('/api/admin/traffic?days='+days+'&scope='+scope+'&country='+encodeURIComponent(country));
      if(run!==sequence)return;
      if(!result.summary || !Array.isArray(result.recent))throw Error(t('统计接口尚未更新','Statistics API is not updated'));
      data=result;render();
    } catch(error){if(run===sequence){lock(error.message);const retry=document.createElement('button');retry.textContent=t('重试','Retry');retry.addEventListener('click',load);root.append(retry);}}
  }
  document.addEventListener('hwnote:owner-state',event=>{if(!event.detail.authorized){sequence++;data=null;lock();}});
  document.addEventListener('zhw:languageapplied',()=>{if(data)render();});
  // Clear sensitive DOM before bfcache snapshots; return navigation rechecks access.
  window.addEventListener('pagehide',()=>{sequence++;lock();});
  window.addEventListener('pageshow',load);
  load();
})();
