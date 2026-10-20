const API_BASE='https://visahobe-agent-api.visamotion365.workers.dev';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
let selectedMode='local', lastTaskUrl='', taskPoll=null;
let webMode=false, imageMode=false, pendingImage=null, currentThread=null;
const store={
  get(k,d){ try{ const v=localStorage.getItem('vh:'+k); return v?JSON.parse(v):d }catch{ return d } },
  set(k,v){ try{ localStorage.setItem('vh:'+k, JSON.stringify(v)) }catch{} }
};
let threads = store.get('threads', []);
const skillData=[
 ['Visa research','Research official visa requirements, eligibility, required documents, and source URLs.','blue','⌕','Research official visa requirements and summarize the eligibility, documents, and source URLs for '],
 ['Official source finder','Prefer government and official organization sources; label sources clearly.','violet','◎','Find official sources and summarize the relevant information for '],
 ['Page summarizer','Extract key information from a webpage and summarize it accurately.','mint','▤','Summarize the main points from this webpage: '],
 ['Website comparison','Compare several pages and organize differences into a clear table.','amber','⇄','Compare the information on these websites and list the key differences: '],
 ['Form assistant','Explain fields and prepare draft answers. Never submit without user approval.','blue','▣','Open this website and help me understand the form fields. Do not submit anything without asking: '],
 ['Document research','Create an evidence-based summary from public document pages.','violet','▧','Research this public document and summarize the important points: '],
 ['GitHub repository review','Inspect a repository after a secure GitHub integration is configured.','mint','⌘','Help me plan a review of this GitHub repository: '],
 ['Deployment check','Review deployment status after Vercel integration is configured.','amber','▲','Help me inspect the deployment status for this project: ']
];
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3000)}
function showView(name){const target=$(`#view-${name}`);if(!target)return;$$('.view').forEach(v=>v.classList.toggle('active',v===target));$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('#pageName').textContent=({home:'Home',chat:'Chat',browser:'Browser Agent',history:'Task History',projects:'Projects & Workspaces',skills:'Skills Library',knowledge:'Knowledge Base',files:'Files & Documents',integrations:'Integrations',settings:'Settings & API Keys'})[name]||name;closeSidebar();if(name==='history')loadTasks();if(name==='settings'||name==='integrations')healthCheck();window.scrollTo({top:0,behavior:'smooth'})}
function closeSidebar(){$('#sidebar').classList.remove('open');$('#scrim').classList.remove('show')}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
$$('[data-goto]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.goto)));
$('#menuBtn').addEventListener('click',()=>{$('#sidebar').classList.add('open');$('#scrim').classList.add('show')});
$('#closeSidebar').addEventListener('click',closeSidebar);$('#scrim').addEventListener('click',closeSidebar);
function toggleTheme(){document.body.classList.toggle('dark');const dark=document.body.classList.contains('dark');try{sessionStorage.setItem('vh-theme',dark?'dark':'light')}catch{};$('#topTheme').textContent=dark?'☀':'◐'}
try{if(sessionStorage.getItem('vh-theme')==='dark'){document.body.classList.add('dark');$('#topTheme').textContent='☀'}}catch{}
$('#topTheme').addEventListener('click',toggleTheme);
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{selectedMode=b.dataset.mode;$$('[data-mode]').forEach(x=>x.classList.toggle('active',x.dataset.mode===selectedMode));}));
function renderSkills(){const el=$('#skillLibrary');el.innerHTML='';skillData.forEach(([name,desc,color,icon,prompt])=>{const card=document.createElement('article');card.className='library-skill';card.innerHTML=`<span class="skill-icon ${color}">${icon}</span><strong></strong><p></p><button type="button">Use skill →</button>`;$('.library-skill strong',card).textContent=name;$('.library-skill p',card).textContent=desc;$('.library-skill button',card).addEventListener('click',()=>{showView('browser');$('#browserPrompt').value=prompt;$('#browserPrompt').focus()});el.append(card)})}renderSkills();
async function healthCheck(){try{const r=await fetch(API_BASE+'/api/health');const h=await r.json();$('#healthDot').className='status-dot'+(h.ok?' on':'');$('#healthLabel').textContent=h.ok?'Connected · backend responding':'Agent unavailable';$('#backendHealth').textContent=h.ok?'Connected':'Unavailable';$('#localStatus').textContent=h.ok?'Connected':'Offline';$('#localStatus').className='status-tag '+(h.ok?'good':'failed');$('#geminiKeyStatus').textContent=h.geminiConfigured?'Configured':'Setup needed';$('#geminiStatus').textContent=h.geminiConfigured?'Configured':'Setup needed';$('#geminiStatus').className='status-tag '+(h.geminiConfigured?'good':'neutral');$('#geminiIntegrationStatus').textContent=h.geminiConfigured?'Configured':'Setup needed';$('#browserUseKeyStatus').textContent=h.cloudConfigured?'Configured':'Not configured';$('#browserUseStatus').textContent=h.cloudConfigured?'Configured':'Setup needed';$('#browserUseStatus').className='status-tag '+(h.cloudConfigured?'good':'neutral');$('#cloudIntegrationStatus').textContent=h.cloudConfigured?'Configured':'Not configured';return h}catch{$('#healthDot').className='status-dot';$('#healthLabel').textContent='Backend not connected';$('#backendHealth').textContent='Offline';return null}}
async function api(path,opts={}){const r=await fetch(API_BASE+path,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});const data=await r.json().catch(()=>({error:'Invalid server response'}));if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`);return data}
function taskRow(t){const row=document.createElement('div');row.className='task-row';const icon=t.status==='failed'?'!':t.status==='completed'?'✓':'◉';row.innerHTML=`<div class="task-icon">${icon}</div><div class="task-main"><strong></strong><small></small></div><div class="task-meta"><span class="status-tag"></span><span class="task-time"></span></div>`;$('.task-main strong',row).textContent=t.prompt;$('.task-main small',row).textContent=t.url||'No URL';const st=$('.status-tag',row);st.textContent=t.status;st.className=`status-tag ${t.status}`;$('.task-time',row).textContent=new Date(t.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});row.addEventListener('click',()=>showTask(t));return row}
function showTask(t){showView('browser');$('#browserUrl').value=t.url||'';$('#browserPrompt').value=t.prompt||'';$('#previewStatus').textContent=t.status;$('#previewStatus').classList.toggle('active',t.status==='completed');const screen=$('#previewScreen');screen.innerHTML='<div class="browser-chrome"><i></i><i></i><i></i><span></span></div>';$('.browser-chrome span',screen).textContent=t.url||'Browser preview';if(t.screenshot){const im=document.createElement('img');im.src=t.screenshot;im.alt='Screenshot from browser task';screen.append(im)}else screen.insertAdjacentHTML('beforeend','<div class="preview-placeholder"><strong>Text result mode</strong><small>Screenshots need the local Playwright build — the extracted text is below.</small></div>');renderResult(t)}
function renderResult(t){const el=$('#browserResult');el.innerHTML='';if(!t.result&&!t.error){el.innerHTML='<div class="empty-state"><span>◷</span><strong>Task is '+t.status+'</strong><small>Refresh to see updates.</small></div>';return}const wrap=document.createElement('div');wrap.className='result-content';const h=document.createElement('h3');h.textContent=t.result?.title||(t.error?'Task failed':'Task result');wrap.append(h);if(t.error){const p=document.createElement('p');p.textContent=t.error;wrap.append(p)}if(t.result?.url){const a=document.createElement('a');a.className='result-url';a.href=t.result.url;a.target='_blank';a.rel='noreferrer';a.textContent=t.result.url;wrap.append(a)}if(t.result?.summary){const p=document.createElement('p');p.textContent=t.result.summary;wrap.append(p)}if(t.result?.text){const pre=document.createElement('div');pre.className='result-text';pre.textContent=t.result.text;wrap.append(pre)}el.append(wrap)}
async function startTask(prompt,url){if(!prompt.trim()){toast('Describe what you want the agent to do.');return}const foundUrl=url?.trim()||prompt.match(/https?:\/\/[^\s]+/i)?.[0];if(!foundUrl){toast('Add a starting URL, for example https://example.com');return}try{const t=await api('/api/tasks',{method:'POST',body:JSON.stringify({prompt,url:foundUrl,mode:selectedMode})});lastTaskUrl=foundUrl;showView('browser');$('#browserUrl').value=foundUrl;$('#browserPrompt').value=prompt;$('#previewStatus').textContent='Running';$('#previewStatus').classList.add('active');renderResult(t);toast('Browser task started');pollTask(t.id)}catch(e){toast(e.message)}}
$('#runBrowserTask').addEventListener('click',()=>startTask($('#browserPrompt').value,$('#browserUrl').value));
$('#openLastUrl').addEventListener('click',()=>{if(lastTaskUrl)window.open(lastTaskUrl,'_blank','noopener');else toast('No task URL yet')});
$('#refreshTasks').addEventListener('click',loadTasks);
function pollTask(id){clearInterval(taskPoll);let n=0;taskPoll=setInterval(async()=>{n++;try{const t=await api(`/api/tasks/${id}`);renderResult(t);$('#previewStatus').textContent=t.status;$('#previewStatus').classList.toggle('active',t.status==='completed');if(t.status==='completed'||t.status==='failed'||n>20)clearInterval(taskPoll)}catch{if(n>20)clearInterval(taskPoll)}},2500)}
async function loadTasks(){try{const list=await api('/api/tasks');const all=$('#allTasks');all.innerHTML='';$('#historyCount').textContent=`${list.length} task${list.length===1?'':'s'} stored`;if(!list.length){all.innerHTML='<div class="empty-state"><span>◷</span><strong>No tasks yet</strong><small>Run a browser task to see it here.</small></div>'}else list.forEach(t=>all.append(taskRow(t)));const recent=$('#recentTasks');if(recent){recent.innerHTML='';(list.slice(0,4).length?list.slice(0,4):[0]).forEach(x=>x?recent.append(taskRow(x)):0);if(!list.length)recent.innerHTML='<div class="empty-state"><span>◷</span><strong>No tasks yet</strong><small>Your browser tasks will appear here.</small></div>'}}catch(e){const all=$('#allTasks');all.innerHTML=`<div class="empty-state"><strong>Could not load history</strong><small>${e.message}</small></div>`}}
$('#historyRefresh').addEventListener('click',loadTasks);

/* ---------- greeting, profile ---------- */
function greeting(){const name=store.get('name','Nasim');const h=new Date().getHours();const g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';$('#greeting').textContent=`${g}, ${name}`;$('#userName').textContent=name;$('#avatar').textContent=name[0]||'N';$('#avatarTop').textContent=name[0]||'N';$('#userEmail').textContent=store.get('email','Personal account')}
greeting();
$('#profileRow').addEventListener('click',()=>{const n=prompt('Your name:',store.get('name','Nasim'));if(n&&n.trim()){store.set('name',n.trim());greeting()}const e=prompt('Your email (shown in the sidebar):',store.get('email',''));if(e&&e.trim())store.set('email',e.trim());greeting()});

/* ---------- chat threads ---------- */
function saveThreads(){threads=threads.slice(0,40);store.set('threads',threads)}
function renderThreadList(filter=''){const wrap=$('#chatHistory');wrap.innerHTML='';const f=(filter||'').toLowerCase();const list=threads.filter(t=>!f||t.title.toLowerCase().includes(f));if(!list.length){wrap.innerHTML='<div class="hist-empty">'+(f?'No chats match your search.':'No chats yet — start one above.')+'</div>';return}list.forEach(t=>{const b=document.createElement('button');b.className='hist-item'+(currentThread&&currentThread.id===t.id?' active':'');b.innerHTML='<span class="t"></span><span class="x">✕</span>';$('.t',b).textContent=t.title||'New chat';b.addEventListener('click',()=>openThread(t.id));$('.x',b).addEventListener('click',ev=>{ev.stopPropagation();threads=threads.filter(x=>x.id!==t.id);saveThreads();renderThreadList($('#sideSearch').value)});wrap.append(b)})}
function newThread(firstText){const t={id:'t'+Date.now(),title:(firstText||'New chat').slice(0,42),msgs:[],at:Date.now()};threads.unshift(t);saveThreads();renderThreadList();return t}
function renderThread(){const box=$('#chatMessages');box.innerHTML='';const t=currentThread;if(!t||!t.msgs.length){box.innerHTML='<div class="chat-welcome"><div class="ai-badge large">✦</div><h2>What\'s on your mind?</h2></div>';return}t.msgs.forEach(m=>{const d=document.createElement('div');d.className='msg '+(m.role==='user'?'user':'ai');d.innerHTML='<div class="who">'+(m.role==='user'?(store.get('name','N')[0]||'Y'):'✦')+'</div><div class="b"></div>';$('.b',d).textContent=m.text;box.append(d)});box.scrollTop=box.scrollHeight}
function openThread(id){currentThread=threads.find(t=>t.id===id)||null;renderThread();renderThreadList($('#sideSearch').value);showView('chat')}
$('#newChatBtn').addEventListener('click',()=>{currentThread=null;renderThread();showView('home');$('#taskPrompt').focus();toast('New chat')});
$('#sideSearch').addEventListener('input',e=>renderThreadList(e.target.value));
$('#imagesBtn').addEventListener('click',()=>{const imgs=threads.flatMap(t=>t.msgs).filter(m=>m.image);if(!imgs.length)return toast('No images in chats yet — attach one from the home composer.');openThread(threads[0].id)});
renderThreadList();

/* ---------- send routing: chat / web / image ---------- */
function activeModel(){return store.get('model','Cloud engine')}
function setModel(m,card){store.set('model',m);$('#homeModelLabel').textContent=m;$('#chatModelLabel').textContent=m;$$('.model-card').forEach(c=>c.classList.toggle('active',c.dataset.model===m));if(card)toast(m+' selected')}
$$('.model-card').forEach(c=>c.addEventListener('click',()=>setModel(c.dataset.model,c)));
$('#carPrev').addEventListener('click',()=>$('#modelsTrack').scrollBy({left:-464,behavior:'smooth'}));
$('#carNext').addEventListener('click',()=>$('#modelsTrack').scrollBy({left:464,behavior:'smooth'}));
$('#seeAllModels').addEventListener('click',()=>$('#modelsTrack').scrollTo({left:0,behavior:'smooth'}));
setModel(activeModel());

/* attach image */
$('#attachBtn').addEventListener('click',()=>$('#imgInput').click());
$('#imgInput').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{pendingImage={name:f.name,data:r.result};const pv=$('#attachPreview');pv.hidden=false;pv.innerHTML='<img><span></span><button class="rm">✕</button>';$('img',pv).src=r.result;$('span',pv).textContent=f.name;$('.rm',pv).addEventListener('click',()=>{pendingImage=null;pv.hidden=true});toast('Image attached')};r.readAsDataURL(f);e.target.value=''});
/* toggles */
$('#webModeBtn').addEventListener('click',()=>{webMode=!webMode;$('#webModeBtn').classList.toggle('on',webMode);if(webMode){imageMode=false;$('#imageModeBtn').classList.remove('on')}toast(webMode?'Web search on — your text will run as a browser task':'Web search off')});
$('#imageModeBtn').addEventListener('click',()=>{imageMode=!imageMode;$('#imageModeBtn').classList.toggle('on',imageMode);if(imageMode){webMode=false;$('#webModeBtn').classList.remove('on')}toast(imageMode?'Create-an-image mode — needs an image AI key on the backend':'Image mode off')});

async function sendHome(){const txt=$('#taskPrompt').value.trim();if(!txt&&!pendingImage){toast('Type something first');return}
  if(webMode||/https?:\/\//i.test(txt)&&!imageMode){if(!/https?:\/\//i.test(txt)&&webMode){toast('Web search needs a URL — add a link to the page you want read.');return}$('#taskPrompt').value='';startTask(txt,'');return}
  // chat flow
  const t=currentThread||newThread(txt);
  if(!t.msgs.length&&t.title==='New chat'){t.title=txt.slice(0,42)}
  const userMsg={role:'user',text:txt+(pendingImage?' [image attached]':''),image:pendingImage?pendingImage.data:null};
  t.msgs.push(userMsg);t.at=Date.now();saveThreads();renderThreadList();openThread(t.id);$('#taskPrompt').value='';const pv=$('#attachPreview');if(pendingImage){pendingImage=null;pv.hidden=true}
  // ai reply
  const aiMsg={role:'ai',text:'…'};t.msgs.push(aiMsg);renderThread();
  try{const history=t.msgs.slice(0,-2).slice(-12).map(m=>({role:m.role==='user'?'user':'model',text:m.text}));
    const r=await api('/api/ai/chat',{method:'POST',body:JSON.stringify({message:txt+(imageMode?' (The user wants an image. Image generation needs an image AI key on the backend.)':''),history})});
    aiMsg.text=r.text;$('#chatStatus').textContent=r.model?'Answered by '+r.model:'';
  }catch(e){aiMsg.text='⚠️ '+e.message}
  t.at=Date.now();saveThreads();renderThread();renderThreadList($('#sideSearch').value);}
$('#runTask').addEventListener('click',sendHome);
$('#taskPrompt').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')sendHome()});
$$('.pill').forEach(b=>{if(b.dataset.quick){b.addEventListener('click',()=>{$('#taskPrompt').value=b.dataset.quick;$('#taskPrompt').focus()})}});
$('#seeMore').addEventListener('click',()=>showView('skills'));
$('#chatSend').addEventListener('click',()=>{const v=$('#chatInput').value.trim();if(!v)return;$('#chatInput').value='';const t=currentThread||newThread(v);t.msgs.push({role:'user',text:v});t.at=Date.now();if(t.title==='New chat')t.title=v.slice(0,42);saveThreads();renderThreadList();openThread(t.id);(async()=>{const aiMsg={role:'ai',text:'…'};t.msgs.push(aiMsg);renderThread();try{const history=t.msgs.slice(0,-2).slice(-12).map(m=>({role:m.role==='user'?'user':'model',text:m.text}));const r=await api('/ai/chat'.replace('/ai/chat','/api/ai/chat'),{method:'POST',body:JSON.stringify({message:v,history})});aiMsg.text=r.text}catch(e){aiMsg.text='⚠️ '+e.message}saveThreads();renderThread()})()});
$('#chatInput').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')$('#chatSend').click()});

/* knowledge notes */
$('#saveKnowledge').addEventListener('click',()=>{const v=$('#knowledgeInput').value.trim();if(!v)return toast('Write a note first');const notes=store.get('notes',[]);notes.unshift({text:v,at:Date.now()});store.set('notes',notes);$('#knowledgeInput').value='';renderNotes();toast('Note saved')});
function renderNotes(){const list=store.get('notes',[]);const el=$('#knowledgeList');el.innerHTML='';list.forEach((n,i)=>{const d=document.createElement('div');d.className='knowledge-item';d.innerHTML='<strong></strong><br><small></small>';$('strong',d).textContent=n.text.slice(0,80);$('small',d).textContent=new Date(n.at).toLocaleString();d.addEventListener('dblclick',()=>{const notes=store.get('notes',[]);notes.splice(i,1);store.set('notes',notes);renderNotes()});el.append(d)})}
renderNotes();

/* side footer actions */
$('#helpBtn').addEventListener('click',()=>toast('Help: type a message for chat, or add a URL and press send to run a browser task.'));
$('#exploreBtn').addEventListener('click',()=>showView('skills'));
function goPro(){toast('Go Pro is a demo badge — premium features coming soon.')}
$('#goProSide').addEventListener('click',goPro);
$('#goProTop').addEventListener('click',goPro);

healthCheck();loadTasks();
