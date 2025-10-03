(function(){
  const root = document.getElementById('osc-container');
  if(!root){ console.warn('osc-container not found'); return; }
  const controlsDiv = document.getElementById('osc-controls');
  const optionsDiv = document.getElementById('osc-options');
  const autoDiv = document.getElementById('osc-auto');
  const statusDiv = document.getElementById('osc-status');
  const plotsDiv = document.getElementById('osc-plots');

  // PARAMETERS (extended to match original Python features)
  const paramDefs = [
    {key:'gamma',   label:'γ (damp)',  type:'range', min:0,   max:1,   step:0.01,  value:0.10},
    {key:'omega0',  label:'ω₀',        type:'range', min:0.2, max:3,   step:0.01,  value:1.00},
    {key:'tau_d',   label:'τ_d',       type:'range', min:0.01,max:0.5, step:0.01,  value:0.08},
    {key:'period',  label:'⟨w⟩ base',  type:'range', min:0.1, max:5,   step:0.05,  value:1.0},
    {key:'jitter',  label:'jitter',    type:'range', min:0,   max:1,   step:0.01,  value:0.02},
    {key:'ampMean', label:'⟨A⟩',       type:'range', min:0,   max:3,   step:0.1,   value:1.0},
    {key:'arms',    label:'Arms',      type:'range', min:0.1, max:3,   step:0.1,   value:1.0},
    {key:'lam',     label:'λ asym',    type:'range', min:0.05,max:0.95,step:0.05,  value:0.5},
    {key:'dt',      label:'dt',        type:'range', min:0.001,max:0.05,step:0.001,value:0.01},
    {key:'winSec',  label:'history s', type:'range', min:2,   max:30,  step:1,     value:10},
    {key:'fcast',   label:'future s',  type:'range', min:0.5, max:10,  step:0.5,   value:3}
  ];
  let params = {};
  // Uniform slider color (single scheme)
  const sliderColor = '#14c95a';
  function applyFill(rng){
    // Uniform solid track color (no gradient)
    const solid = '#486837';
    rng.style.background = solid;
    rng.style.setProperty('--fill-color', solid);
  }

  paramDefs.forEach(p => {
    params[p.key] = p.value;
    const box = document.createElement('div'); box.className='ctrl range-ctrl';
    const lab = document.createElement('label'); lab.textContent=p.label; lab.title=p.label;
    const rng = document.createElement('input'); rng.type=p.type; rng.min=p.min; rng.max=p.max; rng.step=p.step; rng.value=p.value; rng.title=p.label; rng.classList.add('filled');
    const valSpan=document.createElement('span'); valSpan.className='mini'; valSpan.textContent=p.value; valSpan.title=p.label;
  const update=()=>{ params[p.key]=parseFloat(rng.value); valSpan.textContent=rng.value; applyFill(rng); if(p.key==='winSec') adjustWindowLength(); if(p.key==='fcast') computeForecast(); };
    rng.addEventListener('input',update);
    // initial fill
  applyFill(rng);
    box.append(lab,rng,valSpan); controlsDiv.appendChild(box);
  });

  // Extra selects & toggles
  // Pulse shape select
  const shapeBox=document.createElement('div'); shapeBox.className='ctrl';
  const shapeLab=document.createElement('label'); shapeLab.textContent='pulse shape'; shapeLab.style.color='#ffffff';
  const shapeSel=document.createElement('select');
  const shapePlaceholder=document.createElement('option'); shapePlaceholder.disabled=true; shapePlaceholder.selected=true; shapePlaceholder.textContent='choose'; shapePlaceholder.value='Lorentzian'; shapeSel.appendChild(shapePlaceholder);
  ['Lorentzian','Exponential'].forEach(o=>{ const opt=document.createElement('option'); opt.value=o; opt.textContent=o; shapeSel.appendChild(opt); });
  shapeSel.value='Lorentzian'; shapeSel.addEventListener('change',()=>{});
  shapeBox.append(shapeLab, shapeSel);
  optionsDiv.appendChild(shapeBox);

  // Amplitude distribution select
  const ampBox=document.createElement('div'); ampBox.className='ctrl';
  const ampLab=document.createElement('label'); ampLab.textContent='amplitude law'; ampLab.style.color='#ffffff';
  const ampSel=document.createElement('select');
  const ampPlaceholder=document.createElement('option'); ampPlaceholder.disabled=true; ampPlaceholder.selected=true; ampPlaceholder.textContent='choose'; ampPlaceholder.value='Exponential(+)'; ampSel.appendChild(ampPlaceholder);
  ['Exponential(+)','Laplace(0-mean)','Laplace(asym λ)'].forEach(o=>{const opt=document.createElement('option'); opt.value=o; opt.textContent=o; ampSel.appendChild(opt);});
  ampSel.value='Exponential(+)' ;
  ampBox.append(ampLab, ampSel);
  optionsDiv.appendChild(ampBox);

  // Auto toggle
  const autoBox=document.createElement('div'); autoBox.className='ctrl';
  const autoLab=document.createElement('label'); autoLab.textContent='auto pulses'; autoLab.style.color='#ffffff';
  const autoChk=document.createElement('input'); autoChk.type='checkbox'; autoChk.checked=false; autoBox.append(autoLab, autoChk); autoDiv.appendChild(autoBox);

  // Forecast toggle
  const forecastBox=document.createElement('div'); forecastBox.className='ctrl';
  const forecastLab=document.createElement('label'); forecastLab.textContent='forecast';
  const forecastChk=document.createElement('input'); forecastChk.type='checkbox'; forecastChk.checked=true; forecastBox.append(forecastLab, forecastChk); autoDiv.appendChild(forecastBox);

  function randExp(mean){ return -mean*Math.log(1-Math.random()); }
  function randNormal(){ let u=0,v=0; while(u===0)u=Math.random(); while(v===0)v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }

  function drawAmplitude(){
    const dist = ampSel.value;
    if(dist==='Exponential(+)') return randExp(params.ampMean);
    if(dist==='Laplace(0-mean)'){
      const b = params.arms/Math.sqrt(2);
      // Laplace: difference of two exponentials
      return (Math.random()<0.5?1:-1)*randExp(b);
    }
    if(dist==='Laplace(asym λ)'){
      const b = params.arms/Math.sqrt(2); const lam = params.lam; const u=Math.random();
      if(u < 1-lam) return -b*Math.log(u/(1-lam));
      return  b*Math.log((u-(1-lam))/lam);
    }
    return params.ampMean;
  }

  // PULSE EVENTS
  const pulseEvents=[]; // {t, A}
  function triggerPulse(time){ pulseEvents.push({t:time, A: drawAmplitude()}); }
  function phiLorentz(theta){ return 1/Math.PI * 1/(1+theta*theta); }
  function phiExp(theta){ return 0.5*Math.exp(-Math.abs(theta)); }
  function pulseShape(theta){ return (shapeSel.value==='Lorentzian')? phiLorentz(theta): phiExp(theta); }
  function computePulseForce(time){
    let Ft=0; const cutoff=6*params.tau_d;
    for(let i=pulseEvents.length-1;i>=0;--i){ const ev=pulseEvents[i]; const age=time-ev.t; if(age>cutoff) break; Ft += ev.A * pulseShape(age/params.tau_d); }
    return Ft;
  }

  // STATE
  let t=0, x=0, v=0, lastFireTime=-1e9, playing=false, handle=null;
  // Fixed spatial/time window representation (static x-coordinates)
  let xCoord=[]; // relative times history ( -winSec .. 0 )
  let posBuf=[], velBuf=[], dampBuf=[], restBuf=[], pulseBuf=[], tBuf=[]; // circular-ish via shift
  // forecast arrays (future >0)
  let fPos=[], fTimes=[];
  let yMax=1.5; // dynamic enlarge but never shrink quickly

  function adjustWindowLength(){
    rebuildBuffers();
  }

  // FIXED WINDOW append
  function pushSample(time, pos, vel, dampTerm, restTerm, Ft){
    // Shift-left strategy keeps axis static and wave moves left.
    if(posBuf.length === 0) return; // buffers not yet ready
    // Remove first sample
    posBuf.shift(); velBuf.shift(); dampBuf.shift(); restBuf.shift(); pulseBuf.shift(); tBuf.shift();
    // Append new sample at end (present at right edge)
    posBuf.push(pos); velBuf.push(vel); dampBuf.push(dampTerm); restBuf.push(restTerm); pulseBuf.push(Ft); tBuf.push(time);
  }

  function rebuildBuffers(){
    const N = Math.max(10, Math.floor(params.winSec / params.dt));
    // Relative times from -history .. 0 (present at 0)
    xCoord = Array.from({length:N}, (_,i)=> (i-(N-1))*params.dt );
    posBuf = new Array(N).fill(0);
    velBuf = new Array(N).fill(0);
    dampBuf= new Array(N).fill(0);
    restBuf= new Array(N).fill(0);
    pulseBuf=new Array(N).fill(0);
    tBuf   = new Array(N).fill(0);
    // Recreate baseline sinusoid occupying history
    const w = params.omega0;
    for(let i=0;i<N;i++){
      const relTime = xCoord[i]; // negative to 0
      const px = Math.sin(w*relTime);
      const vv = w*Math.cos(w*relTime);
      posBuf[i]=px; velBuf[i]=vv; restBuf[i]=-(w*w)*px; dampBuf[i]=0; pulseBuf[i]=0; tBuf[i]=relTime;
    }
    yMax=1.5;
    computeForecast();
  }

  // BUFFERS & baseline wave
  rebuildBuffers();
  t = 0; x = posBuf[posBuf.length-1]; v = velBuf[velBuf.length-1];

  // PHYSICS STEP
  function step(){
    const dt_=params.dt; // auto pulse
    if(autoChk.checked){
      const due=lastFireTime+params.period;
      if(t>=due){ const jitter=params.jitter*randNormal(); if(t>=due+jitter){ triggerPulse(t); lastFireTime=t; }}
    }
    const Ft = computePulseForce(t);
    const a = -params.gamma*v - (params.omega0*params.omega0)*x + Ft;
    v += a*dt_;
    x += v*dt_;
    t += dt_;
    const dampTerm = -params.gamma*v; // instantaneous damping contribution
    const restTerm = - (params.omega0*params.omega0)*x; // restoring force component
    pushSample(t, x, v, dampTerm, restTerm, Ft);
    // Expand y-range if needed
    const localMax = Math.max(Math.abs(x),Math.abs(v),Math.abs(dampTerm),Math.abs(restTerm),Math.abs(Ft));
    if(localMax > 0.9*yMax) yMax = localMax*1.2;
  if(forecastChk.checked) computeForecast();
  }

  function ensurePlotly(cb){ if(window.Plotly) return cb(); const s=document.createElement('script'); s.src='https://cdn.plot.ly/plotly-2.27.0.min.js'; s.onload=cb; document.head.appendChild(s); }

  function initPlot(){
  const relTimes = xCoord; // history times ≤ 0
    const traces=[
      {x:relTimes, y:posBuf.slice(),  mode:'lines', name:'position x',       line:{color:'#1f77b4', width:2}},
      {x:relTimes, y:velBuf.slice(),  mode:'lines', name:'velocity v',       line:{color:'#e7ff0ea6', width:1}},
      {x:relTimes, y:dampBuf.slice(), mode:'lines', name:'damping -γv',      line:{color:'#fffb00ff', width:1,shape:'spline'}},
      {x:relTimes, y:restBuf.slice(), mode:'lines', name:'resonance -ω₀²x',  line:{color:'#d62728', width:1, dash: 'jot'}},
      {x:relTimes, y:pulseBuf.slice(),mode:'lines', name:'pulse F',          line:{color:'#f19cfce4', width:1, dash:'jot'}},
      {x:[0], y:[x], mode:'lines', name:'forecast x', line:{color:'#0062ff9e', width:1, dash:'dash'}}
    ];
    window.Plotly.newPlot(plotsDiv, traces, {
      height:480,
      paper_bgcolor:'#000', plot_bgcolor:'#000',
      legend:{orientation:'h', y:1.15, font:{size:10, color:'#ddd'}},
      xaxis:{title:'time (s)', range:[-params.winSec, params.fcast], zeroline:false, color:'#ccc'},
      yaxis:{title:'signals', range:[-yMax,yMax], zeroline:false, color:'#ccc'},
      margin:{t:20,l:50,r:10,b:45},
      modebar:{bgcolor:'#111'}
    }, {displaylogo:false});
    addFadeOverlay();
  }

  function redraw(){
  const relTimes = xCoord;
  const updateObj = { x:[relTimes,relTimes,relTimes,relTimes,relTimes], y:[posBuf,velBuf,dampBuf,restBuf,pulseBuf] };
  if(forecastChk.checked){
    updateObj.x.push(fTimes);
    updateObj.y.push(fPos);
  } else {
    updateObj.x.push([0]);
    updateObj.y.push([posBuf[posBuf.length-1]]);
  }
  window.Plotly.update(plotsDiv, updateObj, { xaxis:{range:[-params.winSec, params.fcast]}, yaxis:{range:[-yMax,yMax]} });
    statusDiv.textContent=`t=${t.toFixed(2)} pulses=${pulseEvents.length} x=${x.toFixed(3)} v=${v.toFixed(3)}`;
  }

  function loop(){ if(!playing) return; for(let k=0;k<4;k++) step(); redraw(); handle=requestAnimationFrame(loop); }
  function play(){ if(!playing){ playing=true; playBtn.textContent='⏸ Pause'; loop(); }}
  function pause(){ playing=false; playBtn.textContent='▶ play'; if(handle) cancelAnimationFrame(handle); }

  const playBtn=document.getElementById('osc-play');
  const trigBtn=document.getElementById('osc-trigger');
  const resetBtn=document.getElementById('osc-reset');
  playBtn.addEventListener('click',()=> playing?pause():play());
  trigBtn.addEventListener('click',()=>{ 
    triggerPulse(t);
    if(!playing){ const steps = Math.max(5, Math.floor(3*params.tau_d/params.dt)); for(let k=0;k<steps;k++) step(); }
    redraw();
  });
  resetBtn.addEventListener('click',()=>{ pause();
    t=0; x=0; v=0; lastFireTime=-1e9; pulseEvents.length=0; rebuildBuffers(); x=posBuf[posBuf.length-1]; v=velBuf[velBuf.length-1]; redraw(); });

  forecastChk.addEventListener('change', ()=>{ if(forecastChk.checked) computeForecast(); redraw(); });

  function expectedAmplitudeMean(){
    const dist = ampSel.value;
    if(dist==='Exponential(+)') return params.ampMean;
    if(dist==='Laplace(0-mean)') return 0; // zero mean
    if(dist==='Laplace(asym λ)') return 0; // treat as zero for simplicity (could refine)
    return params.ampMean;
  }

  function computeForecast(){
    fPos.length=0; fTimes.length=0;
    const horizon = params.fcast;
    if(horizon<=0) return;
    let fx = x; let fv = v; // copy state
    const dtf = params.dt;
    // Precompute predicted future pulse times (deterministic mean schedule)
    const predPulseTimes=[];
    if(autoChk.checked){
      let nextT = lastFireTime + params.period;
      while(nextT <= t + horizon){ predPulseTimes.push(nextT); nextT += params.period; }
    }
    const meanA = expectedAmplitudeMean();
    for(let tau=dtf; tau<=horizon+1e-9; tau+=dtf){
      const absTime = t + tau;
      // Force from existing past pulses (reuse computePulseForce) + expected future pulses contributions
      let Ft = computePulseForce(absTime);
      // expected pulses (mean amplitude) contributions
      for(const tp of predPulseTimes){
        if(absTime>=tp){
          const age = absTime - tp;
          if(age <= 6*params.tau_d){ Ft += meanA * pulseShape(age/params.tau_d); }
        }
      }
      const fa = -params.gamma*fv - (params.omega0*params.omega0)*fx + Ft;
      fv += fa*dtf; fx += fv*dtf;
      fTimes.push(tau); fPos.push(fx);
    }
  }

  ensurePlotly(()=>{ initPlot(); redraw(); });

  // Add gradient fade overlay (trail effect: old samples on left dimmer)
  function addFadeOverlay(){
    const wrap = document.getElementById('osc-plots');
    if(!wrap) return;
    if(wrap.querySelector('.trail-fade')) return;
    const fade = document.createElement('div');
    fade.className='trail-fade';
    fade.style.position='absolute';
    fade.style.inset='0';
    fade.style.pointerEvents='none';
    fade.style.background='linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0) 45%, rgba(0,0,0,0) 70%, rgba(0,0,0,0))';
    wrap.style.position='relative';
    wrap.appendChild(fade);
  }
})();
