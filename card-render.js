
export async function renderCardPNG({ id, name, phone, country, photoFile }){
  const W=1080, H=660;
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#00111a'); g.addColorStop(.5,'#032a3b'); g.addColorStop(1,'#0ea5e9');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,.08)';
  ctx.beginPath(); ctx.ellipse(W*0.6,H*0.1,W*0.8,H*0.25,Math.PI/8,0,Math.PI*2); ctx.fill();
  rounded(ctx, 64, 80, 150, 110, 20, 'rgba(255,215,0,.9)');
  ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(64+40,135); ctx.lineTo(64+110,135); ctx.stroke();
  ctx.fillStyle='#9ee7ff'; ctx.font='bold 44px system-ui,Segoe UI,Roboto'; ctx.fillText('RDC', 880, 120);
  rounded(ctx, 860, 140, 180, 58, 18, 'rgba(5,45,58,.85)');
  ctx.fillStyle='#bff0ff'; ctx.font='bold 30px system-ui,Segoe UI,Roboto'; ctx.fillText('ACTIVE', 905, 180);
  const masked = maskId(id);
  ctx.fillStyle='#e6f6ff'; ctx.font='bold 64px system-ui,Segoe UI,Roboto'; ctx.fillText(masked, 64, 330);
  ctx.fillStyle='#ccefff'; ctx.font='bold 38px system-ui,Segoe UI,Roboto'; ctx.fillText(name||'', 64, 400);
  ctx.font='28px system-ui,Segoe UI,Roboto'; ctx.fillText(country||'', 64, 442);
  if(phone){ ctx.font='26px system-ui,Segoe UI,Roboto'; ctx.fillText(String(phone), 64, 480); }
  if(photoFile){
    try{
      const img = await loadImageFile(photoFile);
      const R=110, cx=W-160, cy=H-160;
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();
      ctx.drawImage(img, cx-R, cy-R, 2*R, 2*R); ctx.restore();
      ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(cx,cy,R+6,0,Math.PI*2); ctx.stroke();
    }catch(e){ console.warn('photo load failed',e); }
  }
  return { url: canvas.toDataURL('image/png'), canvas };
}
function rounded(ctx,x,y,w,h,r,fill){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill){ctx.fillStyle=fill;ctx.fill();} }
function maskId(id){ const s=String(id||''); const m=s.match(/^([A-Z]+)(.{4}).*(-)(.*)$/); if(m){ return `${m[1]}${m[2]}••••-${'•'.repeat(Math.max(3, Math.min(6, m[4].length)))}`; } return s.replace(/(.{4}).+(-).+/, (_,a,b)=>`${a}••••${b}•••`); }
function loadImageFile(file){ return new Promise((resolve,reject)=>{ const fr=new FileReader(); fr.onload=()=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=fr.result; }; fr.onerror=reject; fr.readAsDataURL(file); }); }
