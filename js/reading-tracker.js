(function(){
 'use strict';
 if(location.hostname!=='hwnote.space'||/^\/(traffic|__analytics|privacy)(\/|$)/.test(location.pathname)||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
 let stopped=false,page=null,tick=performance.now(),busy=false;
 const optout=()=>{try{return localStorage.getItem('hwnote-analytics-optout')==='1'||/(?:^|;\s*)hwnote_owner_analytics=1(?:;|$)/.test(document.cookie);}catch{return false;}};
 const session=()=>{try{const saved=JSON.parse(sessionStorage.getItem('hwnote-reading-session')||'null');const row=saved&&Date.now()-saved.at<1800000?saved:{id:crypto.randomUUID()};row.at=Date.now();sessionStorage.setItem('hwnote-reading-session',JSON.stringify(row));return row.id;}catch{return crypto.randomUUID();}};
 async function send(payload,keepalive=false){const r=await fetch('/__analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload),keepalive});if(!r.ok)throw Error('telemetry unavailable');return r.json();}
 async function forget(item){if(item?.token){try{await send({type:'exclude',id:item.id,token:item.token},true);}catch{}}}
 async function start(){
  if(stopped||optout()||document.visibilityState!=='visible')return;
  if(window.HWOwner){try{if(await window.HWOwner.refresh()){stopped=true;return;}}catch{}}
  if(stopped)return;
  const params=new URLSearchParams(location.search),item={id:crypto.randomUUID(),session:session(),active:0,scroll:0,interactions:0,created:Date.now()};page=item;tick=performance.now();
  const body={type:'start',id:item.id,session:item.session,path:location.pathname,referrer:document.referrer,source:params.get('utm_source'),medium:params.get('utm_medium'),campaign:params.get('utm_campaign')};
  for(let attempt=0;attempt<2;attempt++){try{const r=await send(body);item.token=r.token;if(stopped)await forget(item);return;}catch{if(stopped)return;if(attempt===0)await new Promise(r=>setTimeout(r,1500));}}
 }
 function measure(){const now=performance.now();if(page&&document.visibilityState==='visible'&&!stopped){page.active+=Math.min(5,Math.max(0,(now-tick)/1000));const height=document.documentElement.scrollHeight-innerHeight;if(height>0)page.scroll=Math.max(page.scroll,Math.min(100,Math.round(scrollY/height*100)));try{sessionStorage.setItem('hwnote-reading-session',JSON.stringify({id:page.session,at:Date.now()}));}catch{}}tick=now;}
 async function flush(keepalive=false){if(stopped||optout()||busy||!page?.token)return;busy=true;const item=page;try{await send({type:'engagement',id:item.id,token:item.token,active:Math.floor(item.active),scroll:item.scroll,interactions:item.interactions},keepalive);}catch{}finally{busy=false;}}
 document.addEventListener('hwnote:owner-state',e=>{if(e.detail.authorized){stopped=true;forget(page);page=null;}});
 document.addEventListener('click',e=>{if(e.isTrusted&&page&&!stopped)page.interactions=Math.min(100,page.interactions+1);},{passive:true});
 document.addEventListener('visibilitychange',()=>{tick=performance.now();if(document.visibilityState==='hidden')flush(true);else if(!page)start();});
 window.addEventListener('pagehide',()=>flush(true));window.addEventListener('pageshow',e=>{if(e.persisted){page=null;start();}});
 setInterval(measure,1000);setInterval(()=>flush(),15000);
 if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
})();
