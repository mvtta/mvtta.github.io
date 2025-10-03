// kspace.js - Minkowski K-space Fibonacci navigator visualization
(function(){
  // --- math constants and helpers ---
  const sqrt5 = Math.sqrt(5);
  const phi = (1+sqrt5)/2;
  const phiPrime = (1 - sqrt5)/2; // conjugate
  const goldenAngle = 2*Math.PI*(1-1/phi);
  function wrapPi(a){ return Math.atan2(Math.sin(a), Math.cos(a)); }
  // Lattice a + b phi -> (sigma1, sigma2)
  function OK_lattice(B){
    const x=[], y=[];
    for(let a=-B; a<=B; a++){
      for(let b=-B; b<=B; b++){
        x.push(a + b*phi);
        y.push(a + b*phiPrime);
      }
    }
    return {x,y};
  }
  // Visual helpers (mirrored from other sims for coherence)
  function colorFromA(A){ const x=Math.max(-1,Math.min(1,A)); const h=120*(x+1)/2; return `hsl(${h.toFixed(0)},90%,55%)`; }
  function thicknessFromE(E){ return 1 + 2*Math.min(1, Math.sqrt(E)); }
  function glowFromE(E){ return 8 + Math.min(10, 60*E); }

  // --- DOM ---
  const el = id => document.getElementById(id);
  const Bslider = el('kB'), layersSlider = el('kLayers'), status = el('kStatus');
  const playBtn = el('kPlay'), stepBtn = el('kStep'), resetBtn = el('kReset');
  if(!Bslider){ console.warn('kspace UI not found'); return; }

  // --- state ---
  let B = parseInt(Bslider.value,10);
  const IDX = { lattice:0 };
  let playing=false, frame=0;

  // controller step (simple phase lock toward golden angle)
  // navigation & controller removed

  function lift_to_shofar(xs, ys, r0=0.12, alpha=0.25){
    const X=[], Y=[], Z=[];
    for(let i=0;i<xs.length;i++){
      const x = xs[i], y = ys[i];
      const s = Math.sign(x*y) || 1;
      const u_hat = 0.5*Math.log(Math.max(1e-12, Math.abs(x/y)));
      const xr = Math.exp(u_hat), yr = s*Math.exp(-u_hat);
      const r = r0*Math.exp(-alpha*u_hat);
      const theta = Math.random()*2*Math.PI;
      X.push(xr); Y.push(yr); Z.push(r*Math.sin(theta));
    }
    return {x:X, y:Y, z:Z};
  }

  function buildLattice(B){
    const base = OK_lattice(B);
    return lift_to_shofar(base.x, base.y, 0.14, 0.22);
  }

  // navigator embedding removed

  // plots
  function initPlots(){
    const L = buildLattice(B);
  const lattice = { name:'O_K lattice', x:L.x, y:L.y, z:L.z, mode:'markers', type:'scatter3d', marker:{size:2, color:'#4db6ac', opacity:0.55} };
  const layout = { height:520, paper_bgcolor:'#0b0f12', plot_bgcolor:'#0b0f12', scene:{ xaxis:{title:'σ1', color:'#cfe'}, yaxis:{title:'σ2', color:'#cfe'}, zaxis:{title:'σ⊥', color:'#cfe'}, camera:{eye:{x:1.35,y:1.25,z:0.95}} }, margin:{t:10,l:0,r:0,b:0} };
  Plotly.newPlot('kLattice3d', [lattice], layout, {displaylogo:false});
  }

  function refreshLattice(){ const L=buildLattice(B); Plotly.restyle('kLattice3d',{x:[L.x],y:[L.y],z:[L.z]},[IDX.lattice]); }

  function stepOnce(){
    frame++;
    // gentle camera rotation for motion illusion
    const ang = 0.004*frame;
    Plotly.relayout('kLattice3d',{
      'scene.camera.eye':{x:1.35*Math.cos(ang)-1.25*Math.sin(ang), y:1.25*Math.cos(ang)+1.35*Math.sin(ang), z:0.95}
    });
  }

  function loop(){ if(!playing) return; stepOnce(); requestAnimationFrame(loop); }

  function resetView(){ frame=0; Plotly.relayout('kLattice3d',{'scene.camera.eye':{x:1.35,y:1.25,z:0.95}}); }

  // removed dynamic body path

  // body drawing removed

  // interpolation removed

  // kin sensing removed

  // step logic removed

  let stepping=false;
  function animateSingleStep(){
    if(playing || stepping) return; if(n > Nmax) return;
    const frames = Math.max(4, Math.floor(spd.value/2));
    const seg = interpUnitSegment(n, frames); let k=0; stepping=true;
    function frame(){
      if(playing){ stepping=false; return; }
      const pt=seg[k]; bodyAppend(pt); drawBody();
      if(k===frames){ stepOnce(); stepping=false; return; }
      k++; requestAnimationFrame(frame);
    }
    frame();
  }

  function loop(){
    if(!playing) return;
    const dt = 0.016*(parseFloat(spd.value)/10);
    kControlStep(dt);
    kTheta += kThetaDot*dt; kTime += dt;
    const frames = Math.max(3, Math.floor(spd.value/2));
    const speedScale = kThetaDot/goldenAngle;
    const seg = interpUnitSegment(n, frames);
    bodyAppend(seg[Math.min(seg.length-1, Math.round(frames*speedScale))]);
    drawBody();
    if(speedScale>=1) stepOnce();
    requestAnimationFrame(loop);
  }

  // reset removed (static)

  // wire
  Bslider.oninput=()=>{ B=parseInt(Bslider.value,10); refreshLattice(); };
  layersSlider.oninput=()=> refreshLattice();
  if(playBtn){
    playBtn.onclick=()=>{ playing=!playing; playBtn.textContent=playing?'⏸':'▶'; if(playing) loop(); };
  }
  if(stepBtn){
    stepBtn.onclick=()=>{ if(!playing) stepOnce(); };
  }
  if(resetBtn){
    resetBtn.onclick=()=>{ playing=false; if(playBtn) playBtn.textContent='▶'; resetView(); };
  }
  initPlots();
})();
