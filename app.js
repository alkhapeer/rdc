
import { renderCardPNG } from './card-render.js';
import { initI18n, applyI18n, t } from './i18n.js';

const TERMS_KEY='CS_TERMS_ACCEPTED_V', TERMS_VERSION='v2';
const STORE={ PUB:'CS_PUB_CARDS', MINE:'CS_MY_CARDS' };
const ADMIN_WA='201000000000';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const on=(sel,ev,fn)=>{ const el=$(sel); if(el) el.addEventListener(ev,fn); };
const lsGet=k=>{ try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;} };
const lsSet=(k,v)=>localStorage.setItem(k, JSON.stringify(v));
const maskId=id=>(id||'').replace(/(.{3,6}).+(-).+/,(_,a,b)=>`${a}••••${b}•••`);

function initTabs(){ const btns=$$('#tabs .tab-btn'), secs=$$('main section'); btns.forEach(btn=>btn.addEventListener('click',()=>{ btns.forEach(b=>b.classList.remove('active')); secs.forEach(s=>s.classList.remove('active')); btn.classList.add('active'); const sec=document.getElementById(btn.dataset.target); if(sec) sec.classList.add('active'); })); }
function termsHide(){ $('#terms-modal')?.classList.add('hidden'); $('#overlay')?.classList.add('hidden'); }
function termsShow(){ $('#terms-modal')?.classList.remove('hidden'); $('#overlay')?.classList.remove('hidden'); }
function initTerms(){
  const chk=$('#terms-check'), btn=$('#btn-accept-terms');
  if(chk&&btn){
    btn.disabled=!chk.checked;
    chk.addEventListener('change',()=>btn.disabled=!chk.checked);
    btn.addEventListener('click',()=>{ localStorage.setItem(TERMS_KEY,TERMS_VERSION); termsHide(); });
  }
  (localStorage.getItem(TERMS_KEY)===TERMS_VERSION)?termsHide():termsShow();
}

async function loadPublic(){
  try{
    const res=await fetch('./cards-public.json?ver=2.1.0',{cache:'no-store'});
    const rows=await res.json();
    lsSet(STORE.PUB, Array.isArray(rows)?rows:[]);
  }catch(e){ console.warn('cards-public.json not found, using cached'); }
  renderMy();
}
function getPub(){ return Array.isArray(lsGet(STORE.PUB))?lsGet(STORE.PUB):[]; }
function getMine(){ return Array.isArray(lsGet(STORE.MINE))?lsGet(STORE.MINE):[]; }
function addMine(id){ const mine=new Set(getMine()); mine.add(id); lsSet(STORE.MINE,[...mine]); renderMy(); }

/* Check */
function initCheck(){
  on('#btn-check','click',()=>{
    const id=$('#check-id')?.value?.trim(); const out=$('#check-result');
    if(!id||!out){ return; }
    const row=getPub().find(r=>String(r.CardID||'').toUpperCase()===id.toUpperCase());
    if(!row){ out.innerHTML=`<span style="color:#f59e0b">${t('check.notFound','Not found')}</span>`; return; }
    const isTemp=String(row.Type||'').toLowerCase()==='temp' || String(row.CardID||'').toUpperCase().startsWith('TEMP');
    const isActive=String(row.Status||'').toLowerCase().includes('active') && !isTemp;
    let badge=`<span class="tab-btn">${t('check.temp','Temporary')}</span>`;
    if(isActive) badge=`<span class="tab-btn" style="background:#16a34a;border-color:#16a34a;color:#052d3a">${t('check.active','Active')}</span>`;
    else if(String(row.Status||'').toLowerCase().includes('expired')) badge=`<span class="tab-btn" style="background:#ef4444;border-color:#ef4444;color:#fff">${t('check.expired','Expired')}</span>`;
    out.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><span class="tab-btn">RDC • CARD</span> ${badge}</div><div style="font-size:1.1rem;margin:.6rem 0"><b>${maskId(row.CardID)}</b></div><small class="muted">${row.Country||''}</small><div class="row" style="margin-top:.5rem"><button class="tab-btn" id="save-mine">أضف لبطاقاتي</button></div></div>`;
    on('#save-mine','click',()=>addMine(row.CardID));
  });
}

/* My Cards */
function renderMy(){
  const host=$('#my-cards'); if(!host) return;
  const mine=new Set(getMine()); const all=getPub();
  const rows=all.filter(r=>mine.has(r.CardID));
  if(rows.length===0){ host.innerHTML=`<div class="card">${t('my.empty','No cards saved yet.')}</div>`; return; }
  host.innerHTML=rows.map(r=>{
    const temp=String(r.Type||'').toLowerCase()==='temp' || String(r.CardID||'').toUpperCase().startsWith('TEMP');
    const label=temp? t('check.temp','Temporary') : 'RDC';
    return `<div class="card"><div><b>${maskId(r.CardID||'-')}</b></div><small class="muted">${label} • ${r.Country||''}</small></div>`;
  }).join('');
}

/* Issue digital card */
function initIssue(){
  on('#btn-generate-card','click', async ()=>{
    const id=$('#issue-id')?.value?.trim(); const name=$('#issue-name')?.value?.trim(); const phone=$('#issue-phone')?.value?.trim(); const photo=$('#issue-photo')?.files?.[0]||null; const out=$('#card-preview'); if(!out) return;
    if(!id || !/^RDC/i.test(id)){ out.textContent=t('issue.errPrefix','CardID must start with RDC'); return; }
    const row=getPub().find(r=>String(r.CardID||'').toUpperCase()===id.toUpperCase());
    if(!row){ out.textContent=t('issue.errMissing','Not found in public snapshot.'); return; }
    const isTemp=String(row.Type||'').toLowerCase()==='temp' || String(row.CardID||'').toUpperCase().startsWith('TEMP');
    const isActive=String(row.Status||'').toLowerCase().includes('active') && !isTemp;
    if(!isActive){ out.textContent=t('issue.errInactive','This card is not officially active.'); return; }
    const png=await renderCardPNG({ id: row.CardID, name: name||'', phone: phone||'', country: row.Country||'', photoFile: photo });
    out.innerHTML=''; const img=new Image(); img.src=png.url; img.style.maxWidth='360px'; img.style.borderRadius='16px';
    const a=document.createElement('a'); a.href=png.url; a.download=(row.CardID||'card')+'.png'; a.textContent=t('issue.download','Download card (PNG)'); a.className='tab-btn';
    out.append(img, document.createElement('br'), a);
    addMine(row.CardID);
  });
}

/* Renew */
function initRenew(){ on('#btn-renew','click',()=>{ const id=$('#renew-id')?.value?.trim()||''; const msg=encodeURIComponent(`مرحبًا، أود تجديد البطاقة: ${id}`); window.open(`https://wa.me/201000000000?text=${msg}`,'_blank'); }); }

/* PWA */
function initInstall(){ let deferred; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault(); deferred=e; $('#btn-install')?.classList.remove('hidden');}); on('#btn-install','click', async ()=>{ if(!deferred) return; deferred.prompt(); await deferred.userChoice; deferred=null; }); }

/* Media (Guide) */
function initMedia(){
  // open guide.pdf if exists
  on('#btn-open-pdf','click',()=>{ window.open('./guide.pdf','_blank'); });
  // local PDF preview
  on('#pdf-file','change', ()=>{
    const f=$('#pdf-file').files[0]; if(!f) return;
    const url=URL.createObjectURL(f);
    const frame=$('#pdf-frame'); if(frame){ frame.src=url; frame.classList.remove('hidden'); }
  });
  // local video preview
  on('#video-file','change', ()=>{
    const f=$('#video-file').files[0]; if(!f) return;
    const url=URL.createObjectURL(f);
    const vid=$('#video-player'); if(vid){ vid.src=url; vid.classList.remove('hidden'); vid.play().catch(()=>{}); }
  });
}

/* Diagram text refresh */
function updateDiagramLabels(){
  const n1=$('#dg-buy'); const n2=$('#dg-temp'); const n3=$('#dg-sell'); const n4=$('#dg-activate'); const n5=$('#dg-loop');
  if(n1) n1.textContent='30$ شراء بطاقة';
  if(n2) n2.textContent='+3 بطاقات مؤقتة';
  if(n3) n3.textContent='بيع بطاقة = 30$ للمُباع';
  if(n4) n4.textContent='10$ للإدارة → تفعيل';
  if(n5) n5.textContent='من يبيع 3 بطاقات يحصل على 3 أخرى';
}

/* Boot */
document.addEventListener('DOMContentLoaded', async ()=>{
  initTabs(); initTerms(); initInstall(); initCheck(); initIssue(); initRenew(); initMedia();
  await initI18n(); applyI18n(); updateDiagramLabels(); // i18n last for DOM
  loadPublic();
});
