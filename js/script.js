// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
const TOTAL_STEPS = 7;
let currentStep = 1;
let isAdmin = false;
let selectedMasterAR = '';
let selectedLogoPos = 'top-right';
const aiState = {};
const lockedFields = {};

const INDIAN_LANGUAGES = [
  'Assamese','Bengali','Bodo','Dogri','Gujarati','Hindi','Kannada','Kashmiri',
  'Konkani','Maithili','Malayalam','Manipuri','Marathi','Nepali','Odia',
  'Punjabi','Sanskrit','Santali','Sindhi','Tamil','Telugu','Urdu','English',
  'Bhojpuri','Chhattisgarhi','Haryanvi','Rajasthani','Awadhi','Magahi',
  'Tulu','Kodava','Mizo','Khasi','Garo','Lepcha','Sikkimese','Braj'
].sort();

const AR_DATA = [
  {val:'16:9', label:'16:9', desc:'Landscape', platforms:'TV · YouTube · OTT', icon:'landscape', recommend:'TV'},
  {val:'9:16', label:'9:16', desc:'Portrait', platforms:'Reels · Stories · Shorts', icon:'portrait', recommend:'Reels'},
  {val:'1:1', label:'1:1', desc:'Square', platforms:'Instagram feed · Facebook', icon:'square'},
  {val:'4:5', label:'4:5', desc:'IG Portrait', platforms:'Instagram feed (best)', icon:'ig-portrait', recommend:'Instagram'},
  {val:'4:3', label:'4:3', desc:'Classic TV', platforms:'Legacy broadcast', icon:'classic'},
  {val:'2.39:1', label:'2.39:1', desc:'Cinematic', platforms:'Cinema · Premium OTT', icon:'cinema'},
  {val:'21:9', label:'21:9', desc:'Ultrawide', platforms:'Brand films · Web hero', icon:'ultrawide'},
];

const AI_ELEMENTS = ['Script & Concept','Cast','Costume & HMU','Location & Spaces','Art & Props','Editing','Voiceover','Music','Sound Mixing','Product Shot','Colour Grading'];

const STEP_NAMES = ['Basics','Script','Specs','Master Film','Subtitles','Brand','Pipeline'];

const LOGO_POS_DATA = [
  {val:'top-left', label:'Top left', svgPos:{x:4,y:4}, bestFor:['16:9','4:3','1:1'], warnFor:['9:16'], note:'Standard TV / broadcast safe zone'},
  {val:'top-right', label:'Top right', svgPos:{x:64,y:4}, bestFor:['16:9','4:3','2.39:1'], note:'Most common — clean exit frame'},
  {val:'top-center', label:'Top centre', svgPos:{x:34,y:4}, note:'Works for cinematic / hero films'},
  {val:'bottom-left', label:'Bottom left', svgPos:{x:4,y:44}, warnFor:['9:16','1:1'], warn:'Cluttered on Reels — platform UI overlaps'},
  {val:'bottom-right', label:'Bottom right', svgPos:{x:64,y:44}, warnFor:['9:16'], warn:'Bottom-right on Reels gets hidden by like/share buttons'},
  {val:'bottom-center', label:'Bottom centre', svgPos:{x:34,y:44}, warnFor:['9:16'], warn:'Covered by Reels / Shorts caption overlay'},
];

let dubbedCount = 0;
let deScriptCount = 0;

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  buildStepTabs();
  buildDotNav();
  buildDurationDropdown();
  buildARGrid('masterARGrid', true, false);
  buildARGrid('adaptARGrid', false, true);
  buildARGrid('downEditARGrid', false, true);
  updateDownEditCap(false);
  buildAIGrid();
  buildLogoPosGrid();
  initSearchSelect('primaryLang', INDIAN_LANGUAGES);
  initCheckChips();
  loadDraft();
});

// ─────────────────────────────────────────────
// STEP TABS + DOTS
// ─────────────────────────────────────────────
function buildStepTabs() {
  const tabs = document.getElementById('stepTabs');
  tabs.innerHTML = STEP_NAMES.map((n,i) => `<div class="step-tab ${i===0?'active':''}" id="tab${i+1}" onclick="goToStep(${i+1})">${n}</div>`).join('');
}
function buildDotNav() {
  const nav = document.getElementById('dotNav');
  nav.innerHTML = Array.from({length:TOTAL_STEPS},(_,i)=>`<div class="ndot ${i===0?'active':''}" id="dot${i+1}" onclick="goToStep(${i+1})"></div>`).join('');
}
function updateNavState() {
  for(let i=1;i<=TOTAL_STEPS;i++){
    const tab=document.getElementById('tab'+i);
    const dot=document.getElementById('dot'+i);
    if(!tab||!dot)continue;
    tab.className='step-tab'+(i===currentStep?' active':i<currentStep?' done':'');
    dot.className='ndot'+(i===currentStep?' active':i<currentStep?' done':'');
  }
  document.getElementById('prevBtn').style.visibility=currentStep===1?'hidden':'visible';
  const nb=document.getElementById('nextBtn');
  if(currentStep===TOTAL_STEPS){nb.textContent='Submit ✓';nb.className='btn btn-submit';nb.onclick=submitForm;}
  else{nb.textContent='Next →';nb.className='btn btn-primary';nb.onclick=()=>changeStep(1);}
  document.getElementById('progressFill').style.width=(currentStep/TOTAL_STEPS*100)+'%';
  
  document.getElementById('saveDraftBtn').style.display=isAdmin&&currentStatus!=='finalized'?'block':'none';
  document.getElementById('shareBtn').style.display=isAdmin&&(currentStatus==='draft'||currentStatus==='shared_with_client')?'block':'none';
  document.getElementById('reviewChangesBtn').style.display=isAdmin&&currentStatus==='client_submitted'?'block':'none';
}
function changeStep(dir){goToStep(currentStep+dir)}
function goToStep(n){
  if(n<1||n>TOTAL_STEPS)return;
  document.getElementById('pane'+currentStep).classList.remove('active');
  currentStep=n;
  document.getElementById('pane'+currentStep).classList.add('active');
  updateNavState();
  window.scrollTo({top:0,behavior:'smooth'});
  if(n===2) generateDESuggest();
  if(n===4) checkDurationMismatch();
}

// ─────────────────────────────────────────────
// ADMIN MODE
// ─────────────────────────────────────────────
function toggleMode(){
  isAdmin=!isAdmin;
  document.getElementById('modeBadge').textContent=isAdmin?'Admin':'Client';
  document.getElementById('modeBadge').className='mode-badge '+(isAdmin?'mode-admin':'mode-client');
  document.getElementById('modeToggleBtn').textContent=isAdmin?'Switch to Client':'Switch to Admin';
  for(let i=1;i<=TOTAL_STEPS;i++){
    const p=document.getElementById('adminPanel'+i);
    if(p)p.style.display=isAdmin?'block':'none';
    buildLockList(i);
  }
  document.getElementById('saveDraftBtn').style.display=isAdmin&&currentStatus!=='finalized'?'block':'none';
  document.getElementById('shareBtn').style.display=isAdmin&&(currentStatus==='draft'||currentStatus==='shared_with_client')?'block':'none';
  document.getElementById('reviewChangesBtn').style.display=isAdmin&&currentStatus==='client_submitted'?'block':'none';
}
function buildLockList(step){
  const el=document.getElementById('lockList'+step);
  if(!el)return;
  const fields=getStepFields(step);
  el.innerHTML=fields.map(f=>`
    <div class="lock-section-row">
      <span>${f.label}</span>
      <label class="toggle" style="width:36px;height:20px">
        <input type="checkbox" ${lockedFields[f.id]?'checked':''} onchange="toggleLock('${f.id}',this.checked)">
        <span class="tslider"></span>
      </label>
    </div>`).join('');
}
function getStepFields(step){
  const map={
    1:[{id:'date',label:'Date'},{id:'client',label:'Client'},{id:'brand',label:'Brand'},{id:'projectTitle',label:'Project title'}],
    2:[{id:'masterScript',label:'Master script'}],
    3:[{id:'numFilms',label:'No. of films'},{id:'resolution',label:'Resolution'},{id:'primaryLang',label:'Primary language'}],
    4:[{id:'filmDuration',label:'Duration'},{id:'numDownEdits',label:'Down edits'}],
    5:[{id:'subtitleToggle',label:'Subtitles'}],
    6:[{id:'colorHex',label:'Brand colour'}],
    7:[{id:'additionalNotes',label:'Additional notes'}],
  };
  return map[step]||[];
}
function toggleLock(id,locked){
  lockedFields[id]=locked;
  const el=document.getElementById(id);
  if(el){el.disabled=locked&&!isAdmin;el.style.opacity=locked&&!isAdmin?'.5':'1';}
}

// ─────────────────────────────────────────────
// DURATION DROPDOWN — MM.SS format
// ─────────────────────────────────────────────
function buildDurationDropdown(){
  const sel=document.getElementById('filmDuration');
  let opts='<option value="">Select duration</option>';
  for(let s=5;s<=600;s+=5){
    const m=Math.floor(s/60);
    const sec=s%60;
    const label=(m<10?'0'+m:m)+'.'+(sec<10?'0'+sec:sec);
    opts+=`<option value="${s}">${label} (${s}s)</option>`;
  }
  sel.innerHTML=opts;
}

// ─────────────────────────────────────────────
// ASPECT RATIO GRIDS
// ─────────────────────────────────────────────
function arSVG(val){
  const map={
    '16:9':{w:80,h:45},'9:16':{w:40,h:71},'1:1':{w:60,h:60},
    '4:5':{w:56,h:70},'4:3':{w:72,h:54},'2.39:1':{w:80,h:33},
    '21:9':{w:80,h:34}
  };
  const d=map[val]||{w:60,h:60};
  return `<svg width="${d.w}" height="${d.h}" viewBox="0 0 ${d.w} ${d.h}" xmlns="http://www.w3.org/2000/svg"><rect width="${d.w}" height="${d.h}" rx="3" fill="#e8e5de" stroke="#c8c5be" stroke-width="0.5"/><text x="${d.w/2}" y="${d.h/2+4}" text-anchor="middle" font-size="9" fill="#888">${val}</text></svg>`;
}
function buildARGrid(containerId, single, multi){
  const el=document.getElementById(containerId);
  el.innerHTML=AR_DATA.map(ar=>`
    <div class="ar-card" data-val="${ar.val}" onclick="${single?`selectMasterAR(this,'${ar.val}')`:`toggleAR(this)`}">
      ${ar.recommend?`<span class="ar-rec">${ar.recommend}</span>`:''}
      ${arSVG(ar.val)}
      <div class="ar-label">${ar.label}</div>
      <div class="ar-platform">${ar.platforms}</div>
    </div>`).join('');
}
function selectMasterAR(el,val){
  document.querySelectorAll('#masterARGrid .ar-card').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  selectedMasterAR=val;
  buildLogoPosGrid();
}
function toggleAR(el){
  if(el.parentElement.id==='downEditARGrid'&&!el.classList.contains('selected')){
    const cap=downEditCap();
    if(cap!==null&&downEditSelected().length>=cap){
      updateDownEditCap(false,true);
      return;
    }
  }
  el.classList.toggle('selected');
  if(el.parentElement.id==='downEditARGrid')updateDownEditCap(false);
}

// Down-edit aspect ratios are limited by "No. of down edits": null = no limit yet (not chosen, or 6+)
function downEditCap(){
  const v=document.getElementById('numDownEdits').value;
  if(v===''||v==='6+')return null;
  return parseInt(v,10);
}
function downEditSelected(){
  return [...document.querySelectorAll('#downEditARGrid .ar-card.selected')];
}
function updateDownEditCap(trim,warn){
  const cap=downEditCap();
  const hint=document.getElementById('downEditARHint');
  let note='';
  if(trim&&cap!==null){
    const extra=downEditSelected().slice(cap);
    extra.forEach(c=>c.classList.remove('selected'));
    if(extra.length)note=` ${extra.length} format${extra.length>1?'s were':' was'} deselected to fit.`;
  }
  const n=downEditSelected().length;
  const grid=document.getElementById('downEditARGrid');
  grid.classList.toggle('ar-grid-capped',cap!==null&&n>=cap);
  if(cap===null)hint.textContent='Select all cut-down formats needed. Choose "No. of down edits" above to set a limit.';
  else if(cap===0)hint.textContent='No down edits chosen — change "No. of down edits" above to pick cut-down formats.';
  else hint.textContent=`Select up to ${cap} cut-down format${cap>1?'s':''} (${n} of ${cap} selected).`+note;
  hint.style.color=warn?'#c0392b':(note?'#b9770e':'');
}

// ─────────────────────────────────────────────
// LOGO POSITION WITH BEST PRACTICES
// ─────────────────────────────────────────────
function buildLogoPosGrid(){
  const grid=document.getElementById('logoPosGrid');
  grid.innerHTML=LOGO_POS_DATA.map(p=>{
    const isBest=selectedMasterAR&&p.bestFor&&p.bestFor.includes(selectedMasterAR);
    const isWarn=selectedMasterAR&&p.warnFor&&p.warnFor.includes(selectedMasterAR);
    const isSelected=p.val===selectedLogoPos;
    const {x,y}=p.svgPos;
    return `<div class="logo-card ${isSelected?'selected':''}" onclick="selectLogoPos(this,'${p.val}')">
      <svg viewBox="0 0 90 56" xmlns="http://www.w3.org/2000/svg">
        <rect width="90" height="56" rx="3" fill="${isWarn?'#fff5f5':'#f5f3ee'}" stroke="${isWarn?'#fca5a5':isSelected?'#1a1a1a':'#d8d5ce'}" stroke-width="${isSelected?'1.5':'0.5'}"/>
        <rect x="${x}" y="${y}" width="22" height="8" rx="2" fill="${isWarn?'#ef4444':isSelected?'#1a1a1a':'#aaa'}"/>
        ${isWarn?`<line x1="0" y1="0" x2="90" y2="56" stroke="#fca5a5" stroke-width="0.5" opacity="0.4"/>`:''}
      </svg>
      <div class="lc-label">${p.label}</div>
      ${isBest?`<div class="lc-best">✓ Best for ${selectedMasterAR}</div>`:''}
      ${isWarn?`<div class="lc-warn">⚠ ${p.warn||'Not ideal for this format'}</div>`:`<div class="lc-note">${p.note||''}</div>`}
    </div>`;
  }).join('')+
  `<div class="logo-fluid-card ${selectedLogoPos==='fluid'?'selected':''}" onclick="selectLogoPos(this,'fluid')">
    <svg viewBox="0 0 90 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="90" height="40" rx="3" fill="#f5f3ee" stroke="#d8d5ce" stroke-width="0.5"/>
      <rect x="4" y="16" width="22" height="8" rx="2" fill="#aaa" opacity="0.3"/>
      <line x1="26" y1="20" x2="64" y2="20" stroke="#aaa" stroke-width="0.5" stroke-dasharray="3,3"/>
      <rect x="64" y="16" width="22" height="8" rx="2" fill="#aaa" opacity="0.3"/>
      <text x="45" y="34" text-anchor="middle" font-size="7" fill="#bbb">animates through film</text>
    </svg>
    <div class="lc-label" style="margin-top:4px">Fluid / animated</div>
    <div class="lc-note">Logo position moves dynamically through the film</div>
  </div>`;
}
function selectLogoPos(el,val){
  selectedLogoPos=val;
  buildLogoPosGrid();
}

// ─────────────────────────────────────────────
// AI / HUMAN GRID
// ─────────────────────────────────────────────
function buildAIGrid(){
  AI_ELEMENTS.forEach(e=>aiState[e]='');
  document.getElementById('aiGrid').innerHTML=AI_ELEMENTS.map(el=>`
    <div class="ai-row">
      <span class="ai-row-label">${el}</span>
      <div class="chip-group">
        <button class="chip" onclick="setAi('${el}','AI',this)">AI</button>
        <button class="chip" onclick="setAi('${el}','Human',this)">Human</button>
        <button class="chip" onclick="setAi('${el}','Hybrid',this)">Hybrid</button>
        <button class="chip" onclick="setAi('${el}','NA',this)">N/A</button>
      </div>
    </div>`).join('');
}
function setAi(el,val,btn){
  aiState[el]=val;
  btn.closest('.ai-row').querySelectorAll('.chip').forEach(c=>c.className='chip');
  btn.classList.add(val==='AI'?'ai':val==='Human'?'human':'na');
}

// ─────────────────────────────────────────────
// SEARCHABLE SELECT
// ─────────────────────────────────────────────
function initSearchSelect(id, options){
  const list=document.getElementById(id+'List');
  list.innerHTML=options.map(o=>`<div onclick="pickSearchSelect('${id}','${o}')">${o}</div>`).join('');
  document.addEventListener('click',e=>{
    if(!document.getElementById(id+'Wrap').contains(e.target)) document.getElementById(id+'DD').classList.remove('open');
  });
}
function toggleSearchSelect(id){
  const dd=document.getElementById(id+'DD');
  dd.classList.toggle('open');
  if(dd.classList.contains('open')) setTimeout(()=>document.getElementById(id+'Search').focus(),50);
}
function filterSearchSelect(id,q){
  const items=document.getElementById(id+'List').querySelectorAll('div');
  items.forEach(d=>{d.style.display=d.textContent.toLowerCase().includes(q.toLowerCase())?'':'none'});
}
function pickSearchSelect(id,val){
  document.getElementById(id).value=val;
  document.getElementById(id+'Display').value=val;
  document.getElementById(id+'DD').classList.remove('open');
  document.getElementById(id+'List').querySelectorAll('div').forEach(d=>{d.classList.toggle('selected',d.textContent===val)});
}

// ─────────────────────────────────────────────
// CHECKBOX CHIPS
// ─────────────────────────────────────────────
function initCheckChips(){
  document.querySelectorAll('.check-chip input').forEach(inp=>{
    inp.addEventListener('change',()=>inp.closest('.check-chip').classList.toggle('selected',inp.checked));
  });
}

// ─────────────────────────────────────────────
// DUBBED WINDOWS
// ─────────────────────────────────────────────
function addDubbedWindow(){
  dubbedCount++;
  const div=document.createElement('div');
  div.className='dubbed-window';
  div.id='dubbed'+dubbedCount;
  div.innerHTML=`
    <div class="dubbed-window-num">${dubbedCount}</div>
    <div class="search-select-wrap" id="dubbed${dubbedCount}Wrap" style="flex:1">
      <input type="text" class="search-select-input" id="dubbed${dubbedCount}Display" placeholder="Select language..." readonly onclick="toggleSearchSelect('dubbed${dubbedCount}')">
      <input type="hidden" id="dubbed${dubbedCount}">
      <div class="search-select-dropdown" id="dubbed${dubbedCount}DD">
        <div class="search-select-search"><input type="text" placeholder="Search..." oninput="filterSearchSelect('dubbed${dubbedCount}',this.value)" id="dubbed${dubbedCount}Search"></div>
        <div class="search-select-list" id="dubbed${dubbedCount}List"></div>
      </div>
    </div>
    <button class="dubbed-remove" onclick="removeDubbed(${dubbedCount},'dubbed${dubbedCount}')">✕</button>`;
  document.getElementById('dubbedWindows').appendChild(div);
  initSearchSelect('dubbed'+dubbedCount, INDIAN_LANGUAGES);
  document.addEventListener('click',e=>{
    if(!document.getElementById('dubbed'+dubbedCount+'Wrap').contains(e.target))
      document.getElementById('dubbed'+dubbedCount+'DD')&&document.getElementById('dubbed'+dubbedCount+'DD').classList.remove('open');
  });
}
function removeDubbed(num,id){document.getElementById(id).remove();}

// ─────────────────────────────────────────────
// DOWN EDIT SCRIPT WINDOWS
// ─────────────────────────────────────────────
function addDownEditScriptWindow(){
  deScriptCount++;
  const div=document.createElement('div');
  div.id='de-script-'+deScriptCount;
  div.style.cssText='background:#fff;border:1px solid #e8e5de;border-radius:10px;padding:16px;margin-bottom:10px';
  div.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-size:13px;font-weight:600">Down edit #${deScriptCount}</span>
      <button style="background:none;border:none;cursor:pointer;color:#bbb;font-size:14px" onclick="this.closest('#de-script-${deScriptCount}').remove()">✕</button>
    </div>
    <div class="script-pane active" id="de${deScriptCount}-paste">
      <textarea rows="5" placeholder="Include only lines and scenes from the master script — no new produced elements..." style="width:100%;border:1px solid #d8d5ce;border-radius:8px;padding:10px;font-size:13px;font-family:inherit;outline:none"></textarea>
    </div>
    <div class="de-warn">⚠ Down edits must be cut-downs from the master script only. No new shots, voiceover, or production elements.</div>`;
  document.getElementById('downEditScriptWindows').appendChild(div);
  document.getElementById('deSuggestBox').style.display='none';
}

// ─────────────────────────────────────────────
// SCRIPT TABS
// ─────────────────────────────────────────────
function switchScriptTab(prefix,type){
  const tabs=document.querySelectorAll(`#${prefix}-paste`)&&document.querySelectorAll(`[id^="${prefix}-"]`);
  document.querySelectorAll(`[id^="${prefix}-"]`).forEach(p=>p.classList.remove('active'));
  document.getElementById(`${prefix}-${type}`).classList.add('active');
  // update tab buttons
  const allTabs=document.getElementById(`${prefix}-paste`).previousElementSibling?.querySelectorAll('.script-tab')||[];
  allTabs.forEach(t=>t.classList.remove('active'));
  event&&event.target&&event.target.classList.add('active');
}

// ─────────────────────────────────────────────
// DURATION MISMATCH CHECK
// ─────────────────────────────────────────────
function checkDurationMismatch(){
  const script=document.getElementById('masterScript').value.trim();
  const dur=parseInt(document.getElementById('filmDuration').value)||0;
  if(!script||!dur){
    hideFlags(); return;
  }
  const words=script.split(/\s+/).filter(Boolean).length;
  // ~2.5 words/sec for voiceover + scene reading buffer
  const estSec=Math.round(words/2.5);
  const diff=Math.abs(estSec-dur);
  const estLabel=formatDur(estSec);
  const specLabel=formatDur(dur);
  const show=diff>10;
  ['durationFlag','durationFlag2'].forEach((id,i)=>{
    const el=document.getElementById(id);
    if(el){
      el.classList.toggle('show',show);
      const e=document.getElementById(i===0?'estDuration':'estDuration2');
      const s=document.getElementById(i===0?'specDuration':'specDuration2');
      if(e)e.textContent='~'+estLabel;
      if(s)s.textContent=specLabel;
    }
  });
}
function hideFlags(){
  ['durationFlag','durationFlag2'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('show')});
}
function formatDur(s){
  const m=Math.floor(s/60),sec=s%60;
  return m>0?`${m}m ${sec}s`:`${s}s`;
}

// ─────────────────────────────────────────────
// DOWN EDIT SUGGEST
// ─────────────────────────────────────────────
function generateDESuggest(){
  if(deScriptCount>0){document.getElementById('deSuggestBox').style.display='none';return;}
  const script=document.getElementById('masterScript').value.trim();
  if(!script){document.getElementById('deSuggestBox').style.display='none';return;}
  // Simple heuristic: take first and last paragraph as a 15s cut
  const paras=script.split('\n\n').filter(p=>p.trim().length>20);
  let suggest='';
  if(paras.length>=3){
    suggest=paras[0]+'\n\n[...]\n\n'+paras[paras.length-1];
    suggest+='\n\n— Suggested cut retains opening and closing scenes only. Message AiC SPOC to adjust mid-section.';
  } else {
    suggest=paras.slice(0,Math.ceil(paras.length/2)).join('\n\n');
    suggest+='\n\n— Suggested cut retains first half of script. Message AiC to refine.';
  }
  document.getElementById('deSuggestText').textContent=suggest;
  document.getElementById('deSuggestBox').style.display='block';
}
function acceptDESuggest(){addDownEditScriptWindow();document.getElementById('deSuggestBox').style.display='none';}
function tweakDESuggest(){
  const spoc=document.getElementById('spocIE').value||'spoc@aicollective.in';
  const sub=encodeURIComponent('Down-edit script adjustment — '+document.getElementById('brand').value);
  const body=encodeURIComponent("Hi AiC team,\n\nPlease adjust the suggested down-edit script for this project:\nClient: "+document.getElementById('client').value+"\nBrand: "+document.getElementById('brand').value+"\n\nRequested adjustments:\n\n[Describe changes here]\n\nThanks");
  window.location.href=`mailto:${spoc}?subject=${sub}&body=${body}`;
}

// ─────────────────────────────────────────────
// SUBTITLES
// ─────────────────────────────────────────────
function toggleSubtitles(checked){
  document.getElementById('subToggleLbl').textContent=checked?'Yes':'No';
  document.getElementById('subtitleSection').style.display=checked?'block':'none';
}
const SUB_SAMPLES={
  Hindi:{native:'यह आपके सब्टाइटल का प्रीव्यू है',roman:'Yeh aapke subtitle ka preview hai'},
  Bengali:{native:'এটি আপনার সাবটাইটেলের প্রিভিউ',roman:'Eti apnar subtitle-er preview'},
  Tamil:{native:'இது உங்கள் வசனத்தின் முன்னோட்டம்',roman:'Idhu ungal subtitle-in munnottam'},
  Telugu:{native:'ఇది మీ సబ్‌టైటిల్ ప్రివ్యూ',roman:'Idi mee subtitle preview'},
  Marathi:{native:'हे तुमच्या सबटायटलचे पूर्वावलोकन आहे',roman:'He tumchya subtitle che purvavalokan aahe'},
  Gujarati:{native:'આ તમારા સબટાઇટલનું પ્રીવ્યૂ છે',roman:'Aa tamara subtitle nu preview chhe'},
  Kannada:{native:'ಇದು ನಿಮ್ಮ ಸಬ್‌ಟೈಟಲ್ ಪ್ರಿವ್ಯೂ',roman:'Idu nimma subtitle preview'},
  Malayalam:{native:'ഇത് നിങ്ങളുടെ സബ്ടൈറ്റിൽ പ്രിവ്യൂ ആണ്',roman:'Ithu ningalude subtitle preview aanu'},
  Punjabi:{native:'ਇਹ ਤੁਹਾਡੇ ਸਬਟਾਈਟਲ ਦਾ ਪ੍ਰੀਵਿਊ ਹੈ',roman:'Eh tuhade subtitle da preview hai'},
  English:{native:'This is your subtitle preview',roman:'This is your subtitle preview'},
  Assamese:{native:'এইটো আপোনাৰ ছাবটাইটেলৰ প্ৰিভিউ',roman:'Eitu aponar subtitle-ar preview'},
  Dogri:{native:'एह् तुंदे सबटाइटल दा प्रीव्यू ऐ',roman:'Eh tunde subtitle da preview ai'},
  Konkani:{native:'हें तुमच्या सबटायटलाचें प्रिव्ह्यू',roman:'Hem tumchya subtitlache preview'},
  Maithili:{native:'ई अहाँक सबटाइटलक प्रीव्यू अछि',roman:'Ee ahank subtitlak preview achhi'},
  Nepali:{native:'यो तपाईंको सबटाइटलको पूर्वावलोकन हो',roman:'Yo tapaiko subtitle ko purvavalokan ho'},
  Odia:{native:'ଏହା ଆପଣଙ୍କ ସବ୍‌ଟାଇଟଲ୍‌ର ପ୍ରିଭ୍ୟୁ',roman:'Eha apanka subtitle-ra preview'},
  Sanskrit:{native:'एतत् भवतः उपशीर्षकस्य पूर्वावलोकनम् अस्ति',roman:'Etat bhavatah upashirshakasya purvavalokanam asti'},
  Sindhi:{native:'هي توهان جي سب ٽائيٽل جو پريويو آهي',roman:'Hi tavhan ji subtitle jo preview aahe',rtl:true},
  Urdu:{native:'یہ آپ کے سب ٹائٹل کا پیش منظر ہے',roman:'Yeh aapke subtitle ka preview hai',rtl:true}
};
// Bodo, Kashmiri, Manipuri and Santali have no sample text yet; the preview falls back to English for them
const SUB_NO_SAMPLE=['Bodo','Kashmiri','Manipuri','Santali'];
const SUB_SCRIPT_LABELS={native:'Native script',roman:'Roman',both:'Native + Roman'};
function updateSubPreview(){
  const size=document.getElementById('subtitleSize').value;
  const font=document.getElementById('subtitleFont').value;
  const style=document.getElementById('subtitleStyleSel').value;
  const lang=document.getElementById('subtitleLang').value;
  const script=document.getElementById('subtitleScriptSel').value;
  const noSample=SUB_NO_SAMPLE.includes(lang);
  const sample=noSample?SUB_SAMPLES.English:(SUB_SAMPLES[lang]||SUB_SAMPLES.Hindi);
  const demo=document.getElementById('subDemo');
  document.getElementById('subSizeLbl').textContent=size+'px';
  document.getElementById('subSampleNote').style.display=noSample?'block':'none';
  demo.textContent='';
  let kinds=script==='both'?['native','roman']:[script];
  if(kinds.length>1&&sample.native===sample.roman)kinds=['native'];
  kinds.forEach(k=>{const l=document.createElement('div');l.textContent=sample[k];l.dir=sample.rtl&&k==='native'?'rtl':'ltr';demo.appendChild(l);});
  demo.style.fontSize=size+'px';
  demo.style.fontFamily=font;
  if(style==='box'){demo.style.background='rgba(0,0,0,.6)';demo.style.color='#fff';demo.style.webkitTextStroke='';}
  else if(style==='plain'){demo.style.background='transparent';demo.style.color='#fff';demo.style.webkitTextStroke='';}
  else if(style==='outline'){demo.style.background='transparent';demo.style.color='#fff';demo.style.webkitTextStroke='.5px black';}
  else if(style==='yellow'){demo.style.background='transparent';demo.style.color='#FFD700';demo.style.webkitTextStroke='';}
}

// ─────────────────────────────────────────────
// COLOR
// ─────────────────────────────────────────────
function updateColor(val){
  document.getElementById('colorSwatch').style.background=val;
  document.getElementById('colorHex').value=val.toUpperCase();
}
function updateColorFromHex(val){
  if(/^#[0-9A-Fa-f]{6}$/.test(val)){
    document.getElementById('colorSwatch').style.background=val;
    document.getElementById('colorPicker').value=val;
  }
}

// ─────────────────────────────────────────────
// FILE NAMES & UPLOADS
// ─────────────────────────────────────────────
const uploadedFiles = {
  masterScriptFile: null,
  logoFile: null,
  packFile: null,
  fontFile: null
};

async function setFileName(targetId, input) {
  const el = document.getElementById(targetId);
  if (!input.files[0]) return;
  
  el.textContent = "Uploading to server...";
  el.style.color = "#8b5cf6";
  
  const formData = new FormData();
  formData.append('file', input.files[0]);
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Upload failed');
    const result = await response.json();
    
    if (result.url) {
      // Set the global uploaded file path based on the input ID
      uploadedFiles[input.id] = result.url;
      el.textContent = input.files[0].name + " (Uploaded ✓)";
      el.style.color = "#10b981";
      saveDraft(); // Auto save draft once file is successfully uploaded
    } else {
      el.textContent = "Upload failed!";
      el.style.color = "#ef4444";
    }
  } catch (error) {
    el.textContent = "Upload error!";
    el.style.color = "#ef4444";
    console.error('File upload error:', error);
  }
}

// ─────────────────────────────────────────────
// CONTEMPORARY
// ─────────────────────────────────────────────
function toggleContemp(checked){
  document.getElementById('contempHint').style.display=checked?'block':'none';
  document.getElementById('contempSpec').style.display=checked?'block':'none';
}

// ─────────────────────────────────────────────
// SAVE / LOAD DRAFT
// ─────────────────────────────────────────────
let projectId = '';
let currentStatus = 'draft';
let internalSnapshot = null;

function collectFormData(){
  return {
    id: projectId || localStorage.getItem('aic_spec_project_id'),
    date:document.getElementById('date').value,
    client:document.getElementById('client').value,
    brand:document.getElementById('brand').value,
    projectTitle:document.getElementById('projectTitle').value,
    spocCN:document.getElementById('spocCN').value,
    spocCP:document.getElementById('spocCP').value,
    spocCE:document.getElementById('spocCE').value,
    spocAN:document.getElementById('spocAN').value,
    spocAP:document.getElementById('spocAP').value,
    spocAE:document.getElementById('spocAE').value,
    spocIN:document.getElementById('spocIN').value,
    spocIP:document.getElementById('spocIP').value,
    spocIE:document.getElementById('spocIE').value,
    masterScript:document.getElementById('masterScript').value,
    masterScriptFile:uploadedFiles.masterScriptFile,
    numFilms:document.getElementById('numFilms').value,
    resolution:document.getElementById('resolution').value,
    primaryLang:document.getElementById('primaryLang').value,
    contemporary:document.getElementById('contempToggle').checked,
    contempSpec:document.getElementById('contempSpec').value,
    filmDuration:document.getElementById('filmDuration').value,
    numDownEdits:document.getElementById('numDownEdits').value,
    masterAR:selectedMasterAR,
    logoPos:selectedLogoPos,
    brandColor:document.getElementById('colorHex').value,
    subtitle:document.getElementById('subtitleToggle').checked,
    subtitleSize:document.getElementById('subtitleSize').value,
    subtitleFont:document.getElementById('subtitleFont').value,
    subtitleStyle:document.getElementById('subtitleStyleSel').value,
    subtitleLang:document.getElementById('subtitleLang').value,
    subtitleScript:document.getElementById('subtitleScriptSel').value,
    logoFile:uploadedFiles.logoFile,
    packFile:uploadedFiles.packFile,
    fontFile:uploadedFiles.fontFile,
    pipeline:{...aiState},
    additionalNotes:document.getElementById('additionalNotes').value,
    adaptAR:[...document.querySelectorAll('#adaptARGrid .ar-card.selected')].map(c=>c.dataset.val),
    downEditAR:[...document.querySelectorAll('#downEditARGrid .ar-card.selected')].map(c=>c.dataset.val),
    pubRights:[...document.querySelectorAll('#pubRights input:checked')].map(i=>i.value),
  };
}

async function saveDraft(){
  const data = collectFormData();
  localStorage.setItem('aic_spec_draft', JSON.stringify(data));
  localStorage.setItem('aic_spec_step', currentStep);
  
  const badge = document.getElementById('savedBadge');
  badge.textContent = "Saving draft...";
  badge.classList.add('show');
  
  try {
    const response = await fetch('/api/spec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, status: 'draft' })
    });
    if (!response.ok) throw new Error('Failed to save to server');
    
    badge.textContent = "Draft saved ✓";
  } catch (err) {
    console.error('Draft save failed:', err);
    badge.textContent = "Draft saved locally ⚠";
  }
  
  setTimeout(() => badge.classList.remove('show'), 3000);
}

async function loadDraft(){
  // 1. Get project ID from URL or generate a new one
  const params = new URLSearchParams(window.location.search);
  let id = params.get('id');
  
  if (!id) {
    id = localStorage.getItem('aic_spec_project_id');
  }
  
  if (!id) {
    id = 'spec-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('aic_spec_project_id', id);
  }
  
  projectId = id;
  
  // Set current URL query parameter to keep URL shareable (without reloading)
  if (!params.get('id')) {
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + projectId;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }

  // 2. Try to fetch from server first
  try {
    const response = await fetch(`/api/spec/${projectId}`);
    if (response.ok) {
      const data = await response.json();
      populateForm(data);
      return;
    }
  } catch (err) {
    console.warn('Unable to load from database server. Falling back to local storage...', err);
  }

  // 3. Fallback to localStorage draft
  try {
    const raw = localStorage.getItem('aic_spec_draft');
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d && d.id === projectId) {
      populateForm(d);
    }
  } catch (e) {
    console.error('Failed to parse local draft:', e);
  }
}

function populateForm(d) {
  const fields = ['date','client','brand','projectTitle','spocCN','spocCP','spocCE','spocAN','spocAP','spocAE','spocIN','spocIP','spocIE','masterScript','numFilms','resolution','filmDuration','numDownEdits','colorHex','additionalNotes','contempSpec'];
  fields.forEach(f => {
    const el = document.getElementById(f);
    // Handle database field mapping naming conventions if returned directly from MySQL
    let val = d[f];
    if (f === 'projectTitle' && d.project_title !== undefined) val = d.project_title;
    if (f === 'contempSpec' && d.contemp_spec !== undefined) val = d.contemp_spec;
    if (f === 'filmDuration' && d.film_duration !== undefined) val = d.film_duration;
    if (f === 'numDownEdits' && d.num_down_edits !== undefined) val = d.num_down_edits;
    if (f === 'colorHex' && d.brand_color !== undefined) val = d.brand_color;
    if (f === 'additionalNotes' && d.additional_notes !== undefined) val = d.additional_notes;

    if (el && val !== undefined && val !== null) el.value = val;
  });

  // Handle files
  const fileFields = {
    masterScriptFile: 'master_script_file',
    logoFile: 'logo_file',
    packFile: 'pack_file',
    fontFile: 'font_file'
  };
  Object.entries(fileFields).forEach(([jsKey, dbKey]) => {
    const url = d[jsKey] || d[dbKey];
    if (url) {
      uploadedFiles[jsKey] = url;
      const displayId = jsKey.replace('File', 'FileName');
      const displayEl = document.getElementById(displayId);
      if (displayEl) {
        const fileName = url.split('/').pop();
        displayEl.textContent = fileName + " (Loaded ✓)";
        displayEl.style.color = "#10b981";
      }
    }
  });

  if (d.primaryLang || d.primary_lang) pickSearchSelect('primaryLang', d.primaryLang || d.primary_lang);
  
  const masterARVal = d.masterAR || d.master_ar;
  if (masterARVal) {
    selectedMasterAR = masterARVal;
    document.querySelectorAll('#masterARGrid .ar-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.val === masterARVal);
    });
  }
  
  const logoPosVal = d.logoPos || d.logo_pos;
  if (logoPosVal) {
    selectedLogoPos = logoPosVal;
    buildLogoPosGrid();
  }
  
  const brandColorVal = d.brandColor || d.brand_color;
  if (brandColorVal) updateColor(brandColorVal);
  
  const subtitleVal = d.subtitle !== undefined ? d.subtitle : d.subtitleToggle;
  if (subtitleVal) {
    document.getElementById('subtitleToggle').checked = true;
    toggleSubtitles(true);
  }
  
  const subtitleSizeVal = d.subtitleSize || d.subtitle_size;
  if (subtitleSizeVal) document.getElementById('subtitleSize').value = subtitleSizeVal;
  
  const subtitleFontVal = d.subtitleFont || d.subtitle_font;
  if (subtitleFontVal) document.getElementById('subtitleFont').value = subtitleFontVal;
  
  const subtitleStyleVal = d.subtitleStyle || d.subtitle_style;
  if (subtitleStyleVal) document.getElementById('subtitleStyleSel').value = subtitleStyleVal;

  const subtitleLangVal = d.subtitleLang || d.subtitle_lang;
  if (subtitleLangVal) document.getElementById('subtitleLang').value = subtitleLangVal;

  const subtitleScriptVal = d.subtitleScript || d.subtitle_script;
  if (subtitleScriptVal) document.getElementById('subtitleScriptSel').value = subtitleScriptVal;
  updateSubPreview();
  
  const contemporaryVal = d.contemporary;
  if (contemporaryVal) {
    document.getElementById('contempToggle').checked = true;
    toggleContemp(true);
  }

  // Handle pipeline
  const pipelineVal = d.pipeline;
  if (pipelineVal) {
    Object.entries(pipelineVal).forEach(([k, v]) => {
      if (v) {
        const row = [...document.querySelectorAll('.ai-row')].find(r => r.querySelector('.ai-row-label').textContent === k);
        if (row) {
          const btn = [...row.querySelectorAll('.chip')].find(c => c.textContent === v);
          if (btn) setAi(k, v, btn);
        }
      }
    });
  }

  // Handle selected aspect ratios
  const adaptARVal = d.adaptAR || d.adapt_ar;
  if (adaptARVal && Array.isArray(adaptARVal)) {
    document.querySelectorAll('#adaptARGrid .ar-card').forEach(c => {
      c.classList.toggle('selected', adaptARVal.includes(c.dataset.val));
    });
  }

  const downEditARVal = d.downEditAR || d.down_edit_ar;
  if (downEditARVal && Array.isArray(downEditARVal)) {
    document.querySelectorAll('#downEditARGrid .ar-card').forEach(c => {
      c.classList.toggle('selected', downEditARVal.includes(c.dataset.val));
    });
  }
  updateDownEditCap(false);

  const pubRightsVal = d.pubRights || d.pub_rights;
  if (pubRightsVal && Array.isArray(pubRightsVal)) {
    document.querySelectorAll('#pubRights input').forEach(inp => {
      if (pubRightsVal.includes(inp.value)) {
        inp.checked = true;
        inp.closest('.check-chip').classList.add('selected');
      }
    });
  }

  // If status is submitted, lock fields and show success page
  if (d.status === 'submitted') {
    // Lock all fields
    const allInputs = document.querySelectorAll('.form-body input, .form-body textarea, .form-body select, .form-body button');
    allInputs.forEach(el => {
      if (el.id !== 'modeToggleBtn' && !el.closest('#adminUnlockPanel')) {
        el.disabled = true;
        el.style.opacity = '.6';
      }
    });

    document.getElementById('pane1').classList.remove('active');
    document.getElementById('successPane').classList.add('active');
    document.getElementById('navBar').style.display = 'none';
    document.getElementById('stepTabs').style.display = 'none';
    document.getElementById('progressFill').style.width = '100%';
    
    // Set confirmed email display
    const emailDisplay = d.spocCE ? 'production@aicollective.in + ' + d.spocCE : 'production@aicollective.in';
    document.getElementById('confirmedEmail').textContent = emailDisplay;

    // Set lock timestamp
    const lockTime = d.updated_at ? new Date(d.updated_at) : new Date();
    document.getElementById('lockTimestamp').textContent = lockTime.toLocaleString('en-IN', {
      day:'numeric', month:'short', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    });
  }

  // Update status globals
  currentStatus = d.status || 'draft';
  if (d.internal_snapshot) {
    try {
      internalSnapshot = typeof d.internal_snapshot === 'string' ? JSON.parse(d.internal_snapshot) : d.internal_snapshot;
    } catch(e) {}
  }

  // If finalized, lock completely
  if (currentStatus === 'finalized') {
    const allInputs = document.querySelectorAll('.form-body input, .form-body textarea, .form-body select, .form-body button');
    allInputs.forEach(el => {
      if (el.id !== 'modeToggleBtn') {
        el.disabled = true;
        el.style.opacity = '.6';
      }
    });
    // Show locked view instead of the form
    document.getElementById('pane1').classList.remove('active');
    document.getElementById('successPane').classList.add('active');
    document.getElementById('navBar').style.display = 'none';
    document.getElementById('stepTabs').style.display = 'none';
    document.querySelector('#successPane h2').textContent = "Project Finalized & Locked";
    document.querySelector('#successPane p').textContent = "This spec sheet has been fully finalized by the internal team. No further modifications are allowed.";
    document.getElementById('adminUnlockPanel').style.display = 'none';
  }

  updateNavState();
}

// ─────────────────────────────────────────────
// SUBMIT — shows review pane first
// ─────────────────────────────────────────────
let cachedFormData = null;

function submitForm(){
  cachedFormData = collectFormData();
  buildReviewCards(cachedFormData);
  // hide all step panes
  for(let i=1;i<=TOTAL_STEPS;i++){
    const p=document.getElementById('pane'+i);
    if(p) p.classList.remove('active');
  }
  document.getElementById('reviewPane').classList.add('active');
  document.getElementById('navBar').style.display='none';
  document.getElementById('stepTabs').style.display='none';
  document.getElementById('progressFill').style.width='100%';
  window.scrollTo({top:0,behavior:'smooth'});
}

function goBackFromReview(){
  document.getElementById('reviewPane').classList.remove('active');
  document.getElementById('pane'+TOTAL_STEPS).classList.add('active');
  document.getElementById('navBar').style.display='flex';
  document.getElementById('stepTabs').style.display='flex';
  document.getElementById('progressFill').style.width='100%';
  window.scrollTo({top:0,behavior:'smooth'});
}

function buildReviewCards(d){
  const cards = [
    {
      icon:'📋',
      label:'Project',
      lines:[
        d.client + ' — ' + d.brand,
        d.projectTitle || '(no title)',
        'Date: ' + d.date
      ]
    },
    {
      icon:'📺',
      label:'Deliverables',
      lines:[
        'Films: ' + (d.numFilms||'—') + '  ·  Resolution: ' + (d.resolution||'—'),
        'Duration: ' + (d.filmDuration ? formatDur(parseInt(d.filmDuration)) : '—') + '  ·  Master AR: ' + (d.masterAR||'—'),
        'Publishing: ' + (d.pubRights.length ? d.pubRights.join(', ') : '—')
      ]
    },
    {
      icon:'🌐',
      label:'Language',
      lines:[
        'Primary: ' + (d.primaryLang||'—') + (d.contemporary ? '  ·  Contemporary: ' + (d.contempSpec||'yes') : '')
      ]
    },
    {
      icon:'🎨',
      label:'Brand',
      lines:[
        'Colour: ' + d.brandColor + '  ·  Logo: ' + d.logoPos,
        'Subtitles: ' + (d.subtitle ? 'Yes — ' + d.subtitleSize + 'px' : 'No')
      ]
    },
    {
      icon:'⚙️',
      label:'Pipeline',
      lines: Object.entries(d.pipeline)
        .filter(([,v])=>v)
        .map(([k,v])=>k+': '+v)
        .join('  ·  ')
        ? [Object.entries(d.pipeline).filter(([,v])=>v).map(([k,v])=>k+' = '+v).join('   ')]
        : ['No pipeline tags set']
    }
  ];

  const container = document.getElementById('reviewCards');
  container.innerHTML = cards.map(c => `
    <div style="background:#fff;border:1px solid #e8e5de;border-radius:10px;padding:14px 16px;display:flex;gap:14px;align-items:flex-start">
      <span style="font-size:20px;flex-shrink:0;margin-top:1px">${c.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">${c.label}</div>
        ${c.lines.map(l=>`<div style="font-size:13px;color:#333;line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l}</div>`).join('')}
      </div>
    </div>`).join('');
}

async function confirmAndSend(ev) {
  const d = cachedFormData || collectFormData();
  const btn = (ev && ev.currentTarget) || (typeof event !== 'undefined' && event.currentTarget) || null;
  const oldText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Generating PDF...'; btn.disabled = true; }

  // ── Collect dynamically-added scripts / dubbed languages ──────────
  // Down-edit windows have ids like "de-script-1"; each holds one textarea.
  const downEdits = [...document.querySelectorAll('[id^="de-script-"] textarea')]
    .map(t => t.value.trim())
    .filter(Boolean);
  // Dubbed windows have class ".dubbed-window"; the chosen language is in the
  // display input (.search-select-input). There is no script textarea.
  const dubbed = [...document.querySelectorAll('.dubbed-window')]
    .map(w => { const el = w.querySelector('.search-select-input'); return el ? el.value.trim() : ''; })
    .filter(Boolean);

  // ── Formatting helpers ─────────────────────────────────────────────
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const BLANK = '<span style="color:#c0392b;font-style:italic;">— not provided —</span>';
  const show = (v) => {
    if (Array.isArray(v)) return v.length ? esc(v.join(', ')) : BLANK;
    const s = (v == null ? '' : String(v)).trim();
    return s ? esc(s) : BLANK;
  };
  const fileName = (url) => url ? esc(String(url).split('/').pop()) : null;

  const row = (label, value, raw) => `
    <div style="display:flex; border-bottom:1px solid #eaeaea; padding:10px 0;">
      <div style="width:38%; font-weight:600; color:#555; font-size:12.5px;">${label}</div>
      <div style="width:62%; font-size:13px; color:#111; word-break:break-word;">${raw ? (value && String(value).trim() ? value : BLANK) : show(value)}</div>
    </div>`;

  const heading = (title) => `
    <h2 style="background:#111; color:#fff; padding:11px 16px; font-size:15px; margin:30px 0 14px; border-radius:6px; letter-spacing:0.05em; text-transform:uppercase;">
      ${title}
    </h2>`;

  const scriptBlock = (text) => `
    <div style="padding:18px; background:#fafafa; border:1px solid #eaeaea; border-radius:8px; white-space:pre-wrap; font-family:monospace; font-size:12.5px; line-height:1.7; color:#333; margin-bottom:18px;">${text && text.trim() ? esc(text) : BLANK}</div>`;

  // ── Production pipeline — always list ALL elements ─────────────────
  const pipelineHtml = AI_ELEMENTS.map(el => {
    const v = d.pipeline ? d.pipeline[el] : '';
    const color = v === 'AI' ? '#7c3aed' : v === 'Human' ? '#059669' : v === 'Hybrid' ? '#d97706' : '#bbb';
    const label = v === 'NA' ? 'N/A' : (v || 'Not specified');
    return `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding:8px 0; font-size:13px;">
        <span style="color:#444;">${esc(el)}</span>
        <span style="font-weight:600; color:${color};">${label}</span>
      </div>`;
  }).join('');

  const durationLabel = d.filmDuration ? `${formatDur(parseInt(d.filmDuration))} (${d.filmDuration}s)` : '';
  const langLabel = d.primaryLang
    ? esc(d.primaryLang) + (d.contemporary ? ` — Contemporary: ${d.contempSpec ? esc(d.contempSpec) : 'yes'}` : '')
    : '';
  const generatedOn = new Date().toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const wrapper = document.createElement('div');
  wrapper.style.padding = '40px';
  wrapper.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  wrapper.style.color = '#333';
  wrapper.style.backgroundColor = '#fff';
  wrapper.style.width = '800px';

  wrapper.innerHTML = `
    <div style="text-align:center; margin-bottom:22px; padding-bottom:18px; border-bottom:2px solid #111;">
      <h1 style="font-size:27px; margin:0 0 6px; color:#111; font-weight:600;">Production Spec Sheet</h1>
      <div style="font-size:13px; color:#888; letter-spacing:0.12em; text-transform:uppercase;">AI Collective</div>
      <div style="font-size:11px; color:#aaa; margin-top:8px;">
        Project ID: ${esc(d.id || '—')} &nbsp;·&nbsp; Generated: ${generatedOn}
      </div>
    </div>

    <div style="background:#fff8e6; border:1px solid #f0d98a; border-radius:8px; padding:12px 16px; margin-bottom:8px; font-size:12.5px; color:#7a5c00; line-height:1.5;">
      <b>Client review copy.</b> Please recheck every detail below and confirm the information you provided is accurate.
      Fields marked <span style="color:#c0392b;font-style:italic;">— not provided —</span> were left blank. Reply with any corrections before we go into production.
    </div>

    ${heading('Project Basics')}
    ${row('Date', d.date)}
    ${row('Client', d.client)}
    ${row('Brand / Product', d.brand)}
    ${row('Project Title', d.projectTitle)}

    ${heading('Points of Contact')}
    ${row('Client SPOC — Name', d.spocCN)}
    ${row('Client SPOC — Phone', d.spocCP)}
    ${row('Client SPOC — Email', d.spocCE)}
    ${row('Agency SPOC — Name', d.spocAN)}
    ${row('Agency SPOC — Phone', d.spocAP)}
    ${row('Agency SPOC — Email', d.spocAE)}
    ${row('Internal SPOC (AiC) — Name', d.spocIN)}
    ${row('Internal SPOC (AiC) — Phone', d.spocIP)}
    ${row('Internal SPOC (AiC) — Email', d.spocIE)}

    ${heading('Deliverable Specs')}
    ${row('Publishing Rights', d.pubRights)}
    ${row('No. of Films', d.numFilms)}
    ${row('Resolution', d.resolution)}
    ${row('Primary Language', langLabel, true)}
    ${row('Other Dubbed Versions', dubbed)}

    ${heading('Master Film')}
    ${row('Master Film Duration', durationLabel, true)}
    ${row('No. of Down Edits', d.numDownEdits)}
    ${row('Master Aspect Ratio', d.masterAR)}
    ${row('Adapts To (Aspect Ratios)', d.adaptAR)}
    ${row('Down-Edit Aspect Ratios', d.downEditAR)}

    ${heading('Subtitles')}
    ${row('Subtitles Required', d.subtitle ? 'Yes' : 'No', true)}
    ${row('Subtitle Size', d.subtitle ? (d.subtitleSize ? d.subtitleSize + 'px' : '') : 'N/A', true)}
    ${row('Subtitle Font', d.subtitle ? d.subtitleFont : 'N/A', true)}
    ${row('Subtitle Style', d.subtitle ? d.subtitleStyle : 'N/A', true)}
    ${row('Subtitle Language', d.subtitle ? d.subtitleLang : 'N/A', true)}
    ${row('Subtitle Script', d.subtitle ? (SUB_SCRIPT_LABELS[d.subtitleScript] || d.subtitleScript) : 'N/A', true)}

    ${heading('Brand Identity')}
    ${row('Brand Colour', `<span style="display:inline-block;width:14px;height:14px;background:${esc(d.brandColor || '#fff')};border:1px solid #ccc;border-radius:3px;vertical-align:middle;margin-right:8px;"></span>${d.brandColor ? esc(d.brandColor) : BLANK}`, true)}
    ${row('Logo Placement', d.logoPos)}
    ${row('Brand Logo File', fileName(d.logoFile))}
    ${row('Product Packaging File', fileName(d.packFile))}
    ${row('Brand Font File', fileName(d.fontFile))}

    <div style="page-break-before:always;"></div>

    ${heading('Production Pipeline')}
    <div style="padding:4px 0 8px;">${pipelineHtml}</div>

    ${heading('Additional Notes')}
    ${scriptBlock(d.additionalNotes)}

    ${heading('Master Film Script')}
    ${row('Uploaded Script File', fileName(d.masterScriptFile))}
    <div style="height:12px;"></div>
    ${scriptBlock(d.masterScript)}

    ${heading('Down-Edit Scripts')}
    ${downEdits.length
      ? downEdits.map((s, i) => `<div style="margin-bottom:8px; font-weight:600; color:#555; font-size:12.5px;">Down-Edit ${i + 1}</div>${scriptBlock(s)}`).join('')
      : `<div style="font-size:13px; color:#111; padding:6px 0;">${BLANK}</div>`}

    ${heading('Client Confirmation')}
    <div style="font-size:12.5px; color:#444; line-height:1.6; margin-bottom:24px;">
      I confirm that the details recorded in this spec sheet are accurate and approve them for production.
    </div>
    <div style="display:flex; gap:40px; margin-top:36px;">
      <div style="flex:1;"><div style="border-bottom:1px solid #333; height:34px;"></div><div style="font-size:11px; color:#888; margin-top:6px;">Client name &amp; signature</div></div>
      <div style="flex:1;"><div style="border-bottom:1px solid #333; height:34px;"></div><div style="font-size:11px; color:#888; margin-top:6px;">Date</div></div>
    </div>

    <div style="margin-top:40px; padding-top:14px; border-top:1px solid #eaeaea; text-align:center; font-size:10.5px; color:#aaa;">
      Generated by AI Collective — Production Spec Sheet · ${generatedOn}
    </div>
  `;

  const safeName = (d.brand || d.client || 'Production')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'Production';

  const opt = {
    margin:       [10, 10, 12, 10],
    filename:     `Spec-Sheet-${safeName}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'], avoid: ['h2'] }
  };

  // Render the document ON-SCREEN, in normal document flow, as the ONLY visible
  // element at the top of <body>. Failure modes ruled out this way:
  //   • off-screen / negative z-index      -> blank canvas
  //   • position:absolute root element     -> html2canvas collapses to 0 height
  //   • inside a position:fixed scroller    -> phantom gap at the top of page 1
  // In-flow layout gives html2canvas the correct height, and having nothing
  // above it keeps the content flush to the top of the first page.
  const hidden = [];
  [...document.body.children].forEach(c => {
    if (c.style.display !== 'none') { hidden.push([c, c.style.display]); c.style.display = 'none'; }
  });
  wrapper.style.margin = '0 auto';
  wrapper.style.background = '#fff';
  document.body.appendChild(wrapper);
  const prevScrollY = window.scrollY;
  window.scrollTo(0, 0);

  const cleanup = () => {
    if (btn) { btn.textContent = oldText; btn.disabled = false; }
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    hidden.forEach(([c, d]) => { c.style.display = d; });
    window.scrollTo(0, prevScrollY);
  };

  // ── Generate, SELF-VERIFY, then download ───────────────────────────
  // 1. Render to canvas first and check it actually contains ink — an
  //    all-white canvas means the capture failed; never save that.
  // 2. Build the PDF and sanity-check blob size + page count.
  // 3. Download via an explicit blob link (more reliable than save()).
  // If ANY step fails, fall back to the browser's print dialog where the
  // user picks "Save as PDF" — so a document is always produced.
  try {
    if (typeof html2pdf !== 'function') throw new Error('html2pdf library not loaded');

    const worker = html2pdf().set(opt).from(wrapper);
    await worker.toCanvas();
    const canvas = worker.prop.canvas;
    if (!canvas || !canvas.width || !canvas.height) throw new Error('Rendered canvas has zero size');

    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let ink = 0;
    for (let i = 0; i < img.length; i += 4 * 199) {
      if (img[i] < 245 || img[i + 1] < 245 || img[i + 2] < 245) { ink++; if (ink > 50) break; }
    }
    if (ink <= 50) throw new Error('Rendered canvas is blank');

    const blob = await worker.toPdf().outputPdf('blob');
    const pages = worker.prop.pdf.internal.getNumberOfPages();
    if (!blob || blob.size < 20000 || pages < 1) {
      throw new Error('PDF output invalid (' + (blob ? blob.size : 0) + ' bytes, ' + pages + ' pages)');
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = opt.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    cleanup();
  } catch (err) {
    console.error('PDF generation failed, opening print fallback:', err);
    const docHtml = wrapper.innerHTML;
    cleanup();
    printFallback(docHtml);
  }
}

// Fallback path: open the spec sheet in a print window — the user chooses
// "Save as PDF" as the printer destination. The browser's own renderer
// produces a perfect vector PDF of the same document.
function printFallback(innerHtml) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Could not generate the PDF automatically, and the pop-up for the print fallback was blocked.\nPlease allow pop-ups for this site and try again.');
    return;
  }
  w.document.write('<!DOCTYPE html><html><head><title>Production Spec Sheet</title>'
    + '<style>'
    + 'body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#333;}'
    + '.sheet{width:800px;margin:0 auto;padding:40px;}'
    + '@media print{.sheet{width:auto;padding:0;} h2{page-break-after:avoid;}}'
    + '@page{size:A4 portrait;margin:12mm;}'
    + '</style></head><body>'
    + '<div class="sheet">' + innerHtml + '</div>'
    + '<scr' + 'ipt>window.onload=function(){window.focus();window.print();};</scr' + 'ipt>'
    + '</body></html>');
  w.document.close();
}

async function adminUnlock(){
  if(!isAdmin) return;
  
  try {
    const response = await fetch(`/api/spec/${projectId}/unlock`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Unlock failed on server');
    
    // Restore form on success
    document.getElementById('successPane').classList.remove('active');
    document.getElementById('pane1').classList.add('active');
    document.getElementById('navBar').style.display='flex';
    document.getElementById('stepTabs').style.display='flex';
    
    // Enable all inputs
    const allInputs = document.querySelectorAll('.form-body input, .form-body textarea, .form-body select, .form-body button');
    allInputs.forEach(el => {
      el.disabled = false;
      el.style.opacity = '1';
    });
    
    currentStep = 1;
    updateNavState();
    localStorage.removeItem('aic_spec_submitted');
    window.scrollTo({top:0,behavior:'smooth'});
    alert('Brief unlocked. Make your amendments and re-submit when ready.');
  } catch (err) {
    console.error('Unlock error:', err);
    alert('Failed to unlock spec sheet on database server.');
  }
}

async function shareWithClient() {
  if (!projectId) {
    alert('Please save the draft first before sharing.');
    return;
  }
  
  const btn = document.getElementById('shareBtn');
  btn.textContent = 'Sharing...';
  
  try {
    // First save any current changes to the draft
    await saveDraft();
    
    // Call the share endpoint to create a snapshot
    const response = await fetch(`/api/spec/${projectId}/share`, { method: 'POST' });
    if (!response.ok) throw new Error('Share failed on server');
    
    currentStatus = 'shared_with_client';
    updateNavState();
    
    // Generate the shareable link (using window.location.origin to work dynamically on live or local)
    const link = `${window.location.origin}/?id=${projectId}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(link).then(() => {
      btn.textContent = 'Link Copied!';
      btn.style.background = '#10b981'; // green
      setTimeout(() => {
        btn.textContent = 'Share with Client';
        btn.style.background = '#2563eb';
      }, 3000);
    }).catch(err => {
      console.error('Copy to clipboard failed', err);
      prompt('Copy this link manually:', link);
      btn.textContent = 'Share with Client';
    });
    
  } catch (err) {
    console.error('Share error:', err);
    alert('Failed to share spec sheet on database server.');
    btn.textContent = 'Share with Client';
  }
}

function showDiffPane() {
  if (!internalSnapshot) {
    alert("No internal snapshot found to compare against.");
    return;
  }
  
  const current = collectFormData();
  const diffs = compareSpec(internalSnapshot, current);
  
  const diffCards = document.getElementById('diffCards');
  if (diffs.length === 0) {
    diffCards.innerHTML = '<div style="padding:20px;text-align:center;color:#666;border:1px dashed #ccc;border-radius:8px">No changes were made by the client.</div>';
  } else {
    diffCards.innerHTML = diffs.map(d => `
      <div style="background:#fff;border:1px solid #e8e5de;border-radius:10px;padding:14px 16px;">
        <div style="font-size:12px;font-weight:700;color:#d97706;margin-bottom:6px">${d.field}</div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <div style="flex:1;background:#fef2f2;border:1px solid #fca5a5;padding:8px;border-radius:6px;font-size:13px;color:#991b1b">
            <div style="font-size:10px;text-transform:uppercase;margin-bottom:4px;color:#dc2626;font-weight:bold">Original (Admin)</div>
            ${d.oldVal}
          </div>
          <div style="padding-top:10px;color:#aaa">➔</div>
          <div style="flex:1;background:#ecfdf5;border:1px solid #6ee7b7;padding:8px;border-radius:6px;font-size:13px;color:#065f46">
            <div style="font-size:10px;text-transform:uppercase;margin-bottom:4px;color:#059669;font-weight:bold">New (Client)</div>
            ${d.newVal}
          </div>
        </div>
      </div>
    `).join('');
  }
  
  // hide all step panes
  for(let i=1;i<=TOTAL_STEPS;i++){
    const p=document.getElementById('pane'+i);
    if(p) p.classList.remove('active');
  }
  document.getElementById('reviewPane').classList.remove('active');
  document.getElementById('diffPane').classList.add('active');
  document.getElementById('navBar').style.display='none';
  document.getElementById('stepTabs').style.display='none';
  window.scrollTo({top:0,behavior:'smooth'});
}

function compareSpec(snapshot, current) {
  const diffs = [];
  
  const mapDbToJs = {
    date: 'date', client: 'client', brand: 'brand', project_title: 'projectTitle',
    spoc_cn: 'spocCN', spoc_cp: 'spocCP', spoc_ce: 'spocCE',
    master_script: 'masterScript',
    num_films: 'numFilms', resolution: 'resolution', primary_lang: 'primaryLang',
    contemporary: 'contemporary', contemp_spec: 'contempSpec', film_duration: 'filmDuration',
    num_down_edits: 'numDownEdits', master_ar: 'masterAR', logo_pos: 'logoPos',
    brand_color: 'brandColor', subtitle: 'subtitle', subtitle_size: 'subtitleSize',
    subtitle_font: 'subtitleFont', subtitle_style: 'subtitleStyle',
    subtitle_lang: 'subtitleLang', subtitle_script: 'subtitleScript',
    additional_notes: 'additionalNotes'
  };

  Object.keys(mapDbToJs).forEach(dbKey => {
    const jsKey = mapDbToJs[dbKey];
    let oldVal = snapshot[dbKey];
    let newVal = current[jsKey];
    
    // Normalize booleans / truthiness for comparison
    if (dbKey === 'contemporary' || dbKey === 'subtitle') {
      oldVal = oldVal ? true : false;
      newVal = newVal ? true : false;
    }
    
    // Normalize strings
    if (typeof oldVal === 'string') oldVal = oldVal.trim();
    if (typeof newVal === 'string') newVal = newVal.trim();
    
    if (oldVal != newVal) {
      if (!oldVal && !newVal) return; // both effectively empty
      diffs.push({
        field: jsKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        oldVal: oldVal || '(empty)',
        newVal: newVal || '(empty)'
      });
    }
  });
  
  return diffs;
}

async function finalizeSpec() {
  if(!confirm("Are you sure you want to finalize this brief? No further changes can be made by anyone.")) return;
  
  try {
    const response = await fetch(`/api/spec/${projectId}/finalize`, { method: 'POST' });
    if (!response.ok) throw new Error('Finalize failed on server');
    
    currentStatus = 'finalized';
    
    // Hide diff pane
    document.getElementById('diffPane').classList.remove('active');
    
    // Reload form UI state
    const { d } = await fetch(`/api/spec/${projectId}`).then(r => r.json()).then(data => ({ d: data }));
    populateForm(d); // This will trigger the locked state UI
    
  } catch (err) {
    console.error('Finalize error:', err);
    alert('Failed to finalize spec sheet on database server.');
  }
}