// qfib.js - Quantum-style Fibonacci wave visualization
(function(){
  const sqrt5=Math.sqrt(5), phi=(1+sqrt5)/2, goldenAngle=2*Math.PI*(1-1/phi);
  function Fcont(t){ return (Math.pow(phi,t) - Math.pow(-1/phi,t)) / (phi + 1/phi); }
  const el=id=>document.getElementById(id);
  const playBtn=el('qPlay'), stepBtn=el('qStep'), resetBtn=el('qReset');
  if(!playBtn){ console.warn('qfib UI not found'); return; }
  const Nslider=el('qN'), spd=el('qSpd'), pitch=el('qPitch'), r0=el('qR0');
  const status=el('qStatus');
  let playing=false, t=0, dt=0.012;
  let theta0=0; let g=0.6; let lam=0.02; let E=0;
  const M=200; const sGrid=new Float64Array(M); for(let i=0;i<M;i++) sGrid[i]=i/(M-1);
  let a=new Float64Array(M), b=new Float64Array(M), aTmp=new Float64Array(M), bTmp=new Float64Array(M);

  // Saturating growth laws (avoid geometric explosion without post-scaling distortions)
  const R_MAX_VIEW = 28, Z_MAX_VIEW = 55;
  function Rof(tsec){
    const Nval=parseInt(Nslider.value,10)||280;
    const raw=Math.pow(phi,(6*tsec)/Nval);
    return Math.min(R_MAX_VIEW, raw);
  }
  function zMap(zRaw){ return Math.max(-Z_MAX_VIEW, Math.min(Z_MAX_VIEW, zRaw)); }
  function centerPoint(s, tNow, P){
    const tEff = tNow * s;
    const R = Rof(tEff);
    const th = theta0 + tEff*goldenAngle;
    const zRaw = P * tEff;
    return {x:R*Math.cos(th), y:R*Math.sin(th), z:zMap(zRaw)};
  }

  const baseParams={V0:0.14,kappa:9.0,Om:0.55};

  function meanCosPhase(){ let s=0; for(let i=0;i<M;i++){ const r=Math.hypot(a[i],b[i])+1e-9; s+=a[i]/r; } return s/M; }

  function stepField(dt,P){
  const base=baseParams;
  g += dt*(0.05*meanCosPhase() - 0.02*g); g=Math.max(0,Math.min(2,g));
  lam = Math.max(0, Math.min(0.2, lam - dt*0.004));
    const m = 1/(1+Fcont(1)); const inv2m=1/(2*m); const ds=1/(M-1);
    for(let i=0;i<M;i++){
      const im=(i-1+M)%M, ip=(i+1)%M; const d2a=(a[ip]-2*a[i]+a[im])/(ds*ds); const d2b=(b[ip]-2*b[i]+b[im])/(ds*ds);
  const s = sGrid[i]; const V = base.V0*Math.cos(base.kappa*s - base.Om*t);
  const at =  inv2m*d2b - V*b[i] - lam*a[i];
  const bt = -inv2m*d2a + V*a[i] - lam*b[i];
      aTmp[i]=a[i]+dt*at; bTmp[i]=b[i]+dt*bt;
    }
    [a,aTmp]=[aTmp,a]; [b,bTmp]=[bTmp,b];
  const uEff=base.V0; E=0.98*E + 0.02*(uEff*uEff);
  }

  function buildTube(P){
    const xs=[],ys=[],zs=[],I=[],J=[],K=[],intensity=[]; const ring=14; // slightly smoother
    for(let i=0;i<M;i++){
      const s=sGrid[i];
      const cp = centerPoint(s,t,P);
      const cp2 = centerPoint(Math.min(1,s+1e-3),t,P);
      let Tx=cp2.x-cp.x, Ty=cp2.y-cp.y, Tz=cp2.z-cp.z; const Tn=Math.hypot(Tx,Ty,Tz)||1; Tx/=Tn; Ty/=Tn; Tz/=Tn;
      let Ax=-Ty, Ay=Tx, Az=0; let An=Math.hypot(Ax,Ay,Az);
      if(An<1e-9){ Ax=0; Ay=-Tz; Az=Ty; An=Math.hypot(Ax,Ay,Az);} Ax/=An; Ay/=An; Az/=An;
      const Bx=Ty*Az-Tz*Ay, By=Tz*Ax-Tx*Az, Bz=Tx*Ay-Ty*Ax; const Bn=Math.hypot(Bx,By,Bz)||1; const BxN=Bx/Bn, ByN=By/Bn, BzN=Bz/Bn;
      // baseline amplitude so tube never vanishes fully
      const magRaw=Math.hypot(a[i],b[i])*1.2;
      const mag=Math.min(1, 0.25 + 0.75*magRaw); // shift upward for visibility
      const baseR=(parseFloat(r0.value)||0.6); // ensure reasonable default if slider missing
      const rt=Math.max(0.10, baseR*(0.40+0.60*mag));
  // clamp center
  let Rc=Math.hypot(cp.x,cp.y); if(Rc>R_MAX_VIEW){ const scl=R_MAX_VIEW/Rc; cp.x*=scl; cp.y*=scl; }
  if(Math.abs(cp.z)>Z_MAX_VIEW) cp.z=Math.sign(cp.z)*Z_MAX_VIEW;
      for(let j=0;j<=ring;j++){
        const th=2*Math.PI*j/ring;
        xs.push(cp.x + rt*(Math.cos(th)*Ax + Math.sin(th)*BxN));
        ys.push(cp.y + rt*(Math.cos(th)*Ay + Math.sin(th)*ByN));
        zs.push(cp.z + rt*(Math.cos(th)*Az + Math.sin(th)*BzN));
        intensity.push(mag);
        if(i>0 && j>0){ const A_=i*(ring+1)+j, B_=A_-1, C_=A_-(ring+1), D_=C_-1; I.push(A_,A_,D_); J.push(B_,C_,C_); K.push(D_,B_,D_); }
      }
    }
    return {x:xs,y:ys,z:zs,i:I,j:J,k:K,intensity};
  }
  function buildSpine(P){
    const sx=[], sy=[], sz=[];
    for(let i=0;i<M;i++){ const cp=centerPoint(sGrid[i],t,P); sx.push(cp.x); sy.push(cp.y); sz.push(cp.z); }
    return {x:sx,y:sy,z:sz};
  }

  let qWaveTraceIndex=0, headTraceIndex=1, spineTraceIndex=2, qDiagInit=false;
  function initPlots(){
    const P=parseFloat(pitch.value); const tube=buildTube(P);
    // compute initial head (peak amplitude location)
    let iPeak=0, peakMag=-1; for(let i=0;i<M;i++){ const m=Math.hypot(a[i],b[i]); if(m>peakMag){ peakMag=m; iPeak=i; } }
    const cpHead=centerPoint(sGrid[iPeak],t,P);
    const spine=buildSpine(P);
  Plotly.newPlot('qScene3d',[
      {type:'mesh3d',x:tube.x,y:tube.y,z:tube.z,i:tube.i,j:tube.j,k:tube.k,intensity:tube.intensity,colorscale:'Viridis',opacity:0.92,flatshading:false,lighting:{ambient:0.6,diffuse:0.8,roughness:0.6}},
      {type:'scatter3d',mode:'markers',x:[cpHead.x],y:[cpHead.y],z:[cpHead.z],
        marker:{size:5,color:'#ffeb7a',line:{color:'#ffffff',width:1}},name:'head'},
      {type:'scatter3d',mode:'lines',x:spine.x,y:spine.y,z:spine.z,line:{color:'#fffae0',width:2},name:'spine'}
    ],{
      height:560,
      paper_bgcolor:'#0b0f12', plot_bgcolor:'#0b0f12',
      scene:{
        xaxis:{title:'x',color:'#cfe', range:[-R_MAX_VIEW,R_MAX_VIEW]},
        yaxis:{title:'y',color:'#cfe', range:[-R_MAX_VIEW,R_MAX_VIEW]},
        zaxis:{title:'z',color:'#cfe', range:[-Z_MAX_VIEW,Z_MAX_VIEW]},
        camera:{eye:{x:1.45,y:1.35,z:1.15}}
      },
      margin:{t:10,l:0,r:0,b:0}
    },{displaylogo:false}).then(()=>{ qWaveTraceIndex=0; });
  qDiagInit=false; // diagnostics removed
  }

  function redraw(){
    const P=parseFloat(pitch.value); const tube=buildTube(P); const spine=buildSpine(P);
    // update mesh
    Plotly.restyle('qScene3d',{x:[tube.x], y:[tube.y], z:[tube.z], i:[tube.i], j:[tube.j], k:[tube.k], intensity:[tube.intensity]}, [qWaveTraceIndex]);
    // update head position
    let iPeak=0, peakMag=-1; for(let i=0;i<M;i++){ const m=Math.hypot(a[i],b[i]); if(m>peakMag){ peakMag=m; iPeak=i; } }
    const cpHead=centerPoint(sGrid[iPeak],t,P);
    Plotly.restyle('qScene3d',{x:[[cpHead.x]], y:[[cpHead.y]], z:[[cpHead.z]]}, [headTraceIndex]);
    // update spine
    Plotly.restyle('qScene3d',{x:[spine.x], y:[spine.y], z:[spine.z]}, [spineTraceIndex]);
    status.textContent=`t=${t.toFixed(2)} g=${g.toFixed(2)} λ=${lam.toFixed(2)} E=${E.toFixed(2)}`;
  }

  function stepOnce(){ const frames=Math.max(2,Math.floor(spd.value/2)); for(let k=0;k<frames;k++){ stepField(dt, parseFloat(pitch.value)); t+=dt; theta0 += goldenAngle*0.0007; } redraw(); }
  function resetField(){ for(let i=0;i<M;i++){ const x=(sGrid[i]-0.25)/0.05; a[i]=Math.exp(-x*x); b[i]=0; } g=0.6; lam=0.02; E=0; t=0; theta0=0; }
  playBtn.onclick=()=>{ playing=!playing; playBtn.textContent=playing?'⏸':'▶'; if(playing) loop(); };
  stepBtn.onclick=()=>{ if(!playing) stepOnce(); };
  resetBtn.onclick=()=>{ playing=false; playBtn.textContent='▶'; resetField(); initPlots(); redraw(); };
  function loop(){ if(!playing) return; stepOnce(); requestAnimationFrame(loop); }
  resetField(); initPlots(); redraw();
})();
