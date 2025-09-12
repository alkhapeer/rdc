/* global XLSX */
const LS = LS_KEYS;
const DB = {
  _get(k, def){ try{ return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(def)); }catch{ return def; } },
  _set(k, v){ localStorage.setItem(k, JSON.stringify(v)); dispatchEvent(new Event('storage')); },
  get cards(){ return this._get(LS.CARDS, []); }, set cards(v){ this._set(LS.CARDS, v); },
  get market(){ return this._get(LS.MARKET, []); }, set market(v){ this._set(LS.MARKET, v); },
  get secrets(){ return this._get(LS.SECRETS, []); }, set secrets(v){ this._set(LS.SECRETS, v); },
  get meta(){ return this._get(LS.META, {}); }, set meta(v){ this._set(LS.META, v); }
};
const $ = (s)=>document.querySelector(s);

let CUR_LANG = localStorage.getItem(LS.LANG)||'ar';
function setLang(l){ CUR_LANG=l; localStorage.setItem(LS.LANG,l); location.reload(); }
document.getElementById('lang-ar')?.addEventListener('click',()=>setLang('ar'));
document.getElementById('lang-en')?.addEventListener('click',()=>setLang('en'));

const ADMIN_PASSWORD = 'ADMIN-123456'; // TODO: change
$('#btn-admin-login')?.addEventListener('click', ()=>{
  const ok = ($('#admin-pass').value||'') === ADMIN_PASSWORD;
  sessionStorage.setItem(LS.ADMIN_OK, ok?'1':'0');
  $('#admin-state').textContent = ok? 'OK' : 'Wrong';
  document.querySelectorAll('.admin-only').forEach(el=>el.style.display = ok? '' : 'none');
});
window.addEventListener('load', ()=>{
  const ok = sessionStorage.getItem(LS.ADMIN_OK)==='1';
  document.querySelectorAll('.admin-only').forEach(el=>el.style.display = ok? '' : 'none');
  updateSecretsCount(); renderCards(); renderMarketAdmin(); updateImportMeta();
});

function updateImportMeta(){
  const meta = DB.meta || {};
  const el = $('#import-meta');
  if(!el) return;
  const s = meta.lastImport ? `آخر استيراد: ${new Date(meta.lastImport).toLocaleString()} (${meta.lastImportName||''})` : '—';
  el.textContent = s;
}

function toInternal(row){
  const v = (k)=> row[k] ?? row[k?.toLowerCase?.()] ?? row[k?.toUpperCase?.()];
  const code = v('CardID') ?? v('code') ?? v('ID') ?? v('Card Id');
  const status = Utils.normalizeStatus(v('Status'));
  const tempParent = v('ParentID') ?? v('tempParent') ?? '';
  const issueDate = v('PurchaseDate') ?? v('issueDate') ?? '';
  const holderName = v('ActivatedFor') ?? v('holderName') ?? '';
  const issuedBy = v('IssuedBy') ?? v('issuedBy') ?? 'admin';
  const phone = v('Phone') ?? v('phone') ?? '';
  const country = v('Country') ?? v('country') ?? '';
  const activateDate = v('ActivateDate') ?? v('activateDate') ?? '';
  const type = v('Type') ?? v('type') ?? (tempParent? 'temp' : 'main');
  const tempSoldCount = parseInt(v('TempSoldCount') ?? 0) || 0;
  const expiryDate = v('ExpiryDate') ?? '';
  return { code, status, tempParent, issueDate, holderName, issuedBy, phone, country, activateDate, type, tempSoldCount, expiryDate };
}
function toExcel(row){
  return {
    CardID: row.code,
    Status: row.status==='active'?'Active':(row.status==='expired'?'Expired':'Pending'),
    ParentID: row.tempParent||'',
    PurchaseDate: row.issueDate||'',
    ActivatedFor: row.holderName||'',
    IssuedBy: row.issuedBy||'admin',
    Phone: row.phone||'',
    Country: row.country||'',
    ActivateDate: row.activateDate||'',
    Type: row.type||'',
    TempSoldCount: row.tempSoldCount||0,
    ExpiryDate: row.expiryDate||''
  };
}

$('#btn-import')?.addEventListener('click', async ()=>{
  if (sessionStorage.getItem(LS.ADMIN_OK)!=='1') return alert('Admin only');
  const f = $('#file-import').files[0]; if(!f) return alert('Choose file');
  const buf = await f.arrayBuffer();
  let cards = [], market = DB.market;
  const name = f.name.toLowerCase();
  if (name.endsWith('.xlsx') && window.XLSX){
    const wb = XLSX.read(buf,{type:'array'});
    const arr = XLSX.utils.sheet_to_json(wb.Sheets['cards']||{}, {defval:''});
    cards = arr.map(toInternal).filter(r=>r.code);
    const m = XLSX.utils.sheet_to_json(wb.Sheets['market']||{}, {defval:''});
    market = m.map(r=>({ timestamp: r.timestamp || Date.now(), code: r.code || r.CardID || '', country: r.country || r.Country || '', contact: r.contact || r.Contact || '', price: r.price || r.Price || '', approved: !!(r.approved ?? r.Approved), isSold: !!(r.isSold ?? r.IsSold) }));
  } else if (name.endsWith('.json')) {
    const j = JSON.parse(new TextDecoder().decode(buf));
    cards = (j.cards||[]).map(toInternal).filter(r=>r.code);
    market = (j.market||[]);
  } else if (name.endsWith('.csv')) {
    const txt = new TextDecoder().decode(buf);
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const head = lines.shift()?.split(',')||[];
    const idx={code:head.indexOf('CardID')>=0?head.indexOf('CardID'):head.indexOf('code')};
    cards = lines.map(l=>{const r=l.split(','); return toInternal({ CardID:r[idx.code]||'' });}).filter(x=>x.code);
  } else return alert('Unsupported');

  DB.cards = cards; DB.market = market;
  DB.meta = { ...(DB.meta||{}), lastImport: Date.now(), lastImportName: f.name };
  alert('Imported.');
  renderCards(); renderMarketAdmin(); updateSecretsCount(); updateImportMeta();
});

$('#btn-export')?.addEventListener('click', ()=>{
  if (sessionStorage.getItem(LS.ADMIN_OK)!=='1') return alert('Admin only');
  const rows = (DB.cards||[]).map(toExcel);
  const market = DB.market||[];
  if(window.XLSX){
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'cards');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(market), 'market');
    const ts = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19);
    XLSX.writeFile(wb, `cards-data-${ts}.xlsx`);
  } else {
    const blob=new Blob([JSON.stringify({cards:rows,market},null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cards-data.json'; a.click(); URL.revokeObjectURL(a.href);
  }
});

function updateSecretsCount(){ $('#secrets-count').textContent = `Secrets in pool: ${DB.secrets.length}`; }
$('#btn-gen-secrets')?.addEventListener('click', ()=>{
  if (sessionStorage.getItem(LS.ADMIN_OK)!=='1') return alert('Admin only');
  const n = parseInt($('#gen-secrets-n').value||'0'); if(!n||n<1) return alert('ضع رقم');
  const pool = DB.secrets;
  for(let i=0;i<n;i++) pool.push(Utils.randId(12) + '-' + Date.now().toString(36));
  DB.secrets = pool; updateSecretsCount(); alert('تم توليد الأسرار');
});
function codeFromSecret(secret){ const head = secret.replace(/[^A-Z0-9]/gi,'').slice(0,4).toUpperCase(); return head + '-' + Utils.randId(6); }

$('#btn-generate-main')?.addEventListener('click', ()=>{
  if (sessionStorage.getItem(LS.ADMIN_OK)!=='1') return alert('Admin only');
  const name=$('#gen-holder').value.trim(); const phone=$('#gen-phone').value.trim(); const country=$('#gen-country').value.trim();
  if(!name) return alert('الاسم؟');
  const pool = DB.secrets; if(pool.length<4) return alert('الأسرار غير كافية (≥4)');
  const mainSecret = pool.shift(); const mainCode = codeFromSecret(mainSecret);
  const ownerId = Utils.randId(10); const now = new Date().toISOString();
  const cards = DB.cards;
  cards.push({ code:mainCode, status:'pending', holderName:name, phone, country, ownerId, issueDate:now, activateDate:'', tempParent:'', type:'main', issuedBy:'admin', tempSoldCount:0 });
  for(let i=0;i<3;i++){ const s=pool.shift(); const c=codeFromSecret(s);
    cards.push({ code:c, status:'pending', holderName:name, phone, country, ownerId, tempParent:mainCode, issueDate:now, activateDate:'', type:'temp', issuedBy:'admin' });
  }
  DB.cards = cards; DB.secrets = pool; updateSecretsCount(); renderCards(); alert(`تم إنشاء بطاقة رئيسية (${mainCode}) + 3 Pending.`);
});

$('#btn-activate')?.addEventListener('click', ()=>{
  if (sessionStorage.getItem(LS.ADMIN_OK)!=='1') return alert('Admin only');
  const code=$('#act-code').value.trim(); if(!code) return;
  const newName=$('#act-new-name').value.trim(); const newPhone=$('#act-new-phone').value.trim();
  const cards = DB.cards; const i = cards.findIndex(x=>String(x.code).toLowerCase()===code.toLowerCase());
  if(i<0) return alert('Not found');
  const row = cards[i];

  if(row.status==='pending' && newName){
    const sellerMainIdx = cards.findIndex(c=>c.code===row.tempParent);
    row.holderName = newName; row.phone = newPhone; row.status='active'; row.activateDate = new Date().toISOString(); cards[i]=row;
    if(sellerMainIdx>=0){
      cards[sellerMainIdx].tempSoldCount = (parseInt(cards[sellerMainIdx].tempSoldCount||0)+1);
      if (cards[sellerMainIdx].tempSoldCount % 3 === 0){
        const pool = DB.secrets;
        if(pool.length>=3){
          for(let k=0;k<3;k++){ const c = codeFromSecret(pool.shift());
            cards.push({ code:c, status:'pending', holderName:cards[sellerMainIdx].holderName, phone:cards[sellerMainIdx].phone, country:cards[sellerMainIdx].country, ownerId:cards[sellerMainIdx].ownerId, tempParent:cards[sellerMainIdx].code, issueDate:new Date().toISOString(), activateDate:'', type:'temp', issuedBy:'admin' });
          }
          DB.secrets = pool;
          alert('🎉 تم منح 3 بطاقات Pending جديدة تلقائيًا.');
        } else alert('لا توجد أسرار كافية لمنح بطاقات!');
      }
    }
  } else {
    row.status='active'; row.activateDate = new Date().toISOString(); cards[i]=row;
  }

  DB.cards = cards; renderCards(); alert('تم التفعيل/التحديث');
});

function renderMarketAdmin(){
  const box = $('#admin-market');
  const rows = DB.market||[];
  box.innerHTML = rows.length? rows.map((r,idx)=>`
    <div class="card">
      <h3>${r.code}</h3>
      <div>${r.country||'-'}</div>
      <div>$${r.price||'-'}</div>
      <div>${r.contact||'-'}</div>
      <div>${r.approved? 'Approved':'Pending'}</div>
      <div class="row">
        <button onclick="adminApprove(${idx},true)" class="primary">Approve</button>
        <button onclick="adminApprove(${idx},false)" class="secondary">Unapprove</button>
        <button onclick="adminRemove(${idx})">Remove</button>
      </div>
    </div>
  `).join('') : '<div class="muted">لا إدراجات</div>';
}
window.adminApprove = (i,val)=>{ const m=DB.market; if(!m[i]) return; m[i].approved=!!val; DB.market=m; renderMarketAdmin(); };
window.adminRemove = (i)=>{ const m=DB.market; m.splice(i,1); DB.market=m; renderMarketAdmin(); };

function renderCards(){
  const tbl = $('#admin-cards');
  const rows = DB.cards||[];
  if(rows.length===0){ tbl.innerHTML='<div class="muted">لا بطاقات</div>'; return; }
  tbl.innerHTML = `
    <div class="thead">
      <div>CODE</div><div>STATUS</div><div>HOLDER</div><div>PHONE</div><div>COUNTRY</div><div>UPDATED</div>
    </div>
    ${rows.map(r=>`
      <div class="trow">
        <div>${r.code}</div>
        <div>${r.status}</div>
        <div>${r.holderName||''}</div>
        <div>${r.phone||''}</div>
        <div>${r.country||''}</div>
        <div>${(r.activateDate||r.issueDate||'').slice(0,10)}</div>
      </div>
    `).join('')}
  `;
}
document.addEventListener('storage', ()=>{ renderCards(); renderMarketAdmin(); });
