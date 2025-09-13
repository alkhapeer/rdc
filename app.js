
import { renderCardPNG } from './card-render.js';

const TERMS_KEY='CS_TERMS_ACCEPTED_V', TERMS_VERSION='v2';
const STORE={ CARDS:'CS_CARDS' };
const ADMIN_WA='201000000000';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const on=(sel,ev,fn)=>{ const el=$(sel); if(el) el.addEventListener(ev,fn); };
const readLS=k=>{ try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;} };
const writeLS=(k,v)=>localStorage.setItem(k, JSON.stringify(v));
const maskId=id=>(id||'').replace(/(.{3,6}).+(-).+/,(_,a,b)=>`${a}••••${b}•••`);

/* Tabs */
function initTabs(){ const btns=$$('#tabs .tab-btn'), secs=$$('main section'); btns.forEach(btn=>btn.addEventListener('click',()=>{ btns.forEach(b=>b.classList.remove('active')); secs.forEach(s=>s.classList.remove('active')); btn.classList.add('active'); const sec=document.getElementById(btn.dataset.target); if(sec) sec.classList.add('active'); })); }
/* Terms */
function termsHide(){ const m=$('#terms-modal'),o=$('#overlay'); if(m&&o){ m.classList.add('hidden');o.classList.add('hidden'); } }
function termsShow(){ const m=$('#terms-modal'),o=$('#overlay'); if(m&&o){ m.classList.remove('hidden');o.classList.remove('hidden'); } }
function ensureTermsOr(fn){ if(localStorage.getItem(TERMS_KEY)===TERMS_VERSION){ fn(); return; } termsShow(); const btn=$('#btn-accept-terms'); const once=()=>{ btn.removeEventListener('click',once); fn(); }; if(btn) btn.addEventListener('click', once); }
function initTerms(){ const chk=$('#terms-check'), btn=$('#btn-accept-terms'); if(chk&&btn){ btn.disabled=!chk.checked; chk.addEventListener('change',()=>btn.disabled=!chk.checked); btn.addEventListener('click',()=>{ localStorage.setItem(TERMS_KEY,TERMS_VERSION); termsHide(); }); } (localStorage.getItem(TERMS_KEY)===TERMS_VERSION)?termsHide():termsShow(); }
/* Local cards */
function getCards(){ return Array.isArray(readLS(STORE.CARDS))? readLS(STORE.CARDS):[]; }
/* Check */
function initCheck(){ on('#btn-check','click',()=>{ const id=$('#check-id')?.value?.trim(); const out=$('#check-result'); if(!out) return; if(!id){ out.textContent='أدخل Card ID'; return; } const row=getCards().find(r=>String(r.CardID||'').toUpperCase()===id.toUpperCase()); if(!row){ out.innerHTML='<span style="color:#f59e0b">غير موجود</span>'; return; } const isTemp=String(row.CardID||'').toUpperCase().startsWith('TEMP') || String(row.Type||'').toLowerCase()==='temp'; const isActive=String(row.Status||'').toLowerCase().includes('active') && !isTemp; let badge='<span class="tab-btn">مؤقتة</span>'; if(isActive) badge='<span class="tab-btn" style="background:#16a34a;border-color:#16a34a;color:#052d3a">مفعّلة</span>'; else if(String(row.Status||'').toLowerCase().includes('expired')) badge='<span class="tab-btn" style="background:#ef4444;border-color:#ef4444;color:#fff">منتهية</span>'; out.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><span class="tab-btn">RDC • CARD</span> ${badge}</div><div style="font-size:1.1rem;margin:.6rem 0"><b>${maskId(row.CardID)}</b></div><small class="muted">${row.ActivatedFor||''} • ${row.Country||''}</small></div>`; }); }
/* My Cards */
function renderMyCards(){ const host=$('#my-cards'); if(!host) return; const rows=getCards(); if(rows.length===0){ host.innerHTML='<div class="card">No cards</div>'; return; } host.innerHTML=rows.map(r=>{ const temp=String(r.CardID||'').toUpperCase().startsWith('TEMP') || String(r.Type||'').toLowerCase()==='temp'; return `<div class="card"><div><b>${maskId(r.CardID||'-')}</b></div><small class="muted">${temp?'مؤقتة':'رسمية'} • ${r.ActivatedFor||''}</small></div>`; }).join(''); }
/* Issue (PNG) */
function initIssue(){ on('#btn-generate-card','click', async ()=>{ ensureTermsOr(async ()=>{ const id=$('#issue-id')?.value?.trim(); const name=$('#issue-name')?.value?.trim(); const phone=$('#issue-phone')?.value?.trim(); const photo=$('#issue-photo')?.files?.[0]||null; const out=$('#card-preview'); if(!out) return; if(!id || !/^RDC/i.test(id)){ out.textContent='CardID يجب أن يبدأ بـ RDC'; return; } const row=getCards().find(r=>String(r.CardID||'').toUpperCase()===id.toUpperCase()); if(!row){ out.textContent='غير موجود في الكاش المحلي.'; return; } const isTemp=String(row.CardID||'').toUpperCase().startsWith('TEMP') || String(row.Type||'').toLowerCase()==='temp'; const isActive=String(row.Status||'').toLowerCase().includes('active') && !isTemp; if(!isActive){ out.textContent='هذه البطاقة ليست مفعّلة رسمياً.'; return; } const png=await renderCardPNG({ id: row.CardID, name: name||row.ActivatedFor||'', phone: phone||row.Phone||'', country: row.Country||'', photoFile: photo }); out.innerHTML=''; const img=new Image(); img.src=png.url; img.style.maxWidth='360px'; img.style.borderRadius='16px'; const a=document.createElement('a'); a.href=png.url; a.download=(row.CardID||'card')+'.png'; a.textContent='تحميل البطاقة (PNG)'; a.className='tab-btn'; out.append(img, document.createElement('br'), a); }); }); }
/* Renew */
function initRenew(){ on('#btn-renew','click',()=>{ ensureTermsOr(()=>{ const id=$('#renew-id')?.value?.trim()||''; const msg=encodeURIComponent(`مرحبًا، أود تجديد البطاقة: ${id}`); window.open(`https://wa.me/${ADMIN_WA}?text=${msg}`,'_blank'); }); }); }
/* PWA install */
function initInstall(){ let deferred; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault(); deferred=e; $('#btn-install')?.classList.remove('hidden');}); on('#btn-install','click', async ()=>{ if(!deferred) return; deferred.prompt(); await deferred.userChoice; deferred=null; }); }

/* ===== Admin Gate ===== */
async function sha256Hex(s){ const enc=new TextEncoder().encode(s); const buf=await crypto.subtle.digest('SHA-256', enc); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
function showAdmin(){ $('#admin-excel-card')?.classList.remove('hidden'); }
async function openAdminGate(){ const key=prompt('أدخل مفتاح الأدمن'); if(!key) return; const h=await sha256Hex(key); if(h === window.__ADMIN_HASH__){ sessionStorage.setItem('CS_ADMIN_OK','1'); showAdmin(); } else { alert('مفتاح خاطئ'); } }
function initAdmin(){ if(sessionStorage.getItem('CS_ADMIN_OK')==='1') showAdmin(); const title=$('#title'); if(title){ title.addEventListener('dblclick', openAdminGate); } document.addEventListener('keydown', (e)=>{ if(e.ctrlKey && e.shiftKey && (e.key==='A' || e.key==='a')){ openAdminGate(); } }); }

/* Excel Import/Export (admin-only card has buttons) */
function initExcel(){
  const status=$('#excel-status');
  const imp=()=>on('#btn-import-excel','click', async ()=>{
    try{
      const file=$('#file-excel')?.files?.[0];
      if(!file){ alert('اختر ملف Excel'); return; }
      const XLSX = window.XLSX;
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, {type:'array'});
      const sh = wb.Sheets['cards'] || wb.Sheets[wb.SheetNames[0]];
      if(!sh){ alert('لم يتم العثور على ورقة cards'); return; }
      const rows = XLSX.utils.sheet_to_json(sh);
      writeLS(STORE.CARDS, rows);
      status.textContent='تم الاستيراد إلى الكاش.'; renderMyCards();
    }catch(e){ console.error(e); status.textContent='فشل الاستيراد.'; }
  });
  const exp=()=>on('#btn-export-excel','click', ()=>{
    try{
      const rows = getCards();
      const XLSX = window.XLSX;
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'cards');
      XLSX.writeFile(wb, 'cards-data.xlsx');
    }catch(e){ console.error(e); alert('فشل التصدير'); }
  });
  const observer=new MutationObserver(()=>{
    if(!$('#admin-excel-card')?.classList.contains('hidden')){ imp(); exp(); observer.disconnect(); }
  });
  observer.observe(document.body, {subtree:true, attributes:true, attributeFilter:['class']});
}

/* boot */
document.addEventListener('DOMContentLoaded', ()=>{
  initTabs(); initTerms(); initCheck(); renderMyCards(); initIssue(); initRenew(); initInstall(); initAdmin(); initExcel();
});
