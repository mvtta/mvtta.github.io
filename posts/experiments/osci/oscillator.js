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
  const sliderElems = {}; // map key -> {input, display}
  // Uniform slider color (single scheme)
  const sliderColor = '#14c95a';
  function applyFill(rng){
    // No filled background: keep transparent so only the thin track + thumb show
    rng.style.background='transparent';
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
  sliderElems[p.key] = {input:rng, display:valSpan};
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

  // --- Mode scheduler UI ---
  const modeBox=document.createElement('div'); modeBox.className='ctrl';
  const modeLab=document.createElement('label'); modeLab.textContent='mode';
  const modeSel=document.createElement('select');
  ['Free','Habituation','Sensitization','Anticipation','Association','Delayed'].forEach(o=>{ const opt=document.createElement('option'); opt.value=o; opt.textContent=o; modeSel.appendChild(opt); });
  modeSel.value='Free';
  modeBox.append(modeLab, modeSel); optionsDiv.appendChild(modeBox);
  modeSel.addEventListener('change', ()=>{ modeClock=0; });

  // Spectrum controls
  let specEveryInp, specWinInp; // forward refs
  const specEveryBox=document.createElement('div'); specEveryBox.className='ctrl';
  const specEveryLab=document.createElement('label'); specEveryLab.textContent='spec every N';
  specEveryInp=document.createElement('input'); specEveryInp.type='number'; specEveryInp.value=12; specEveryInp.min=1; specEveryInp.max=200; specEveryInp.step=1; specEveryBox.append(specEveryLab, specEveryInp); optionsDiv.appendChild(specEveryBox);
  const specWinBox=document.createElement('div'); specWinBox.className='ctrl';
  const specWinLab=document.createElement('label'); specWinLab.textContent='spec window s';
  specWinInp=document.createElement('input'); specWinInp.type='number'; specWinInp.value=8; specWinInp.min=1; specWinInp.max=30; specWinInp.step=1; specWinBox.append(specWinLab, specWinInp); optionsDiv.appendChild(specWinBox);

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

  // ================== Spectrum / DSP utilities ==================
  let spectrumDiv = document.getElementById('osc-spectrum');
  let specFbuf=[], specXbuf=[]; let specStep=0;
  function hann(N){ const w=new Float64Array(N); for(let n=0;n<N;n++) w[n]=0.5*(1-Math.cos(2*Math.PI*n/(N-1))); return w; }
  function fftRadix2(re, im){ const N=re.length; let j=0; for(let i=0;i<N;i++){ if(i<j){ const tr=re[i]; re[i]=re[j]; re[j]=tr; const ti=im[i]; im[i]=im[j]; im[j]=ti; } let m=N>>1; while(m>=1 && j>=m){ j-=m; m>>=1; } j+=m; } for(let len=2; len<=N; len<<=1){ const ang=-2*Math.PI/len; const wlen_re=Math.cos(ang), wlen_im=Math.sin(ang); for(let i=0;i<N;i+=len){ let w_re=1, w_im=0; for(let k=0;k<(len>>1);k++){ const u_re=re[i+k], u_im=im[i+k]; const j2=i+k+(len>>1); const v_re=re[j2]*w_re - im[j2]*w_im; const v_im=re[j2]*w_im + im[j2]*w_re; re[i+k]=u_re+v_re; im[i+k]=u_im+v_im; re[j2]=u_re-v_re; im[j2]=u_im-v_im; const nw_re=w_re*wlen_re - w_im*wlen_im; const nw_im=w_re*wlen_im + w_im*wlen_re; w_re=nw_re; w_im=nw_im; } } } }
  function realPSD(samples, dt){ if(samples.length<8) return {f:[],S:[]}; let N=samples.length; const Npow=1<<Math.floor(Math.log2(N)); N=Math.max(256,Npow); const x=new Float64Array(N); const w=hann(N); const mean=samples.reduce((a,b)=>a+b,0)/samples.length; for(let n=0;n<N;n++){ const v=(n<samples.length? samples[n]-mean:0); x[n]=v*w[n]; } const re=x.slice(); const im=new Float64Array(N); fftRadix2(re,im); const scale=1.0/(N/dt); const half=(N>>1)+1; const f=new Float64Array(half); const S=new Float64Array(half); for(let k=0;k<half;k++){ const mag2=re[k]*re[k]+im[k]*im[k]; f[k]=k/(N*dt); S[k]=mag2*scale; } return {f:Array.from(f), S:Array.from(S)}; }
  function acf(samples, maxLag){ const N=samples.length; if(!N) return []; const mean=samples.reduce((a,b)=>a+b,0)/N; const x=samples.map(v=>v-mean); const out=new Float64Array(maxLag+1); const denom=x.reduce((a,b)=>a+b*b,0)||1; for(let lag=0; lag<=maxLag; lag++){ let c=0; for(let n=0;n<N-lag;n++) c+=x[n]*x[n+lag]; out[lag]=c/denom; } return Array.from(out); }
  function pushSpectrumSamples(FtVal, xVal, dt){ const maxLen=Math.floor((parseFloat(specWinInp.value)||8)/dt); specFbuf.push(FtVal); specXbuf.push(xVal); if(specFbuf.length>maxLen){ const drop=specFbuf.length-maxLen; specFbuf.splice(0,drop); specXbuf.splice(0,drop); } }
  function updateSpectrum(dt){
    if(!window.Plotly || !spectrumDiv) return;
    if(specFbuf.length<256) return;
    const pF = realPSD(specFbuf, dt);
    const pX = realPSD(specXbuf, dt);
    const lags = acf(specXbuf, Math.min(400, specXbuf.length-4));
    const lagAxis = lags.map((_,i)=> i*dt);
    // Use restyle to update existing three traces (indices 0,1,2)
    window.Plotly.restyle(spectrumDiv, {
      x: [pF.f, pX.f, lagAxis],
      y: [pF.S, pX.S, lags]
    }, [0,1,2]);
  }
  function initSpectrum(){ if(!spectrumDiv){ spectrumDiv=document.createElement('div'); spectrumDiv.id='osc-spectrum'; spectrumDiv.style.marginTop='10px'; root.appendChild(spectrumDiv);} const data=[{x:[],y:[],mode:'lines',name:'PSD F',line:{color:'#aa22aa',width:1.6}},{x:[],y:[],mode:'lines',name:'PSD x',line:{color:'#2ca02c',width:1.6}},{x:[],y:[],mode:'lines',name:'ACF x',line:{color:'#1f77b4',width:1.6}}]; const layout={height:430,paper_bgcolor:'#000',plot_bgcolor:'#000',showlegend:true,legend:{orientation:'h',y:1.15,font:{size:10,color:'#ddd'}},grid:{rows:3,columns:1,pattern:'independent'},xaxis:{title:'f (Hz)',color:'#ccc'},yaxis:{title:'PSD(F)',type:'log',color:'#ccc'},xaxis2:{title:'f (Hz)',color:'#ccc'},yaxis2:{title:'PSD(x)',type:'log',color:'#ccc'},xaxis3:{title:'lag (s)',color:'#ccc'},yaxis3:{title:'ACF(x)',color:'#ccc'},margin:{t:20,l:50,r:10,b:45},modebar:{bgcolor:'#111'}}; data[0].xaxis='x1'; data[0].yaxis='y1'; data[1].xaxis='x2'; data[1].yaxis='y2'; data[2].xaxis='x3'; data[2].yaxis='y3'; window.Plotly.newPlot(spectrumDiv,data,layout,{displaylogo:false}); }

  // ================== Mode scheduler ==================
  let modeClock=0.0;
  function runScheduler(dt){ const mode=modeSel.value; if(mode==='Free'){ modeClock+=dt; return; }
    if(mode==='Habituation'){ params.period=1/1.3; modeClock+=dt; return; }
    if(mode==='Sensitization'){ const Ts=12.0; modeClock=(modeClock+dt)%Ts; const f=0.6+(1.0-0.6)*(modeClock/Ts); params.period=1/Math.max(0.2,f); return; }
    if(mode==='Anticipation'){ const f0=params.omega0/(2*Math.PI); const A=0.2; const fmod=0.2; modeClock+=dt; const f=Math.max(0.2, f0 + A*Math.sin(2*Math.PI*fmod*modeClock)); params.period=1/f; return; }
    if(mode==='Association'){ const Tpair=8.0, Ttest=8.0, Tcycle=Tpair+Ttest; modeClock=(modeClock+dt)%Tcycle; if(modeClock<Tpair){ if(Math.floor(modeClock/1.25)%2===0) params.period=1/1.0; else params.period=1/1.6; } else { params.period=1/1.6; } return; }
    if(mode==='Delayed'){ const Toff=4.0, Ton=2.0, Tcycle=Toff+Ton; modeClock=(modeClock+dt)%Tcycle; if(modeClock<Toff) params.period=1/0.5; else params.period=1/1.0; return; }
  }

  // After scheduler modifications reflect period slider (wrap original function)
  const originalRunScheduler = runScheduler;
  runScheduler = function(dt){
    originalRunScheduler(dt);
    if(sliderElems.period){ const perStr = params.period.toFixed(2); sliderElems.period.input.value=perStr; sliderElems.period.display.textContent=perStr; }
  };

  // Reset spectrum buffers when window length changes
  specWinInp.addEventListener('change', ()=>{ specFbuf.length=0; specXbuf.length=0; });

  // Extended PHYSICS STEP with spectrum + scheduler
  function step(){
    const dt_=params.dt;
    if(autoChk.checked){ const due=lastFireTime+params.period; if(t>=due){ const jitter=params.jitter*randNormal(); if(t>=due+jitter){ triggerPulse(t); lastFireTime=t; } } }
    runScheduler(dt_);
    const Ft = computePulseForce(t);
    const a = -params.gamma*v - (params.omega0*params.omega0)*x + Ft;
    v += a*dt_;
    x += v*dt_;
    t += dt_;
    const dampTerm = -params.gamma*v;
    const restTerm = - (params.omega0*params.omega0)*x;
    pushSample(t, x, v, dampTerm, restTerm, Ft);
    pushSpectrumSamples(Ft, x, dt_);
    if(forecastChk.checked) computeForecast();
    specStep++; if(specStep % Math.max(1, parseInt(specEveryInp.value)||12) === 0) updateSpectrum(dt_);
    const localMax = Math.max(Math.abs(x),Math.abs(v),Math.abs(dampTerm),Math.abs(restTerm),Math.abs(Ft));
    if(localMax > 0.9*yMax) yMax = localMax*1.2;
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

  ensurePlotly(()=>{ initPlot(); initSpectrum(); redraw(); });

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
