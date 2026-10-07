const state={
 role:'tourist', page:'overview', lastLocation:null, locationSource:'not_acquired', locationPermission:'unknown', geofenceState:{}, lastZoneEvent:null, aiUpdatedAt:null, user:{name:'Aditya Sanap',email:'tourist@example.com',phone:'9876543210',blood:'O+',allergy:'Penicillin',id:'ST-00124'},
 safety:'SAFE',zone:'Safe Zone',network:'ONLINE',ai:'LOW',incidents:[
  {id:'INC-1024',tourist:'Priya Shah',touristId:'ST-00142',type:'Geofence Warning',severity:'MEDIUM',status:'Resolved',time:'12 Aug 2026',zone:'Hill Road Caution Area',auditRef:'AR-a1c39e02d47bf918a1c39e02d47bf918',historical:true,source:'geofence'},
  {id:'INC-1017',tourist:'Rahul Patil',touristId:'ST-00131',type:'SOS Alert',severity:'HIGH',status:'Resolved',time:'05 Aug 2026',zone:'Cliff Area',auditRef:'AR-7fb203a9e6c1d0457fb203a9e6c1d045',historical:true,source:'sos'}
 ],
 activeIncident:null,
 reportFilters:{status:'all',severity:'all',type:'all',zone:'all'},
 zones:[
  {name:'Marine Drive Safe Zone', type:'Safe', risk:'Low', radius:280, lat:19.0730, lng:72.8720},
  {name:'Hill Road Caution Area', type:'Caution', risk:'Medium', radius:350, lat:19.0810, lng:72.8830},
  {name:'Cliff Area', type:'Restricted', risk:'High', radius:400, lat:19.0700, lng:72.8865}
 ],
 tourists:[
  {name:'Aarav Mehta',id:'ST-00118',email:'aarav@example.com',zone:'Safe Zone',status:'Safe',lat:19.0745,lng:72.8735,locationSource:'demo',identityHash:'IDR-71c4e8a20f9356b2'},
  {name:'Aditya Sanap',id:'ST-00124',email:'tourist@example.com',phone:'9876543210',familyContactName:'Neha Sanap',familyContactPhone:'9876543211',blood:'O+',allergy:'Penicillin',password:'Tourist@123',identityHash:'IDR-2b91f6c4a8703d51',zone:'Safe Zone',status:'Safe',lat:19.0760,lng:72.8777,locationSource:'demo'},
  {name:'Meera Kulkarni',id:'ST-00131',email:'meera@example.com',zone:'Safe Zone',status:'Safe',lat:19.0735,lng:72.8810,locationSource:'demo',identityHash:'IDR-4d8a21c9f6530be7'},
  {name:'Rohan Deshmukh',id:'ST-00142',email:'rohan@example.com',zone:'Safe Zone',status:'Safe',lat:19.0785,lng:72.8795,locationSource:'demo',identityHash:'IDR-93e5b7c1024af68d'}
 ]
};
const DEFAULT_CENTER={lat:19.0760,lng:72.8777};
function jitterLatLng(center,spread){
  spread=spread||0.006;
  return {lat:center.lat+(Math.random()*2-1)*spread, lng:center.lng+(Math.random()*2-1)*spread};
}


const STORAGE_KEY='smartTouristSafetyAccounts_v2';
const LEGACY_STORAGE_KEYS=['smartTouristSafetyAccounts_v1','smartTouristSafetyAccounts'];
state.accounts=[];
function defaultTouristAccount(){return {name:'Aditya Sanap',email:'tourist@example.com',phone:'9876543210',familyContactName:'Neha Sanap',familyContactPhone:'9876543211',blood:'O+',allergy:'Penicillin',id:'ST-00124',password:'Tourist@123',identityHash:'IDR-2b91f6c4a8703d51'};}
function ensureAccountConsistency(){
  state.accounts=Array.isArray(state.accounts)?state.accounts:[];
  const def=defaultTouristAccount();
  if(!findAccount(def.email)) state.accounts.push(def);
  (state.tourists||[]).forEach(t=>{
    if(!t.email){ const a=state.accounts.find(x=>x.id===t.id); if(a) Object.assign(t,{email:a.email,phone:a.phone,familyContactName:a.familyContactName,familyContactPhone:a.familyContactPhone,blood:a.blood,allergy:a.allergy,password:a.password,identityHash:a.identityHash}); }
  });
  state.accounts.forEach(a=>{
    let t=state.tourists.find(x=>x.id===a.id);
    if(!t){ const p=jitterLatLng(DEFAULT_CENTER,0.004); t={...a,zone:'Safe Zone',status:'Safe',lat:p.lat,lng:p.lng,locationSource:'demo'}; state.tourists.push(t); }
    else Object.assign(t,{email:a.email,phone:a.phone,familyContactName:a.familyContactName,familyContactPhone:a.familyContactPhone,blood:a.blood,allergy:a.allergy,password:a.password,identityHash:a.identityHash||t.identityHash});
  });
}



function normalizeTouristRecords(){
  const canonical={
    'ST-00118':{name:'Aarav Mehta',email:'aarav@example.com',identityHash:'IDR-71c4e8a20f9356b2'},
    'ST-00124':{name:'Aditya Sanap',email:'tourist@example.com',identityHash:'IDR-2b91f6c4a8703d51'},
    'ST-00131':{name:'Meera Kulkarni',email:'meera@example.com',identityHash:'IDR-4d8a21c9f6530be7'},
    'ST-00142':{name:'Rohan Deshmukh',email:'rohan@example.com',identityHash:'IDR-93e5b7c1024af68d'}
  };
  const priority=t=>(canonical[t.id]?0:1);
  const seenIds=new Set(), seenEmails=new Set(), seenNames=new Set();
  state.tourists=[...(state.tourists||[])].sort((a,b)=>priority(a)-priority(b)).filter(t=>{
    const id=String(t.id||'').trim(); const email=String(t.email||'').toLowerCase(); const name=String(t.name||'').trim().toLowerCase();
    const junk=/^(l+|n+|test|testing|demo|account|user|tourist)$/i.test(name) || /^l+@/i.test(email) || /^n+@/i.test(email);
    if(junk || !id || seenIds.has(id) || (email&&seenEmails.has(email)) || seenNames.has(name)) return false;
    seenIds.add(id); if(email)seenEmails.add(email); seenNames.add(name); return true;
  });
  state.tourists.forEach(t=>{const c=canonical[t.id]; if(c){t.name=c.name;t.email=c.email;t.identityHash=c.identityHash;} if(!Array.isArray(t.locationHistory))t.locationHistory=[]; if(t.locationSource==='demo'&&t.lat!=null&&t.lng!=null&&!t.locationHistory.length)t.locationHistory=[{lat:Number(t.lat),lng:Number(t.lng),at:new Date().toISOString(),source:'demo'}];});
  state.accounts=(state.accounts||[]).map(a=>{const c=canonical[a.id];return c?{...a,name:c.name,email:c.email,identityHash:c.identityHash}:a;});
  state.incidents=(state.incidents||[]).filter(i=>i.touristId!=='ST-00124' || i.tourist==='Aditya Sanap' || !i.tourist);
  state.incidents.forEach(i=>{const t=state.tourists.find(x=>x.id===i.touristId);if(t)i.tourist=t.name;});
  if(state.activeIncident){const t=state.tourists.find(x=>x.id===state.activeIncident.touristId);if(t)state.activeIncident.tourist=t.name;}
  state.accounts=(state.accounts||[]).filter(a=>!(/^(l+|n+|test|testing|demo)$/i.test(String(a.name||'').trim()))).filter((a,i,arr)=>arr.findIndex(x=>(x.id&&x.id===a.id)||((x.email||'').toLowerCase()===(a.email||'').toLowerCase()))===i);
}
function saveAccounts(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tourists: state.tourists,
      incidents: state.incidents,
      zones: state.zones,
      activity: state.activity || {},
      accounts: state.accounts || [],
      lastLocation: state.lastLocation || null,
      locationSource: state.locationSource || 'not_acquired',
      activeIncident: state.activeIncident || null,
      version:5,
      savedAt:new Date().toISOString()
    }));
  }catch(e){ toast('Browser storage is unavailable; account data cannot be saved on this device.','danger'); }
}
function loadAccounts(){
  try{
    let raw=localStorage.getItem(STORAGE_KEY);
    if(!raw){ for(const key of LEGACY_STORAGE_KEYS){ raw=localStorage.getItem(key); if(raw) break; } }
    if(raw){
      const d=JSON.parse(raw);
      if(Array.isArray(d.tourists)) state.tourists=d.tourists;
      if(Array.isArray(d.incidents)) state.incidents=d.incidents;
      if(Array.isArray(d.zones)) state.zones=d.zones.map(z=>({...z,radius:Number(z.radius)|| (z.type==='Restricted'?400:z.type==='Caution'?350:280)}));
      if(d.activity) state.activity=d.activity;
      if(Array.isArray(d.accounts)) state.accounts=d.accounts;
      if(d.lastLocation && d.lastLocation.lat!=null) state.lastLocation=d.lastLocation;
      if(d.locationSource) state.locationSource=d.locationSource;
      if(d.activeIncident) state.activeIncident=d.activeIncident;
      else state.activeIncident=null;
    }
    ensureAccountConsistency();
    saveAccounts();
  }catch(e){
    console.error('Storage load failed',e);
    ensureAccountConsistency();
  }
}
function findAccount(email){
  const e=(email||'').trim().toLowerCase();
  return state.accounts.find(a=>(a.email||'').toLowerCase()===e);
}
function addAccount(account){
  state.accounts=state.accounts||[];
  const existing=findAccount(account.email);
  if(existing) return false;
  state.accounts.push(account);
  saveAccounts();
  return true;
}
function getTouristByEmail(email){
  const a=findAccount(email);
  if(a) return a;
  return state.tourists.find(t=>(t.email||'').toLowerCase()===(email||'').trim().toLowerCase());
}

const touristNav=[['overview','Overview'],['location','Live Location'],['zones','Safety Zones'],['ai','AI Safety'],['sos','Emergency / SOS'],['medical','Medical Emergency Contact'],['digital','Digital ID'],['incidents','My Incidents'],['profile','Profile']];
const authorityNav=[['overview','Overview'],['monitor','Tourist Monitoring'],['locations','Live Locations'],['alerts','Geofence Alerts'],['ai','AI Incident Analysis'],['incidents','Incident Management'],['verify','Digital ID Verification'],['response','Emergency Response'],['zones','Danger Zones'],['reports','Reports']];

function show(id){['landing','auth','register','app'].forEach(x=>document.getElementById(x).classList.add('hidden'));document.getElementById(id).classList.remove('hidden')}
function showLanding(){show('landing')}
function showAuth(role='tourist'){state.role=role;show('auth');setRole(role)}
function showRegister(){show('register')}
function setRole(role){
  state.role=role;
  document.getElementById('touristTab').classList.toggle('active',role==='tourist');
  document.getElementById('authorityTab').classList.toggle('active',role==='authority');
  document.getElementById('email').value='';
  document.getElementById('password').value='';
  document.getElementById('emailErr').textContent='';
  document.getElementById('passErr').textContent='';
  const g=document.getElementById('guestRow');
  if(g) g.style.display = role==='authority' ? 'none' : 'block';
}
function togglePassword(inputId,btnId){
  const p=document.getElementById(inputId);
  const b=document.getElementById(btnId);
  if(!p) return;
  p.type=p.type==='password'?'text':'password';
  if(b) b.textContent=p.type==='password'?'Show':'Hide';
}
function isValidEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v||'').trim())}
function isValidPhone(v){const digits=((v||'').match(/\d/g)||[]).length;return /^[0-9+\-\s()]+$/.test((v||'').trim()) && digits===10}
function isValidName(v){return /^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test((v||'').trim())}

function forgotPassword(){
  const roleAtOpen=state.role;
  openModal(`<h2>Reset password</h2><p class="muted">Enter the email on your account and we'll walk you through resetting it. (This is a local account — password reset is handled on this device.)</p>
    <div class="field"><label>Email</label><input id="fpEmail" type="text" placeholder="you@example.com"><div id="fpEmailErr" class="error"></div></div>
    <div id="fpStep2" class="hidden">
      <div class="field"><label>New password</label><div class="password-row"><input id="fpNew" type="password" placeholder="Minimum 8 characters"><button type="button" class="btn" onclick="togglePassword('fpNew','fpNewToggle')" id="fpNewToggle">Show</button></div><div id="fpNewErr" class="error"></div></div>
    </div>
    <div class="actions" style="justify-content:flex-end;margin-top:10px">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" id="fpAction" onclick="forgotPasswordStep()">Continue</button>
    </div>`);
  state.role=roleAtOpen;
}
function forgotPasswordStep(){
  const step2=document.getElementById('fpStep2');
  if(step2.classList.contains('hidden')){
    const email=document.getElementById('fpEmail').value.trim().toLowerCase();
    document.getElementById('fpEmailErr').textContent='';
    if(!isValidEmail(email)){document.getElementById('fpEmailErr').textContent='Enter a valid email address.';return}
    const account=findAccount(email);
    if(!account){document.getElementById('fpEmailErr').textContent='No account found for this email.';return}
    state._fpEmail=email;
    step2.classList.remove('hidden');
    document.getElementById('fpAction').textContent='Set new password';
  }else{
    const next=document.getElementById('fpNew').value;
    document.getElementById('fpNewErr').textContent='';
    if(next.length<8){document.getElementById('fpNewErr').textContent='Password must be at least 8 characters.';return}
    const account=findAccount(state._fpEmail);
    if(account){account.password=next; const t=state.tourists.find(x=>x.id===account.id); if(t)t.password=next; saveAccounts()}
    closeModal();
    toast('Password updated — sign in with your new password','success');
  }
}

function login(e){
  e.preventDefault();
  const email=document.getElementById('email').value.trim().toLowerCase();
  const pass=document.getElementById('password').value;
  document.getElementById('emailErr').textContent='';
  document.getElementById('passErr').textContent='';
  let hasError=false;
  if(!isValidEmail(email)){document.getElementById('emailErr').textContent='Enter a valid email address.';hasError=true}
  if(!pass){document.getElementById('passErr').textContent='Password is required.';hasError=true}
  if(hasError) return;

  if(state.role==='authority'){
    const ok=email==='authority@example.com'&&pass==='Authority@123';
    if(!ok){document.getElementById('passErr').textContent='Invalid authority credentials.';return}
    state.user={name:'Safety Authority',email,phone:'—',id:'AUTH-001'}; state.lastLocation=null; state.locationSource='not_acquired'; state.locationPermission='unknown';
  }else{
    ensureAccountConsistency();
    let account=findAccount(email);
    if(!account){
      const touristRecord=state.tourists.find(t=>(t.email||'').trim().toLowerCase()===email);
      if(touristRecord && touristRecord.password){
        account={name:touristRecord.name,email,phone:touristRecord.phone||'Not provided',familyContactName:touristRecord.familyContactName||'Not provided',familyContactPhone:touristRecord.familyContactPhone||'Not provided',blood:touristRecord.blood||'O+',allergy:touristRecord.allergy||'None',id:touristRecord.id,password:touristRecord.password,identityHash:touristRecord.identityHash||null};
        state.accounts.push(account);
      }
    }
    if(!account){document.getElementById('emailErr').textContent='No account found for this email. Create a tourist account first.';return}
    if(account.password!==pass){document.getElementById('passErr').textContent='Incorrect password.';return}
    const touristRecord=state.tourists.find(t=>t.id===account.id);
    if(touristRecord) Object.assign(touristRecord,account);
    state.user={...account};
  }
  state.page='overview';
  saveAccounts();
  enterApp();
}

function loginGuest(){
  const p=jitterLatLng(DEFAULT_CENTER,0.004);
  const account={name:'Guest Explorer',email:'guest-'+Date.now()+'@safetrail.local',phone:'Not provided',blood:'Not provided',allergy:'Not provided',id:'GUEST-'+Math.floor(1000+Math.random()*8999),isGuest:true};
  state.tourists.push({...account,zone:'Safe Zone',status:'Safe',lat:p.lat,lng:p.lng,locationSource:'demo'});
  state.role='tourist';
  state.user={...account};
  state.page='overview';
  toast('Continuing as guest — some features are limited without a registered profile','warning');
  enterApp();
}

function register(e){
  e.preventDefault();
  const name=document.getElementById('rname').value.trim();
  const email=document.getElementById('remail').value.trim().toLowerCase();
  const phone=document.getElementById('rphone').value.trim();
  const password=document.getElementById('rpass').value;
  const confirm=document.getElementById('rconfirm').value;
  ['rnameErr','remailErr','rphoneErr','rpassErr','rconfirmErr'].forEach(id=>document.getElementById(id).textContent='');
  let hasError=false;
  if(!isValidName(name)){document.getElementById('rnameErr').textContent='Enter a valid full name (letters only, at least 2 characters).';hasError=true}
  if(!isValidEmail(email)){document.getElementById('remailErr').textContent='Enter a valid email address.';hasError=true}
  else if(findAccount(email)){document.getElementById('remailErr').textContent='An account with this email already exists — sign in instead.';hasError=true}
  if(!isValidPhone(phone)){document.getElementById('rphoneErr').textContent='Enter a valid 10-digit mobile number.';hasError=true}
  if(password.length<8){document.getElementById('rpassErr').textContent='Password must be at least 8 characters.';hasError=true}
  if(password!==confirm){document.getElementById('rconfirmErr').textContent='Passwords do not match.';hasError=true}
  if(hasError) return;

  const account={name,email,phone,familyContactName:document.getElementById('rfamilyName').value.trim()||'Not provided',familyContactPhone:document.getElementById('rfamilyPhone').value.trim()||'Not provided',blood:document.getElementById('blood').value,allergy:document.getElementById('allergy').value||'None',id:'ST-'+Math.floor(10000+Math.random()*89999),password,identityHash:null};
  if(!addAccount(account)){document.getElementById('remailErr').textContent='An account with this email already exists — sign in instead.';return;}
  const existingTourist=state.tourists.find(t=>t.id===account.id);
  if(!existingTourist){ const p=jitterLatLng(DEFAULT_CENTER,0.004); state.tourists.push({...account,zone:'Safe Zone',status:'Safe',lat:p.lat,lng:p.lng,locationSource:'demo'}); }
  state.user={...account};
  state.role='tourist';
  state.page='overview';
  saveAccounts();
  toast('Registration successful — Digital ID generated','success');
  enterApp();
}
function enterApp(){
  if(state.role==='tourist' && state.user){
    const rec=state.tourists.find(t=>t.id===state.user.id);
    if(rec){
      if(rec.locationSource==='gps' && rec.lat!=null){
        state.lastLocation={lat:Number(rec.lat).toFixed(6),lng:Number(rec.lng).toFixed(6),accuracy:rec.accuracy||null,updatedAt:rec.updatedAt||null};
        state.locationSource='gps';
        applyLiveGeofence(Number(rec.lat),Number(rec.lng));
      }else{
        state.lastLocation=null;
        state.locationSource='not_acquired';
        state.zone='Location not acquired';
        state.safety='UNKNOWN';
        state.ai='WAITING';
      }
    }
  }
  show('app');renderNav();render();
  if(!window._clockStarted){window._clockStarted=true;startClock();}
  const btn=document.getElementById('themeToggle');
  if(btn) btn.textContent = document.body.classList.contains('dark') ? '☀' : '☾';
}
function resetSystemData(){
  if(state.watchId!==null && navigator.geolocation){navigator.geolocation.clearWatch(state.watchId);}
  localStorage.removeItem(STORAGE_KEY);
  state.tourists=[
    {name:'Aarav Mehta',id:'ST-00118',email:'aarav@example.com',zone:'Safe Zone',status:'Safe',lat:19.0745,lng:72.8735,locationSource:'demo',identityHash:'IDR-71c4e8a20f9356b2',locationHistory:[{lat:19.0745,lng:72.8735,at:'2026-09-02T09:00:00',source:'demo'}]},
    {name:'Aditya Sanap',id:'ST-00124',email:'tourist@example.com',phone:'9876543210',familyContactName:'Neha Sanap',familyContactPhone:'9876543211',blood:'O+',allergy:'Penicillin',password:'Tourist@123',identityHash:'IDR-2b91f6c4a8703d51',zone:'Safe Zone',status:'Safe',lat:19.0760,lng:72.8777,locationSource:'demo',locationHistory:[{lat:19.0760,lng:72.8777,at:'2026-09-02T09:05:00',source:'demo'}]},
    {name:'Meera Kulkarni',id:'ST-00131',email:'meera@example.com',zone:'Safe Zone',status:'Safe',lat:19.0735,lng:72.8810,locationSource:'demo',identityHash:'IDR-4d8a21c9f6530be7',locationHistory:[{lat:19.0735,lng:72.8810,at:'2026-09-02T09:10:00',source:'demo'}]},
    {name:'Rohan Deshmukh',id:'ST-00142',email:'rohan@example.com',zone:'Safe Zone',status:'Safe',lat:19.0785,lng:72.8795,locationSource:'demo',identityHash:'IDR-93e5b7c1024af68d',locationHistory:[{lat:19.0785,lng:72.8795,at:'2026-09-02T09:15:00',source:'demo'}]}
  ];
  state.incidents=[
    {id:'INC-2041',tourist:'Rohan Deshmukh',touristId:'ST-00142',type:'Geofence Warning',severity:'MEDIUM',status:'Resolved',time:'12 Aug 2026',zone:'Hill Road Caution Area',auditRef:'AR-91d2a6f4c8305b7191d2a6f4c8305b71',historical:true,source:'geofence'},
    {id:'INC-2034',tourist:'Meera Kulkarni',touristId:'ST-00131',type:'SOS Alert',severity:'HIGH',status:'Resolved',time:'05 Aug 2026',zone:'Cliff Area',auditRef:'AR-4c8e21b7d5039fa14c8e21b7d5039fa1',historical:true,source:'sos'}
  ];
  state.zones=[{name:'Marine Drive Safe Zone',type:'Safe',risk:'Low',radius:280,lat:19.0730,lng:72.8720},{name:'Hill Road Caution Area',type:'Caution',risk:'Medium',radius:350,lat:19.0810,lng:72.8830},{name:'Cliff Area',type:'Restricted',risk:'High',radius:400,lat:19.0700,lng:72.8865}];
  state.activeIncident=null; state.accounts=[]; state.tracking=false; state.lastLocation=null; state.locationSource='not_acquired'; state.locationPermission='unknown'; state.watchId=null; state.geofenceState={}; state.lastZoneEvent=null; state.safety='SAFE'; state.zone='Safe Zone'; state.network='ONLINE'; state.ai='LOW'; state.verifyResultId=null; state.verifyVerifiedId=null; state.selectedTouristId=null; state.reportFilters={status:'all',severity:'all',type:'all',zone:'all'};
  state.user=state.role==='authority'?{name:'Safety Authority',email:'authority@example.com',phone:'—',id:'AUTH-001'}:{...defaultTouristAccount()};
  ensureAccountConsistency(); normalizeTouristRecords(); saveAccounts(); state.page='overview'; show('app'); renderNav(); render(); toast('Demo data reset — unique tourist IDs restored','success');
}
function logout(){if(state.watchId!==null && navigator.geolocation){navigator.geolocation.clearWatch(state.watchId);} state.tracking=false;state.watchId=null;showLanding();toast('Signed out','info')}
function renderNav(){const nav=document.getElementById('nav'),items=state.role==='tourist'?touristNav:authorityNav;nav.innerHTML=items.map(([id,label])=>`<button class="${state.page===id?'active':''}" onclick="go('${id}')">${icon(id)} ${label}</button>`).join('')}
function icon(id){return {overview:'⌂',location:'⌖',locations:'⌖',zones:'◌',ai:'✦',sos:'!',medical:'♡',digital:'◇',incidents:'≡',profile:'○',monitor:'◎',alerts:'△',verify:'✓',response:'↗',reports:'▤'}[id]||'•'}
function go(page){
  state.page=page;
  try{
    renderNav(); render();
  }
  catch(err){ console.error('Navigation render failed:',err); toast('Something went wrong loading that page — please try again.','danger'); }
}
function render(){document.getElementById('roleLabel').textContent=state.role==='tourist'?'Tourist portal':'Authority command';document.getElementById('userName').textContent=state.user.name;document.getElementById('userRole').textContent=state.role==='tourist'?'Tourist':'Authority';document.getElementById('avatar').textContent=state.user.name.split(' ').map(x=>x[0]).join('').slice(0,2);const titles={overview:'Overview',location:'Live Location',zones:state.role==='tourist'?'Safety Zones':'Danger Zones',ai:state.role==='tourist'?'AI Safety':'AI Incident Analysis',sos:'Emergency / SOS',medical:'Medical Emergency Contact',digital:'Digital ID',incidents:state.role==='tourist'?'Incident History':'Incident Management',profile:'Profile',monitor:'Tourist Monitoring',locations:'Live Locations',alerts:'Geofence Alerts',verify:'Digital ID Verification',response:'Emergency Response',reports:'Reports',touristDetail:'Tourist Details'};document.getElementById('pageTitle').textContent=titles[state.page]||'Overview';cleanupOrphanMaps();document.getElementById('content').innerHTML=state.role==='tourist'?touristPage():authorityPage()}
window.addEventListener('error',function(ev){ console.error('Unhandled error:',ev.error||ev.message); });

function touristPage(){switch(state.page){
case'overview':{
  const live=!!state.lastLocation&&state.locationSource==='gps';
  const statusLabel=live?(state.safety==='DANGER'?'Danger':state.safety==='CAUTION'?'Caution':'Safe'):'Awaiting GPS';
  const zoneLabel=live?state.zone:'Location not acquired';
  const score=calculateRiskScore(state.user);
  return `<div class="grid stats">${stat('Safety status',statusLabel,live?(state.safety==='DANGER'?'danger-b':state.safety==='CAUTION'?'warning':'safe'):'')}${stat('Current zone',zoneLabel,live?(state.zone.includes('Restricted')?'danger-b':state.zone.includes('Caution')?'warning':'safe'):'')}${stat('Active alerts',state.activeIncident?'1':'0',state.activeIncident?'danger-b':'safe')}${stat('Risk score',live?score+'/100':'—',live?(score>=70?'danger-b':score>=40?'warning':'safe'):'')}</div><div class="grid two" style="margin-top:16px"><div class="card"><h3 class="section-title">Safety activity</h3>${state.activeIncident?`<div class="notice danger"><b>Active incident</b><br>${state.activeIncident.type} · ${state.activeIncident.severity}</div>`:live?`<div class="notice safe"><b>Live safety check active</b><br>Your latest GPS position is being checked against the monitored geofences.</div>`:`<div class="notice warning"><b>Location required</b><br>Get your current location to calculate your real safety status.</div>`}<div class="row"><div><b>Digital ID</b><small>Identity verified</small></div><span class="badge safe">✓ Verified</span></div><div class="row"><div><b>Medical contact</b><small>Emergency information ready</small></div><button class="btn" onclick="go('medical')">View</button></div><button class="btn danger" style="width:100%;margin-top:18px" onclick="go('sos')">Emergency / SOS</button></div><div class="card"><h3 class="section-title">Current location</h3>${detail('Coordinates',live?state.lastLocation.lat+', '+state.lastLocation.lng:'Not acquired')}${detail('Current zone',zoneLabel)}${detail('Network',state.network)}${detail('Location accuracy',live&&state.lastLocation.accuracy?Math.round(state.lastLocation.accuracy)+' m':'Not available')}<button class="btn" style="width:100%;margin-top:8px" onclick="go('location')">Open Live Location →</button></div></div>`;
}
case'location':return `<div class="grid two"><div class="card">${map('own')}</div><div class="card"><h3 class="section-title">Live location</h3>${detail('Coordinates',state.lastLocation?state.lastLocation.lat+', '+state.lastLocation.lng:'Waiting for GPS')}${detail('Accuracy',state.lastLocation&&state.lastLocation.accuracy?Math.round(state.lastLocation.accuracy)+' metres':'Waiting for GPS')}${detail('Tracking',state.tracking?'LIVE':'Not started')}${detail('Current zone',state.lastLocation?state.zone:'Waiting for GPS')}${detail('Network',state.network)}${detail('Last updated',state.lastLocation?.updatedAt?new Date(state.lastLocation.updatedAt).toLocaleTimeString('en-IN'):'Waiting for GPS')}</div></div>`;
case'zones':return `<div class="notice ${state.safety==='DANGER'?'danger':state.safety==='CAUTION'?'warning':''}" style="margin-bottom:16px"><b>Current status: ${state.zone} · ${state.safety}</b><br><span class="muted">Updated from live GPS geofence checks or an authority zone event. SOS can also raise a HIGH-risk state.</span></div><div class="grid three">${state.zones.map(z=>{const active=z.name===state.zone;return `<div class="card"${active?' style="border-color:var(--brass);background:var(--brass-soft)"':''}><div class="badge ${z.type==='Safe'?'safe':z.type==='Caution'?'warning':'danger-b'}">${z.type}</div><h3>${z.name}</h3><p class="muted">Risk level: <b>${z.risk}</b></p>${active?'<span class="badge safe">✓ You are here</span>':''}</div>`}).join('')}</div>`;
case'ai':{
  const live=!!state.lastLocation&&state.locationSource==='gps';
  const score=live?calculateRiskScore(state.user):0;
  const level=live?(score>=70?'HIGH':score>=40?'MEDIUM':'LOW'):'WAITING';
  const action=getRecommendedAction();
  const locationSignal=live?(state.lastLocation.accuracy?Math.max(15,Math.min(100,100-Math.min(85,state.lastLocation.accuracy)/2)):60):0;
  const zoneSignal=!live?0:(/Restricted/i.test(state.zone)?100:/Caution/i.test(state.zone)?55:15);
  const emergencySignal=state.activeIncident?(state.activeIncident.severity==='HIGH'?100:state.activeIncident.severity==='MEDIUM'?60:25):0;
  return `<div class="grid two">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 class="section-title" style="margin:0">AI safety assessment</h3><button class="btn" onclick="refreshAISafety()">Refresh</button></div>
      <div style="display:flex;align-items:center;gap:18px;margin-top:14px"><div class="ai-score">${live?score:'—'}<span class="muted" style="font-size:16px">${live?'/100':''}</span></div><div><span class="badge ${level==='HIGH'?'danger-b':level==='MEDIUM'?'warning':level==='LOW'?'safe':'warning'}">${level}</span><div class="muted" style="margin-top:6px">${live?'Based on your latest safety signals':'Get a GPS fix to start the assessment.'}</div></div></div>
      ${live?`<div class="risk-meter" style="margin-top:14px"><div class="risk-meter-fill" style="width:${score}%"></div></div>`:''}
    </div>
    <div class="card">
      <h3 class="section-title">Live safety signals</h3>
      ${detail('Geofence signal',live?(/Restricted/i.test(state.zone)?'Danger zone':/Caution/i.test(state.zone)?'Caution zone':'Safe zone'):'Waiting for GPS')}
      ${detail('Emergency signal',state.activeIncident?state.activeIncident.severity:'None')}
      ${detail('Location confidence',live&&state.lastLocation.accuracy?Math.round(state.lastLocation.accuracy)+' m':'Not available')}
      ${detail('Signal status',live?state.network:'Location not acquired')}
    </div>
    <div class="card" style="grid-column:1 / -1">
      <h3 class="section-title">Recommended action</h3>
      <div class="notice ${action.type==='danger'?'danger':action.type==='warning'?'warning':'safe'}"><b>${action.title}</b><br>${action.text}</div>
      <div class="grid three" style="margin-top:14px">
        <div><small class="muted">Geofence</small><div class="risk-meter"><div class="risk-meter-fill" style="width:${zoneSignal}%"></div></div></div>
        <div><small class="muted">Emergency</small><div class="risk-meter"><div class="risk-meter-fill" style="width:${emergencySignal}%"></div></div></div>
        <div><small class="muted">Location</small><div class="risk-meter"><div class="risk-meter-fill" style="width:${locationSignal}%"></div></div></div>
      </div>
      <small class="muted" style="display:block;margin-top:12px">Assessment updated ${state.aiUpdatedAt?new Date(state.aiUpdatedAt).toLocaleTimeString('en-IN'):'when GPS is acquired'}</small>
    </div>
  </div>`;
}
case'sos':return `<div class="card" style="max-width:760px;margin:auto;text-align:center;padding:40px"><div class="eyebrow">Emergency response</div><h2 style="font-size:42px;letter-spacing:-.05em">Need help?</h2><p class="muted">Your current location and Digital ID can be shared with the response authority.</p><button class="btn danger" style="font-size:22px;padding:25px 55px;border-radius:50%;margin:22px" onclick="confirmSOS()">SOS</button><div class="actions" style="justify-content:center"><button class="btn" onclick="voiceSOS()">🎤 Voice SOS</button><button class="btn" onclick="offlineFallback()">Offline emergency fallback</button></div><div class="notice" style="margin-top:25px;text-align:left"> Offline fallback stores the emergency alert locally until connectivity is restored.</div></div><div class="card" style="max-width:760px;margin:16px auto 0"><h3 class="section-title">Emergency contact numbers</h3><div class="row"><div><b>Police</b><small>All-India emergency number</small></div><a class="btn danger" href="tel:100">Call 100</a></div><div class="row"><div><b>Ambulance</b><small>Medical emergency</small></div><a class="btn danger" href="tel:108">Call 108</a></div><div class="row"><div><b>Tourist helpline</b><small>24x7 multilingual tourist assistance</small></div><a class="btn" href="tel:1363">Call 1363</a></div></div>`;
case'medical':return `<div class="grid two"><div class="card"><h3 class="section-title">Medical Emergency Contact</h3>${detail('Blood group',state.user.blood||'O+')}${detail('Allergies',state.user.allergy||'None')}${detail('Access','Authorized responders only')}<button class="btn green" onclick="openMedicalResponderView()">Secure responder view</button></div><div class="card" style="text-align:center"><h3 class="section-title">Medical QR payload</h3><div id="medicalQR" class="qr"></div><small class="muted">Medical payload · ${state.user.id}</small><br><button class="btn" style="margin-top:10px" onclick="generateQR('medicalQR')">Generate QR</button><small class="muted" style="display:block;margin-top:8px">Scannable QR generated in the browser.</small></div></div>`;
case'digital':return `<div class="idbox"><div class="idhead"><div><div class="eyebrow">Digital identity</div><h2>${state.user.name}</h2></div><span class="badge safe">✓ VERIFIED</span></div>${detail('Tourist ID',state.user.id)}${detail('Identity reference',getIdentityReference(state.user))}${detail('Identity type','Digital identity')}${detail('Verification','Verified identity record')}<div id="digitalQR" class="qr"></div><button class="btn" style="width:100%;margin-bottom:8px" onclick="generateQR('digitalQR')">Generate QR</button><small class="muted" style="display:block;text-align:center;margin-bottom:10px">Scannable QR generated in the browser.</small><button class="btn primary" style="width:100%" onclick="verifyCurrentIdentity()">Verify Identity</button><div class="notice" style="margin-top:15px">Identity verification uses the registered identity record and audit reference.</div></div>`;
case'incidents':{const mine=state.incidents.filter(i=>i.touristId===state.user.id || i.tourist===state.user.name);return `<div class="card"><h3 class="section-title">My Incident History</h3><p class="muted" style="margin-top:-6px">Only incidents linked to your Tourist ID are shown here.</p>${mine.length?mine.map(i=>incidentRow(i)).join(''):'<div class="notice">No incidents recorded for your account.</div>'}</div>`;}
case'profile':return `<div class="card" style="max-width:720px">${detail('Full name',state.user.name)}${detail('Email',state.user.email)}${detail('Mobile',state.user.phone||'—')}${detail('Family contact',state.user.familyContactName||'Not provided')}${detail('Family contact number',state.user.familyContactPhone||'Not provided')}${detail('Country','India')}${detail('Digital ID',state.user.id)}${detail('Identity reference',getIdentityReference(state.user))}${detail('Medical summary',(state.user.blood||'O+')+' · '+(state.user.allergy||'None'))}</div>`;
}}
function statusForTourist(t){return t.status==='SOS'?'SOS':(t.zone||'').includes('Restricted')?'Restricted':(t.zone||'').includes('Caution')?'Caution':'Safe'}
function authorityPage(){switch(state.page){
case'overview':return `<div class="grid stats">${stat('Registered tourists',state.tourists.length,'')} ${stat('Open incidents',state.incidents.filter(i=>i.status!=='Resolved').length,'danger-b')} ${stat('Live geofence alerts',state.incidents.filter(i=>(i.type.includes('Geofence')||i.type.includes('Restricted'))&&i.status!=='Resolved'&&!i.historical).length,state.incidents.filter(i=>(i.type.includes('Geofence')||i.type.includes('Restricted'))&&i.status!=='Resolved'&&!i.historical).length?'warning':'safe')} ${stat('SOS alerts',state.incidents.filter(i=>i.type==='SOS Alert'&&i.status!=='Resolved').length,'danger-b')}</div><div class="grid two" style="margin-top:16px"><div class="card"><h3 class="section-title">Recent incidents</h3>${state.activeIncident?incidentRow(state.activeIncident):'<div class="notice">No new emergency incidents.</div>'}${state.incidents.filter(i=>!state.activeIncident||i.id!==state.activeIncident.id).slice(0,3).map(incidentRow).join('')}</div><div class="card"><h3 class="section-title">Quick links</h3><div class="row"><div><b>Live tourist locations</b><small>View current and recent location records</small></div><button class="btn" onclick="go('locations')">Open</button></div><div class="row"><div><b>Safety zones</b><small>Add zones and trigger geofence events</small></div><button class="btn" onclick="go('zones')">Open</button></div><div class="row"><div><b>Incident queue</b><small>Acknowledge, assign, resolve</small></div><button class="btn" onclick="go('incidents')">Open</button></div></div></div>`;
case'monitor':{
  const q=(state.touristFilter||'');
  const qLower=q.trim().toLowerCase();
  const filtered=qLower ? state.tourists.filter(t=>(t.name+' '+t.id+' '+t.zone).toLowerCase().includes(qLower)) : state.tourists;
  const statusFor=statusForTourist;
  return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h3 class="section-title" style="margin:0">Tourist monitoring</h3><p class="muted" style="margin:5px 0 0">Monitor registered tourists, status and latest location data.</p></div><input class="search-box" placeholder="Search by name, ID or zone…" value="${q}" oninput="filterTourists(this.value)"></div><div class="monitor-list"><div class="monitor-item monitor-head"><div>Tourist</div><div>Tourist ID</div><div>Zone</div><div>Status</div><div>Action</div></div>${filtered.length?filtered.map(t=>{const st=statusFor(t);const live=t.locationSource==='gps';return `<div class="monitor-item"><div><b>${t.name}</b><small class="muted" style="display:block;margin-top:3px">${t.email||'Registered account'} · ${live?'GPS connected':'Location not connected'}</small></div><div class="mono">${t.id}</div><div>${t.zone||'Outside monitored zones'}</div><div><span class="badge ${st==='SOS'||st==='Restricted'?'danger-b':st==='Caution'?'warning':'safe'}">${st}</span></div><div><button class="btn primary view-btn" onclick="viewTourist('${t.id}')">View details</button></div></div>`}).join(''):'<div class="notice" style="margin:14px">No tourists match your search.</div>'}</div></div>`;
}
case'touristDetail':{
  const t=state.tourists.find(x=>x.id===state.selectedTouristId);
  if(!t){state.page='monitor';return authorityPage();}
  const account=findAccount(t.email)||{};
  const incidents=state.incidents.filter(i=>i.touristId===t.id || i.tourist===t.name);
  const st=statusForTourist(t);
  return `<div class="detail-page">
    <div class="detail-toolbar"><button class="btn" onclick="backFromTouristDetails()">← Back to Tourist Monitoring</button><span class="badge ${st==='SOS'||st==='Restricted'?'danger-b':st==='Caution'?'warning':'safe'}">${st}</span></div>
    <div class="grid two" style="margin-top:15px">
      <div class="card"><div class="eyebrow">Tourist record</div><h2 style="margin:10px 0 4px">${t.name}</h2><p class="muted" style="margin-top:0">${t.id}</p>${detail('Current zone',t.zone||'Outside monitored zones')}${detail('Current status',st)}${detail('Risk score',calculateRiskScore(t)+'/100')}${detail('Latest location',t.lat!=null?t.lat.toFixed(6)+', '+t.lng.toFixed(6)+(t.locationSource==='demo'?' (demo)':''):'Location unavailable')}${detail('Last update',t.updatedAt?new Date(t.updatedAt).toLocaleString('en-IN'):'Not available')}${detail('Identity reference',getIdentityReference(t))}</div>
      <div class="card"><h3 class="section-title">Response information</h3>${detail('Response status',t.status==='SOS'?'Emergency response required':t.status==='Alert'?'Safety alert':'Monitoring')}${detail('Assigned team',state.activeIncident&&state.activeIncident.touristId===t.id?(state.activeIncident.assignedTo||'Awaiting assignment'):'No active assignment')}${detail('Medical record',(account.blood||'Not provided')+' · '+(account.allergy||'No allergies on file'))}${detail('Incidents recorded',incidents.length)}<div class="actions" style="margin-top:15px"><button class="btn primary" onclick="state.verifyResultId='${t.id}';go('verify')">Verify identity</button><button class="btn" onclick="go('locations')">View live location</button><button class="btn" onclick="go('incidents')">View incidents</button></div></div>
    </div>
    <div class="card" style="margin-top:15px"><h3 class="section-title">Incident history</h3>${incidents.length?incidents.map(incidentRow).join(''):'<div class="notice">No incidents recorded for this tourist.</div>'}</div>
  </div>`;
}
case'locations':return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h3 class="section-title" style="margin:0">Live Tourist Locations</h3><p class="muted" style="margin:4px 0 0">Live GPS and last-known tourist positions are shown on the map.</p></div><div class="actions"><button class="btn" type="button" onclick="refreshAuthorityMap()">↻ Refresh map</button></div></div><div style="margin-top:14px">${map('monitor')}</div></div>`;
case'alerts':{
  const geo=activeGeofenceIncidents().filter(i=>!i.historical);
  const count=geo.length;
  const gpsCount=state.tourists.filter(t=>t.locationSource==='gps').length;
  const alertRows=geo.map(incidentRow).join('');
  const zoneRows=state.zones.map(z=>'<div class="row"><div><b>'+z.name+'</b><small>'+z.type+' · '+(Number(z.radius)||400)+' m radius</small></div><span class="badge '+(z.type==='Restricted'?'danger-b':z.type==='Caution'?'warning':'safe')+'">'+z.type+'</span></div>').join('');
  const connectionNotice=gpsCount
    ? `<div class="notice safe" style="margin-top:15px"><b>${gpsCount} GPS-connected tourist${gpsCount===1?'':'s'}</b><br>Each new GPS position is checked against every monitored zone.</div>`
    : `<div class="notice warning" style="margin-top:15px"><b>Waiting for a GPS-connected tourist</b><br>Start Live Location on the Tourist portal; the authority view updates through browser storage.</div>`;
  const alertBody=count
    ? `<div style="margin-top:14px">${alertRows}</div>`
    : `<div class="notice safe" style="margin-top:15px"><b>No active geofence alerts</b><br>When a GPS position crosses into a caution or restricted boundary, an alert appears here immediately.</div>`;
  return `<div class="grid two"><div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><h3 class="section-title" style="margin:0">Geofence alerts</h3><p class="muted" style="margin:4px 0 0">Live alerts are created from GPS boundary crossings.</p></div><span class="badge ${count?'warning':'safe'}">${count} active</span></div>${connectionNotice}${alertBody}</div><div class="card"><h3 class="section-title">Boundary monitoring</h3>${zoneRows}<div class="notice" style="margin-top:14px"><b>Live flow</b><br>GPS fix → distance calculation → zone classification → new-entry alert → incident record.</div></div></div>`;
}
case'ai':{const score=calculateRiskScore(state.activeIncident||state.user);return `<div class="grid two"><div class="card"><h3 class="section-title">Current risk score</h3><div class="ai-score">${score}<span class="muted" style="font-size:16px">/100</span></div><div class="risk-meter"><div class="risk-meter-fill" style="width:${score}%"></div></div><p class="muted" style="margin-bottom:0">Live score uses the current zone, SOS state, incident severity and location/network signals.</p></div><div class="card"><h3 class="section-title">Live risk distribution</h3>${riskDistributionMarkup()}<p class="muted" style="margin-bottom:0">Current monitored tourists only.</p></div></div><div class="card" style="margin-top:15px"><h3 class="section-title">Active risk assessment</h3>${state.activeIncident?`<div class="notice ${state.activeIncident.severity==='HIGH'?'danger':'warning'}"><b>${state.activeIncident.tourist} · ${state.activeIncident.severity} risk</b><br>${state.activeIncident.type} · ${state.activeIncident.zone}<br>Risk score: <b>${calculateRiskScore(state.activeIncident)}/100</b></div>`:'<div class="notice safe"><b>No active incident</b><br>Continue monitoring current tourist risk states.</div>'}<p class="muted" style="margin-bottom:0;margin-top:12px">Decision-support scoring based on live safety signals; not a trained ML model.</p></div>`;}
case'incidents':return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 class="section-title">Incident management</h3><button class="btn primary" type="button" onclick="openCreateIncidentModal()">Create incident</button></div>${state.activeIncident?`<div class="card incident-active" style="margin:15px 0;background:#fbf2f2;border-color:#eed1d1"><div class="incident-active-grid"><div><span class="badge danger-b">${state.activeIncident.severity}</span><h3>${state.activeIncident.id}</h3><p><b>${state.activeIncident.tourist}</b> · ${state.activeIncident.type}</p><p class="muted">${state.activeIncident.zone} · ${state.activeIncident.status}</p><p class="mono" style="font-size:11px;color:#8a9198;margin-top:8px">Audit reference: ${state.activeIncident.auditRef||'—'}</p></div><div class="actions"><button class="btn" onclick="updateIncident('Acknowledged')" ${state.activeIncident.status!=='New'?'disabled':''}>Acknowledge</button><button class="btn amber" onclick="updateIncident('Assigned')" ${state.activeIncident.status!=='Acknowledged'?'disabled':''}>Assign response</button><button class="btn green" onclick="updateIncident('Resolved')" ${state.activeIncident.status!=='Assigned'?'disabled':''}>Resolve</button></div></div><div class="notice" style="margin-top:12px">Response status: <b>${state.activeIncident.status}</b>${state.activeIncident.assignedTo?' · '+state.activeIncident.assignedTo:''}</div></div>`:'<div class="notice">No active incidents. Trigger SOS from the Tourist portal, or use Zone Event Controls in Danger Zones to update the connected workflow.</div>'}${state.incidents.map(incidentRow).join('')}</div>`;
case'verify':{
  const found = state.verifyResultId ? state.tourists.find(t=>t.id===state.verifyResultId) : null;
  const verified=found && state.verifyVerifiedId===found.id;
  return `<div class="grid two"><div class="idbox"><div class="eyebrow">Authority verification</div><h2>Digital ID lookup</h2><p class="muted">Enter a registered Tourist ID to retrieve the current identity and safety record.</p>
    <div class="field"><label>Tourist ID</label><input id="verifyId" placeholder="e.g. ST-00124" value="${state.verifyResultId||''}" onkeydown="if(event.key==='Enter')runVerify()"><div id="verifyErr" class="error"></div></div>
    <div class="actions"><button class="btn primary" onclick="runVerify()">Look up record</button><button class="btn" onclick="clearVerify()">Clear</button></div>
    ${found?`<div class="verify-result">${detail('Tourist',found.name)}${detail('Tourist ID',found.id)}${detail('Current zone',found.zone||'Outside monitored zones')}${detail('Current status',found.status||'Safe')}${detail('Identity reference',getIdentityReference(found))}${detail('Record status',verified?'Verified':'Ready for verification')}<div class="actions" style="margin-top:14px"><button class="btn green" onclick="verifyAuthorityRecord()">${verified?'Verified ✓':'Verify identity'}</button><button class="btn" onclick="generateVerifyQR()">Generate QR</button></div>${verified?'<div class="notice" style="margin-top:12px"><b>Verification successful.</b> Identity matches the registered tourist record.</div>':''}<div id="verifyQR" class="qr"></div></div>`:''}
    </div><div class="card"><h3 class="section-title">Verification activity</h3>${found?`<div class="notice ${verified?'':'warning'}"><b>${verified?'Identity verified':'Record located'}</b><br>${found.name} · ${found.id}<br><span class="muted">${new Date().toLocaleString('en-IN')}</span></div>`:'<div class="notice">No record selected. Search for a Tourist ID to begin.</div>'}<div class="row"><div><b>Registered identity records</b><small>Available tourist accounts</small></div><b>${state.tourists.length}</b></div><div class="row"><div><b>Verification method</b><small>Registered ID and identity reference</small></div><span class="badge safe">Active</span></div></div></div>`;
}
case'response':return `<div class="grid two"><div class="card"><h3 class="section-title">Emergency response</h3>${state.activeIncident?`<div class="notice danger"><b>${state.activeIncident.type}</b><br>${state.activeIncident.tourist} · ${state.activeIncident.touristId||'—'}<br>${state.activeIncident.zone}</div><div class="grid two" style="margin-top:14px">${detail('Severity',state.activeIncident.severity)}${detail('Status',state.activeIncident.status)}${detail('Tourist ID',state.activeIncident.touristId||'—')}${detail('Assigned to',state.activeIncident.assignedTo||'Not assigned')}${detail('Incident time',state.activeIncident.time||'—')}${detail('Audit reference',state.activeIncident.auditRef?state.activeIncident.auditRef.slice(0,18)+'…':'—')}</div><div class="response-actions"><button class="btn" onclick="updateIncident('Acknowledged')" ${state.activeIncident.status!=='New'?'disabled':''}>Acknowledge</button><button class="btn amber" onclick="updateIncident('Assigned')" ${state.activeIncident.status!=='Acknowledged'?'disabled':''}>Assign response</button><button class="btn green" onclick="updateIncident('Resolved')" ${state.activeIncident.status!=='Assigned'?'disabled':''}>Resolve</button></div><div class="notice" style="margin-top:14px"><b>Response workflow</b><br>New → Acknowledged → Assigned → Resolved</div>`:'<div class="notice">No active emergency response required.</div>'}</div><div class="card"><h3 class="section-title">Response information</h3>${detail('Response team','Emergency Response Team')}${detail('Identity verification','Available through Digital ID Verification')}${detail('Incident records','Available through Incident Management')}${detail('Live location','Available through Live Locations')}<div class="actions" style="margin-top:15px"><button class="btn primary" onclick="go('incidents')">Incident Management</button><button class="btn" onclick="go('verify')">Verify Identity</button><button class="btn" onclick="go('locations')">Live Locations</button></div></div></div>`;
case'zones':return `<div class="card" style="margin-bottom:16px">${map('editor')}</div><div class="grid two"><div class="card"><h3 class="section-title">Create danger zone</h3><p class="muted">Add and manage monitored zones with a defined geofence radius.</p><form onsubmit="createZone(event)" novalidate><div class="field"><label>Zone name</label><input id="zname" placeholder="Cliff Area"><div id="znameErr" class="error"></div></div><div class="field"><label>Zone type</label><select id="ztype"><option>Restricted</option><option>Caution</option><option>Safe</option></select></div><div class="field"><label>Risk level</label><select id="zrisk"><option>High</option><option>Medium</option><option>Low</option></select></div><div class="field"><label>Geofence radius (metres)</label><input id="zradius" type="number" min="50" max="5000" value="400"></div><button class="btn primary">Create zone</button></form><h3 class="section-title" style="margin-top:22px">Active zones</h3>${state.zones.map((z,i)=>`<div class="row"><div><b>${z.name}</b><small>${z.type} · ${z.risk} risk · ${Number(z.radius)||400}m</small></div><div class="zone-row-actions"><span class="badge ${z.type==='Safe'?'safe':z.type==='Caution'?'warning':'danger-b'}">${z.type}</span><button class="btn" onclick="openZoneEditModal(${i})">Edit</button><button class="btn" onclick="confirmRemoveZone(${i})">Remove</button></div></div>`).join('')}</div><div class="card"><h3 class="section-title">Geofence test controls</h3><p class="muted">For a viva demonstration, place a selected tourist at a zone boundary. The same browser-side alert and incident pipeline used by GPS is triggered immediately.</p><div class="field"><label>Tourist</label><select id="eventTourist">${state.tourists.map(t=>`<option value="${t.id}">${t.name} — ${t.id}</option>`).join('')}</select></div><div class="zone-control-list">${state.zones.map((z,i)=>`<div class="zone-control ${z.type==='Safe'?'zone-safe':z.type==='Caution'?'zone-caution':'zone-restricted'}"><span><b>${z.name}</b><small>${z.type} · ${z.risk} risk · ${Number(z.radius)||400}m radius</small></span><button type="button" class="btn ${z.type==='Restricted'?'danger':z.type==='Caution'?'amber':'green'}" onclick="triggerZoneEventForTourist(document.getElementById('eventTourist').value,${i})">${z.type==='Restricted'?'Trigger danger':z.type==='Caution'?'Trigger caution':'Set safe'}</button></div>`).join('')}</div>${state.lastZoneEvent?`<div class="notice" style="margin-top:14px"><b>Last zone event:</b> ${state.lastZoneEvent}</div>`:''}</div></div>`;
case'reports':{const filtered=filteredReportIncidents();const resolved=filtered.filter(i=>i.status==='Resolved').length;const open=filtered.filter(i=>i.status!=='Resolved').length;const high=filtered.filter(i=>i.severity==='HIGH').length;const medium=filtered.filter(i=>i.severity==='MEDIUM').length;const low=filtered.filter(i=>i.severity==='LOW').length;return `<div class="grid three">${stat('Matching incidents',filtered.length,'')} ${stat('Open',open,open?'danger-b':'safe')} ${stat('Resolved',resolved,'safe')}</div><div class="grid three" style="margin-top:15px">${stat('High risk',high,high?'danger-b':'safe')} ${stat('Medium risk',medium,medium?'warning':'safe')} ${stat('Low risk',low,'safe')}</div><div class="card" style="margin-top:15px"><h3 class="section-title">Report filters</h3><div class="grid four"><div class="field"><label>Status</label><select onchange="setReportFilter('status',this.value)"><option value="all" ${state.reportFilters.status==='all'?'selected':''}>All statuses</option><option value="New" ${state.reportFilters.status==='New'?'selected':''}>New</option><option value="Acknowledged" ${state.reportFilters.status==='Acknowledged'?'selected':''}>Acknowledged</option><option value="Assigned" ${state.reportFilters.status==='Assigned'?'selected':''}>Assigned</option><option value="Resolved" ${state.reportFilters.status==='Resolved'?'selected':''}>Resolved</option></select></div><div class="field"><label>Severity</label><select onchange="setReportFilter('severity',this.value)"><option value="all" ${state.reportFilters.severity==='all'?'selected':''}>All severity</option><option value="HIGH" ${state.reportFilters.severity==='HIGH'?'selected':''}>High</option><option value="MEDIUM" ${state.reportFilters.severity==='MEDIUM'?'selected':''}>Medium</option><option value="LOW" ${state.reportFilters.severity==='LOW'?'selected':''}>Low</option></select></div><div class="field"><label>Type</label><select onchange="setReportFilter('type',this.value)"><option value="all" ${state.reportFilters.type==='all'?'selected':''}>All types</option>${reportTypeOptions()}</select></div><div class="field"><label>Zone</label><select onchange="setReportFilter('zone',this.value)"><option value="all" ${state.reportFilters.zone==='all'?'selected':''}>All zones</option>${state.zones.map(z=>`<option value="${z.name.replace(/"/g,'&quot;')}" ${state.reportFilters.zone===z.name?'selected':''}>${z.name}</option>`).join('')}</select></div></div><div class="actions"><button class="btn" onclick="resetReportFilters()">Reset filters</button><button class="btn primary" onclick="exportIncidentCSV()">Export CSV</button><button class="btn" onclick="printIncidentReport()">Print filtered report</button></div></div><div class="card" style="margin-top:15px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h3 class="section-title" style="margin:0">Incident report results</h3><span class="badge safe">${filtered.length} records</span></div>${filtered.length?filtered.map(incidentRow).join(''):'<div class="notice" style="margin-top:12px">No incidents match the selected filters.</div>'}</div>`;}

}}
function stat(label,num,cls){return `<div class="card"><div class="stat-label">${label}</div><div class="stat-num">${num}</div>${cls?`<span class="badge ${cls}" style="margin-top:8px">${cls==='safe'?'Stable':cls==='danger-b'?'Attention':'Monitor'}</span>`:''}</div>`}
function detail(a,b){return `<div class="row"><span class="muted">${a}</span><b>${b}</b></div>`}
let leafletMaps = {};
const ZONE_COLORS = {Safe:'#22c55e', Caution:'#f59e0b', Restricted:'#f43f5e'};
const STATUS_COLORS = {SAFE:'#22c55e', CAUTION:'#f59e0b', DANGER:'#f43f5e'};

function getRecommendedAction(){
  const live=!!state.lastLocation&&state.locationSource==='gps';
  if(!live) return {type:'warning',title:'Get your current location',text:'Acquire a fresh GPS position so the safety check can compare you with the monitored zones.'};
  if(state.activeIncident?.severity==='HIGH') return {type:'danger',title:'Move to a safer point and use SOS support',text:`A ${state.activeIncident.type} is active. Keep your phone available and follow the emergency response instructions.`};
  if(/Restricted/i.test(state.zone)) return {type:'danger',title:'Leave the restricted zone',text:`Your latest GPS position is inside ${state.zone}. Move outside the monitored boundary and use SOS if you cannot leave safely.`};
  if(/Caution/i.test(state.zone)) return {type:'warning',title:'Proceed carefully',text:`You are currently inside ${state.zone}. Stay alert, avoid isolated areas, and keep your live location active.`};
  if(state.lastLocation.accuracy && state.lastLocation.accuracy>100) return {type:'warning',title:'Improve location confidence',text:`GPS accuracy is about ${Math.round(state.lastLocation.accuracy)} m. Move to an open area for a clearer position before relying on the boundary check.`};
  return {type:'safe',title:'Continue normally',text:'Your latest GPS position is outside the monitored danger boundaries. Keep location monitoring active while travelling.'};
}
function refreshAISafety(){
  state.aiUpdatedAt=new Date().toISOString();
  const rec=myTouristRecord();
  if(rec && state.lastLocation && state.locationSource==='gps') applyLiveGeofence(Number(state.lastLocation.lat),Number(state.lastLocation.lng));
  saveAccounts();
  render();
  toast('Safety assessment refreshed','success');
}
function myTouristRecord(){
  return state.tourists.find(t=>t.id===state.user.id) || null;
}
function myLatLng(){
  const rec=myTouristRecord();
  if(rec && rec.lat!=null) return {lat:rec.lat,lng:rec.lng};
  if(state.lastLocation?.lat) return {lat:Number(state.lastLocation.lat), lng:Number(state.lastLocation.lng)};
  return {lat:DEFAULT_CENTER.lat,lng:DEFAULT_CENTER.lng};
}

function cleanupOrphanMaps(){
  Object.keys(leafletMaps).forEach(id=>{
    const m=leafletMaps[id];
    const container=m && m.getContainer && m.getContainer();
    if(!container || !document.body.contains(container)){
      try{ m.remove(); }catch(e){}
      delete leafletMaps[id];
    }
  });
}

// mode: 'own' (tourist's personal read-only map) | 'monitor' (authority
// read-only, all tourists) | 'editor' (authority, all tourists + click to
// place a new zone)
function map(mode){
  const id = 'leafletMap_' + Math.random().toString(36).slice(2,10);
  setTimeout(()=>initLeafletMap(id, mode), 0);
  if(mode==='own'){
    return `<div class="mapbox" id="${id}" style="position:relative;"><div style="position:absolute;top:12px;right:12px;z-index:10000;display:flex;flex-direction:column;gap:7px;"><button type="button" title="Get exact live location" aria-label="Get exact live location" onclick="event.stopPropagation();getFreshMapLocation(ownLiveMap)" style="width:44px;height:44px;border:2px solid #555;border-radius:8px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.35);font-size:24px;line-height:40px;cursor:pointer;padding:0">⌖</button><button type="button" title="Refresh live GPS" aria-label="Refresh live GPS" onclick="event.stopPropagation();getFreshMapLocation(ownLiveMap)" style="width:44px;height:44px;border:2px solid #555;border-radius:8px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.35);font-size:22px;line-height:40px;cursor:pointer;padding:0">↻</button></div></div>`;
  }
  return `<div class="mapbox mini-map" id="${id}"></div>`;
}

function drawZonesOn(m){
  (state.zones||[]).forEach((z,i)=>{
    const radiusM = Number(z.radius)|| (z.type==='Restricted'?400:z.type==='Caution'?350:280);
    L.circle([z.lat,z.lng],{
      radius:radiusM,
      color: ZONE_COLORS[z.type]||ZONE_COLORS.Safe,
      fillColor: ZONE_COLORS[z.type]||ZONE_COLORS.Safe,
      fillOpacity:.16,
      weight:2
    }).addTo(m).bindPopup(`<b>${z.name}</b><br>${z.type} zone · ${z.risk||'—'} risk`);
  });
}

function initLeafletMap(id,mode){
  const el=document.getElementById(id); if(!el||!window.L)return;
  const hasGps=mode==='own' && state.lastLocation && state.locationSource==='gps';
  const center=hasGps?{lat:Number(state.lastLocation.lat),lng:Number(state.lastLocation.lng)}:DEFAULT_CENTER;
  const zoom=hasGps?17:14;
  const m=L.map(id,{zoomControl:true,scrollWheelZoom:true}).setView([center.lat,center.lng],zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(m);
  drawZonesOn(m);
  if(mode==='own'){
    ownLiveMap=m; ownLiveMarker=null; ownAccuracyCircle=null;
    if(state.lastLocation){
      const c=STATUS_COLORS[state.safety]||STATUS_COLORS.SAFE;
      ownLiveMarker=L.circleMarker([center.lat,center.lng],{radius:9,color:'#fff',weight:3,fillColor:c,fillOpacity:1}).addTo(m);
      if(Number(state.lastLocation.accuracy)>0) ownAccuracyCircle=L.circle([center.lat,center.lng],{radius:Number(state.lastLocation.accuracy),color:c,fillColor:c,fillOpacity:.08,weight:1}).addTo(m);
      ownLiveMarker.bindPopup(`<b>Current device location</b><br>${state.zone} · ${state.safety}<br>Accuracy: ${state.lastLocation.accuracy?Math.round(state.lastLocation.accuracy)+' m':'not available'}`);
    }
  }else{
    state.tourists.forEach(t=>{
      if(t.lat==null||t.lng==null)return;
      const c=t.status==='SOS'?STATUS_COLORS.DANGER:(t.zone||'').includes('Restricted')?STATUS_COLORS.DANGER:(t.zone||'').includes('Caution')?STATUS_COLORS.CAUTION:STATUS_COLORS.SAFE;
      L.circleMarker([Number(t.lat),Number(t.lng)],{radius:t.locationSource==='gps'?10:8,color:'#fff',weight:2,fillColor:c,fillOpacity:1}).addTo(m)
       .bindPopup(`<b>${t.name}</b><br>${t.id}<br>${t.zone||'Outside monitored zones'}<br>${t.locationSource==='gps'?'LIVE GPS':'Last known position'}`);
    });
  }
  if(mode==='editor')m.on('click',e=>openZoneCreateModal(e.latlng));
  leafletMaps[id]=m; setTimeout(()=>{m.invalidateSize(); if(mode==='own' && state.lastLocation){ const lat=Number(state.lastLocation.lat),lng=Number(state.lastLocation.lng); if(Number.isFinite(lat)&&Number.isFinite(lng)){ updateOwnLiveMap(lat,lng,Number(state.lastLocation.accuracy)||0); m.setView([lat,lng],17,{animate:false}); }}},80);
}

function openZoneCreateModal(latlng){
  openModal(`<h2>Add a new zone</h2><p class="muted">Placed at ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}.</p>
    <div class="field"><label>Zone name</label><input id="mzname" placeholder="e.g. Cliff Area"><div id="mznameErr" class="error"></div></div>
    <div class="field"><label>Zone type</label><select id="mztype"><option>Restricted</option><option>Caution</option><option>Safe</option></select></div>
    <div class="field"><label>Risk level</label><select id="mzrisk"><option>High</option><option>Medium</option><option>Low</option></select></div><div class="field"><label>Geofence radius (metres)</label><input id="mzradius" type="number" min="50" max="5000" value="400"></div>
    <div class="actions" style="justify-content:flex-end;margin-top:10px">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="confirmCreateZoneAt(${latlng.lat},${latlng.lng})">Add zone</button>
    </div>`);
}
function confirmCreateZoneAt(lat,lng){
  const name=document.getElementById('mzname').value.trim();
  if(!name){ document.getElementById('mznameErr').textContent='Enter a zone name.'; return; }
  const radius=Math.max(50,Math.min(5000,Number(document.getElementById('mzradius').value)||400)); state.zones.push({name, type:document.getElementById('mztype').value, risk:document.getElementById('mzrisk').value, radius, lat, lng});
  saveAccounts();
  closeModal();
  toast('Zone added to the map','success');
  render();
}

function refreshAuthorityMap(){
  const maps=Object.values(leafletMaps||{});
  const m=maps.find(x=>x && x.getContainer && document.body.contains(x.getContainer()) && x.getContainer().classList.contains('mini-map'));
  if(!m){ toast('Authority map is not ready yet.','warning'); return; }
  m.eachLayer(layer=>{
    if(layer instanceof L.CircleMarker) m.removeLayer(layer);
  });
  state.tourists.forEach(t=>{
    if(t.lat==null||t.lng==null)return;
    const c=t.status==='SOS'?STATUS_COLORS.DANGER:(t.zone||'').includes('Restricted')?STATUS_COLORS.DANGER:(t.zone||'').includes('Caution')?STATUS_COLORS.CAUTION:STATUS_COLORS.SAFE;
    L.circleMarker([Number(t.lat),Number(t.lng)],{radius:t.locationSource==='gps'?10:8,color:'#fff',weight:2,fillColor:c,fillOpacity:1}).addTo(m)
      .bindPopup(`<b>${t.name}</b><br>${t.id}<br>${t.zone||'Outside monitored zones'}<br>${t.locationSource==='gps'?'LIVE GPS':'Last known position'}<br>${t.updatedAt?'Updated: '+new Date(t.updatedAt).toLocaleTimeString('en-IN'):''}`);
  });
  m.invalidateSize();
  toast('Authority map refreshed','success');
}
function syncAuthorityLiveMap(){
  const maps=Object.values(leafletMaps||{});
  const m=maps.find(x=>x && x.getContainer && document.body.contains(x.getContainer()) && x.getContainer().classList.contains('mini-map'));
  if(m) refreshAuthorityMapSilent(m);
}
function refreshAuthorityMapSilent(m){
  m.eachLayer(layer=>{if(layer instanceof L.CircleMarker)m.removeLayer(layer);});
  state.tourists.forEach(t=>{
    if(t.lat==null||t.lng==null)return;
    const c=t.status==='SOS'?STATUS_COLORS.DANGER:(t.zone||'').includes('Restricted')?STATUS_COLORS.DANGER:(t.zone||'').includes('Caution')?STATUS_COLORS.CAUTION:STATUS_COLORS.SAFE;
    L.circleMarker([Number(t.lat),Number(t.lng)],{radius:t.locationSource==='gps'?10:8,color:'#fff',weight:2,fillColor:c,fillOpacity:1}).addTo(m)
      .bindPopup(`<b>${t.name}</b><br>${t.id}<br>${t.zone||'Outside monitored zones'}<br>${t.locationSource==='gps'?'LIVE GPS':'Last known position'}`);
  });
  m.invalidateSize();
}
function handleLocationError(err){
  const messages={1:'Location permission was denied. Enable location permission once in your browser settings.',2:'Your location could not be determined. Try again outdoors or with GPS enabled.',3:'Location request timed out. Try again.'};
  state.locationPermission=err.code===1?'denied':state.locationPermission;
  state.tracking=false;
  if(state.watchId!==null && navigator.geolocation){navigator.geolocation.clearWatch(state.watchId);}
  state.watchId=null;
  if(state.livePollTimer){clearInterval(state.livePollTimer);state.livePollTimer=null;}
  toast(messages[err.code]||'Unable to get device location.','danger');
  render();
}
function updateOwnLiveMap(lat,lng,accuracy){
  if(!ownLiveMap || !document.body.contains(ownLiveMap.getContainer())) return;
  ownLiveMap.invalidateSize();
  const c=STATUS_COLORS[state.safety]||STATUS_COLORS.SAFE;
  if(!ownLiveMarker){
    ownLiveMarker=L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:3,fillColor:c,fillOpacity:1}).addTo(ownLiveMap);
    ownLiveMarker.bindPopup(`<b>Current device location</b><br>${state.zone} · ${state.safety}<br>Accuracy: ${accuracy>0?Math.round(accuracy)+' m':'not available'}`);
  }else{
    ownLiveMarker.setLatLng([lat,lng]);
    ownLiveMarker.setStyle({fillColor:c});
  }
  if(ownAccuracyCircle){
    if(accuracy>0) ownAccuracyCircle.setLatLng([lat,lng]).setRadius(accuracy);
    else { ownAccuracyCircle.remove(); ownAccuracyCircle=null; }
  }else if(accuracy>0){
    ownAccuracyCircle=L.circle([lat,lng],{radius:accuracy,color:c,fillColor:c,fillOpacity:.08,weight:1}).addTo(ownLiveMap);
  }
}

function handleLivePosition(pos,shouldRender=true){
  const lat=pos.coords.latitude,lng=pos.coords.longitude,accuracy=Math.round(pos.coords.accuracy||0);
  state.lastLocation={lat:lat.toFixed(6),lng:lng.toFixed(6),accuracy,updatedAt:new Date().toISOString()};
  state.locationSource='gps';state.locationPermission='granted';state.network='ONLINE';
  const rec=myTouristRecord();
  if(rec){rec.lat=lat;rec.lng=lng;rec.accuracy=accuracy;rec.updatedAt=state.lastLocation.updatedAt;rec.locationSource='gps';}
  applyLiveGeofence(lat,lng);saveAccounts();updateOwnLiveMap(lat,lng,accuracy);if(ownLiveMap && ownLiveMap._container && document.body.contains(ownLiveMap._container)){ownLiveMap.setView([lat,lng],Math.max(ownLiveMap.getZoom(),17),{animate:false});ownLiveMap.invalidateSize();}
  if(state.page==='locations') syncAuthorityLiveMap();
  if(state.page==='location' && ownLiveMap){ ownLiveMap.setView([lat,lng],17,{animate:false}); }
  if(shouldRender)render();
}
function getFreshMapLocation(m){
  if(!navigator.geolocation){toast('Live location is not supported by this browser.','danger');return;}
  state.locationPermission='requesting';
  toast('Getting a fresh GPS fix…','info');
  navigator.geolocation.getCurrentPosition(pos=>{
    handleLivePosition(pos,false);
    if(m && m._container && document.body.contains(m._container)) m.setView([pos.coords.latitude,pos.coords.longitude],17,{animate:true});
    beginContinuousTracking(false);
    toast('GPS refreshed · '+new Date().toLocaleTimeString('en-IN'),'success');
  },handleLocationError,{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

function beginContinuousTracking(showToast=true){
  if(!navigator.geolocation){toast('Live location is not supported by this browser.','danger');return false;}
  if(state.tracking)return true;
  state.tracking=true;
  state.locationPermission='granted';
  if(showToast) toast('Real-time geofence monitoring is active','success');
  state.watchId=navigator.geolocation.watchPosition(pos=>handleLivePosition(pos,false),handleLocationError,{enableHighAccuracy:true,timeout:12000,maximumAge:0});
  if(state.livePollTimer) clearInterval(state.livePollTimer);
  state.livePollTimer=setInterval(()=>{if(!state.tracking||!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(pos=>handleLivePosition(pos,false),()=>{}, {enableHighAccuracy:true,timeout:10000,maximumAge:0});},5000);
  return true;
}
function requestCurrentLocation(){
  if(!navigator.geolocation){toast('Live location is not supported by this browser.','danger');return;}
  state.locationPermission='requesting';
  toast('Getting a fresh GPS fix…','info');
  navigator.geolocation.getCurrentPosition(pos=>{
    handleLivePosition(pos,false);
    beginContinuousTracking(false);
    toast('GPS refreshed · '+new Date().toLocaleTimeString('en-IN'),'success');
    refreshVisibleLocationDetails();
  },handleLocationError,{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
function refreshVisibleLocationDetails(){
  const box=document.querySelector('.mapbox');
  if(!box || state.page!=='location') return;
  const card=box.closest('.grid')?.querySelector('.card:nth-child(2)');
  if(!card || !state.lastLocation) return;
  const rows=card.querySelectorAll('.row');
  // Keep the existing map DOM intact; only refresh the text panel.
  const text=card.innerHTML;
  const zone=state.zone||'Outside monitored zones';
  const acc=state.lastLocation.accuracy?Math.round(state.lastLocation.accuracy)+' metres':'Not available';
  card.innerHTML=`<h3 class="section-title">Live location controls</h3>${detail('Coordinates',state.lastLocation.lat+', '+state.lastLocation.lng)}${detail('Accuracy',acc)}${detail('Current zone',zone)}${detail('Network',state.network)}${detail('Last updated',state.lastLocation.updatedAt?new Date(state.lastLocation.updatedAt).toLocaleTimeString('en-IN'):'Not available')}<div class="actions" style="margin-top:14px"><button class="btn primary" onclick="requestCurrentLocation()">Get current location</button><button class="btn" onclick="getFreshMapLocation(ownLiveMap)">↻ Refresh GPS</button></div>`;
}
function startLiveTracking(){
  if(!navigator.geolocation){toast('Live location is not supported by this browser.','danger');return;}
  if(state.tracking){toast('Real-time tracking is already active','info');return;}
  beginContinuousTracking(true);
  render();
}
function stopLiveTracking(){if(state.watchId!==null && navigator.geolocation){navigator.geolocation.clearWatch(state.watchId);} state.watchId=null; state.tracking=false; saveAccounts(); render(); toast('Location monitoring stopped','info');}
function useLiveLocation(){requestCurrentLocation();}

function getIdentityReference(user){
  if(!user) return '—';
  let target=user;
  const rec=state.tourists.find(t=>t.id===user.id);
  const acc=state.accounts?.find(a=>a.id===user.id);
  if(rec) target=rec; else if(acc) target=acc;
  if(!target.identityHash){
    const base=[target.id,target.name,target.email].join('|'); let h=2166136261;
    for(let i=0;i<base.length;i++){h^=base.charCodeAt(i);h=Math.imul(h,16777619);}
    target.identityHash='IDR-'+(h>>>0).toString(16).padStart(8,'0')+Math.random().toString(16).slice(2,18);
    if(state.user && state.user.id===target.id) state.user.identityHash=target.identityHash;
    saveAccounts();
  }
  return target.identityHash.slice(0,14)+'…'+target.identityHash.slice(-6);
}
function openMedicalResponderView(){
  const u=state.user||{};
  openModal(`<h2>Authorized medical view</h2><div class="notice"><b>Authorization check</b><br>The authority role controls access to responder information.</div>${detail('Tourist',u.name||'—')}${detail('Digital ID',u.id||'—')}${detail('Blood group',u.blood||'Not provided')}${detail('Allergies',u.allergy||'None')}${detail('Family contact',u.familyContactName||'Not provided')}${detail('Family contact number',u.familyContactPhone||'Not provided')}<button class="btn green" style="width:100%;margin-top:15px" onclick="closeModal()">Close secure view</button>`);
}
function verifyCurrentIdentity(){
  const t=state.tourists.find(x=>x.id===state.user.id);
  if(!t){toast('Tourist identity record not found','danger');return;}
  state.verifyResultId=t.id; state.verifyVerifiedId=t.id;
  toast('Identity verified successfully','success'); render();
}
function runVerify(){
  const input=document.getElementById('verifyId');
  const id=(input?.value||'').trim().toUpperCase();
  const err=document.getElementById('verifyErr');
  if(err) err.textContent='';
  state.verifyVerifiedId=null;
  if(!id){if(err)err.textContent='Enter a Tourist ID.';return;}
  const found=state.tourists.find(t=>String(t.id||'').toUpperCase()===id);
  if(!found){state.verifyResultId=null; state.selectedTouristId=null;if(err)err.textContent='No registered tourist found for this ID.';return;}
  state.verifyResultId=found.id;
  toast('Tourist record found: '+found.name,'success');
  render();
}
function clearVerify(){state.verifyResultId=null; state.selectedTouristId=null;state.verifyVerifiedId=null;render();}
function verifyAuthorityRecord(){
  const found=state.tourists.find(t=>t.id===state.verifyResultId);
  if(!found){toast('Look up a Tourist ID first','warning');return;}
  const account=findAccount(found.email)||{};
  if(account.id && account.id!==found.id){toast('Identity record mismatch','danger');return;}
  state.verifyVerifiedId=found.id;
  toast('Identity verified: '+found.id,'success');
  render();
}
function incidentRow(i){return `<div class="row"><div><b>${i.id} · ${i.type}</b><small>${i.tourist} · ${i.zone} · ${i.time||'Just now'}</small></div><div style="text-align:right"><span class="badge ${i.status==='Resolved'?'safe':i.severity==='HIGH'?'danger-b':'warning'}">${i.status}</span>${i.auditRef?`<div class="mono" style="font-size:10px;color:#8a9198;margin-top:4px;cursor:pointer" title="Click to copy audit reference" onclick="copyAuditReference('${i.auditRef}')">${i.auditRef.slice(0,10)}…${i.auditRef.slice(-6)} ⧉</div>`:''}</div></div>`}
function generateAuditReference(){
  const chars='0123456789abcdef'; let h='AR-';
  for(let i=0;i<64;i++) h+=chars[Math.floor(Math.random()*16)];
  return h;
}
function confirmSOS(){openModal(`<h2>Confirm emergency?</h2><p class="muted">Your current location and Digital ID will be shared with the response authority.</p><div class="actions" style="justify-content:flex-end"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="sendSOS()">Send SOS</button></div>`)}
function sendSOS(){
  closeModal();
  if(state.activeIncident && state.activeIncident.type==='SOS Alert' && state.activeIncident.status!=='Resolved'){toast('An SOS incident is already active','warning');return;}
  state.activeIncident={id:'INC-'+Math.floor(1000+Math.random()*8999),tourist:state.user.name,touristId:state.user.id,type:'SOS Alert',severity:'HIGH',status:'New',time:new Date().toLocaleString('en-IN'),zone:state.zone,lat:state.lastLocation?Number(state.lastLocation.lat):null,lng:state.lastLocation?Number(state.lastLocation.lng):null,accuracy:Number(state.lastLocation?.accuracy)||null,auditRef:generateAuditReference(),source:'sos'};
  state.ai='HIGH';
  state.incidents.unshift(state.activeIncident);
  const tourist=state.tourists.find(t=>t.id===state.user.id);
  if(tourist) tourist.status='SOS';
  saveAccounts();
  toast('SOS alert sent — authority workflow updated and incident logged to audit trail','danger');
  render();
}
function voiceSOS(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ openModal(`<h2>Voice SOS unavailable</h2><p class="muted">Speech recognition is not supported by this browser. You can still use the main SOS button.</p><button class="btn danger" style="width:100%" onclick="closeModal();confirmSOS()">Use SOS</button>`); return; }
  openModal(`<h2>Voice SOS</h2><div style="font-size:50px;text-align:center;margin:20px">🎤</div><p id="voiceStatus" style="text-align:center"><b>Listening…</b><br><span class="muted">Say “help”, “SOS”, or “emergency”.</span></p><button class="btn" style="width:100%" onclick="closeModal()">Cancel</button>`);
  const r=new SR(); r.lang='en-IN'; r.interimResults=false; r.maxAlternatives=1;
  r.onresult=e=>{const text=(e.results[0][0].transcript||'').toLowerCase(); if(/\b(help|sos|emergency)\b/.test(text)){closeModal();sendSOS();}else{const el=document.getElementById('voiceStatus'); if(el) el.innerHTML='<b>Command not recognized.</b><br><span class="muted">Try saying help or SOS.</span>';}};
  r.onerror=()=>{const el=document.getElementById('voiceStatus'); if(el) el.innerHTML='<b>Could not hear the command.</b><br><span class="muted">You can use the main SOS button instead.</span>';};
  r.onend=()=>{};
  try{r.start();}catch(e){}
}
function offlineFallback(){state.network='OFFLINE'; state.offlineQueuedAt=new Date().toISOString(); saveAccounts(); toast('Offline mode: alert queued locally until connectivity is restored','warning'); go('location')}

// Authority-side zone event: places a tourist inside
// the chosen zone and runs the same alert → incident → audit-log pipeline
// a real geofence breach would trigger.
function triggerZoneEventForTourist(touristId, zoneIndex){
  const zone=state.zones[zoneIndex];
  const t=state.tourists.find(x=>x.id===touristId);
  if(!zone || !t){toast('Select a valid tourist and zone','warning');return;}

  state.geofenceState=state.geofenceState||{};
  t.zone=zone.name; t.lat=Number(zone.lat); t.lng=Number(zone.lng); t.updatedAt=new Date().toISOString(); t.locationSource='demo'; t.locationHistory=Array.isArray(t.locationHistory)?t.locationHistory:[]; t.locationHistory.push({lat:t.lat,lng:t.lng,at:t.updatedAt,source:'demo'}); t.locationHistory=t.locationHistory.slice(-10);
  if(zone.type!=='Restricted' && t.status==='SOS') t.status='Safe';

  const isSelf = state.user && state.user.id===t.id;
  if(isSelf){
    state.zone=zone.name;
    state.lastLocation={lat:Number(zone.lat).toFixed(6),lng:Number(zone.lng).toFixed(6),accuracy:null,updatedAt:new Date().toISOString()}; state.locationSource='manual';
  }

  const currentOpen=state.incidents.find(i=>i.touristId===t.id && i.status!=='Resolved');
  if(zone.type==='Safe'){
    state.lastZoneEvent=`${t.name} → ${zone.name} · SAFE`;
    if(currentOpen){ currentOpen.status='Resolved'; if(state.activeIncident && state.activeIncident.id===currentOpen.id) state.activeIncident=null; }
    if(isSelf){ state.safety='SAFE'; state.ai='LOW'; }
    t.status='Safe'; state.geofenceState[t.id]=zone.name;
    toast(`${t.name} moved to ${zone.name} — status updated to Safe`,'success');
  } else {
    state.lastZoneEvent=`${t.name} → ${zone.name} · ${zone.type.toUpperCase()}`;
    if(currentOpen && currentOpen.zone===zone.name){toast(`${t.name} already has an open alert for ${zone.name}.`,'info');return;}
    const severity = zone.type==='Restricted' ? 'HIGH' : 'MEDIUM';
    t.status=severity==='HIGH'?'SOS':'Alert'; state.geofenceState[t.id]=zone.name;
    const incType = zone.type==='Restricted' ? 'Restricted Zone Entry' : 'Geofence Warning';
    const incident={id:'INC-'+Math.floor(1000+Math.random()*8999),tourist:t.name,touristId:t.id,type:incType,severity,status:'New',time:new Date().toLocaleString('en-IN'),zone:zone.name,lat:Number(t.lat),lng:Number(t.lng),accuracy:null,auditRef:generateAuditReference(),source:'geofence'};
    state.incidents.unshift(incident);
    if(severity==='HIGH' || !state.activeIncident) state.activeIncident=incident;
    if(isSelf){ state.safety = severity==='HIGH'?'DANGER':'CAUTION'; state.ai=severity; }
    toast(`${zone.type} alert created for ${t.name}`,'danger');
  }
  saveAccounts();
  render();
}

function openCreateIncidentModal(){
  openModal(`<h2>Create incident</h2><p class="muted">Create a browser-side incident for a registered tourist.</p><div class="field"><label>Tourist</label><select id="ciTourist">${state.tourists.map(t=>`<option value="${t.id}">${t.name} — ${t.id}</option>`).join('')}</select></div><div class="field"><label>Incident type</label><select id="ciType"><option>SOS Alert</option><option>Restricted Zone Entry</option><option>Geofence Warning</option><option>Medical Emergency</option></select></div><div class="field"><label>Severity</label><select id="ciSeverity"><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></div><div class="actions" style="justify-content:flex-end"><button class="btn" type="button" onclick="closeModal()">Cancel</button><button class="btn primary" type="button" onclick="createIncidentFromForm()">Create incident</button></div>`);
}
function createIncidentFromForm(){
  const id=document.getElementById('ciTourist')?.value; const target=state.tourists.find(t=>t.id===id);
  if(!target){toast('Select a tourist first','warning');return;}
  const type=document.getElementById('ciType')?.value||'SOS Alert'; const severity=document.getElementById('ciSeverity')?.value||'HIGH';
  const incident={id:'INC-'+Math.floor(1000+Math.random()*8999),tourist:target.name,touristId:target.id,type,severity,status:'New',time:new Date().toLocaleString('en-IN'),zone:target.zone||'Outside monitored zones',source:'authority',lat:target.lat??null,lng:target.lng??null,accuracy:target.accuracy??null,auditRef:generateAuditReference()};
  state.activeIncident=incident; state.ai=severity; state.incidents.unshift(incident); target.status=severity==='HIGH'?'SOS':'Alert'; closeModal(); saveAccounts(); render(); toast(`Incident ${incident.id} created for ${target.name}`,'danger');
}
function createIncident(){ openCreateIncidentModal(); }
function createIncidentLegacy(){
  const target=state.tourists.find(t=>t.status==='SOS')||state.tourists[0];
  const incident={id:'INC-'+Math.floor(1000+Math.random()*8999),tourist:target?target.name:'Tourist',touristId:target?.id||'TOURIST-001',type:'SOS Alert',severity:'HIGH',status:'New',time:new Date().toLocaleString('en-IN'),zone:target?.zone||'Restricted Zone',source:'authority',lat:target?.lat??null,lng:target?.lng??null,accuracy:target?.accuracy??null,auditRef:generateAuditReference()};
  state.activeIncident=incident; state.ai='HIGH'; state.incidents.unshift(incident);
  if(target) target.status='SOS';
  saveAccounts(); toast('Incident created — use Acknowledge → Assign → Resolve','danger'); render();
}
function updateIncident(status){
  if(!state.activeIncident)return;
  const allowed={New:['Acknowledged'],Acknowledged:['Assigned'],Assigned:['Resolved']};
  const current=state.activeIncident.status;
  if(status!=='Resolved' && !(allowed[current]||[]).includes(status)){toast('Follow the response sequence: Acknowledge → Assign → Resolve','warning');return;}
  state.activeIncident.status=status;
  if(status==='Assigned') state.activeIncident.assignedTo='Emergency Response Team';
  const saved=state.incidents.find(i=>i.id===state.activeIncident.id); if(saved) saved.status=status;
  const target=state.tourists.find(t=>t.id===state.activeIncident.touristId) || state.tourists.find(t=>t.name===state.activeIncident.tourist);
  if(status==='Resolved'){if(target) target.status='Safe'; state.activeIncident=null; state.ai='LOW'; state.safety='SAFE'; toast('Incident resolved and tourist marked safe','success')}
  else toast('Incident status: '+status,'info');
  saveAccounts(); render();
}
function haversineMeters(a,b){
  const R=6371000, p1=a.lat*Math.PI/180, p2=b.lat*Math.PI/180, dp=(b.lat-a.lat)*Math.PI/180, dl=(b.lng-a.lng)*Math.PI/180;
  const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2; return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function classifySafetyFromZone(zone){return !zone?'SAFE':zone.type==='Restricted'?'DANGER':zone.type==='Caution'?'CAUTION':'SAFE';}
function applyLiveGeofence(lat,lng){
  const point={lat,lng}; let inside=null; let best=Infinity;
  (state.zones||[]).forEach((z,i)=>{const d=haversineMeters(point,{lat:Number(z.lat),lng:Number(z.lng)}); const r=Number(z.radius)|| (z.type==='Restricted'?400:z.type==='Caution'?350:280); if(d<=r && d<best){inside={...z,_distance:d,_index:i};best=d;}});
  const rec=myTouristRecord(); if(!rec)return;
  const previous=state.geofenceState[rec.id]||null;
  if(inside){
    state.zone=inside.name; rec.zone=inside.name;
    const safety=classifySafetyFromZone(inside); state.safety=safety; state.ai=safety==='DANGER'?'HIGH':safety==='CAUTION'?'MEDIUM':'LOW';
    if(previous!==inside.name && inside.type!=='Safe'){
      const incident={id:'INC-'+Math.floor(1000+Math.random()*8999),tourist:rec.name,touristId:rec.id,type:inside.type==='Restricted'?'Restricted Zone Entry':'Geofence Warning',severity:inside.type==='Restricted'?'HIGH':'MEDIUM',status:'New',time:new Date().toLocaleString('en-IN'),zone:inside.name,lat,lng,accuracy:state.lastLocation?.accuracy||null,auditRef:generateAuditReference(),source:'geofence'};
      state.incidents.unshift(incident); if(incident.severity==='HIGH')state.activeIncident=incident; rec.status=incident.severity==='HIGH'?'SOS':'Alert';
      toast('Automatic geofence alert: '+inside.name+' ('+incident.severity+')','danger');
    }
    state.geofenceState[rec.id]=inside.name;
    state.lastZoneEvent=`${rec.name} entered ${inside.name} · ${inside.type} · ${new Date().toLocaleTimeString('en-IN')}`;
    state.aiUpdatedAt=new Date().toISOString();
  }else{
    state.zone='Outside monitored zones'; rec.zone=state.zone; if(rec.status!=='SOS')rec.status='Safe'; state.safety='SAFE'; state.ai='LOW'; state.aiUpdatedAt=new Date().toISOString(); const openGeo=state.incidents.find(i=>i.touristId===rec.id&&isGeofenceIncident(i)&&i.status!=='Resolved'); if(openGeo){openGeo.status='Resolved'; if(state.activeIncident&&state.activeIncident.id===openGeo.id)state.activeIncident=null;} if(previous){state.lastZoneEvent=`${rec.name} left ${previous} · ${new Date().toLocaleTimeString('en-IN')}`;} state.geofenceState[rec.id]=null;
  }
}

function viewTourist(id){
  const t=state.tourists.find(x=>x.id===id);
  if(!t){toast('Tourist record not found','danger');return;}
  state.selectedTouristId=t.id;
  state.page='touristDetail';
  renderNav();
  render();
}
function backFromTouristDetails(){
  state.selectedTouristId=null;
  state.page='monitor';
  renderNav();
  render();
}
function removeZone(index){
  const z=state.zones[index];
  if(!z) return;
  state.zones.splice(index,1);
  saveAccounts();
  toast(`"${z.name}" removed`,'info');
  render();
}
function createZone(e){
  e.preventDefault();
  const name=document.getElementById('zname').value.trim();
  document.getElementById('znameErr').textContent='';
  if(!name){ document.getElementById('znameErr').textContent='Enter a zone name.'; return; }
  const p=jitterLatLng(DEFAULT_CENTER,0.006);
  const radius=Math.max(50,Math.min(5000,Number(document.getElementById('zradius').value)||400)); state.zones.push({name,type:document.getElementById('ztype').value,risk:document.getElementById('zrisk').value,radius,lat:p.lat,lng:p.lng});
  saveAccounts();
  toast('Danger zone created near the default centre','success');
  render();
}

function drawQrPattern(canvasId, seedString){
  const el=document.getElementById(canvasId); if(!el)return false;
  el.innerHTML='';
  if(window.QRCode){
    new QRCode(el,{text:seedString,width:150,height:150,colorDark:'#252723',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
    return true;
  }
  const c=document.createElement('canvas'); c.width=170;c.height=170;c.style.width='170px';c.style.height='170px'; el.appendChild(c);
  const ctx=c.getContext('2d'), n=29, cell=Math.floor(c.width/n); ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
  const seed=seedString.split('').reduce((a,ch)=>a+ch.charCodeAt(0),0); ctx.fillStyle='#252723';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(((seed+x*17+y*31+x*y)%11)<5)ctx.fillRect(x*cell,y*cell,cell,cell);
  return true;
}
function generateQR(id){
  const ok=drawQrPattern(id,[state.user.id,state.user.name,state.user.email].join('|'));
  if(ok) toast('QR generated for '+state.user.id,'success');
}
function generateVerifyQR(){
  const found=state.tourists.find(t=>t.id===state.verifyResultId);
  if(!found) return;
  const ok=drawQrPattern('verifyQR',[found.id,found.name].join(''));
  if(ok) toast('QR generated for '+found.id,'success');
}

function openModal(html){document.getElementById('modal').innerHTML=html;document.getElementById('modalBack').classList.remove('hidden');const first=document.querySelector('#modal input');if(first) setTimeout(()=>first.focus(),30)}
function closeModal(){document.getElementById('modalBack').classList.add('hidden')}
let toastTimer=null;
function toast(msg,type){
  const t=document.getElementById('toast');
  const icons={success:'✓',warning:'△',danger:'!',info:'ⓘ'};
  const colors={success:'#2f6b4f',warning:'#8a6a1f',danger:'#8f2f2f',info:'#172936'};
  type=type||'info';
  t.innerHTML=`<span style="margin-right:8px">${icons[type]||icons.info}</span>${msg}`;
  t.style.background=colors[type]||colors.info;
  t.classList.remove('hidden');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.add('hidden'),3200);
}
function toggleTheme(){
  const isDark=document.body.classList.toggle('dark');
  localStorage.setItem('smartTouristTheme', isDark?'dark':'light');
  const btn=document.getElementById('themeToggle');
  if(btn) btn.textContent = isDark ? '☀' : '☾';
}
function initTheme(){
  const saved=localStorage.getItem('smartTouristTheme');
  if(saved==='dark') document.body.classList.add('dark');
}
setInterval(()=>{ if(state.page==='locations') syncAuthorityLiveMap(); },2000);

function startClock(){
  const tick=()=>{const now=new Date(); const time=now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); const el=document.getElementById('liveClock'); if(el) el.textContent=time; const landing=document.getElementById('landingLiveTime'); if(landing) landing.textContent='ACTIVE · '+time+' IST';};
  tick();
  setInterval(tick,1000);
}
function filterTourists(q){
  state.touristFilter=q||'';
  const el=document.activeElement;
  const pos=el && el.selectionStart;
  render();
  const again=document.querySelector('.search-box');
  if(again){ again.focus(); if(pos!=null) again.setSelectionRange(pos,pos); }
}
function isGeofenceIncident(i){return i && (i.source==='geofence' || i.type==='Geofence Warning' || i.type==='Restricted Zone Entry');}
function activeGeofenceIncidents(){return state.incidents.filter(i=>isGeofenceIncident(i)&&i.status!=='Resolved');}
function riskScoreForSeverity(sev){return sev==='HIGH'?70:sev==='MEDIUM'?45:15;}
function calculateRiskScore(subject){
  if(!subject)return 0;
  if(subject.id && subject.type){
    let score=riskScoreForSeverity(subject.severity);
    if(subject.type==='SOS Alert')score+=15;
    if(subject.zone && /Restricted/i.test(subject.zone))score+=8;
    if(subject.accuracy && subject.accuracy>100)score+=4;
    return Math.max(0,Math.min(95,score));
  }
  if(subject.locationSource!=='gps' && !state.lastLocation) return 0;
  let score=5;
  const zone=subject.zone||state.zone||'';
  if(/Restricted/i.test(zone))score+=58; else if(/Caution/i.test(zone))score+=30;
  if(subject.status==='SOS')score+=22;
  else if(subject.status==='Alert')score+=8;
  if(state.activeIncident && state.activeIncident.touristId===subject.id){
    if(state.activeIncident.severity==='HIGH')score+=12;
    else if(state.activeIncident.severity==='MEDIUM')score+=6;
  }
  if(subject.accuracy && subject.accuracy>100)score+=4;
  if(state.network==='OFFLINE')score+=3;
  return Math.max(0,Math.min(95,score));
}
function riskDistributionMarkup(){
  const total=state.tourists.length||1;
  const buckets=[
    {label:'High danger',cls:'danger-b',n:state.tourists.filter(t=>t.status==='SOS'||/Restricted/i.test(t.zone||'')).length},
    {label:'Caution',cls:'warning',n:state.tourists.filter(t=>t.status!=='SOS'&&/Caution/i.test(t.zone||'')).length},
    {label:'Safe',cls:'safe',n:state.tourists.filter(t=>t.status!=='SOS'&&!/Restricted|Caution/i.test(t.zone||'')).length}
  ];
  return buckets.map(b=>{const pct=Math.round(b.n/total*100);return `<div class="risk-dist-row"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>${b.label}</b><span class="badge ${b.cls}">${b.n} · ${pct}%</span></div><div class="risk-meter"><div class="risk-meter-fill" style="width:${pct}%"></div></div></div>`}).join('');
}
function filteredReportIncidents(){
  const f=state.reportFilters||{status:'all',severity:'all',type:'all',zone:'all'};
  return state.incidents.filter(i=>(f.status==='all'||i.status===f.status)&&(f.severity==='all'||i.severity===f.severity)&&(f.type==='all'||i.type===f.type)&&(f.zone==='all'||i.zone===f.zone));
}
function reportTypeOptions(){const types=[...new Set(state.incidents.map(i=>i.type))];return types.map(t=>`<option value="${t.replace(/"/g,'&quot;')}" ${state.reportFilters.type===t?'selected':''}>${t}</option>`).join('');}
function setReportFilter(key,value){state.reportFilters=state.reportFilters||{status:'all',severity:'all',type:'all',zone:'all'};state.reportFilters[key]=value;render();}
function resetReportFilters(){state.reportFilters={status:'all',severity:'all',type:'all',zone:'all'};render();}
function exportIncidentCSV(){
  const rows=filteredReportIncidents();
  const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const csv=[['Incident ID','Tourist','Tourist ID','Type','Severity','Status','Zone','Assigned Team','Latitude','Longitude','Time'],...rows.map(i=>[i.id,i.tourist,i.touristId||'',i.type,i.severity,i.status,i.zone,i.assignedTo||'',i.lat??'',i.lng??'',i.time||''])].map(r=>r.map(esc).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='smart-tourist-incident-report.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast(rows.length+' incident records exported','success');
}
function printIncidentReport(){
  const rows=filteredReportIncidents().map(i=>`<tr><td>${i.id}</td><td>${i.tourist}</td><td>${i.type}</td><td>${i.severity}</td><td>${i.status}</td><td>${i.zone}</td><td>${i.assignedTo||'—'}</td><td>${i.lat!=null?Number(i.lat).toFixed(5)+', '+Number(i.lng).toFixed(5):'—'}</td><td>${i.time||'—'}</td></tr>`).join('');
  const w=window.open('','_blank','width=1100,height=800');
  if(!w){toast('Allow pop-ups to print the report','warning');return;}
  w.document.write(`<html><head><title>Incident Report</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#202320}h1{margin-bottom:4px}p{color:#666}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #ccc;padding:9px;text-align:left;font-size:12px}th{background:#f2f3f1}</style></head><body><h1 class="opening-project-title">Smart Tourist Safety Monitoring System</h1><p>Incident Report · Generated ${new Date().toLocaleString('en-IN')}</p><table><thead><tr><th>ID</th><th>Tourist</th><th>Type</th><th>Severity</th><th>Status</th><th>Zone</th><th>Assigned team</th><th>Location</th><th>Time</th></tr></thead><tbody>${rows||'<tr><td colspan="9">No incidents recorded.</td></tr>'}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}
function copyAuditReference(hash){
  navigator.clipboard?.writeText(hash).then(()=>toast('Audit reference copied','success')).catch(()=>toast('Could not copy — copy manually'));
}
function confirmRemoveZone(index){
  const z=state.zones[index];
  if(!z) return;
  openModal(`<h2>Remove zone?</h2><p class="muted">This will remove "<b>${z.name}</b>" from the map. This can't be undone.</p><div class="actions" style="justify-content:flex-end;margin-top:10px"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="closeModal();removeZone(${index})">Remove zone</button></div>`);
}
function openZoneEditModal(index){
  const z=state.zones[index];
  if(!z) return;
  openModal(`<h2>Edit zone</h2>
    <div class="field"><label>Zone name</label><input id="ezname" value="${z.name.replace(/"/g,'&quot;')}"><div id="eznameErr" class="error"></div></div>
    <div class="field"><label>Zone type</label><select id="eztype"><option ${z.type==='Restricted'?'selected':''}>Restricted</option><option ${z.type==='Caution'?'selected':''}>Caution</option><option ${z.type==='Safe'?'selected':''}>Safe</option></select></div>
    <div class="field"><label>Risk level</label><select id="ezrisk"><option ${z.risk==='High'?'selected':''}>High</option><option ${z.risk==='Medium'?'selected':''}>Medium</option><option ${z.risk==='Low'?'selected':''}>Low</option></select></div><div class="field"><label>Geofence radius (metres)</label><input id="ezradius" type="number" min="50" max="5000" value="${Number(z.radius)||400}"></div>
    <div class="actions" style="justify-content:flex-end;margin-top:10px"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveZoneEdit(${index})">Save changes</button></div>`);
}
function saveZoneEdit(index){
  const z=state.zones[index];
  if(!z) return;
  const name=document.getElementById('ezname').value.trim();
  if(!name){ document.getElementById('eznameErr').textContent='Enter a zone name.'; return; }
  z.name=name; z.type=document.getElementById('eztype').value; z.risk=document.getElementById('ezrisk').value; z.radius=Math.max(50,Math.min(5000,Number(document.getElementById('ezradius').value)||400));
  saveAccounts();
  closeModal();
  toast('Zone updated','success');
  render();
}
initTheme();
loadAccounts();
ensureAccountConsistency();
normalizeTouristRecords();
if(!state.lastLocation || state.locationSource!=='gps'){state.lastLocation=null; state.locationSource='not_acquired';} state.locationPermission='unknown'; state.aiUpdatedAt=null; if(state.role==='tourist'){state.zone='Location not acquired';state.safety='UNKNOWN';state.ai='WAITING';}
saveAccounts();
if(!window._clockStarted){window._clockStarted=true;startClock();}
normalizeTouristRecords(); saveAccounts();
window.addEventListener('storage',e=>{
  if(e.key!==STORAGE_KEY)return;
  const currentPage=state.page;
  const beforeIds=new Set((state.incidents||[]).map(i=>i.id));
  loadAccounts();
  normalizeTouristRecords();
  const newGeo=(state.incidents||[]).find(i=>!beforeIds.has(i.id)&&isGeofenceIncident(i)&&!i.historical);
  if(state.role==='authority' && document.getElementById('app') && !document.getElementById('app').classList.contains('hidden')){
    state.page=currentPage;
    renderNav();
    render();
    if(newGeo) toast(`Real-time geofence alert: ${newGeo.tourist} entered ${newGeo.zone}`,'danger');
  }
});
window.addEventListener('beforeunload',()=>{if(state.watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(state.watchId); state.watchId=null;});

function getCanonicalAuthorityTourists(){
  const preferred=['ST-00118','ST-00124','ST-00131','ST-00142'];
  const byId={};
  (state.tourists||[]).forEach(t=>{ if(t && t.id) byId[String(t.id)]=t; });
  return preferred.map(id=>byId[id]).filter(Boolean);
}
function canonicalTouristName(id){
  const names={'ST-00118':'Aarav Mehta','ST-00124':'Aditya Sanap','ST-00131':'Meera Kulkarni','ST-00142':'Rohan Deshmukh'};
  return names[String(id)] || 'Registered Tourist';
}

(function cleanLegacyDemoAccounts(){
  try{
    const raw=localStorage.getItem('smartTouristSafetyAccounts_v2');
    if(!raw)return;
    const db=JSON.parse(raw);
    const junkName=/^(l+|n+|test|testing|demo|account|user|tourist)$/i;
    if(Array.isArray(db.tourists)){
      db.tourists=db.tourists.filter(t=>{
        const n=String(t?.name||'').trim(), e=String(t?.email||'').trim();
        return !junkName.test(n) && !/^l+@/i.test(e) && !/^n+@/i.test(e);
      });
    }
    if(Array.isArray(db.accounts)){
      db.accounts=db.accounts.filter(a=>{
        const n=String(a?.name||'').trim(), e=String(a?.email||'').trim();
        return !junkName.test(n) && !/^l+@/i.test(e) && !/^n+@/i.test(e);
      });
    }
    localStorage.setItem('smartTouristSafetyAccounts_v2',JSON.stringify(db));
  }catch(e){}
})();
