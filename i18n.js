
const LANG_KEY='RDC_LANG';
let I18N=null, LANG='ar';

export async function setLang(l){
  LANG = (l==='en'?'en':'ar');
  localStorage.setItem(LANG_KEY, LANG);
  I18N = await fetch(`./i18n-${LANG}.json?ver=2.1.0`).then(r=>r.json()).catch(()=>null);
  applyI18n();
}

export async function initI18n(){
  const saved = localStorage.getItem(LANG_KEY) || 'ar';
  await setLang(saved);
  document.documentElement.lang = (LANG==='en'?'en':'ar');
  document.documentElement.dir  = (LANG==='en'?'ltr':'rtl');
  document.getElementById('btn-ar')?.addEventListener('click', ()=>setLang('ar'));
  document.getElementById('btn-en')?.addEventListener('click', ()=>setLang('en'));
}

export function t(path, fallback=''){
  const keys = path.split('.');
  let cur = I18N;
  for(const k of keys){ if(cur && typeof cur==='object' && (k in cur)) cur = cur[k]; else return fallback; }
  return (typeof cur==='string')?cur:fallback;
}

export function applyI18n(){
  if(!I18N) return;
  document.title = t('app.title', document.title);
  document.documentElement.lang = (LANG==='en'?'en':'ar');
  document.documentElement.dir  = (LANG==='en'?'ltr':'rtl');
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key=el.getAttribute('data-i18n');
    const txt=t(key); if(txt) el.textContent=txt;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
    const key=el.getAttribute('data-i18n-ph');
    const txt=t(key); if(txt) el.setAttribute('placeholder',txt);
  });
}
