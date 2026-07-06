export function createUiPrimitives(ctx) {
function fantasyPanel(x, y, w, h, accent = '#b8893f') {
  ctx.save();
  ctx.shadowColor = '#000'; ctx.shadowBlur = 34;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(38,22,31,.98)'); g.addColorStop(.5, 'rgba(18,13,19,.98)'); g.addColorStop(1, 'rgba(7,7,10,.99)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#2d191e'; ctx.lineWidth = 12; ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(x+7, y+7, w-14, h-14);
  ctx.strokeStyle = 'rgba(243,211,139,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x+13, y+13, w-26, h-26);
  [[x+9,y+9],[x+w-9,y+9],[x+9,y+h-9],[x+w-9,y+h-9]].forEach(([cx,cy]) => {
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.PI/4); ctx.fillStyle='#171016'; ctx.strokeStyle=accent;
    ctx.fillRect(-10,-10,20,20); ctx.strokeRect(-10,-10,20,20); ctx.restore();
  });
  ctx.restore();
}

function fantasyButton(x, y, w, h, active, label = '') {
  ctx.save(); const g = ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0, active ? '#63313a' : '#34272d'); g.addColorStop(1, active ? '#291018' : '#151217');
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h); ctx.strokeStyle=active?'#d2a75a':'#725d43'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
  ctx.strokeStyle='rgba(255,225,158,.22)'; ctx.lineWidth=1; ctx.strokeRect(x+6,y+6,w-12,h-12);
  if(label){ctx.fillStyle=active?'#f4dfae':'#c1b7a0';ctx.font='600 20px "Segoe UI", Arial, sans-serif';ctx.textAlign='center';ctx.fillText(label,x+w/2,y+h/2+7)}
  ctx.restore();
}

function gothicFrame(x, y, w, h) {
  ctx.save();
  const stone = ctx.createLinearGradient(x,y,x+24,y);
  stone.addColorStop(0,'#07131a'); stone.addColorStop(.45,'#19303a'); stone.addColorStop(.7,'#0b2028'); stone.addColorStop(1,'#02080c');
  ctx.shadowColor='#000';ctx.shadowBlur=24;ctx.fillStyle=stone;
  ctx.fillRect(x,y,30,h);ctx.fillRect(x+w-30,y,30,h);ctx.fillRect(x,y,w,28);ctx.fillRect(x,y+h-34,w,34);
  ctx.shadowBlur=0;ctx.strokeStyle='#3a2a1d';ctx.lineWidth=4;ctx.strokeRect(x+7,y+7,w-14,h-14);
  ctx.strokeStyle='#8b5c2b';ctx.lineWidth=2;ctx.strokeRect(x+16,y+16,w-32,h-32);
  // Masonry blocks, bronze studs and broken inner teeth.
  ctx.strokeStyle='rgba(83,113,118,.42)';ctx.lineWidth=1;
  for(let yy=y+34,n=0;yy<y+h-45;yy+=54,n++){
    const inset=n%2?4:0;ctx.strokeRect(x+3+inset,yy,24-inset,45);ctx.strokeRect(x+w-27,yy,24-inset,45);
    ctx.fillStyle=n%3===0?'#a45225':'#6b482b';ctx.beginPath();ctx.arc(x+17,yy+12,2.5,0,Math.PI*2);ctx.arc(x+w-17,yy+12,2.5,0,Math.PI*2);ctx.fill();
  }
  for(let xx=x+42;xx<x+w-42;xx+=70){ctx.strokeRect(xx,y+3,60,21);ctx.strokeRect(xx,y+h-30,60,25)}
  // Gothic corner buttresses.
  [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([cx,cy,sx,sy])=>{
    ctx.save();ctx.translate(cx,cy);ctx.scale(sx,sy);ctx.fillStyle='#112833';ctx.strokeStyle='#9a6530';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(52,0);ctx.lineTo(30,17);ctx.lineTo(17,52);ctx.lineTo(0,52);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#050b0e';ctx.beginPath();ctx.arc(17,17,8,0,Math.PI*2);ctx.fill();ctx.restore();
  });
  // Hanging chains and tiny ember lamps.
  for(const cx of [x+78,x+w-78]){ctx.strokeStyle='#54432c';ctx.lineWidth=2;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(cx,y+24);ctx.quadraticCurveTo(cx+(cx<x+w/2?18:-18),y+75,cx,y+122);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#f08a32';ctx.shadowColor='#ff5c18';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(cx,y+125,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
  ctx.restore();
}

  return { fantasyPanel, fantasyButton, gothicFrame };
}
