// ===== Local storage model =====
const LS = LS_KEYS;

const Storage = {
  _get(k, def){ try{ return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(def)); }catch{ return def; } },
  _set(k, v){ localStorage.setItem(k, JSON.stringify(v)); dispatchEvent(new Event('storage')); },

  get cards(){ return this._get(LS.CARDS, []); },
  set cards(v){ this._set(LS.CARDS, v); },

  get market(){ return this._get(LS.MARKET, []); },
  set market(v){ this._set(LS.MARKET, v); },

  get meta(){ return this._get(LS.META, {}); },
  set meta(v){ this._set(LS.META, v); },

  get renew(){ return this._get(LS.RENEW, []); },
  set renew(v){ this._set(LS.RENEW, v); },
};

// ===== i18n =====
let CUR_LANG = localStorage.getItem(LS.LANG) || 'ar';
let I18N = null;

async function loadLang(lang){
  CUR_LANG = (lang==='en') ? 'en' : 'ar';
  localStorage.setItem(LS.LANG, CUR_LANG);
  try {
    const dict = await fetch(`i18n-${CUR_LANG}.json`).then(r=>r.json());
    I18N = dict;
  } catch {
    I18N = (CUR_LANG==='en')? {} : {};
  }
  applyI18n();
}

function applyI18n(){
  const t = I18N || {};
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const path = el.getAttribute('data-i18n').split('.'); let v=t; for(const k of path){ v=v?.[k]; }
    if(typeof v==='string') el.textContent=v;
  });
  document.title = t.app?.title || document.title;
  document.documentElement.lang = (CUR_LANG==='en'?'en':'ar');
  document.documentElement.dir = (CUR_LANG==='en'?'ltr':'rtl');
}

document.getElementById('lang-ar')?.addEventListener('click',()=>loadLang('ar'));
document.getElementById('lang-en')?.addEventListener('click',()=>loadLang('en'));
loadLang(CUR_LANG);

// Tabs
document.querySelectorAll('.tab-link').forEach(a=>{
  a.addEventListener('click',(e)=>{
    e.preventDefault();
    const id=a.dataset.target;
    document.querySelectorAll('.tab-section').forEach(s=>s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  });
});

// ===== Terms gating =====
const TERMS_VERSION='v2';
const modal = document.getElementById('terms-modal');
const modalBody = document.getElementById('terms-content');
const btnAccept = document.getElementById('btn-accept-terms');
const chkTerms = document.getElementById('terms-checkbox');
let PENDING_ACTION = null;

async function showTermsIfNeeded(force=false){
  const accepted = localStorage.getItem(LS.TERMS)===TERMS_VERSION;
  if (accepted && !force) return true;
  try{ modalBody.innerHTML = await fetch('terms.html').then(r=>r.text()); }catch{ modalBody.innerHTML='<p>Terms unavailable</p>'; }
  chkTerms.checked=false; btnAccept.disabled=true;
  modal.classList.remove('hide');
  return false;
}
chkTerms?.addEventListener('change', ()=>{ btnAccept.disabled = !chkTerms.checked; });
btnAccept?.addEventListener('click', ()=>{
  localStorage.setItem(LS.TERMS, TERMS_VERSION);
  localStorage.setItem(LS.TERMS_TS, Date.now());
  modal.classList.add('hide');
  if (typeof PENDING_ACTION === 'function'){ try{ PENDING_ACTION(); }finally{ PENDING_ACTION=null; } }
});

async function ensureTermsAnd(cb, force=true){
  const ok = await showTermsIfNeeded(force);
  if (ok) return cb();
  PENDING_ACTION = cb;
}

// ===== PWA Install =====
let deferredPrompt = null;
const btnInstall = document.getElementById('btn-install');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; btnInstall?.classList.remove('hide'); });
btnInstall?.addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); try{ await deferredPrompt.userChoice; }catch{} deferredPrompt=null; btnInstall.classList.add('hide'); });

// ===== Verify =====
document.getElementById('btn-verify')?.addEventListener('click', ()=>{
  const code = (document.getElementById('v-code').value||'').trim();
  const t = I18N?.verify || {};
  const c = Storage.cards.find(x=>String(x.code).toLowerCase()===code.toLowerCase());
  const box = document.getElementById('verify-res');
  if(!c){ box.innerHTML = `<div class="warn">${t.notFound||'Not found'}</div>`; return; }
  const badge = c.status==='active'? (t.active||'Active') : (c.status==='expired'? (t.expired||'Expired') : (t.pending||'Pending'));
  const statusClass = c.status==='active'? '' : (c.status==='expired'?'expired':'pending');
  const masked = Utils.maskCode(c.code);
  box.innerHTML = `
    <div class="digital-card ${statusClass}">
      <div class="brand">CARD • ${c.country||''}</div>
      <div class="badge">${badge}</div>
      <div class="code">${masked}</div>
      <div class="holder">
        <div>${c.status==='active' ? (c.holderName||'-') : '—'}</div>
        <small>${c.status==='active' ? (c.phone||'') : ''}</small>
      </div>
    </div>
    <div class="space-sm">
      <button id="btn-wa" class="secondary">${I18N?.verify?.contact||'Contact Admin'} (WA)</button>
      <button id="btn-mail" class="secondary">${I18N?.verify?.contact||'Contact Admin'} (Email)</button>
    </div>`;
  document.getElementById('btn-wa')?.addEventListener('click', ()=>ensureTermsAnd(()=>{
    location.href='https://wa.me/201000000000?text='+encodeURIComponent('Support for: '+masked);
  }, true));
  document.getElementById('btn-mail')?.addEventListener('click', ()=>ensureTermsAnd(()=>{
    location.href='mailto:admin@example.com?subject='+encodeURIComponent('Support '+masked);
  }, true));
});

// ===== My Cards =====
function renderMyCards(){
  const box = document.getElementById('my-cards');
  const t=I18N?.my||{};
  const rows = Storage.cards || [];
  if(!box) return;
  box.innerHTML = rows.length? rows.map(c=>{
    const badge = c.status==='active'? (I18N?.verify?.active||'Active') : (c.status==='expired'?(I18N?.verify?.expired||'Expired'):(I18N?.verify?.pending||'Pending'));
    const klass = c.status==='active'? '' : (c.status==='expired'?'expired':'pending');
    const h = c.status==='active'? c.code : Utils.maskCode(c.code);
    return `<div class="card">
      <div class="digital-card ${klass}" style="width:100%">
        <div class="brand">CARD • ${c.country||''}</div>
        <div class="badge">${badge}</div>
        <div class="code">${h}</div>
        <div class="holder"><div>${c.status==='active'? (c.holderName||'-'):'—'}</div><small>${c.status==='active'? (c.phone||''):''}</small></div>
      </div>
      <div class="row" style="margin-top:8px">
        <button onclick="copyId('${c.code}')">${t.copy||'Copy ID'}</button>
        <button class="secondary" onclick="listForSale('${c.code}')">${t.sell||'List for Sale'}</button>
      </div>
    </div>`;
  }).join('') : `<div class="muted">${I18N?.common?.noCards||'No cards'}</div>`;
}
window.copyId = (code)=>{ navigator.clipboard?.writeText(code); alert('Copied'); };
window.listForSale = async (code)=>{
  await ensureTermsAnd(async ()=>{
    const country = prompt(I18N?.common?.country||'Country?')||'';
    const price = prompt(I18N?.common?.price||'Price $?')||'';
    const contact = prompt(I18N?.common?.contact||'Contact? (WhatsApp/Email)')||'';
    const m = Storage.market;
    m.push({ code, country, price, contact, approved:false, isSold:false, timestamp: Date.now() });
    Storage.market = m;
    alert(I18N?.market?.waiting||'Pending admin approval');
  }, true);
};
renderMyCards();
document.addEventListener('storage', renderMyCards);

// ===== Digital Card (enforce terms each time) =====
document.getElementById('btn-show-card')?.addEventListener('click', ()=>{
  ensureTermsAnd(()=>{
    const code = (document.getElementById('i-code').value||'').trim();
    const card = Storage.cards.find(x=>String(x.code).toLowerCase()===code.toLowerCase());
    const box = document.getElementById('digital-card');
    if(!card || card.status!=='active'){ box.classList.add('hide'); alert('غير مفعّلة/غير موجودة'); return; }
    box.classList.remove('hide'); box.classList.remove('pending','expired');
    box.innerHTML = `<div class="brand">CARD • ${card.country||''}</div>
      <div class="badge">${I18N?.verify?.active||'Active'}</div>
      <div class="code">${card.code}</div>
      <div class="holder"><div>${card.holderName||'-'}</div><small>${card.phone||''}</small></div>`;
  }, true);
});

// ===== Marketplace =====
function renderMarket(){
  const list = document.getElementById('market-list'); if(!list) return;
  const fc=(document.getElementById('m-country')?.value||'').trim().toLowerCase();
  const fmin=parseFloat(document.getElementById('m-min')?.value);
  const fmax=parseFloat(document.getElementById('m-max')?.value);
  let rows = (Storage.market||[]).filter(r=>r.approved===true && !r.isSold);
  if(fc) rows = rows.filter(r => (r.country||'').toLowerCase().includes(fc));
  if(!isNaN(fmin)) rows = rows.filter(r => parseFloat(r.price||0) >= fmin);
  if(!isNaN(fmax)) rows = rows.filter(r => parseFloat(r.price||0) <= fmax);
  list.innerHTML = rows.length? rows.map(r=>`
    <div class="card">
      <h3>${Utils.maskCode(r.code)}</h3>
      <div>${r.country||'-'}</div>
      <div>${r.contact||'-'}</div>
      <div>$${r.price||'-'}</div>
      <small>${Utils.fmtDate(r.timestamp)}</small>
    </div>`).join('') : `<div class="muted">${I18N?.common?.noItems||'No items'}</div>`;
}
document.getElementById('btn-filter')?.addEventListener('click', renderMarket);
document.addEventListener('storage', renderMarket);
renderMarket();

// ===== Renew =====
document.getElementById('btn-renew')?.addEventListener('click', ()=>{
  const code = (document.getElementById('r-code').value||'').trim();
  if(!code) return;
  ensureTermsAnd(()=>{
    const masked = Utils.maskCode(code);
    const q = Storage.renew; q.push({ code, timestamp: Date.now() }); Storage.renew = q;
    document.getElementById('renew-msg').innerHTML = `<div class="ok">${(I18N?.renew?.queued)||'Queued locally.'}</div>`;
    location.href = 'https://wa.me/201000000000?text=' + encodeURIComponent('[Renew] Request for '+masked);
  }, true);
});

// ===== Terms initial prompt =====
(async ()=>{ await showTermsIfNeeded(false); })();
