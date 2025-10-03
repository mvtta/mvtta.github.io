// fib3d.js - Continuous Fibonacci helix body with bounding
(function(){
  const sqrt5 = Math.sqrt(5); const phi=(1+sqrt5)/2; const goldenAngle=2*Math.PI*(1-1/phi);
  function radial(t){ const NsliderEl=document.getElementById('Nmax'); const NmaxVal=NsliderEl? parseInt(NsliderEl.value,10)||280:280; return Math.pow(phi, (10*t)/NmaxVal); }
  const el=id=>document.getElementById(id);
  function ensureUI(){ if(!el('fib3d')) return; }
  ensureUI();
  const playBtn = el('play'), stepBtn=el('step'), resetBtn=el('reset');
  if(!playBtn){ console.warn('fib3d UI not found'); return; }
  const Nslider=el('Nmax'), spd=el('spd'), rise=el('rise'), thick=el('thick');
  const status=el('status');
  let playing=false, tNow=0; let theta=0, thetaDot=goldenAngle; let body={x:[],y:[],z:[],maxLen:2000};
  const IDX={hull:0, spine:1, body:2, head:3, kin:4}; let kinCache=null;
  function wrapPi(a){ return Math.atan2(Math.sin(a), Math.cos(a)); }
  function colorFromA(A){ const x=Math.max(-1,Math.min(1,A)); const h=120*(x+1)/2; return `hsl(${h.toFixed(0)},90%,55%)`; }
  function thicknessFromE(E){ return 1 + 2*Math.min(1, Math.sqrt(E)); }
  function glowFromE(E){ return 8 + Math.min(10, 60*E); }
  function updateUniformity(){}
  function controlStep(dt){ thetaDot=goldenAngle; }
  function center(t, R0, p){ const R = R0 * radial(t); return { x: R*Math.cos(theta), y: R*Math.sin(theta), z: p*t }; }
  function buildHull(Tmax,R0,p,r0,alphaR,steps=420,ring=14){ const xs=[],ys=[],zs=[],I=[],J=[],K=[]; for(let i=0;i<=steps;i++){ const t = Tmax*(i/steps); const thFrozen=t*goldenAngle; const R=R0*radial(t); const P0={x:R*Math.cos(thFrozen), y:R*Math.sin(thFrozen), z:p*t}; const eps=1e-3; const R1=R0*radial(t+eps); const P1={x:R1*Math.cos(thFrozen+goldenAngle*eps), y:R1*Math.sin(thFrozen+goldenAngle*eps), z:p*(t+eps)}; let Tx=P1.x-P0.x, Ty=P1.y-P0.y, Tz=P1.z-P0.z; const Tn=Math.hypot(Tx,Ty,Tz); Tx/=Tn; Ty/=Tn; Tz/=Tn; let Ax=-Ty, Ay=Tx, Az=0; let An=Math.hypot(Ax,Ay,Az); if(An<1e-9){ Ax=0; Ay=-Tz; Az=Ty; An=Math.hypot(Ax,Ay,Az);} Ax/=An; Ay/=An; Az/=An; const Bx=Ty*Az-Tz*Ay, By=Tz*Ax-Tx*Az, Bz=Tx*Ay-Ty*Ax; const Bn=Math.hypot(Bx,By,Bz); const BxN=Bx/Bn, ByN=By/Bn, BzN=Bz/Bn; const rt=r0*Math.exp(-alphaR*t); for(let j=0;j<=ring;j++){ const th=2*Math.PI*j/ring; xs.push(P0.x + rt*(Math.cos(th)*Ax + Math.sin(th)*BxN)); ys.push(P0.y + rt*(Math.cos(th)*Ay + Math.sin(th)*ByN)); zs.push(P0.z + rt*(Math.cos(th)*Az + Math.sin(th)*BzN)); if(i>0 && j>0){ const a=i*(ring+1)+j, b=a-1, c=a-(ring+1), d_=c-1; I.push(a,a,d_); J.push(b,c,c); K.push(d_,b,d_); } } } return {x:xs,y:ys,z:zs,i:I,j:J,k:K}; }
  function kinPoints(Tmax,R0,p,density=450){ const xs=[],ys=[],zs=[]; const step=Math.max(1,Math.floor(Tmax/density)); for(let i=0;i<=Tmax;i+=step){ const th=i*goldenAngle + (Math.random()-0.5)*0.12; const R=R0*radial(i)*(1+(Math.random()-0.5)*0.08); xs.push(R*Math.cos(th)); ys.push(R*Math.sin(th)); zs.push(p*i + (Math.random()-0.5)*0.12); } return {x:xs,y:ys,z:zs}; }
  function initPlots(){ const Tmax=parseInt(Nslider.value,10); const pVal=parseFloat(rise.value); const R0=1.0; const hull=buildHull(Tmax,R0,pVal, parseFloat(thick.value), 0.30); const hullTrace={name:'shofar hull', type:'mesh3d', opacity:0.18, color:'#ff6f61', x:hull.x,y:hull.y,z:hull.z,i:hull.i,j:hull.j,k:hull.k}; const spineTrace={name:'spine', x:[],y:[],z:[], type:'scatter3d', mode:'lines', line:{width:2, color:'#90caf9'}}; const bodyTrace={name:'body', x:[],y:[],z:[], type:'scatter3d', mode:'lines', line:{width:6, color:'#f5e663'}}; const headTrace={name:'head', x:[],y:[],z:[], type:'scatter3d', mode:'markers', marker:{size:8, color:'#ff4081', symbol:'circle'}}; kinCache=kinPoints(Tmax,R0,pVal); const kinTrace={name:'kin', x:kinCache.x,y:kinCache.y,z:kinCache.z, type:'scatter3d', mode:'markers', marker:{size:3, color:'#80deea', opacity:0.8}}; Plotly.newPlot('scene3d',[hullTrace, spineTrace, bodyTrace, headTrace, kinTrace], {height:560, paper_bgcolor:'#0b0f12', plot_bgcolor:'#0b0f12', scene:{xaxis:{title:'x',color:'#cfe'}, yaxis:{title:'y',color:'#cfe'}, zaxis:{title:'z',color:'#cfe'}, camera:{eye:{x:1.45,y:1.35,z:1.15}}}, margin:{t:10,l:0,r:0,b:0}}, {displaylogo:false}); }
  function drawPoint(p){ const gd=el('scene3d'); const sx=gd.data[IDX.spine].x.concat([p.x]); const sy=gd.data[IDX.spine].y.concat([p.y]); const sz=gd.data[IDX.spine].z.concat([p.z]); Plotly.restyle('scene3d',{x:[sx], y:[sy], z:[sz]}, [IDX.spine]); body.x.push(p.x); body.y.push(p.y); body.z.push(p.z); if(body.x.length>body.maxLen){ body.x.shift(); body.y.shift(); body.z.shift(); } Plotly.restyle('scene3d',{x:[body.x], y:[body.y], z:[body.z]}, [IDX.body]); Plotly.restyle('scene3d',{x:[[p.x]], y:[[p.y]], z:[[p.z]]}, [IDX.head]); }
  function stepOnce(frameDt=0.025){ controlStep(frameDt); theta += thetaDot*frameDt; tNow += frameDt; const Rmax=60; if(radial(tNow)>Rmax){ tNow=0; theta=0; body={x:[],y:[],z:[],maxLen:body.maxLen}; initPlots(); } const p=center(tNow,1.0, parseFloat(rise.value)); drawPoint(p); status.textContent = `t=${tNow.toFixed(2)}`; }
  let animHandle=null; function loop(){ if(!playing) return; const frames=Math.max(3, Math.floor(spd.value/2)); for(let k=0;k<frames;k++) stepOnce(0.02); animHandle=requestAnimationFrame(loop); }
  playBtn.onclick=()=>{ playing=!playing; playBtn.textContent=playing?'⏸':'▶'; if(playing) loop(); else if(animHandle) cancelAnimationFrame(animHandle); };
  stepBtn.onclick=()=>{ if(!playing) stepOnce(); };
  resetBtn.onclick=reset; Nslider.oninput=rise.oninput=thick.oninput=()=> reset();
  function reset(){ if(animHandle) cancelAnimationFrame(animHandle); playing=false; playBtn.textContent='▶'; tNow=0; theta=0; thetaDot=goldenAngle; body={x:[],y:[],z:[],maxLen:2000}; initPlots(); status.textContent='Reset.'; const p0=center(0,1.0, parseFloat(rise.value)); const p1=center(0.02,1.0, parseFloat(rise.value)); drawPoint(p0); drawPoint(p1); }
  reset();
})();
