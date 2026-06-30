import { MOTIVES } from '../data/motives.js';
import { TRENDING } from '../data/trending-books.js';
import { DEFAULT_FLASHCARDS } from '../data/flashcards.js';
import { BOOK_GRADIENTS } from '../data/book-gradients.js';
import { catColors, catEmoji } from '../data/categories.js';

// ─── XSS PROTECTION ───
function esc(s){if(s==null)return '';if(window.DOMPurify)return DOMPurify.sanitize(String(s),{ALLOWED_TAGS:[],ALLOWED_ATTR:[]});return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}

// ─── STATE ───
const STORE='fbp_v1';
function loadState(){try{const s=localStorage.getItem(STORE);return s?JSON.parse(s):null;}catch(e){return null;}}
function saveState(){
  setSyncStatus('syncing');
  try{
    localStorage.setItem(STORE,JSON.stringify({tasks,habitsData,skillsData,roadmapData,notes,library,userName,userAvatar,theme:document.documentElement.dataset.theme||'dark',accentColor,focusStats,currentEmail}));
    setTimeout(()=>setSyncStatus('saved'),400);
  }catch(e){setSyncStatus('error');}
}
let S=loadState();
let tasks=S?.tasks||[];
let habitsData=S?.habitsData||[];
let skillsData=S?.skillsData||[
  {name:'React.js',icon:'⚛',lvl:'Intermediate',pct:62,tags:['Frontend','JS']},
  {name:'UI/UX Design',icon:'🎨',lvl:'Intermediate',pct:75,tags:['Design','Figma']},
  {name:'Node.js',icon:'🟢',lvl:'Beginner',pct:28,tags:['Backend']},
];
let roadmapData=S?.roadmapData||[
  {t:'JavaScript Basics',d:'Variables, functions, async',s:'done'},
  {t:'React Fundamentals',d:'Components, hooks, props',s:'active'},
  {t:'State Management',d:'Redux, Zustand',s:'pending'},
  {t:'Backend Basics',d:'Node.js, APIs',s:'pending'},
];
let notes=S?.notes||[];
let library=S?.library||[];
let userName=S?.userName||'User';
let userAvatar=S?.userAvatar||'😎';
let accentColor=S?.accentColor||'#7c3aed';
let currentEmail=S?.currentEmail||'';
let focusStats=S?.focusStats||{sessions:0,minutes:0,dayStreak:0,lastDay:''};
let taskFilter='all';
let aiMsgs=[];
let calYear=new Date().getFullYear(),calMonth=new Date().getMonth();
let calSelDate=null;
let selEmoji='🧘';
let chartsInit=false;
let weeklyChartInst=null, readingChartInst=null;

// ─── BOOKORA STATE ───
let bookPages=[];
let currentPage=0;
let currentBookTitle='';
let currentBookIdx=-1;
let ttsActive=false;
let ttsUtterance=null;
let flashcards=[];
let fcIdx=0;
let wishlist=S?.wishlist||[];
let readView='3d';
let isFlipping=false;

// ─── FOCUS STATE ───
let focusActive=false;
let focusPhase='focus'; // 'focus'|'break'
let focusSeconds=25*60;
let focusDuration=25;
let focusTimer=null;
let focusSessions=0;
let focusTaskId=null;


// ─── SYNC STATUS ───
function setSyncStatus(s){const d=document.getElementById('syncDot');const l=document.getElementById('syncLabel');if(!d)return;d.className='sync-dot'+(s==='syncing'?' syncing':s==='error'?' error':'');l.textContent=s==='syncing'?'Saving…':s==='error'?'Error':'Saved';}

// ─── TOAST / LOADING ───
function showToast(msg,dur=2800){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),dur);}
function showLoading(msg){document.getElementById('loading-text').textContent=msg||'Loading…';document.getElementById('loading').classList.add('show');}
function hideLoading(){document.getElementById('loading').classList.remove('show');}

// ─── MODAL ───
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function showConfirm(title,msg,okLabel='Confirm',danger=true){
  return new Promise(r=>{
    window._confirmResolve=r;
    document.getElementById('confirmTitle').textContent=title;
    document.getElementById('confirmMsg').textContent=msg;
    const ok=document.getElementById('confirmOkBtn');
    ok.textContent=okLabel;
    ok.style.background=danger?'var(--red)':'var(--grad)';
    openModal('confirmModal');
  });
}

// ─── AUTH ───
let signingUp=false;
function toggleLoginMode(){signingUp=!signingUp;document.getElementById('loginPanel').style.display=signingUp?'none':'block';document.getElementById('signupPanel').style.display=signingUp?'block':'none';}
function showAuthErr(id,msg){const el=document.getElementById(id);el.textContent=msg;el.style.display='block';setTimeout(()=>el.style.display='none',4000);}
function getUsers(){try{return JSON.parse(localStorage.getItem('fbp_users')||'{}');}catch(e){return {};}}
function saveUsers(u){localStorage.setItem('fbp_users',JSON.stringify(u));}
async function sha256(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');}
async function doLogin(){
  const email=document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass=document.getElementById('loginPass').value;
  if(!email||!pass){showAuthErr('loginErr','Saari fields bharo.');return;}
  const users=getUsers();
  if(!users[email]){showAuthErr('loginErr','Account nahi mila. Pehle sign up karo.');return;}
  const hashed=await sha256(pass+email);
  if(users[email].password!==hashed){showAuthErr('loginErr','Password galat hai.');return;}
  const u=users[email];
  if(u.data){try{const d=JSON.parse(u.data);tasks=d.tasks||tasks;habitsData=d.habitsData||habitsData;skillsData=d.skillsData||skillsData;notes=d.notes||notes;library=d.library||library;focusStats=d.focusStats||focusStats;}catch(e){}}
  currentEmail=email;
  completeLogin({name:u.name,avatar:u.avatar||'😎',email});
}
async function doSignup(){
  const name=document.getElementById('signupName').value.trim();
  const email=document.getElementById('signupEmail').value.trim().toLowerCase();
  const pass=document.getElementById('signupPass').value;
  if(!name||!email||!pass){showAuthErr('signupErr','Saari fields bharo.');return;}
  if(pass.length<6){showAuthErr('signupErr','Password kam se kam 6 characters ka hona chahiye.');return;}
  if(!/\S+@\S+\.\S+/.test(email)){showAuthErr('signupErr','Valid email daalo.');return;}
  const users=getUsers();
  if(users[email]){showAuthErr('signupErr','Is email se account pehle se hai.');return;}
  const hashed=await sha256(pass+email);
  users[email]={name,password:hashed,avatar:'😎',createdAt:new Date().toISOString()};
  saveUsers(users);
  currentEmail=email;
  completeLogin({name,avatar:'😎',email});
}
function guestLogin(){completeLogin({name:'Guest',avatar:'👤',email:''});}
function completeLogin(u){
  userName=u.name;userAvatar=u.avatar||'😎';currentEmail=u.email||'';
  localStorage.setItem('fbp_session',JSON.stringify({name:u.name,avatar:u.avatar,email:u.email}));
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('mainApp').style.display='flex';
  initApp();
}
function logout(){if(currentEmail){const users=getUsers();if(users[currentEmail]){users[currentEmail].data=JSON.stringify({tasks,habitsData,skillsData,notes,library,focusStats});saveUsers(users);}}localStorage.removeItem(STORE);location.reload();}

// ─── NAV ───
let currentView='dashboard';
function showView(id,btn){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const v=document.getElementById('view-'+id);if(v)v.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  currentView=id;
  const titles={dashboard:'Dashboard 🏠',tasks:'Tasks 📋',habits:'Habits 🌱',focus:'Focus Timer ⏱',skills:'Skills ⚡',calendar:'Calendar 📅',library:'Library 📚',reader:'Reader 📖',notes:'Notes ✍️',study:'Study Tools 🎓',analytics:'Analytics 📊',ai:'AI Assistant 🤖',settings:'Settings ⚙️'};
  document.getElementById('topbarTitle').textContent=titles[id]||id;
  if(id==='analytics')initCharts();
  if(id==='calendar')renderCalendar();
  if(id==='dashboard')renderAll();
  if(id==='study')renderStudy();
  if(id==='settings')renderSettings();
  if(id==='library')renderLibrary();
  if(id==='notes')renderNotes();
  if(id==='reader')renderReader();
  if(id==='focus'){renderFocusPage();}
}
function setBN(id){document.querySelectorAll('.bn-item').forEach(b=>b.classList.remove('active'));const b=document.getElementById('bn-'+id);if(b)b.classList.add('active');}
function toggleSidebar(){const sb=document.getElementById('sidebar');sb.classList.toggle('slim');sb.classList.toggle('open');}
function handleFAB(){if(currentView==='tasks'||currentView==='dashboard'){openModal('taskModal');resetTaskModal();}else if(currentView==='habits'){openModal('habitModal');resetHabitModal();}else if(currentView==='library'){document.getElementById('pdfInput').click();}else{openModal('taskModal');resetTaskModal();}}
function handleSearch(q){if(currentView==='tasks')renderTaskList(q);else if(currentView==='library')filterLibrary(q);}

// ─── TASKS ───


function cc(cat){return catColors[cat]||'#8892A8';}
function resetTaskModal(){document.getElementById('taskModalTitle').textContent='✦ New Task';document.getElementById('editTaskId').value='';document.getElementById('mTitle').value='';document.getElementById('mPri').value='mid';document.getElementById('mCat').value='work';document.getElementById('mDue').value='';document.getElementById('mRecur').value='none';document.getElementById('saveTaskBtn').textContent='Add Task ✦';}
function saveTask(){
  const title=document.getElementById('mTitle').value.trim();
  if(!title){showToast('❗ Task ka naam daalo');return;}
  const editId=document.getElementById('editTaskId').value;
  const task={id:editId?parseInt(editId):Date.now(),title,pri:document.getElementById('mPri').value,cat:document.getElementById('mCat').value,due:document.getElementById('mDue').value,recur:document.getElementById('mRecur').value,done:false,subtasks:[],createdAt:new Date().toISOString()};
  if(editId){const idx=tasks.findIndex(t=>t.id===parseInt(editId));if(idx>-1){task.done=tasks[idx].done;task.subtasks=tasks[idx].subtasks||[];tasks[idx]=task;}else tasks.unshift(task);}
  else tasks.unshift(task);
  closeModal('taskModal');saveState();renderAll();showToast('✅ Task '+( editId?'updated':'added')+'!');
  addXP(editId?5:10);
}
function openEditTask(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  document.getElementById('taskModalTitle').textContent='✏️ Edit Task';
  document.getElementById('editTaskId').value=id;
  document.getElementById('mTitle').value=t.title;
  document.getElementById('mPri').value=t.pri;
  document.getElementById('mCat').value=t.cat||'work';
  document.getElementById('mDue').value=t.due||'';
  document.getElementById('mRecur').value=t.recur||'none';
  document.getElementById('saveTaskBtn').textContent='Update Task ✦';
  openModal('taskModal');
}
async function deleteTask(id){const ok=await showConfirm('Task Delete?','Yeh task permanently delete ho jayega.','Delete');if(!ok)return;tasks=tasks.filter(t=>t.id!==id);saveState();renderAll();showToast('🗑 Task deleted');}
function toggleTask(id){const t=tasks.find(x=>x.id===id);if(!t)return;t.done=!t.done;if(t.done)addXP(15);saveState();renderAll();showToast(t.done?'✅ Done!':'↩️ Undone');}
function setFilter(f,el){taskFilter=f;document.querySelectorAll('.chip-filter').forEach(c=>c.classList.remove('active'));if(el)el.classList.add('active');renderTaskList();}
function getFiltered(q=''){
  let f=[...tasks];
  if(taskFilter==='done')f=f.filter(t=>t.done);
  else if(taskFilter==='pending')f=f.filter(t=>!t.done);
  else if(taskFilter==='high')f=f.filter(t=>t.pri==='high'&&!t.done);
  else if(['work','study','fitness','health','personal','finance'].includes(taskFilter))f=f.filter(t=>t.cat===taskFilter);
  if(q)f=f.filter(t=>t.title.toLowerCase().includes(q.toLowerCase()));
  return f;
}
function renderTaskItem(t){
  const subs=t.subtasks||[];const doneS=subs.filter(s=>s.done).length;const pct=subs.length?Math.round((doneS/subs.length)*100):0;
  const dueEl=t.due?`<span class="due-badge ${new Date(t.due)<new Date()&&!t.done?'overdue':''}">${t.due.slice(5)}</span>`:'';
  const subProg=subs.length?`<div class="sub-prog"><div class="sub-prog-track"><div class="sub-prog-fill" style="width:${pct}%"></div></div><span class="sub-count">${doneS}/${subs.length}</span></div>`:'';
  const recurBadge=t.recur&&t.recur!=='none'?`<span class="recur-badge">🔁 ${t.recur}</span>`:'';
  return `<div class="task-item ${t.done?'done-task':''}" style="border-left:3px solid ${cc(t.cat)}" draggable="true" data-id="${t.id}" ondragstart="dragStart(event,${t.id})" ondragover="dragOver(event)" ondrop="dropOn(event,${t.id})" ondragleave="dragLeave(event)" ondragend="dragEnd(event)">
    <div class="drag-handle" title="Drag">⠿</div>
    <div class="task-check ${t.done?'done':''}" onclick="event.stopPropagation();toggleTask(${t.id})"></div>
    <div class="task-body" onclick="toggleSubContainer(${t.id})">
      <div class="task-title">${esc(t.title)}</div>
      <div class="task-meta"><span class="pri-badge pri-${t.pri}">${t.pri}</span><span class="cat-badge"><span class="cat-dot" style="background:${cc(t.cat)}"></span>${catEmoji[t.cat]||''} ${t.cat}</span>${dueEl}${recurBadge}</div>
      ${subProg}
      <div class="subtask-wrap" id="sc-${t.id}">
        <div class="subtask-add"><input class="sub-input" id="si-${t.id}" placeholder="Add subtask…" onkeydown="if(event.key==='Enter')addSubtask(${t.id})" onclick="event.stopPropagation()"/><button class="sub-add-btn" onclick="event.stopPropagation();addSubtask(${t.id})">+ Add</button></div>
        ${subs.map(s=>`<div class="sub-item"><div class="sub-check ${s.done?'done':''}" onclick="toggleSub(${t.id},${s.id})"></div><span class="sub-title ${s.done?'done':''}">${esc(s.title)}</span><span class="sub-del" onclick="deleteSub(${t.id},${s.id})">✕</span></div>`).join('')}
      </div>
    </div>
    <div class="task-actions">
      <div class="t-act edit" onclick="event.stopPropagation();openEditTask(${t.id})">✏️</div>
      <div class="t-act del" onclick="event.stopPropagation();deleteTask(${t.id})">🗑</div>
    </div>
  </div>`;
}
function renderTaskList(q=''){const el=document.getElementById('taskListFull');const f=getFiltered(q);if(!f.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-text">Koi task nahi mila</div><button class="btn-primary" onclick="openModal('taskModal');resetTaskModal()">+ New Task</button></div>`;return;}el.innerHTML=f.map(renderTaskItem).join('');}
function renderRecentTasks(){const el=document.getElementById('recentTasks');const r=tasks.filter(t=>!t.done).slice(0,5);if(!r.length){el.innerHTML=`<div class="empty-state" style="padding:18px 10px"><div class="empty-icon">📝</div><div class="empty-text">Koi pending task nahi</div></div>`;return;}el.innerHTML=r.map(t=>`<div class="task-item ${t.done?'done-task':''}" style="border-left:3px solid ${cc(t.cat)};margin-bottom:6px;cursor:default"><div class="task-check ${t.done?'done':''}" onclick="toggleTask(${t.id})"></div><div class="task-body"><div class="task-title" style="font-size:12px">${esc(t.title)}</div><div class="task-meta"><span class="pri-badge pri-${t.pri}">${t.pri}</span><span class="cat-badge"><span class="cat-dot" style="background:${cc(t.cat)}"></span>${t.cat}</span></div></div><div class="t-act edit" onclick="openEditTask(${t.id})">✏️</div></div>`).join('');}
function addSubtask(tid){const inp=document.getElementById('si-'+tid),title=inp?.value.trim();if(!title)return;const t=tasks.find(x=>x.id===tid);if(t){t.subtasks=t.subtasks||[];t.subtasks.push({id:Date.now(),title,done:false});inp.value='';renderTaskList();saveState();}}
function toggleSub(tid,sid){const t=tasks.find(x=>x.id===tid);if(t){const s=t.subtasks?.find(x=>x.id===sid);if(s){s.done=!s.done;renderTaskList();saveState();}}}
function deleteSub(tid,sid){const t=tasks.find(x=>x.id===tid);if(t){t.subtasks=t.subtasks.filter(x=>x.id!==sid);renderTaskList();saveState();}}
function toggleSubContainer(id){document.getElementById('sc-'+id)?.classList.toggle('open');}

// Drag & Drop
let dragId=null;
function dragStart(e,id){dragId=id;e.currentTarget.classList.add('dragging');}
function dragEnd(e){e.currentTarget.classList.remove('dragging');document.querySelectorAll('.task-item').forEach(el=>el.classList.remove('drag-over'));}
function dragOver(e){e.preventDefault();e.currentTarget.classList.add('drag-over');}
function dragLeave(e){e.currentTarget.classList.remove('drag-over');}
function dropOn(e,targetId){e.preventDefault();if(!dragId||dragId===targetId)return;const fi=tasks.findIndex(t=>t.id===dragId);const ti=tasks.findIndex(t=>t.id===targetId);if(fi===-1||ti===-1)return;const[m]=tasks.splice(fi,1);tasks.splice(ti,0,m);dragId=null;renderTaskList();saveState();}

// ─── STATS ───
function calcStreak(done){if(!done||!done.length)return 0;const today=new Date();let streak=0;for(let i=0;i<done.length;i++){const d=new Date(today);d.setDate(d.getDate()-i);const key=d.toISOString().slice(0,10);if(done.includes(key))streak++;else break;}return streak;}
function renderStats(){
  const total=tasks.length,done=tasks.filter(t=>t.done).length,pending=tasks.filter(t=>!t.done).length;
  document.getElementById('dbTotal').textContent=total;
  document.getElementById('dbDone').textContent=done;
  document.getElementById('dbStreak').textContent=habitsData.length?habitsData.reduce((mx,h)=>Math.max(mx,calcStreak(h.done||[])),0):0;
  document.getElementById('dbBooks').textContent=library.length;
  document.getElementById('taskBadge').textContent=pending;
  const dot=document.getElementById('bnDot');if(dot)dot.style.display=pending>0?'block':'none';
  const pct=total?Math.round((done/total)*100):0;
  document.getElementById('ringPct').textContent=pct+'%';
  document.getElementById('ringCircle').style.strokeDashoffset=345.4-(345.4*pct/100);
  const maxStreak=habitsData.length?habitsData.reduce((mx,h)=>Math.max(mx,calcStreak(h.done||[])),0):0;
  const lvl=Math.max(1,Math.floor(done/5)+1);
  document.getElementById('heroStreak').textContent='🔥 '+maxStreak+'d Streak';
  document.getElementById('heroScore').textContent='⚡ '+pct+'% Done';
  document.getElementById('heroBooks').textContent='📚 '+library.length+' Books';
  const xp=done*10;const xpMax=lvl*100;
  document.getElementById('xpLabel').textContent=xp+'/'+xpMax;
  document.getElementById('xpFill').style.width=Math.min(100,(xp%(xpMax/lvl))/(xpMax/lvl)*100)+'%';
  document.getElementById('sbRole').textContent='Level '+lvl+' · '+xp+' XP';
  document.getElementById('sbName').textContent=userName;
  document.getElementById('sbAvatar').textContent=userAvatar;
  const h=new Date().getHours();
  document.getElementById('heroGreet').textContent=(h<12?'Good morning':h<17?'Good afternoon':'Good evening')+', '+userName+'! '+(h<12?'🌅':h<17?'☀️':'🌙');
  document.getElementById('heroSub').textContent=pending>0?`${pending} tasks baki hain — focus karo!`:'🎉 Saare tasks done! Great job!';
}
function addXP(amount){showToast(`+${amount} XP earned! ✨`,1800);}
function renderAll(){renderStats();renderTaskList();renderRecentTasks();renderDashBook();renderAISugs().catch(()=>{});}

// ─── HABITS ───
function resetHabitModal(){document.getElementById('habitModalTitle').textContent='🌱 New Habit';document.getElementById('editHabitIdx').value='';document.getElementById('hName').value='';selEmoji='🧘';document.querySelectorAll('.emoji-opt').forEach((e,i)=>{e.classList.toggle('active',i===0)});}
function pickEmoji(el,em){selEmoji=em;document.querySelectorAll('.emoji-opt').forEach(e=>e.classList.remove('active'));el.classList.add('active');}
function saveHabit(){
  const name=document.getElementById('hName').value.trim();
  if(!name){showToast('❗ Habit ka naam daalo');return;}
  const editIdx=document.getElementById('editHabitIdx').value;
  const h={name,emoji:selEmoji,done:editIdx?habitsData[parseInt(editIdx)]?.done||[]:[]};
  if(editIdx!==''){habitsData[parseInt(editIdx)]=h;}else habitsData.push(h);
  closeModal('habitModal');saveState();renderHabits();showToast('🌱 Habit '+(editIdx!==''?'updated':'added')+'!');addXP(10);
}
function toggleHabitDay(idx){
  const h=habitsData[idx];if(!h)return;
  const today=new Date().toISOString().slice(0,10);
  h.done=h.done||[];
  if(h.done.includes(today)){h.done=h.done.filter(d=>d!==today);showToast('↩️ Habit unchecked');}
  else{h.done.push(today);showToast('✅ Habit done! +5 XP');addXP(5);}
  saveState();renderHabits();
}
async function deleteHabit(idx){const ok=await showConfirm('Habit Delete?','Yeh habit permanently delete ho jayegi.','Delete');if(!ok)return;habitsData.splice(idx,1);saveState();renderHabits();showToast('🗑 Habit deleted');}
function renderHabits(){
  const el=document.getElementById('habitListFull');
  if(!habitsData.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">🌱</div><div class="empty-text">Koi habit nahi hai abhi tak</div><button class="btn-primary" onclick="openModal('habitModal');resetHabitModal()">+ First Habit Add Karo</button></div>`;updateHabitProgress();return;}
  const today=new Date().toISOString().slice(0,10);
  el.innerHTML=habitsData.map((h,i)=>{
    const done=h.done||[];const streak=calcStreak(done);const checkedToday=done.includes(today);
    const days=['Su','Mo','Tu','We','Th','Fr','Sa'];const weekDays=Array.from({length:7},(_,d)=>{const dt=new Date();dt.setDate(dt.getDate()-6+d);const k=dt.toISOString().slice(0,10);const isToday=k===today;return`<div class="sday ${done.includes(k)?'done':isToday?'today':'miss'}">${days[dt.getDay()]}</div>`;}).join('');
    return`<div class="habit-item"><div class="habit-emoji">${h.emoji||'🌱'}</div>
      <div class="habit-body"><div class="habit-name">${esc(h.name)}</div><div class="habit-streak">🔥 ${streak} day streak</div>
      <div class="streak-days" style="margin-top:5px">${weekDays}</div></div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:center">
        <div class="habit-check-btn ${checkedToday?'checked':''}" onclick="toggleHabitDay(${i})">${checkedToday?'✓':'○'}</div>
        <div style="display:flex;gap:3px">
          <div class="t-act edit" onclick="editHabit(${i})">✏️</div>
          <div class="t-act del" onclick="deleteHabit(${i})">🗑</div>
        </div>
      </div>
    </div>`;
  }).join('');
  updateHabitProgress();
}
function editHabit(idx){const h=habitsData[idx];document.getElementById('habitModalTitle').textContent='✏️ Edit Habit';document.getElementById('editHabitIdx').value=idx;document.getElementById('hName').value=h.name;selEmoji=h.emoji||'🧘';document.querySelectorAll('.emoji-opt').forEach(e=>{e.classList.toggle('active',e.textContent===selEmoji)});openModal('habitModal');}
function updateHabitProgress(){
  const today=new Date().toISOString().slice(0,10);
  const total=habitsData.length;const done=habitsData.filter(h=>(h.done||[]).includes(today)).length;
  document.getElementById('habDoneCount').textContent=done+' / '+total+' Done';
  document.getElementById('habPct').textContent=total?Math.round(done/total*100)+'%':'0%';
  document.getElementById('habProgressFill').style.width=total?done/total*100+'%':'0%';
}

// ─── SKILLS ───
function resetSkillModal(){document.getElementById('skillModalTitle').textContent='⚡ Add Skill';document.getElementById('editSkillIdx').value='';document.getElementById('skName').value='';document.getElementById('skIcon').value='';document.getElementById('skLvl').value='Beginner';document.getElementById('skPct').value=50;document.getElementById('skPctLabel').textContent='50%';document.getElementById('skTags').value='';}
function saveSkill(){
  const name=document.getElementById('skName').value.trim();if(!name){showToast('❗ Skill ka naam daalo');return;}
  const editIdx=document.getElementById('editSkillIdx').value;
  const sk={name,icon:document.getElementById('skIcon').value||'⚡',lvl:document.getElementById('skLvl').value,pct:parseInt(document.getElementById('skPct').value),tags:document.getElementById('skTags').value.split(',').map(t=>t.trim()).filter(Boolean)};
  if(editIdx!=='')skillsData[parseInt(editIdx)]=sk;else skillsData.push(sk);
  closeModal('skillModal');saveState();renderSkills();showToast('⚡ Skill '+(editIdx!==''?'updated':'added')+'!');addXP(15);
}
async function deleteSkill(idx){const ok=await showConfirm('Skill Delete?','Yeh skill permanently delete ho jayegi.','Delete');if(!ok)return;skillsData.splice(idx,1);saveState();renderSkills();showToast('🗑 Skill deleted');}
function editSkill(idx){const sk=skillsData[idx];document.getElementById('skillModalTitle').textContent='✏️ Edit Skill';document.getElementById('editSkillIdx').value=idx;document.getElementById('skName').value=sk.name;document.getElementById('skIcon').value=sk.icon;document.getElementById('skLvl').value=sk.lvl;document.getElementById('skPct').value=sk.pct;document.getElementById('skPctLabel').textContent=sk.pct+'%';document.getElementById('skTags').value=(sk.tags||[]).join(', ');openModal('skillModal');}
function renderSkills(){
  const el=document.getElementById('skillListFull');
  if(!skillsData.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">⚡</div><div class="empty-text">Koi skill nahi hai</div><button class="btn-primary" onclick="openModal('skillModal');resetSkillModal()">+ Add First Skill</button></div>`;return;}
  el.innerHTML=skillsData.map((sk,i)=>`<div class="skill-item">
    <div class="skill-hdr"><span class="skill-icon">${sk.icon}</span><span class="skill-name">${esc(sk.name)}</span><span class="skill-lvl">${sk.lvl}</span>
    <div style="display:flex;gap:3px"><div class="t-act edit" onclick="editSkill(${i})">✏️</div><div class="t-act del" onclick="deleteSkill(${i})">🗑</div></div></div>
    <div class="skill-tags">${(sk.tags||[]).map(t=>`<span class="skill-tag">${esc(t)}</span>`).join('')}</div>
    <div class="skill-bar-row"><div class="skill-bar"><div class="skill-bar-fill" style="width:${sk.pct}%"></div></div><span class="skill-pct">${sk.pct}%</span></div>
  </div>`).join('');
  const rl=document.getElementById('roadmapList');
  rl.innerHTML=roadmapData.map((r,i)=>`<div class="roadmap-item">
    <div class="rm-line-col"><div class="rm-dot ${r.s}"></div>${i<roadmapData.length-1?`<div class="rm-connector ${r.s==='done'?'done':''}"></div>`:''}</div>
    <div class="rm-body"><div class="rm-title">${esc(r.t)}</div><div class="rm-desc">${esc(r.d)}</div></div>
  </div>`).join('');
}

// ─── CALENDAR ───
function renderCalendar(){
  const d=new Date(calYear,calMonth,1);const daysInMonth=new Date(calYear,calMonth+1,0).getDate();const firstDay=d.getDay();const today=new Date();
  document.getElementById('calMonthLabel').textContent=d.toLocaleString('default',{month:'long',year:'numeric'});
  const grid=document.getElementById('calGrid');
  const taskDates=new Set(tasks.filter(t=>t.due).map(t=>t.due));
  let html='';
  for(let i=0;i<firstDay;i++)html+=`<div class="cal-day other-month"></div>`;
  for(let day=1;day<=daysInMonth;day++){
    const dateStr=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday=today.getFullYear()===calYear&&today.getMonth()===calMonth&&today.getDate()===day;
    const isSel=calSelDate===dateStr;
    html+=`<div class="cal-day ${isToday?'today':''} ${taskDates.has(dateStr)?'has-tasks':''} ${isSel?'selected':''}" onclick="selectCalDay('${dateStr}')">${day}</div>`;
  }
  grid.innerHTML=html;
  renderCalTasks();
}
function selectCalDay(date){calSelDate=date;renderCalendar();}
function changeCalMonth(d){calMonth+=d;if(calMonth>11){calMonth=0;calYear++;}if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}
function renderCalTasks(){
  const el=document.getElementById('calTaskList');
  if(!calSelDate){el.innerHTML='<div style="font-size:12px;color:var(--t3);padding:8px 0">Koi din select karo tasks dekhne ke liye</div>';document.getElementById('calSelectedDate').textContent='Tasks';return;}
  document.getElementById('calSelectedDate').textContent=new Date(calSelDate+'T12:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'});
  const dayTasks=tasks.filter(t=>t.due===calSelDate);
  if(!dayTasks.length){el.innerHTML=`<div class="empty-state" style="padding:16px"><div class="empty-icon">📅</div><div class="empty-text">Is din koi task nahi</div><button class="btn-primary" onclick="openModal('taskModal');resetTaskModal();document.getElementById('mDue').value='${calSelDate}'">+ Add Task</button></div>`;return;}
  el.innerHTML=dayTasks.map(t=>`<div class="task-item ${t.done?'done-task':''}" style="border-left:3px solid ${cc(t.cat)};margin-bottom:6px"><div class="task-check ${t.done?'done':''}" onclick="toggleTask(${t.id})"></div><div class="task-body"><div class="task-title" style="font-size:12px">${esc(t.title)}</div><div class="task-meta"><span class="pri-badge pri-${t.pri}">${t.pri}</span></div></div></div>`).join('');
}

// ─── FOCUS ───
function renderFocusPage(){
  document.getElementById('focusTotalSess').textContent=focusStats.sessions||0;
  document.getElementById('focusTotalMin').textContent=focusStats.minutes||0;
  document.getElementById('focusStreak').textContent=focusStats.dayStreak||0;
  const mIdx=Math.floor(Date.now()/3600000)%MOTIVES.length;
  const m=MOTIVES[mIdx];
  document.getElementById('motiveQuote').innerHTML=`<em>${m.q}</em><br><span style="font-size:10px;color:var(--t3);margin-top:5px;display:block">${m.a}</span>`;
}
function enterFocus(){
  document.getElementById('focusView').classList.add('active');
  renderFocusTaskSel();
  renderFocusDots();
  updateFocusDisplay();
}
function exitFocus(){
  if(focusActive)clearInterval(focusTimer);
  focusActive=false;focusPhase='focus';
  document.getElementById('focusPlayBtn').textContent='▶';
  document.getElementById('focusView').classList.remove('active');
}
function toggleFocus(){
  if(focusActive){clearInterval(focusTimer);focusActive=false;document.getElementById('focusPlayBtn').textContent='▶';}
  else{focusActive=true;document.getElementById('focusPlayBtn').textContent='⏸';focusTimer=setInterval(tickFocus,1000);}
}
function tickFocus(){
  focusSeconds--;
  if(focusSeconds<=0){
    clearInterval(focusTimer);focusActive=false;
    if(focusPhase==='focus'){focusSessions++;focusStats.sessions=(focusStats.sessions||0)+1;focusStats.minutes=(focusStats.minutes||0)+focusDuration;const today=new Date().toISOString().slice(0,10);if(focusStats.lastDay!==today){focusStats.dayStreak=(focusStats.dayStreak||0)+1;focusStats.lastDay=today;}saveState();showToast('⏰ Focus session complete! Break time 🎉');focusPhase='break';focusSeconds=5*60;}
    else{showToast('☕ Break over! Ready for next session?');focusPhase='focus';focusSeconds=focusDuration*60;}
    document.getElementById('focusPlayBtn').textContent='▶';
    renderFocusDots();
    updateFocusDisplay();
    return;
  }
  updateFocusDisplay();
}
function updateFocusDisplay(){
  const mins=Math.floor(focusSeconds/60),secs=focusSeconds%60;
  document.getElementById('focusTimeNum').textContent=String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');
  document.getElementById('focusPhaseLabel').textContent=focusPhase==='focus'?'FOCUS':'☕ BREAK';
  const total=(focusPhase==='focus'?focusDuration:5)*60;
  const pct=(total-focusSeconds)/total;
  document.getElementById('focusRingCircle').style.strokeDashoffset=628-(628*pct);
}
function resetFocus(){clearInterval(focusTimer);focusActive=false;focusPhase='focus';focusSeconds=focusDuration*60;document.getElementById('focusPlayBtn').textContent='▶';updateFocusDisplay();}
function skipFocusPhase(){clearInterval(focusTimer);focusActive=false;focusPhase=focusPhase==='focus'?'break':'focus';focusSeconds=(focusPhase==='focus'?focusDuration:5)*60;document.getElementById('focusPlayBtn').textContent='▶';updateFocusDisplay();}
function setFocusDuration(min){focusDuration=min;document.getElementById('focusView').querySelectorAll('[id^=fd]').forEach(b=>b.classList.remove('active'));document.getElementById('fd'+min)?.classList.add('active');resetFocus();}
function renderFocusDots(){const c=document.getElementById('focusSessionDots');c.innerHTML=Array.from({length:4},(_,i)=>`<div class="fsess-dot ${i<focusSessions%4?'done':''}"></div>`).join('');}
function renderFocusTaskSel(){
  const c=document.getElementById('focusTaskSel');
  const pending=tasks.filter(t=>!t.done);
  if(!pending.length){c.innerHTML='<div style="font-size:11px;color:var(--t3);padding:4px">Koi pending task nahi</div>';return;}
  c.innerHTML=pending.slice(0,8).map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:9px;cursor:pointer;border:1px solid transparent;transition:all .15s;font-size:12px;font-weight:600;color:var(--t2)" onclick="selectFocusTask(${t.id},this)" class="fts-item ${focusTaskId===t.id?'selected':''}"><div style="width:5px;height:5px;border-radius:50%;background:${cc(t.cat)};flex-shrink:0"></div>${esc(t.title)}</div>`).join('');
}
function selectFocusTask(id,el){focusTaskId=id;document.querySelectorAll('.fts-item').forEach(e=>e.classList.remove('selected'));el.classList.add('selected');const t=tasks.find(x=>x.id===id);document.getElementById('focusTaskPill').textContent='🎯 '+esc(t.title);toggleFocusTaskSel();}
function toggleFocusTaskSel(){const s=document.getElementById('focusTaskSel');s.style.display=s.style.display==='none'?'block':'none';}

// ─── AI DASHBOARD SUGGESTIONS ───
async function renderAISugs(){
  const pending=tasks.filter(t=>!t.done);const done=tasks.filter(t=>t.done).length;const high=pending.filter(t=>t.pri==='high');
  const localSugs=[
    high.length?{t:`🔴 ${high.length} High-Priority`,b:`"${esc(high[0]?.title)}" — pehle yeh karo`}:{t:'🎯 Sabhi high tasks done!',b:'Great! Medium tasks par focus karo.'},
    {t:'📊 Aapki Progress',b:`${done}/${tasks.length} tasks done (${tasks.length?Math.round(done/tasks.length*100):0}%)`},
    library.length?{t:'📚 '+esc(library[0]?.title),b:`${library[0]?.progress||0}% read — reading continue karo!`}:{t:'📚 Koi book nahi',b:'Library mein PDF upload karo'},
  ];
  const el=document.getElementById('aiSugs');if(!el)return;
  el.innerHTML=localSugs.map(s=>`<div class="ai-sug-card"><div class="ai-sug-title">${esc(s.t)}</div><div class="ai-sug-body">${esc(s.b)}</div></div>`).join('');
  const apiKey=localStorage.getItem('fbp_apikey');
  if(!apiKey||window._aiTipLast&&Date.now()-window._aiTipLast<300000)return;
  window._aiTipLast=Date.now();
  try{
    const ctx=`User: ${userName}. Tasks: ${tasks.length} total, ${done} done, ${pending.length} pending. High priority: ${high.map(t=>t.title).slice(0,3).join(', ')||'none'}. Books: ${library.length}. Habits: ${habitsData.length}.`;
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:300,system:'You are a productivity AI. Give 3 short actionable tips in Hindi/English mix. Return ONLY valid JSON array: [{"t":"emoji title","b":"one sentence tip"}]. No markdown.',messages:[{role:'user',content:ctx}]})});
    const d=await r.json();const text=d.content?.[0]?.text||'';
    const tips=JSON.parse(text.replace(/```json|```/g,'').trim());
    if(Array.isArray(tips)&&tips.length)el.innerHTML=tips.map(s=>`<div class="ai-sug-card"><div class="ai-sug-title">${esc(s.t)}</div><div class="ai-sug-body">${esc(s.b)}</div></div>`).join('');
  }catch(e){}
}

// ─── AI CHAT ───
async function sendAIMsg(){
  const inp=document.getElementById('aiUserInput');const msg=inp.value.trim();if(!msg)return;inp.value='';
  aiMsgs.push({role:'user',content:msg});renderAIChat();
  const apiKey=localStorage.getItem('fbp_apikey');
  if(!apiKey){aiMsgs.push({role:'assistant',content:'⚠️ API key nahi hai. Settings > AI Assistant mein add karo.'});renderAIChat();return;}
  const log=document.getElementById('aiChatLog');log.scrollTop=log.scrollHeight;
  try{
    const ctx=`User: ${userName}. Tasks: ${tasks.length}, Done: ${tasks.filter(t=>t.done).length}. Books: ${library.map(b=>b.title).slice(0,3).join(', ')||'None'}. Current book: ${currentBookTitle||'None'}.`;
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:500,system:'You are FlowBook Pro AI assistant. Help with productivity, tasks, reading, and study. Be helpful and concise. User context: '+ctx,messages:aiMsgs})});
    const d=await r.json();
    const reply=d.content?.[0]?.text||'Kuch error aa gaya. Dobara try karo.';
    aiMsgs.push({role:'assistant',content:reply});renderAIChat();
  }catch(e){aiMsgs.push({role:'assistant',content:'⚠️ Error: '+e.message});renderAIChat();}
}
function askAI(prompt){document.getElementById('aiUserInput').value=prompt;showView('ai',document.getElementById('nb-ai'));sendAIMsg();}
function renderAIChat(){
  const log=document.getElementById('aiChatLog');
  log.innerHTML=aiMsgs.length?aiMsgs.map(m=>`<div class="chat-msg ${m.role}"><div class="msg-label">${m.role==='user'?'YOU':'AI'}</div><div class="msg-text">${esc(m.content)}</div></div>`).join(''):'<div style="font-size:11px;color:var(--t3);padding:4px">Kuch poocho…</div>';
  log.scrollTop=log.scrollHeight;
}
function saveApiKey(){const k=document.getElementById('apiKeyInput').value.trim();if(!k){showToast('❗ Key daalo');return;}localStorage.setItem('fbp_apikey',k);showToast('✅ API Key saved!');}
async function testApiKey(){
  const apiKey=localStorage.getItem('fbp_apikey');
  if(!apiKey){showToast('❗ Pehle API key save karo');return;}
  showToast('🔌 Testing…');
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:10,messages:[{role:'user',content:'Hi'}]})});
    const d=await r.json();
    if(d.content)showToast('✅ AI Connected! Claude ready hai');
    else showToast('❌ Invalid key: '+JSON.stringify(d.error?.message||d));
  }catch(e){showToast('❌ Error: '+e.message);}
}

// ─── PDF / BOOKORA ───

// PDF worker configured in main.js

async function loadPDF(input){
  const file=input.files[0];if(!file)return;
  showLoading('📄 PDF load ho raha hai…');
  try{
    const arrayBuffer=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:arrayBuffer}).promise;
    let fullText='';
    for(let i=1;i<=Math.min(pdf.numPages,400);i++){
      const page=await pdf.getPage(i);
      const textContent=await page.getTextContent();
      let lastY=null,pageText='';
      textContent.items.forEach(item=>{
        if(lastY!==null&&Math.abs(item.transform[5]-lastY)>2)pageText+='\n';
        pageText+=item.str+' ';
        lastY=item.transform[5];
      });
      fullText+=pageText.trim()+'\n\n';
    }
    fullText=fullText.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
    // Split full text into reading-pages by character count so NO text is ever cut off
    const CHARS_PER_PAGE=900;
    const pages=[];
    let remaining=fullText;
    let pageNum=1;
    while(remaining.length>0){
      if(remaining.length<=CHARS_PER_PAGE){
        pages.push({chapter:'Page '+pageNum,content:remaining.trim()});
        break;
      }
      let cut=remaining.lastIndexOf('\n\n',CHARS_PER_PAGE);
      if(cut<CHARS_PER_PAGE*0.5)cut=remaining.lastIndexOf('. ',CHARS_PER_PAGE);
      if(cut<CHARS_PER_PAGE*0.5)cut=remaining.lastIndexOf(' ',CHARS_PER_PAGE);
      if(cut<=0)cut=CHARS_PER_PAGE;
      pages.push({chapter:'Page '+pageNum,content:remaining.slice(0,cut).trim()});
      remaining=remaining.slice(cut).trim();
      pageNum++;
    }
    const title=file.name.replace('.pdf','');
    const bookData={id:Date.now(),title,pages,progress:0,addedAt:new Date().toISOString(),bg:BOOK_GRADIENTS[library.length%BOOK_GRADIENTS.length],icon:'📖',totalPages:pages.length};
    library.unshift(bookData);
    saveState();hideLoading();
    showToast(`✨ "${title}" ready! ${pages.length} pages`);addXP(50);
    openBook(0);renderLibrary();
  }catch(e){hideLoading();showToast('❌ PDF Error: '+e.message.slice(0,60));}
  input.value='';
}
function handleDragBook(e,over){e.preventDefault();document.getElementById('dropZone').classList.toggle('drag-over',over);}
function handleDropBook(e){e.preventDefault();document.getElementById('dropZone').classList.remove('drag-over');const f=e.dataTransfer?.files?.[0];if(f&&f.name.endsWith('.pdf')){const inp=document.getElementById('pdfInput');const dt=new DataTransfer();dt.items.add(f);inp.files=dt.files;loadPDF(inp);}}
function openBook(idx){
  currentBookIdx=idx;
  const book=library[idx];if(!book)return;
  bookPages=book.pages||[];currentPage=book.lastPage||0;currentBookTitle=book.title;
  showView('reader',document.getElementById('nb-reader'));setBN('library');
  document.getElementById('readerEmpty').style.display='none';
  document.getElementById('readerActive').style.display='block';
  document.getElementById('readerBookTitle').textContent=currentBookTitle;
  renderBookPages();updateReadProgress();
  initDefaultFlashcards();
}
function renderBookPages(){
  if(!bookPages.length)return;
  const leftPage=bookPages[currentPage];
  const rightPage=bookPages[currentPage+1];
  function fullPageHTML(p){
    if(!p)return'';
    const paras=p.content.split(/\n\n+/).filter(Boolean);
    return`<div class="page-chapter-tag">${esc(p.chapter||'')}</div>`+paras.map(para=>`<p class="left-para">${esc(para)}</p>`).join('');
  }
  document.getElementById('leftPageContent').innerHTML=fullPageHTML(leftPage);
  document.getElementById('rightPageContent').innerHTML=rightPage?fullPageHTML(rightPage):`<div class="page-chapter-tag">END</div><p class="right-para" style="text-align:center;margin-top:40px;opacity:.6">— End of Book —</p>`;
  document.getElementById('leftPageNum').textContent=currentPage+1;
  document.getElementById('rightPageNum').textContent=Math.min(currentPage+2,bookPages.length);
  document.getElementById('scrollPageContent').innerHTML=`<div style="font-family:'Georgia',serif;font-size:14px;line-height:1.9;color:#2a1f0e"><p><strong>${esc(leftPage?.chapter||'')}</strong></p><br>${(leftPage?.content||'').split(/\n\n+/).filter(Boolean).map(p=>`<p style="margin-bottom:14px">${esc(p)}</p>`).join('')}</div>`;
  updateReadProgress();
  // Save progress
  if(library[currentBookIdx]){library[currentBookIdx].lastPage=currentPage;library[currentBookIdx].progress=Math.round((currentPage/Math.max(bookPages.length-1,1))*100);saveState();}
}
function nextPage(){
  if(currentPage>=bookPages.length-1||isFlipping)return;
  isFlipping=true;
  const fp=document.getElementById('flipPage');
  const ff=document.getElementById('flipFront');const fb=document.getElementById('flipBack');
  const curContent=document.getElementById('rightPageContent').innerHTML;
  const nxt=bookPages[currentPage+2];
  function fullPageHTML(p){if(!p)return'';const paras=p.content.split(/\n\n+/).filter(Boolean);return`<div class="page-chapter-tag">${esc(p.chapter||'')}</div>`+paras.map(para=>`<p class="left-para">${esc(para)}</p>`).join('');}
  ff.innerHTML=curContent;
  fb.innerHTML=nxt?fullPageHTML(nxt):'';
  fp.style.animation='none';fp.style.transform='rotateY(0)';fp.offsetHeight;
  fp.style.animation='flipToLeft 0.5s cubic-bezier(.4,0,.2,1) forwards';
  setTimeout(()=>{currentPage=Math.min(currentPage+2,bookPages.length-1);renderBookPages();fp.style.animation='none';fp.style.transform='';isFlipping=false;},500);
}
function prevPage(){
  if(currentPage<2||isFlipping)return;
  isFlipping=true;
  const fp=document.getElementById('flipPage');
  fp.style.animation='none';fp.style.transform='rotateY(-180deg)';fp.offsetHeight;
  fp.style.animation='flipToRight 0.5s cubic-bezier(.4,0,.2,1) forwards';
  setTimeout(()=>{currentPage=Math.max(0,currentPage-2);renderBookPages();fp.style.animation='none';fp.style.transform='';isFlipping=false;},500);
}
function updateReadProgress(){
  const pct=bookPages.length?Math.round((currentPage/Math.max(bookPages.length-1,1))*100):0;
  document.getElementById('readProgressFill').style.width=pct+'%';
  document.getElementById('pageCounter').textContent=(currentPage+1)+' / '+bookPages.length;
  document.getElementById('readPct').textContent=pct+'%';
  document.getElementById('prevPageBtn').disabled=currentPage<2;
  document.getElementById('nextPageBtn').disabled=currentPage>=bookPages.length-1;
}
function setReadView(v){
  readView=v;
  document.getElementById('read3DView').style.display=v==='3d'?'block':'none';
  document.getElementById('readScrollView').style.display=v==='scroll'?'block':'none';
  ['rtView3D','rtViewScroll'].forEach(id=>document.getElementById(id)?.classList.remove('active'));
  document.getElementById(v==='3d'?'rtView3D':'rtViewScroll')?.classList.add('active');
}
function enterReadFocus(){showToast('🧘 Focus reading mode: Swipe or arrow keys to turn pages');document.documentElement.classList.add('focus-mode');}

// TTS
function toggleTTS(){
  ttsActive=!ttsActive;document.getElementById('ttsBtn').textContent=ttsActive?'🔇 Stop':'🔊 TTS';
  if(ttsActive){
    const text=bookPages[currentPage]?.content||'';
    ttsUtterance=new SpeechSynthesisUtterance(text);ttsUtterance.lang='en-IN';
    ttsUtterance.onend=()=>{ttsActive=false;document.getElementById('ttsBtn').textContent='🔊 TTS';};
    window.speechSynthesis.speak(ttsUtterance);
  }else{window.speechSynthesis.cancel();}
}

// ─── LIBRARY VIEW ───
function renderLibrary(){
  const el=document.getElementById('libraryGrid');
  if(!library.length){el.innerHTML='';renderTrending();renderReadStreak();return;}
  el.innerHTML=`<div class="sec-label">YOUR BOOKS (${library.length})</div>`+library.map((b,i)=>`<div class="card mb16" style="cursor:pointer" onclick="openBook(${i})">
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="width:56px;height:80px;border-radius:8px;flex-shrink:0;background:${b.bg};display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 6px 20px rgba(0,0,0,.4)">${b.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.title)}</div>
        <div style="font-size:10px;color:var(--t3);margin-bottom:7px">${b.totalPages} pages • ${b.progress||0}% read</div>
        <div class="skill-bar"><div class="skill-bar-fill" style="width:${b.progress||0}%"></div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <div class="t-act" onclick="event.stopPropagation();addToWishlist(${i})" title="Wishlist">💖</div>
        <div class="t-act del" onclick="event.stopPropagation();deleteBook(${i})" title="Delete">🗑</div>
      </div>
    </div>
  </div>`).join('');
  renderTrending();renderReadStreak();
}
async function deleteBook(idx){const ok=await showConfirm('Book Delete?','Yeh book permanently delete ho jayegi.','Delete');if(!ok)return;library.splice(idx,1);if(currentBookIdx===idx){currentBookIdx=-1;document.getElementById('readerEmpty').style.display='block';document.getElementById('readerActive').style.display='none';}saveState();renderLibrary();showToast('🗑 Book deleted');}
function renderDashBook(){
  const el=document.getElementById('dashCurrentBook');
  if(!library.length){el.innerHTML=`<div class="empty-state" style="padding:12px"><div class="empty-icon">📖</div><div class="empty-text">Koi book nahi hai</div><button class="btn-primary" style="display:inline-block;width:auto;padding:8px 14px;font-size:12px" onclick="document.getElementById('pdfInput').click()">+ PDF Upload Karo</button></div>`;return;}
  const b=library[0];
  el.innerHTML=`<div style="display:flex;gap:10px;align-items:center;cursor:pointer" onclick="openBook(0)"><div style="width:44px;height:64px;border-radius:7px;background:${b.bg};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📖</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.title)}</div><div style="font-size:10px;color:var(--t3);margin:3px 0">${b.progress||0}% read • ${b.totalPages} pages</div><div class="skill-bar"><div class="skill-bar-fill" style="width:${b.progress||0}%"></div></div></div><button class="btn-primary" style="width:auto;padding:8px 14px;font-size:12px;flex-shrink:0">Continue →</button></div>`;
}

// Trending Books

function renderTrending(){
  const el=document.getElementById('trendingBooks');
  el.innerHTML=TRENDING.map((b,i)=>`<div class="book-card-sm" onclick="addTrendingBook('${i}')"><div class="book-cover-sm" style="background:${b.bg}"><div class="bc-title-sm">${esc(b.title)}</div><div class="bc-author-sm">${esc(b.author)}</div></div><div class="book-meta-sm"><span class="book-name-sm">${esc(b.title)}</span></div></div>`).join('');
}
function addTrendingBook(idx){
  const b=TRENDING[parseInt(idx)];
  if(library.find(x=>x.title===b.title)){showToast('📚 Yeh book pehle se hai!');return;}
  // Create demo pages for trending books
  const demoPages=[{chapter:'Introduction',content:`Welcome to "${b.title}" by ${b.author}. ${b.desc}. This is a demo placeholder. Upload the actual PDF for full reading experience. This book explores fascinating concepts that can transform your life and way of thinking.`},{chapter:'Chapter 1',content:`Chapter 1 of ${b.title}. The journey begins here. Upload the actual PDF to read the complete book with all its chapters, insights, and wisdom. This demo shows how the reader works.`}];
  library.unshift({id:Date.now(),title:b.title,author:b.author,pages:demoPages,progress:0,bg:b.bg,icon:b.icon,totalPages:demoPages.length,addedAt:new Date().toISOString(),isDemo:true});
  saveState();renderLibrary();showToast(`📚 "${b.title}" added (demo)! Upload PDF for full book.`);addXP(10);
}
function renderReadStreak(){
  const today=new Date();const days=['Su','Mo','Tu','We','Th','Fr','Sa'];
  document.getElementById('readStreak').textContent=`${library.length} books`;
  document.getElementById('streakDays').innerHTML=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const isToday=d.toDateString()===today.toDateString();return`<div class="sday ${isToday?'today':'miss'}">${days[d.getDay()]}</div>`;}).join('');
}

// ─── NOTES ───
function addNote(){
  const text=document.getElementById('noteInput').value.trim();if(!text){showToast('❗ Note likhein pehle');return;}
  const color=document.getElementById('noteColorSel').value;
  notes.unshift({id:Date.now(),text,color,book:currentBookTitle||'General',page:currentPage+1,createdAt:new Date().toISOString()});
  document.getElementById('noteInput').value='';saveState();renderNotes();showToast('📝 Note saved!');addXP(5);
}
async function deleteNote(id){const ok=await showConfirm('Note Delete?','Yeh note delete ho jayega.','Delete');if(!ok)return;notes=notes.filter(n=>n.id!==id);saveState();renderNotes();showToast('🗑 Note deleted');}
function renderNotes(){
  const el=document.getElementById('notesList');
  if(!notes.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">✍️</div><div class="empty-text">Koi note nahi hai abhi tak</div></div>`;return;}
  el.innerHTML=notes.map(n=>`<div class="note-card"><div class="note-tag-bar" style="background:${n.color||'#a78bfa'}"></div><div class="note-inner"><div class="note-cat">${esc(n.book||'General')}</div><div class="note-body">${esc(n.text)}</div><div class="note-foot"><span class="note-page">${n.book?'📖 p.'+n.page:''} · ${new Date(n.createdAt).toLocaleDateString('en-IN')}</span><div class="t-act del" onclick="deleteNote(${n.id})" style="cursor:pointer">🗑</div></div></div></div>`).join('');
}

// ─── WISHLIST ───
function addToWishlist(idx){const b=library[idx];if(!b)return;if(wishlist.find(w=>w.title===b.title)){showToast('💖 Pehle se wishlist mein hai!');return;}wishlist.push({title:b.title,bg:b.bg,icon:b.icon,addedAt:new Date().toISOString()});saveState();showToast(`💖 "${b.title}" wishlist mein add ki!`);}
function renderWishlist(){const el=document.getElementById('wishlist-items');if(!wishlist.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">💔</div><div class="empty-text">Wishlist khali hai!</div></div>`;return;}el.innerHTML=wishlist.map((w,i)=>`<div class="habit-item"><div class="habit-emoji" style="background:${w.bg};border-radius:10px;font-size:22px">${w.icon}</div><div class="habit-body"><div class="habit-name">${esc(w.title)}</div></div><div class="t-act del" onclick="removeWish(${i})">✕</div></div>`).join('');}
function removeWish(i){wishlist.splice(i,1);saveState();renderWishlist();showToast('🗑 Wishlist se hataya');}

// ─── STUDY TOOLS ───

function initDefaultFlashcards(){
  if(bookPages.length>3){
    flashcards=bookPages.slice(0,6).map((p,i)=>({q:`What is the key concept of ${p.chapter}?`,a:p.content?.slice(0,150)+'…'}));
  }else{flashcards=[...DEFAULT_FLASHCARDS];}
  fcIdx=0;renderFlashcard();
}
function renderFlashcard(){
  const el=document.getElementById('flashcardContainer');if(!flashcards.length){el.innerHTML='<div class="empty-state"><div class="empty-text">Koi flashcard nahi</div></div>';return;}
  const fc=flashcards[fcIdx];
  el.innerHTML=`<div class="flashcard" id="curFC" onclick="this.classList.toggle('flipped')"><div class="fc-q">${esc(fc.q)}</div><div class="fc-a">${esc(fc.a)}</div><div class="fc-tap">👆 Tap to reveal answer (${fcIdx+1}/${flashcards.length})</div></div>`;
}
function fcNext(){fcIdx=(fcIdx+1)%flashcards.length;renderFlashcard();}
function fcPrev(){fcIdx=(fcIdx-1+flashcards.length)%flashcards.length;renderFlashcard();}
function shuffleFlashcards(){flashcards=flashcards.sort(()=>Math.random()-.5);fcIdx=0;renderFlashcard();showToast('🔀 Shuffled!');}
function renderStudy(){
  if(!flashcards.length)initDefaultFlashcards();
  renderFlashcard();
  document.getElementById('studyPages').textContent=library.reduce((s,b)=>s+Math.floor((b.progress||0)/100*(b.totalPages||0)),0);
  document.getElementById('studyBooks').textContent=library.length;
  document.getElementById('studyNotes').textContent=notes.length;
}
async function getAISummary(){
  const apiKey=localStorage.getItem('fbp_apikey');
  if(!apiKey){showToast('❗ Settings mein API key add karo');return;}
  if(!bookPages.length){showToast('❗ Pehle koi book open karo');return;}
  showToast('🤖 AI summary generate ho rahi hai…');
  const sampleText=bookPages.slice(0,3).map(p=>p.content).join(' ').slice(0,1000);
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:400,messages:[{role:'user',content:`Summarize this book content in 3-4 key points in Hindi/English mix:\n\nBook: ${currentBookTitle}\n\nContent: ${sampleText}`}]})});
    const d=await r.json();const text=d.content?.[0]?.text||'Summary generate nahi ho saki.';
    document.getElementById('aiBookSummary').textContent=text;showToast('✅ AI Summary ready!');
  }catch(e){showToast('❌ Error: '+e.message);}
}

// ─── ANALYTICS ───
function renderSettings(){
  document.getElementById('settingsName').textContent=userName;
  document.getElementById('settingsEmail').textContent=currentEmail||'Guest';
  document.getElementById('settingsAvatar').textContent=userAvatar;
  document.getElementById('settingsNameInput').value=userName;
  document.getElementById('setTaskCount').textContent=tasks.length;
  document.getElementById('setHabitCount').textContent=habitsData.length;
  document.getElementById('setSkillCount').textContent=skillsData.length;
  document.getElementById('setBookCount').textContent=library.length;
  const apiKey=localStorage.getItem('fbp_apikey');
  if(apiKey)document.getElementById('apiKeyInput').value=apiKey;
}
function saveDisplayName(){const n=document.getElementById('settingsNameInput').value.trim();if(!n)return;userName=n;saveState();renderStats();renderSettings();showToast('✅ Naam update hua!');}
function initCharts(){
  if(chartsInit)return;chartsInit=true;
  const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d.toISOString().slice(0,10);});
  const weeklyData=last7.map(date=>tasks.filter(t=>t.done&&t.createdAt?.slice(0,10)===date).length);
  const bookData=last7.map((_,i)=>i<library.length?library[library.length-1-i]?.progress||0:0);
  const wCtx=document.getElementById('weeklyChart')?.getContext('2d');
  if(wCtx)weeklyChartInst=new Chart(wCtx,{type:'bar',data:{labels:last7.map(d=>new Date(d+'T12:00').toLocaleDateString('en',{weekday:'short'})),datasets:[{data:weeklyData,backgroundColor:'rgba(124,58,237,.6)',borderColor:'#7c3aed',borderWidth:1,borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:'rgba(248,250,252,.4)',stepSize:1},grid:{color:'rgba(255,255,255,.05)'}},x:{ticks:{color:'rgba(248,250,252,.4)'},grid:{display:false}}}}});
  const rCtx=document.getElementById('readingChart')?.getContext('2d');
  if(rCtx)readingChartInst=new Chart(rCtx,{type:'line',data:{labels:library.slice(0,5).map(b=>b.title.slice(0,12))||['No books'],datasets:[{data:library.slice(0,5).map(b=>b.progress||0)||[0],borderColor:'#06b6d4',backgroundColor:'rgba(6,182,212,.15)',fill:true,tension:.4,pointBackgroundColor:'#06b6d4'}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100,ticks:{color:'rgba(248,250,252,.4)',callback:v=>v+'%'},grid:{color:'rgba(255,255,255,.05)'}},x:{ticks:{color:'rgba(248,250,252,.4)'},grid:{display:false}}}}});
  const done=tasks.filter(t=>t.done).length;
  document.getElementById('aTasks').textContent=done;
  document.getElementById('aHabits').textContent=habitsData.length;
  document.getElementById('aBooks').textContent=library.length;
  document.getElementById('aFocus').textContent=Math.round((focusStats.minutes||0)/60*10)/10;
}

// ─── THEME / SETTINGS ───
function toggleTheme(){const isDark=!document.documentElement.dataset.theme;document.documentElement.dataset.theme=isDark?'light':'dark';const btn=document.getElementById('themeToggleBtn');if(btn)btn.textContent=isDark?'☀️ Light':'🌙 Dark';saveState();}
function setAccent(color,el){accentColor=color;document.documentElement.style.setProperty('--np',color);document.documentElement.style.setProperty('--accent',color);document.documentElement.style.setProperty('--grad',`linear-gradient(135deg,${color},#06b6d4)`);document.documentElement.style.setProperty('--accentg',`linear-gradient(135deg,${color},#a78bfa)`);document.querySelectorAll('.color-dot').forEach(d=>d.classList.remove('active'));if(el)el.classList.add('active');saveState();}
async function clearAllTasks(){const ok=await showConfirm('Clear All Tasks?','Saare tasks delete ho jayenge.','Clear All');if(!ok)return;tasks=[];saveState();renderAll();showToast('🗑 All tasks cleared');}
async function clearLibrary(){const ok=await showConfirm('Clear Library?','Saari books delete ho jayengi.','Clear');if(!ok)return;library=[];saveState();renderLibrary();showToast('🗑 Library cleared');}
async function resetAll(){const ok=await showConfirm('Reset Everything?','Saara data delete ho jayega. Yeh action undo nahi ho sakti!','Reset All');if(!ok)return;localStorage.removeItem(STORE);location.reload();}
function exportJSON(){const data=JSON.stringify({tasks,habitsData,skillsData,notes,library,focusStats,exportedAt:new Date().toISOString()},null,2);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download='flowbook_backup.json';a.click();showToast('💾 JSON exported!');}
function exportCSV(){const rows=[['Title','Category','Priority','Done','Due'],...tasks.map(t=>[t.title,t.cat,t.pri,t.done,t.due||''])];const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='tasks.csv';a.click();showToast('📊 CSV exported!');}
function importData(){document.getElementById('importFile').click();}
function handleImport(input){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>{try{const d=JSON.parse(e.target.result);if(d.tasks)tasks=d.tasks;if(d.habitsData)habitsData=d.habitsData;if(d.skillsData)skillsData=d.skillsData;if(d.notes)notes=d.notes;saveState();renderAll();showToast('📥 Data imported!');}catch(err){showToast('❌ Invalid file');}};reader.readAsText(file);input.value='';}

// ─── FILTER LIBRARY ───
function filterLibrary(q){
  const cards=document.querySelectorAll('#libraryGrid .card');
  cards.forEach((c,i)=>{const title=library[i]?.title||'';c.style.display=q&&!title.toLowerCase().includes(q.toLowerCase())?'none':'';});
}

// ─── RENDER READER (when switching to reader tab) ───
function renderReader(){
  if(bookPages.length){document.getElementById('readerEmpty').style.display='none';document.getElementById('readerActive').style.display='block';}
  else{document.getElementById('readerEmpty').style.display='block';document.getElementById('readerActive').style.display='none';}
}

// ─── ONLINE/OFFLINE ───
window.addEventListener('offline',()=>{document.getElementById('offlineBanner').style.display='block';showToast('📵 Offline — changes saved locally');});
window.addEventListener('online',()=>{document.getElementById('offlineBanner').style.display='none';showToast('🌐 Back online!');});

// ─── KEYBOARD SHORTCUTS ───
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  if(e.key==='ArrowRight'&&currentView==='reader')nextPage();
  if(e.key==='ArrowLeft'&&currentView==='reader')prevPage();
  if(e.key==='Escape'){document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));if(document.getElementById('focusView').classList.contains('active'))exitFocus();document.documentElement.classList.remove('focus-mode');}
});

// ─── INIT APP ───
function setAmbientGlow(){
  const h=new Date().getHours();
  const el=document.getElementById('ambGlow');if(!el)return;
  el.style.background=(h>=6&&h<12)?'var(--amb-day)':(h>=17&&h<21)?'var(--amb-eve)':'var(--amb-night)';
}
function initApp(){
  document.getElementById('mainApp').style.display='flex';
  // Apply saved theme
  if(S?.theme==='light')document.documentElement.dataset.theme='light';
  if(S?.accentColor)setAccent(S.accentColor,null);
  // Sidebar: slim on mobile by default
  if(window.innerWidth<769)document.getElementById('sidebar').classList.remove('open');
  // Render everything
  renderAll();renderHabits();renderSkills();
  setAmbientGlow();
  showView('dashboard',document.getElementById('nb-dashboard'));
  initDefaultFlashcards();
  renderTrending();
  // Greeting time
  const h=new Date().getHours();
  const greet=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  document.getElementById('heroGreet').textContent=greet+', '+userName+'! '+(h<12?'🌅':h<17?'☀️':'🌙');
}

// ─── AUTO-LOGIN CHECK ───
window.addEventListener('load',()=>{
  const savedLogin=localStorage.getItem('fbp_session');
  if(savedLogin){
    const s=JSON.parse(savedLogin);
    userName=s.name||'User';userAvatar=s.avatar||'😎';currentEmail=s.email||'';
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('mainApp').style.display='flex';
    initApp();
  }
});

// ─── SWIPE SUPPORT (mobile page turning) ───
let touchStartX=0;
document.addEventListener('touchstart',e=>touchStartX=e.touches[0].clientX,{passive:true});
document.addEventListener('touchend',e=>{
  if(currentView!=='reader')return;
  const dx=e.changedTouches[0].clientX-touchStartX;
  if(Math.abs(dx)>60){if(dx<0)nextPage();else prevPage();}
},{passive:true});

// Expose handlers for inline HTML attributes
Object.assign(window, {
  esc,
  loadState,
  saveState,
  setSyncStatus,
  showToast,
  showLoading,
  hideLoading,
  openModal,
  closeModal,
  showConfirm,
  toggleLoginMode,
  showAuthErr,
  getUsers,
  saveUsers,
  sha256,
  doLogin,
  doSignup,
  guestLogin,
  completeLogin,
  logout,
  showView,
  setBN,
  toggleSidebar,
  handleFAB,
  handleSearch,
  cc,
  resetTaskModal,
  saveTask,
  openEditTask,
  deleteTask,
  toggleTask,
  setFilter,
  getFiltered,
  renderTaskItem,
  renderTaskList,
  renderRecentTasks,
  addSubtask,
  toggleSub,
  deleteSub,
  toggleSubContainer,
  dragStart,
  dragEnd,
  dragOver,
  dragLeave,
  dropOn,
  calcStreak,
  renderStats,
  addXP,
  renderAll,
  resetHabitModal,
  pickEmoji,
  saveHabit,
  toggleHabitDay,
  deleteHabit,
  renderHabits,
  editHabit,
  updateHabitProgress,
  resetSkillModal,
  saveSkill,
  deleteSkill,
  editSkill,
  renderSkills,
  renderCalendar,
  selectCalDay,
  changeCalMonth,
  renderCalTasks,
  renderFocusPage,
  enterFocus,
  exitFocus,
  toggleFocus,
  tickFocus,
  updateFocusDisplay,
  resetFocus,
  skipFocusPhase,
  setFocusDuration,
  renderFocusDots,
  renderFocusTaskSel,
  selectFocusTask,
  toggleFocusTaskSel,
  renderAISugs,
  sendAIMsg,
  askAI,
  renderAIChat,
  saveApiKey,
  testApiKey,
  loadPDF,
  handleDragBook,
  handleDropBook,
  openBook,
  renderBookPages,
  nextPage,
  prevPage,
  updateReadProgress,
  setReadView,
  enterReadFocus,
  toggleTTS,
  renderLibrary,
  deleteBook,
  renderDashBook,
  renderTrending,
  addTrendingBook,
  renderReadStreak,
  addNote,
  deleteNote,
  renderNotes,
  addToWishlist,
  renderWishlist,
  removeWish,
  initDefaultFlashcards,
  renderFlashcard,
  fcNext,
  fcPrev,
  shuffleFlashcards,
  renderStudy,
  getAISummary,
  renderSettings,
  saveDisplayName,
  initCharts,
  toggleTheme,
  setAccent,
  clearAllTasks,
  clearLibrary,
  resetAll,
  exportJSON,
  exportCSV,
  importData,
  handleImport,
  filterLibrary,
  renderReader,
  setAmbientGlow,
  initApp,
});
