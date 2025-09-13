
import { renderCardPNG } from './card-render.js';
import { initI18n, applyI18n, t } from './i18n.js';

const TERMS_KEY='CS_TERMS_ACCEPTED_V', TERMS_VERSION='v2';
const STORE={ PUB:'CS_PUB_CARDS', MINE:'CS_MY_CARDS', META:'CS_PUB_META' };
let ADMIN_WA='201000000000';
const CONTACT_FORM_URL='https://docs.google.com/forms/d/e/1FAIpQLSem_8RjWAryclLqgTaaTLqz1CYg6zCmtfl9N1UyDY1gfOoo5A/viewform?usp=sharing&ouid=109028943176097355718';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const on=(sel,ev,fn)=>{ const el=$(sel); if(el) el.addEventListener(ev,fn); };
const lsGet=k=>{ try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;} };
const lsSet=(k,v)=>localStorage.setItem(k, JSON.stringify(v));
const maskId=id=>(id||'').replace(/(.{3,6}).+(-).+/,(_,a,b)=>`${a}••••${b}•••`);

function setActive(target){ $$('#tabs .tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.target===target)); $$('main section').forEach(s=>s.classList.toggle('active', s.id===target)); }
function initTabs(){
  $$('#tabs .tab-btn').forEach(btn=>{ if(btn.dataset.target){ btn.addEventListener('click',()=>{ setActive(btn.dataset.target); if(btn.dataset.target==='tab-shops') loadPartners(); }); } });
  const c=document.getElementById('btn-contact'); if(c){ c.addEventListener('click',()=>window.open(CONTACT_FORM_URL,'_blank')); }
  setActive('tab-guide');
}
function initTerms(){
  const chk=$('#terms-check'), btn=$('#btn-accept-terms');
  if(chk&&btn){ btn.disabled=!chk.checked;
    chk.addEventListener('change',()=>btn.disabled=!chk.checked);
    btn.addEventListener('click',()=>{ localStorage.setItem(TERMS_KEY,TERMS_VERSION); $('#overlay').classList.add('hidden'); $('#terms-modal').classList.add('hidden'); });
    if(localStorage.getItem(TERMS_KEY)!==TERMS_VERSION){ $('#overlay').classList.remove('hidden'); $('#terms-modal').classList.remove('hidden'); }
  }
}

/* load public json: array OR {meta, rows} */
async function loadPublic(){
  try{
    const res=await fetch('./cards-public.json?ver=3.3.0',{cache:'no-store'});
    const json=await res.json();
    let rows=json; let meta={};
    if(json && typeof json==='object' && !Array.isArray(json)){
      rows=json.rows||json.data||[]; meta=json.meta||json._meta||{};
    }
    lsSet(STORE.PUB, Array.isArray(rows)?rows:[]);
    lsSet(STORE.META, meta);
    if(meta.whatsapp || meta.adminWa) ADMIN_WA=String(meta.whatsapp||meta.adminWa);
  }catch(e){ console.warn('cards-public.json not found; using cache'); }
  renderMy();
}

function getPub(){ return Array.isArray(lsGet(STORE.PUB))?lsGet(STORE.PUB):[]; }
function getMine(){ return Array.isArray(lsGet(STORE.MINE))?lsGet(STORE.MINE):[]; }
function addMine(id){ const s=new Set(getMine()); s.add(id); lsSet(STORE.MINE,[...s]); renderMy(); }

/* CHECK */
function initCheck(){
  on('#btn-check','click',()=>{
    const id=($('#check-id')?.value||'').trim(); const out=$('#check-result'); if(!id){ out.textContent=t('check.notFound'); return; }
    const row=getPub().find(r=>String(r.CardID||'').toUpperCase()===id.toUpperCase());
    if(!row){ out.innerHTML=`<div class="card status warn">${t('check.notFound')}</div>`; return; }
    const type=String(row.Type||'').toLowerCase();
    const isTemp= type==='temp' || String(row.CardID||'').toUpperCase().startsWith('TEMP');
    const isActive=String(row.Status||'').toLowerCase().includes('active') && !isTemp;
    let st=`<span class="badge">${t('check.temp')}</span>`;
    if(isActive) st=`<span class="badge" style="background:rgba(22,163,74,.15);border-color:#16a34a;color:#86efac">${t('check.active')}</span>`;
    else if(String(row.Status||'').toLowerCase().includes('expired')) st=`<span class="badge" style="background:rgba(239,68,68,.2);border-color:#ef4444;color:#fecaca">${t('check.expired')}</span>`;
    out.innerHTML=`
      <div class="kard">
        <div class="chip"></div><div class="logo">RDC</div>
        <h4>${maskId(row.CardID)}</h4>
        <small class="muted">${row.Country||''}</small>
        <div class="row" style="margin-top:.5rem">${st}<button id="save-mine" class="btn pill" style="margin-inline-start:auto">${t('check.save')}</button></div>
      </div>`;
    on('#save-mine','click',()=>addMine(row.CardID));
  });
}

/* MY */
function renderMy(){
  const host=$('#my-cards'); if(!host) return;
  const mine=new Set(getMine()), all=getPub();
  const rows=all.filter(r=>mine.has(r.CardID));
  host.innerHTML = rows.length? rows.map(r=>`
    <div class="kard"><div class="chip"></div><div class="logo">RDC</div>
      <h4>${maskId(r.CardID)}</h4><small class="muted">${(String(r.Type).toLowerCase()==='temp'?'TEMP • ':'RDC • ')+(r.Country||'')}</small>
    </div>`).join('') : `<div class="card"><small class="muted">${t('my.empty')}</small></div>`;
}

/* ISSUE */
function initIssue(){
  on('#btn-generate-card', async ()=>{
    const id=($('#issue-id')?.value||'').trim(), name=($('#issue-name')?.value||'').trim(), phone=($('#issue-phone')?.value||'').trim(), photo=$('#issue-photo')?.files?.[0]||null, out=$('#card-preview');
    if(!/^RDC/i.test(id)){ out.textContent=t('issue.errPrefix'); return; }
    const row=getPub().find(r=>String(r.CardID||'').toUpperCase()===id.toUpperCase());
    if(!row){ out.textContent=t('issue.errMissing'); return; }
    const type=String(row.Type||'').toLowerCase();
    const isTemp= type==='temp' || String(row.CardID||'').toUpperCase().startsWith('TEMP');
    const isActive=String(row.Status||'').toLowerCase().includes('active') && !isTemp;
    if(!isActive){ out.textContent=t('issue.errInactive'); return; }
    const badge='ACTIVE';
    const png=await renderCardPNG({ id:row.CardID, name, phone, country:row.Country||'', photoFile:photo, badge });
    out.innerHTML=''; const img=new Image(); img.src=png.url; img.style.maxWidth='360px'; img.style.borderRadius='16px';
    const a=document.createElement('a'); a.href=png.url; a.download=(row.CardID||'card')+'.png'; a.textContent=t('issue.download'); a.className='btn pill';
    out.append(img, document.createElement('br'), a);
    addMine(row.CardID);
  });
}

/* RENEW */
function initRenew(){ on('#btn-renew','click',()=>{ const id=($('#renew-id')?.value||'').trim(); const msg=encodeURIComponent(`مرحبًا، أود تجديد البطاقة: ${id}`); window.open(`https://wa.me/${ADMIN_WA}?text=${msg}`,'_blank'); }); }

/* SHOPS */
async function loadPartners(){
  const host=$('#shops-list'); const note=$('#shops-note');
  host.innerHTML=''; note.textContent='';
  try{
    let data=null;
    try{ const r=await fetch('./partners.json?ver=3.3.0',{cache:'no-store'}); if(r.ok) data=await r.json(); }catch(e){}
    if(!data){
      const meta=lsGet(STORE.META)||{}; data=meta.partners||meta.shops||null;
    }
    if(!data || !Array.isArray(data) || data.length===0){
      note.textContent=t('shops.soon'); 
      return;
    }
    host.innerHTML = data.map(p=>`
      <div class="shop">
        <h4>${p.name||'-'}</h4>
        <small>${[p.country,p.city].filter(Boolean).join(' • ')}</small><br/>
        <small>${t('shops.discount')}: ${p.discount||'-'}</small><br/>
        ${(p.link?`<a href="${p.link}" target="_blank" class="btn pill" style="margin-top:.35rem">Open</a>`:'')}
      </div>
    `).join('');
  }catch(e){
    note.textContent=t('shops.soon');
  }
}

/* PWA install */
function initInstall(){ let deferred; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault(); deferred=e; $('#btn-install')?.classList.remove('hidden');}); on('#btn-install','click', async ()=>{ if(!deferred) return; deferred.prompt(); await deferred.userChoice; deferred=null; }); }

/* Guide media */
async function probe(url){ try{ const r=await fetch(url,{method:'HEAD'}); return r.ok; }catch{return false;} }
async function initGuide(){
  const hasPdf = await probe('./guide.pdf');
  const hasVid = await probe('./training.mp4');
  if(hasPdf){ $('#btn-open-pdf')?.classList.remove('hidden'); $('#btn-open-pdf').onclick=()=>window.open('./guide.pdf','_blank'); } else { $('#guide-missing')?.classList.remove('hidden'); }
  if(hasVid){ const v=$('#video-player'); v.src='./training.mp4'; v.classList.remove('hidden'); }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  initTabs(); initTerms(); initInstall(); initCheck(); initIssue(); initRenew();
  await initI18n(); applyI18n();
  await initGuide();
  loadPublic();
});
