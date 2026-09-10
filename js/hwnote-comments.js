/* HWNote comments: static first, independent login, no external script dependencies. */
(() => {
  'use strict';
  const root=document.getElementById('hwnote-comments');if(!root)return;
  const config=JSON.parse(document.getElementById('hwnote-comment-config').textContent);
  const t=(zh,en)=>config.en?en:zh;
  const list=root.querySelector('.hw-list'),status=root.querySelector('.hw-status');
  const controls=root.querySelector('.hw-controls'),editor=root.querySelector('.hw-editor');
  const storageKey=`hwnote-session:${config.server}`;
  let token='',user=null,rows=config.comments,reply=null,popup=null,nextOffset=null,live=false;
  try{token=sessionStorage.getItem(storageKey)||'';}catch{}
  const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(label,action)=>{const b=element('button',label);b.type='button';b.addEventListener('click',()=>Promise.resolve(action()).catch(e=>status.textContent=e.message));return b;};
  const safeLink=url=>{try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  function avatar(row){
    const wrap=element('span',undefined,'hw-avatar');wrap.setAttribute('aria-hidden','true');
    wrap.append(element('span',Array.from(row.author_name.trim())[0]?.toUpperCase()||'?'));
    const id=row.author_id,src=config.avatars?.[id] || (/^github:\d+$/.test(id||'')?`https://avatars.githubusercontent.com/u/${id.slice(7)}?s=80&v=4`:'');
    if(src){const img=document.createElement('img');img.alt='';img.width=40;img.height=40;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});img.src=src;wrap.append(img);}
    return wrap;
  }
  function body(text){
    const container=element('div',undefined,'hw-comment-body');
    // Preserve text exactly; render quotes and inline code without parsing HTML.
    for(const line of text.split('\n')){
      const quoted=/^>\s?/.test(line),p=element(quoted?'blockquote':'div');
      const parts=(quoted?line.replace(/^>\s?/,''):line).split(/(`[^`]+`)/g);
      for(const part of parts)p.append(part.startsWith('`')&&part.endsWith('`')?element('code',part.slice(1,-1)):document.createTextNode(part||''));
      if(!line)p.append(document.createElement('br'));container.append(p);
    }
    return container;
  }
  async function api(path,options={}){
    const response=await fetch(config.server+path,{...options,signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...options.headers}});
    const data=await response.json();if(!response.ok)throw Error(data.error||`HTTP ${response.status}`);return data;
  }
  function render(){
    list.replaceChildren();
    if(!rows.length)list.append(element('p',t('还没有评论，写下你的想法吧。','No comments yet. Share your thoughts.')));
    for(const row of rows){
      const card=element('article',undefined,'hw-comment');card.id='hw-'+row.id.replaceAll(':','-');
      const head=element('header'),name=safeLink(row.author_url)?element('a',row.author_name):element('strong',row.author_name);
      if(name.tagName==='A'){name.href=safeLink(row.author_url);name.target='_blank';name.rel='noopener noreferrer nofollow ugc';}
      const time=element('time',new Date(row.created_at).toLocaleString(config.en?'en-GB':'zh-CN'));time.dateTime=row.created_at;
      const platform=row.author_id?.split(':')[0];
      const identity=element('div',undefined,'hw-identity');identity.append(name,time,element('span',platform?platform:t('访客 · 未验证','Guest · Unverified'),'hw-badge'));
      head.append(avatar(row),identity);card.append(head);
      if(row.parent_id){const parent=rows.find(r=>r.id===row.parent_id);card.append(element('small',t('回复 ','Reply to ')+(parent?.author_name||t('较早的评论','an earlier comment'))));}
      card.append(body(row.content));
      const actions=element('footer');
      if(safeLink(row.source_url)){const a=element('a',t('原评论','Original comment'));a.href=safeLink(row.source_url);a.target='_blank';a.rel='noopener noreferrer nofollow ugc';actions.append(a);}
      actions.append(button(t('回复','Reply'),()=>{reply=row;renderEditor();editor.scrollIntoView({behavior:'smooth',block:'center'});editor.querySelector('textarea')?.focus();}));
      if(live && user && (user.admin||user.id===row.author_id))actions.append(button(t('删除','Delete'),async()=>{
        if(!confirm(t('确认删除这条评论？','Delete this comment?')))return;
        await api('/api/comments/'+encodeURIComponent(row.id),{method:'DELETE'});await refresh();
      }));
      card.append(actions);list.append(card);
    }
    if(nextOffset!==null)list.append(button(t('更多评论','More comments'),async()=>{
      const data=await api('/api/comments?page='+encodeURIComponent(config.page)+'&offset='+nextOffset);rows.push(...data.comments);nextOffset=data.nextOffset;render();
    }));
  }
  async function refresh(){
    try{
      const data=await api('/api/comments?page='+encodeURIComponent(config.page));rows=data.comments;nextOffset=data.nextOffset;live=true;render();
      status.textContent=t('评论已更新','Comments updated');
    }catch(error){
      status.replaceChildren(document.createTextNode(live?t('更新暂时失败，保留上次内容。','Update failed. Showing the last result.'):t(`暂时无法更新，显示 ${config.snapshotAt.slice(0,10)} 保存的历史评论。`,`Unavailable. Showing comments saved on ${config.snapshotAt.slice(0,10)}.`)),button(t('重试','Retry'),refresh));
    }
  }
  let options={providers:[],guest:false};
  function renderEditor(){
    const draft=editor.querySelector('textarea')?.value||'',oldName=editor.querySelector('[name="name"]')?.value||'',oldEmail=editor.querySelector('[name="email"]')?.value||'',oldNotify=editor.querySelector('[name="notifyReplies"]')?.checked||false;
    editor.replaceChildren();
    if(!options.guest&&!user){editor.append(element('p',t('登录后即可评论。','Sign in to comment.')));return;}
    const form=element('form');
    if(reply)form.append(element('p',t('回复 ','Reply to ')+reply.author_name),button(t('取消回复','Cancel reply'),()=>{reply=null;renderEditor();}));
    if(!user){const label=element('label',t('昵称（访客评论需审核）','Name (guest comments are moderated)'));const name=element('input');name.name='name';name.required=true;name.maxLength=80;name.autocomplete='nickname';name.value=oldName;label.append(name);form.append(label);}
    const trap=element('input');trap.name='website';trap.tabIndex=-1;trap.autocomplete='off';trap.className='hw-trap';trap.setAttribute('aria-hidden','true');form.append(trap);
    const label=element('label',t('你的评论','Your comment')),text=element('textarea');text.name='content';text.required=true;text.maxLength=5000;text.rows=4;text.value=draft;text.placeholder=t('写下想法，或回复一位读者。','Share a thought or reply to a reader.');label.append(text);form.append(label);
    if(options.replySubscriptions){
      const opt=element('label',undefined,'hw-subscribe'),checkbox=element('input');checkbox.type='checkbox';checkbox.name='notifyReplies';checkbox.checked=oldNotify;
      opt.append(checkbox,document.createTextNode(t('有人回复这条评论时，邮件通知我','Email me when someone replies to this comment')));
      const emailLabel=element('label',t('邮箱（不公开，需验证，可随时退订）','Email (private; verification required; unsubscribe anytime)')),email=element('input');email.type='email';email.name='email';email.maxLength=254;email.autocomplete='email';email.value=oldEmail;email.required=checkbox.checked;email.disabled=!checkbox.checked;emailLabel.hidden=!checkbox.checked;
      checkbox.addEventListener('change',()=>{email.required=checkbox.checked;email.disabled=!checkbox.checked;emailLabel.hidden=!checkbox.checked;});emailLabel.append(email);form.append(opt,emailLabel);
    }
    const send=element('button',t('发表评论','Post comment'));send.type='submit';form.append(send);
    form.addEventListener('submit',async event=>{
      event.preventDefault();send.disabled=true;
      try{
        const result=await api('/api/comments',{method:'POST',body:JSON.stringify({page:config.page,content:text.value,name:form.elements.name?.value||'',website:trap.value,parentId:reply?.id||null,notifyReplies:!!form.elements.notifyReplies?.checked,email:form.elements.notifyReplies?.checked?form.elements.email?.value:undefined})});
        text.value='';reply=null;await refresh();renderEditor();
        status.textContent=result.status==='pending'?t('已收到，审核通过后会显示。','Received. Your comment will appear after review.'):t('评论已发布。','Comment posted.');
        if(result.subscription==='verification_pending')status.textContent+=t(' 请查收验证邮件，点击确认后才会收到回复提醒。',' Check your email and confirm to activate reply notifications.');
      }catch(error){status.textContent=t('提交失败，内容已保留：','Could not post. Your draft is preserved: ')+error.message;}finally{send.disabled=false;}
    });
    editor.append(form);
  }
  async function moderation(){
    root.querySelector('.hw-admin')?.remove();const panel=element('section',undefined,'hw-admin');panel.append(element('h3',t('待审核评论','Pending comments')));
    const data=await api('/api/admin/comments');
    for(const c of data.comments){const row=element('article');row.append(element('strong',c.author_name),element('p',c.page_key),body(c.content));for(const [label,state] of [[t('通过','Approve'),'approved'],[t('移除','Remove'),'deleted']])row.append(button(label,async()=>{await api('/api/admin/moderate',{method:'POST',body:JSON.stringify({id:c.id,status:state})});await moderation();await refresh();}));panel.append(row);}
    if(!data.comments.length)panel.append(element('p',t('没有待审核评论。','Nothing pending.')));root.append(panel);
  }
  async function loadControls(){
    const results=await Promise.allSettled([api('/api/config'),api('/api/me')]);controls.replaceChildren();
    if(results[0].status==='fulfilled')options=results[0].value;
    if(results[1].status==='fulfilled')user=results[1].value.user;
    if(user){controls.append(element('span',t('已登录：','Signed in: ')+user.name),button(t('退出','Sign out'),async()=>{await api('/api/logout',{method:'POST'});token='';try{sessionStorage.removeItem(storageKey);}catch{}user=null;root.querySelector('.hw-admin')?.remove();await loadControls();}));}
    else for(const p of options.providers)controls.append(button(p.label+t(' 登录',' login'),()=>{
      popup=window.open(`${config.server}/auth/${p.id}/start?origin=${encodeURIComponent(location.origin)}`,'hwnote-login','width=620,height=720');
      if(!popup)throw Error(t('请允许登录弹窗。','Please allow the login popup.'));
    }));
    controls.append(button(t('刷新评论','Refresh comments'),refresh));
    if(results.some(x=>x.status==='rejected'))controls.append(button(t('重试登录服务','Retry login service'),loadControls));
    if(!user?.admin)root.querySelector('.hw-notification-status')?.remove();
    if(user?.admin){
      controls.append(button(t('邮件提醒','Email notifications'),async()=>{
        const data=await api('/api/admin/notifications');root.querySelector('.hw-notification-status')?.remove();
        const panel=element('section',undefined,'hw-admin hw-notification-status');panel.append(element('h3',t('邮件提醒','Email notifications')),element('p',data.configured?t('提醒已配置：其他人的新评论及待审核留言会通知站长。','Enabled: new comments and pending reviews notify the owner.'):t('邮件提醒尚未配置。','Email notifications are not configured.')));
        const labels={queued:t('等待发送','Queued'),sending:t('发送中','Sending'),sent:t('已交给邮件服务器','Accepted by mail server'),failed:t('发送失败，请检查邮箱配置或联系维护者','Failed; check email settings or contact the maintainer'),cancelled:t('评论已删除，取消通知','Cancelled after deletion')};
        for(const n of data.notifications){const row=element('p');row.append(document.createTextNode(n.author_name+' · '+(labels[n.state]||n.state)+' · '));const link=element('a',t('所在页面','View page'));link.href=new URL(n.page_key,location.origin).href+'#hwnote-comments';row.append(link);panel.append(row);}
        if(!data.notifications.length)panel.append(element('p',t('尚无发送记录。','No notifications yet.')));root.append(panel);
      }));
      controls.append(button(t('审核','Moderate'),moderation),button(t('导出备份','Export backup'),async()=>{
        const data=await api('/api/admin/export'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
        const a=element('a');a.href=url;a.download=`comments-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }));
    }
    render();renderEditor();
  }
  window.addEventListener('message',async event=>{
    if(event.origin!==new URL(config.server).origin || event.source!==popup || event.data?.type!=='hwnote-auth')return;
    if(event.data.error){status.textContent=event.data.error;return;}
    if(!/^[a-f0-9]{64}$/.test(event.data.token))return;
    token=event.data.token;try{sessionStorage.setItem(storageKey,token);}catch{}
    await loadControls();
  });
  render();
  // Static comments already exist in HTML. Network work starts ahead of the viewport.
  const start=()=>{refresh();loadControls();};
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();start();}},{rootMargin:'900px'});observer.observe(root);}else start();
})();
