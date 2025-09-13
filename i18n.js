
const LANG_KEY='RDC_LANG';
let I18N=null, LANG='ar';
export async function setLang(l){
  LANG=(l==='en'?'en':'ar'); localStorage.setItem(LANG_KEY,LANG);
  I18N=await fetch(`./i18n-${LANG}.json?ver=3.3.0`).then(r=>r.json()).catch(()=>null);
  applyI18n();
  document.documentElement.lang=(LANG==='en'?'en':'ar');
  document.documentElement.dir=(LANG==='en'?'ltr':'rtl');
}
export async function initI18n(){
  const saved=localStorage.getItem(LANG_KEY)||'ar'; await setLang(saved);
  document.getElementById('btn-ar')?.addEventListener('click',()=>setLang('ar'));
  document.getElementById('btn-en')?.addEventListener('click',()=>setLang('en'));
}
export function t(path, fallback=''){
  try{ return path.split('.').reduce((o,k)=>o[k], I18N) || fallback; }catch{ return fallback; }
}
export function applyI18n(){
  if(!I18N) return;
  document.title=t('app.title', document.title);
  document.querySelectorAll('[data-i18n]').forEach(el=>{ const k=el.getAttribute('data-i18n'); const v=t(k); if(v) el.textContent=v; });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{ const k=el.getAttribute('data-i18n-ph'); const v=t(k); if(v) el.setAttribute('placeholder',v); });
}
