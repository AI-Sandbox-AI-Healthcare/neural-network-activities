// Source-aware browser checks: run through scripts/check_browser.py.
async (page) => {
  await page.goto('__ACTIVITIES_BASE_URL__');
  const links=await page.locator('a.act-card').evaluateAll(a=>a.map(x=>x.href));
  const results=[]; let errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for(const url of links){
    errors=[];await page.goto(url);
    const result=await page.evaluate(async()=>{
      const id=location.pathname.split('/').pop().replace('.html','');
      const set=(id,v)=>{const e=document.getElementById(id);if(!e)throw Error('Missing input '+id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));};
      const quiz=(p,Q)=>Object.entries(Q).forEach(([q,v])=>window[p+'MCQ'](+q,v.opts.findIndex(x=>x.c)));
      const fills=(p,F)=>Object.entries(F).forEach(([k,v])=>{set(`${p}-f-${k}`,v.ans);window[p+'CheckFill'](k)});
      const inputsWithAnswer=handler=>document.querySelectorAll('input[oninput]').forEach(e=>{const m=e.getAttribute('oninput').match(new RegExp(handler+"\\('[^']+',\\s*([-\\d.]+)\\)"));if(m)set(e.id,m[1]);});
      const state={};
      const initiallyComplete=[...document.querySelectorAll('.activity-done-banner')].some(e=>getComputedStyle(e).display!=='none');
      try{
        switch(id){
          case '0.0':set('n-w0',1);break;
          case '6.1':baUnlock(2);baUnlock(3);baHandleXShape('4x3');baHandleWShape('3x2');baUnlock(4);[0,1,2,3].forEach(i=>set('ba-xcol-'+i,1));set('ba-wrow-0',0);set('ba-wrow-1',-1);break;
          case '6.2.1':ceUnlock(2);ceUnlock(3);[[-1,-1],[-.152,-3.322],[-.152,-3.322]].forEach((r,i)=>r.forEach((v,j)=>set(`ce-logp-${i}-${j}`,v)));[[0,-1],[-.152,0],[0,-3.322]].forEach((r,i)=>r.forEach((v,j)=>set(`ce-ylogp-${i}-${j}`,v)));set('ce-jw-0',.05);set('ce-jw-1',1.44);break;
          case '6.2.2':[[0,-5],[0,5],[1,-5],[1,5]].forEach(([y,z])=>a4SnapScenario(y,z));break;
          case '6.2.3':set('a4-score-0',3);a4Answer(0,'softmax');state.retryEnabled=!$('a4-qb-0-sigmoid').disabled;['sigmoid','softmax','sigmoid','softmax'].forEach((a,i)=>a4Answer(i,a));break;
          case '6.3':set('mx-w0',1);break;
          case '6.4':[3,2,9,3,27].forEach((v,i)=>set('lr-step'+'ABCDE'[i],v));lrRandomize();state.regionPlot=$('lr-plot').querySelectorAll('polyline').length;break;
          case '6.5.1':cgUnlock(2);CG_ALL_NODES.forEach(n=>{cgToggleChip(n);if(!CG_INPUTS_SET.has(n))cgToggleChip(n)});CG_WIRE_Q.forEach(q=>cgWireAnswer(q.node,q.opts.findIndex(o=>o.correct)));await new Promise(r=>setTimeout(r,450));break;
          case '6.5.2':bpUnlock(2);BP_ROWS.forEach((r,i)=>{if(!r.given)Object.entries(r.ans).forEach(([k,v])=>set(`bp-r${i}-${k}`,v))});bpAnswer(1);break;
          case '7.1':rrUnlock();inputsWithAnswer('rrCheck');inputsWithAnswer('rrCheckD');rrToStage3();rrAnswer('noreg',0);rrAnswer('l1',0);rrAnswer('l2',1);break;
          case '7.8':esUnlock();esToStage3();esAnswer('stop',1);set('es-epoch-answer',40);esCheckEpochAnswer();state.beforeWhy=isComplete('earlystop');esAnswer('why',1);break;
          case '7.12':dpUnlock();Object.entries(DP_MCQ).forEach(([k,o])=>dpAnswer(k,o.findIndex(x=>x.c)));dpBestAnswer(0);break;
          case '7.KD':kdUnlock();inputsWithAnswer('kdCheckDist');kdToStage3();[['sim',KD_SIM],['formula',KD_FORMULA],['weight',KD_WEIGHT],['effect',KD_EFFECT]].forEach(([k,q])=>kdAnswer(k,q.findIndex(x=>x.c)));break;
          case '8.1':SL_WARMUP_OPTS.forEach((o,i)=>$('sl-wu-'+i).checked=o.c);slCheckWarmup();SL_FLASH.forEach((_,i)=>{slShowFlash(i);slFlipFlash()});slContinuePlayground();Object.entries(SL_MCQ).forEach(([k,q])=>slAnswerMCQ(k,q.opts.findIndex(x=>x.c)));SL_MATCH.forEach((m,i)=>set('sl-match-'+i,m.a));slCheckMatch();slContinueRecap();break;
          case '8.2':gnUnlock();gnToStage3();for(let i=0;i<GN_SCENARIOS.length;i++){gnScenarioAnswer(i,GN_SCENARIOS[i].correct);await new Promise(r=>setTimeout(r,350))}gnClipAnswer(GN_CLIP.findIndex(x=>x.c));break;
          case '8.3':mmUnlock();MM_NO.forEach((r,i)=>{set(`mm-n-w0-${i+1}`,r.W0);set(`mm-n-w1-${i+1}`,r.W1)});MM_MOM.forEach((r,i)=>Object.entries(r).forEach(([k,v])=>set(`mm-${k.toLowerCase()}-${i+1}`,v)));mmCheckMom();mmAnswer(1,MM_MCQ1.findIndex(x=>x.c));mmAnswer(2,MM_MCQ2.findIndex(x=>x.c));break;
          case '8.4':tlUnlock(2);[TL_Q1,TL_Q2,TL_Q3,TL_Q4].forEach((q,i)=>tlAns('q'+(i+1),q.findIndex(x=>x.c)));tlUnlock(3);set('tl-px-inp',786432000);tlCheckPixel();break;
          case '8.5':orUnlock(2);orUnlock(3);OR_MATCH.forEach((q,i)=>orMatchAns(i,q.c));orUnlock(4);orReferenceRun();orUnlock(5);orFinalAns(1);break;
          case '8.7.1':bnUnlock(2);set('bn-m1',2);set('bn-m2',4);bnUnlock(3);set('bn-w11',1.5);set('bn-w12',2.5);set('bn-w21',0);set('bn-w22',0);bnUnlock(4);set('bn-hnm',0);set('bn-bv','[3,5]');bnWhyAns(0);break;
          case '9.1':cvAdvance();for(const v of [6,8,-1]){set('cv-ans',v);cvCheckStep();cvAdvance()}for(let j=0;j<3;j++){cvEditCell(0,j);cvEditCell(0,j);cvEditCell(2,j)}cvCheckDesign();Object.entries(CV_SIZE).forEach(([k,v])=>{set('cv-sz-'+k,v.ans);cvCheckSize(k)});quiz('cv',CV_QS);break;
          case '9.3':[3,9,4,7].forEach((v,i)=>set('pl-m'+i,v));plCheckMax();plMove9(-1);plMove9(1);set('pl-fix-ans',25);plCheckFixed();set('pl-adapt-a',6);set('pl-adapt-b',13);plCheckAdapt();quiz('pl',PL_QS);break;
          case '9.GC.1':gmSelectNode(0);gmSelectNode(2);set('gm-f0',2.5);set('gm-f2',2);gmCheckFill();set('gm-W',-1);set('gm-b',1.8);gmLearnUpdate();quiz('gm',GM_QS);break;
          case '9.GC.2':[0,1,3,4].forEach(geToggle);geCheckRow();[-1,0,1].forEach(v=>set('ge-W2',v));for(let r=0;r<3;r++)for(let c=0;c<3;c++)while(geStencil[r][c]!==[1,0,-1][c])geStencilCell(r,c);quiz('ge',GE_QS);break;
          case '10.1.1':fills('tc',TC_FILL);tcRnnSentence('D');for(let i=0;i<TC_LONG.length;i++)tcRnnStep();quiz('tc',TC_QS);break;
          case '10.1.2':for(const [n,a,h] of [[1,[0,2],[0,2]],[2,[5,-7],[5,0]]]){a.forEach((v,i)=>set(`rf-a${n}-${i}`,v));h.forEach((v,i)=>set(`rf-h${n}-${i}`,v));rfCheck(n)}[[2,[1,2]],[3,[1,0]]].forEach(([n,vs])=>{vs.forEach((v,i)=>set(`rf-r${n}-${i}`,v));rfCheckRun(n)});quiz('rf',RF_QS);break;
          case '10.2.1':quiz('rd',RD_QS);RD_GREEDY.forEach(rdPick);rdSetFeedback(false);['weather',...RD_GREEDY.slice(1)].forEach(rdPick);break;
          case '10.2.2':set('rn-f-z',1.82);rnCheckZ();set('rn-u',0);set('rn-w',1);rnSim();set('rn-u',2);set('rn-w',1.5);rnSim();quiz('rn',RN_QS);break;
          case '10.3':[1,2].forEach(brToggle);brCheckDeps();[1,2,3,4].forEach(brToggle);brCheckDeps();Object.entries(BR_CALC).forEach(([k,v])=>set('br-c-'+k,v));brCheckCalc();Object.entries(BR_EQ).forEach(([k,v])=>set('br-sel-'+k,v));brCheckEq();quiz('br',BR_QS);break;
          case '10.4':NS_S1.gold.forEach((v,i)=>set('ns-t1-'+i,v));nsCheckTag1();fills('ns',NS_FILL);['O','O','O','O','B-ORG','I-ORG','I-ORG'].forEach((v,i)=>set('ns-t2-'+i,v));nsCheckNest();quiz('ns',NS_QS);break;
          case '10.6':Object.entries(RC_CALC).forEach(([k,v])=>set('rc-c-'+k,v));rcCheckCalc();Object.entries(RC_INFL).forEach(([k,v])=>set('rc-c-'+k,v));rcCheckInfl();fills('rc',RC_FILL);RC_MATCH.forEach((m,i)=>set('rc-m-'+i,RC_SOURCES[m.ans]));rcCheckMatch();quiz('rc',RC_QS);break;
          case '10.7':Object.entries(LM_UNROLL).forEach(([k,v])=>set('lm-c-'+k,v));lmCheckUnroll();fills('lm',LM_FILL);quiz('lm',LM_QS);break;
          case '10.10':for(const g of ['f','g'])for(let t=0;t<6;t++)ggSet(g,t);for(let t=1;t<6;t++)ggSet('g',t);for(let t=1;t<6;t++)ggSet('g',t);for(let t=0;t<6;t++){while(ggGates.f[t]!==1)ggSet('f',t);while(ggGates.g[t]!==0)ggSet('g',t)}ggSet('f',3);ggSet('g',3);ggSet('g',3);for(let t=0;t<6;t++){while(ggGates.f[t]!==1)ggSet('f',t);while(ggGates.g[t]!==1)ggSet('g',t)}for(let t=0;t<6;t++)while(ggGates.u[t]!==1)ggSet('u',t);ggSet('u',0);ggSet('u',3);GG_MAP.forEach((m,i)=>set('gg-m-'+i,m.ans));ggCheckMap();fills('gg',GG_FILL);quiz('gg',GG_QS);break;
          case '10.TF':fills('po',PO_FILL);poSetOrder(1);poTogglePE();PO_MATCH.forEach((m,i)=>set('po-m-'+i,PO_METHODS[m.ans]));poCheckMatch();quiz('po',PO_QS);break;
          case '11.1':fills('cn',CN_FILL);set('cn-t',.65);set('cn-t',.25);quiz('cn',CN_QS);break;
          case '11.3':Object.entries(LC_GAPS).forEach(([k,v])=>set('lc-c-'+k,v));lcCheckGaps();Object.entries(LC_DIAG).forEach(([k,v])=>set('lc-d-'+k,v));lcCheckDiag();fills('lc',LC_FILL);set('lc-n',8);LC_ACTIONS.forEach((m,i)=>set('lc-m-'+i,m.ans));lcCheckMatch();quiz('lc',LC_QS);break;
          case '11.4':['D','G','B'].forEach(hbRacePick);hbRaceKeep();hbRacePick('D');hbRaceKeep();hbRaceReveal();fills('hb',HB_FILL);Object.entries(HB_N).forEach(([k,v])=>set('hb-c-'+k,v));hbCheckN();quiz('hb',HB_QS);break;
          case '11.LS':leToggle(5);fills('le',LE_FILL);leFit(100,'bg','le-coef-svg');leFit(20,'bg','le-coef-svg');leFit(20,'bg','le-coef-svg');leFit(100,'zero','le-coef3-svg');quiz('le',LE_QS);break;
          case '11.GA':fills('ga',GA_FILL);GA_MATCH.forEach((m,i)=>set('ga-m-'+i,GA_METHODS[m.ans]));gaCheckMatch();quiz('ga',GA_QS);break;
        }
        await new Promise(r=>setTimeout(r,450));
        const banner=document.querySelector('.tab-panel.active .activity-done-banner');
        return {id,initiallyComplete,complete:getComputedStyle(banner).display!=='none',state,mathErrors:document.querySelectorAll('.katex-error').length};
      }catch(e){return {id,error:e.stack,state};}
    });
    results.push({...result,errors:[...errors]});
  }
  return results;
}
