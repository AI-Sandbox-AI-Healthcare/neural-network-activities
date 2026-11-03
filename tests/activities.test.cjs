const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'docs/assets/app.js'), 'utf8');

function sandbox() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {id, value:'', textContent:'', innerHTML:'', className:'', style:{}, disabled:false,
      classList:{add(){},remove(){},contains(){return false}}, querySelectorAll(){return []}});
    return elements.get(id);
  };
  const context = vm.createContext({document:{getElementById:element,querySelectorAll:()=>[],querySelector:()=>null},
    window:{}, setInterval:()=>0, setTimeout:()=>0, console});
  vm.runInContext(source, context);
  return {run:code=>vm.runInContext(code,context),element};
}
const plain = value => JSON.parse(JSON.stringify(value));
const near = (actual,expected,tolerance=1e-9) => assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} != ${expected}`);

test('published catalog contains all 38 panels and their initializers',()=>{
  const catalog = fs.readFileSync(path.join(root,'docs/index.html'),'utf8');
  const links = [...catalog.matchAll(/href="activities\/([^"]+)\.html"/g)];
  assert.equal(links.length,38);
  for(const [,id] of links){
    const html=fs.readFileSync(path.join(root,`docs/activities/${id}.html`),'utf8');
    assert.ok(html.includes(`id="tab-${id}"`),id);
    const init=html.match(/\n  (init\w+)\(\)/)[1];
    assert.ok(source.includes(`function ${init}(`),init);
  }
});

test('cross entropy answer key agrees with independent base-2 calculation',()=>{
  const {run}=sandbox();
  const p=[[.5,.5],[.9,.1],[.9,.1]], y=[[0,1],[1,0],[0,1]];
  const log=p.map(r=>r.map(Math.log2)), masked=log.map((r,i)=>r.map((v,j)=>v*y[i][j]));
  run('CE_LOGP_ANS').forEach((r,i)=>r.forEach((v,j)=>near(v,log[i][j],.001)));
  run('CE_YLOGP_ANS').forEach((r,i)=>r.forEach((v,j)=>near(v,masked[i][j],.001)));
  run('CE_JW_ANS').forEach((v,j)=>near(v,-masked.reduce((s,r)=>s+r[j],0)/3,.001));
});

test('sigmoid CE is nonnegative, symmetric, and equals the Bernoulli negative log likelihood',()=>{
  const {run}=sandbox();
  for(const z of [-10,-2,0,2,10]) for(const y of [0,1]){
    const p=1/(1+Math.exp(-z));
    near(run(`a4Cost(${y},${z})`),-(y*Math.log(p)+(1-y)*Math.log(1-p)));
    near(run(`a4Cost(${y},${z})`),run(`a4Cost(${1-y},${-z})`));
  }
});

test('completion requires intermediate computations and all early-stopping questions',()=>{
  const {run}=sandbox();
  run('ceJWOk=true'); assert.equal(run("isComplete('ce')"),false);
  run('ceLogPOk=ceYlogPOk=true'); assert.equal(run("isComplete('ce')"),true);
  run('esStopMcq=esEpochOk=true'); assert.equal(run("isComplete('earlystop')"),false);
  run('esWhyMcq=true'); assert.equal(run("isComplete('earlystop')"),true);
  run('esVal=0'); assert.equal(run("isComplete('earlystop')"),false);
  run('orMcq={sgd:true,ada:true,rms:true,adam:true};orFinal=true'); assert.equal(run("isComplete('optrace')"),false);
  run('orRan=true'); assert.equal(run("isComplete('optrace')"),true);
});

test('bias absorption requires the requested ones column and bias row, not only matching outputs',()=>{
  const {run}=sandbox();
  run('baXcol=[2,2,2,2];baWrow=[0,-0.5];baXshapeOk=baWshapeOk=true');
  assert.deepEqual(plain(run('baXnewWnew()')),plain(run('baXWplusC()')));
  assert.equal(run("isComplete('bias')"),false);
  run('baXcol=[1,1,1,1];baWrow=[0,-1]');
  assert.equal(run("isComplete('bias')"),true);
});

test('sigmoid/softmax quiz permits recovery and requires exploration plus all correct answers',()=>{
  const {run,element}=sandbox();
  run("a4Answer(0,'softmax')");
  assert.equal(element('a4-qb-0-sigmoid').disabled,false);
  run("a4Answer(0,'sigmoid');a4Answer(1,'softmax');a4Answer(2,'sigmoid');a4Answer(3,'softmax')");
  assert.equal(run('a4QuizDone'),true);
  assert.equal(run("isComplete('a423')"),false);
  run('a4Explored=true'); assert.equal(run("isComplete('a423')"),true);
});

test('a wholly incorrect quiz never awards completion',()=>{
  const {run}=sandbox();
  run("a4Explored=true;a4Answer(0,'softmax');a4Answer(1,'sigmoid');a4Answer(2,'softmax');a4Answer(3,'sigmoid')");
  assert.equal(run('a4QuizDone'),false);
  assert.equal(run("isComplete('a423')"),false);
});

test('one-layer region bound includes n+1 intervals and deeper layers multiply that factor',()=>{
  const {run}=sandbox();
  for(const n of [2,3,4]) for(const l of [1,3,6]){
    run(`lrN=${n};lrL=${l}`);
    near(run('lrTargetE()'),(n+1)**l);
    near(run('lrTargetC()*lrTargetD()'),(n+1)**l);
  }
  // relu(x)+relu(x-1) has three output pieces despite n=2 and l=1.
  const slopes=[-1,.5,2].map(x=>((Math.max(0,x+1e-5)+Math.max(0,x+1e-5-1))-(Math.max(0,x)+Math.max(0,x-1)))/1e-5);
  assert.equal(new Set(slopes.map(x=>Math.round(x))).size,3);
  assert.ok(!source.includes('Math.min(actualRaw,bound)'));
});

test('detector evaluation thresholds do not alter its toy training objective',()=>{
  const {run}=sandbox();
  const before=run('slSimulate()');
  run('SL.conf=.99;SL.iou=.95');
  const after=run('slSimulate()');
  assert.notEqual(before.TP,after.TP);
  for(const key of ['clsLoss','boxLoss','objLoss','total']) near(before[key],after[key]);
  run("SL.quality='good'"); assert.ok(run('slSimulate().boxLoss')<before.boxLoss);
  for(const n of ['few','balanced','many']) for(const q of ['poor','medium','good']){
    run(`SL.npred='${n}';SL.quality='${q}'`);
    const r=run('slSimulate()'); near(r.TP+r.FN,4);
    for(const key of ['clsLoss','boxLoss','objLoss','total']) assert.ok(Number.isFinite(r[key])&&r[key]>=0);
  }
});

test('backprop answer follows the local derivative chain (finite difference)',()=>{
  const {run}=sandbox();
  const f=x=>Math.abs(x*5+3), eps=1e-6;
  near((f(-1+eps)-f(-1-eps))/(2*eps),run('BP_ROWS[3].ans.G'),1e-8);
});

test('SGD and momentum tables follow the supplied gradients',()=>{
  const {run}=sandbox();
  let w=[0,0],m=[0,0],v=[0,0];
  [[0,1],[1,0],[0,1]].forEach((g,i)=>{
    w=w.map((x,j)=>x-.5*g[j]); v=v.map((x,j)=>.5*x-.5*g[j]);m=m.map((x,j)=>x+v[j]);
    const a=run(`MM_NO[${i}]`),b=run(`MM_MOM[${i}]`);
    near(a.W0,w[0]);near(a.W1,w[1]);near(b.W0,m[0]);near(b.W1,m[1]);near(b.v0,v[0]);near(b.v1,v[1]);
  });
});

test('optimizer fixed-question winner agrees with the actual 30-step simulation',()=>{
  const {run}=sandbox();
  const losses=['sgd','ada','rms','adam'].map(k=>run(`(()=>{const p=orSim('${k}',.30,30).at(-1);return OR_F(p.x,p.y)})()`));
  assert.equal(losses.indexOf(Math.min(...losses)),2);
  assert.equal(run('OR_FMCQ.findIndex(x=>x.c)'),1);
});

test('convolution, adaptive pooling, and graph aggregation calculations',()=>{
  const {run}=sandbox();
  assert.deepEqual(plain(run('cvCorr(CV_I,CV_K)')),[[7,6],[8,-1]]);
  assert.deepEqual(plain(run('plMaxes(PL_X0)')),[3,9,4,7]);
  assert.deepEqual(plain(run('plAdaptRegions(10,4)')),[[0,3],[2,5],[5,8],[7,10]]);
  assert.deepEqual(plain(run('plAdaptRegions(20,3)')),[[0,7],[6,14],[13,20]]);
  near(run('GM_NEW[0]'),2.5);
});

test('recurrent forward passes preserve order and match hand computations',()=>{
  const {run}=sandbox();
  assert.deepEqual(plain(run('RF_MAIN.h1')),[0,2]);
  assert.deepEqual(plain(run('RF_MAIN.h2')),[5,0]);
  assert.deepEqual(plain(run('RF_SWAP.h2')),[1,2]);
  assert.deepEqual(plain(run('RF_EMPTY.h2')),[1,0]);
  near(run('LM_UNROLL.a'),2*.5**2);
  near(run('LM_UNROLL.b'),2*.5);
  near(run('LM_UNROLL.c'),2);
  near(run('lmEigPoint(20)[0]'),.5*(1.1**20+.5**20));
});

test('gated memory can accumulate with LSTM while GRU stays in candidate convex hull',()=>{
  const {run}=sandbox();
  run('ggGates.f=Array(6).fill(1);ggGates.g=Array(6).fill(1)');
  near(run('ggRunLSTM().at(-1)'),2.8);
  for(const u of [0,.5,1]){
    run(`ggGates.u=Array(6).fill(${u})`);
    assert.ok(run('ggRunGRU().every(h=>h>=-.5&&h<=.9)'));
  }
});

test('self-attention without positions is permutation equivariant',()=>{
  const {run}=sandbox();
  const a=run('poAttend(PO_ORDERS[0],false).Z'), b=run('poAttend(PO_ORDERS[1],false).Z');
  a.forEach((r,i)=>r.forEach((v,j)=>near(v,b[2-i][j])));
  assert.notEqual(run('poAttend(PO_ORDERS[0],true).Z[0][0]'),run('poAttend(PO_ORDERS[1],true).Z[2][0]'));
});

test('cancer-classification toy counts and threshold targets are internally consistent',()=>{
  const {run}=sandbox();
  assert.equal(run('cnSum(CN_POS)'),500);assert.equal(run('cnSum(CN_NEG)'),9500);
  const all=Array.from({length:19},(_,i)=>run(`cnCounts(${i+1})`));
  const best=all.reduce((a,b)=>a.TP+a.TN>b.TP+b.TN?a:b);
  const target=run('cnCounts(13)'); assert.equal(target.TP+target.TN,best.TP+best.TN);
  near(run('cnCounts(5).TP/500'),.98);
});

test('LIME ridge coefficients remain finite across repeated sampling and perturbation modes',()=>{
  const {run}=sandbox();
  for(const n of [20,100]) for(const mode of ['bg','zero']) for(let seed=1;seed<=8;seed++){
    assert.ok(run(`leLime(${n},'${mode}',${seed}).beta.every(Number.isFinite)`));
  }
});

test('integrated gradients and Shapley values satisfy completeness in the supplied examples',()=>{
  const {run}=sandbox();
  near(run('GA_FILL.ig.ans'),.8*(1/1.6));
  near(run('GA_FILL.phinot.ans'),((.4-.5)+(.8-.1))/2);
  near(run('GA_FILL.phibad.ans'),((.1-.5)+(.8-.4))/2);
  near(run('GA_FILL.phinot.ans+GA_FILL.phibad.ans'),.8-.5);
});

test('batch norm revokes success feedback and continue buttons after incorrect edits',()=>{
  const {run,element}=sandbox();
  element('bn-m1').value='2';element('bn-m2').value='4';run('bnCheckMeans()');
  assert.equal(element('bn-btn2').disabled,false);
  element('bn-m1').value='0';run('bnCheckMeans()');
  assert.equal(element('bn-btn2').disabled,true);
  for(const [id,v] of Object.entries({'bn-w11':'1.5','bn-w12':'2.5','bn-w21':'0','bn-w22':'0'}))element(id).value=v;
  run('bnLiveH()');assert.equal(element('bn-btn3').disabled,false);
  element('bn-w11').value='0';run('bnLiveH()');
  assert.equal(element('bn-btn3').disabled,true);
  assert.equal(element('bn-whint').className,'guidance-box cold');
});

test('early stopping exposes the regularization question required by completion',()=>{
  const html=fs.readFileSync(path.join(root,'docs/activities/7.8.html'),'utf8');
  assert.ok(html.includes('id="es-why-opts"'));
  assert.ok(html.includes('id="es-why-hint"'));
});

test('early-stopping loss paths stay inside the plotted axes',()=>{
  const {run,element}=sandbox();run('esDrawCurves()');
  const paths=[...element('es-curve-svg').innerHTML.matchAll(/<path d="([^"]+)"/g)];
  assert.equal(paths.length,2);
  for(const [,d] of paths) for(const [,x,y] of d.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)){
    assert.ok(+x>=44&&+x<=448);assert.ok(+y>=14&&+y<=168,`curve exceeds plot: ${y}`);
  }
});
