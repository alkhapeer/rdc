const LS_KEYS={CARDS:'CS_CARDS',MARKET:'CS_MARKET',SECRETS:'CS_SECRETS',ADMIN_OK:'CS_ADMIN_OK',TERMS:'CS_TERMS_ACCEPTED_V',TERMS_TS:'CS_TERMS_TS',LANG:'CS_LANG',META:'CS_META',RENEW:'CS_RENEW'};
const Utils={
  randId(n=8){const s='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let o='';for(let i=0;i<n;i++)o+=s[Math.floor(Math.random()*s.length)];return o;},
  fmtDate(d){try{return new Date(d).toISOString().split('T')[0];}catch{return d||'';}},
  maskCode(code){if(!code)return'';const s=String(code);if(s.length<=4)return s;const head=s.slice(0,4);const tail=s.slice(-2);return `${head}-${'•'.repeat(Math.max(2,s.length-6))}${tail}`;},
  normalizeStatus(v){const s=String(v||'').toLowerCase();if(['active','مفعلة','مفعّلة','valid','activated'].includes(s))return'active';if(['pending','temp','تحت التفعيل','غير مفعلة','غير مفعّلة','inactive'].includes(s))return'pending';if(['expired','منتهية','غير صالحة'].includes(s))return'expired';return'pending';}
};