// ══════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════
const $ = id => document.getElementById(id)
const relu    = x => Math.max(0, x)
const sigmoid = x => 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))))
const log2    = x => Math.log(Math.max(1e-10, x)) / Math.LN2
const fmt     = (v, d=2) => (v >= 0 ? '+' : '') + v.toFixed(d)

function showTab(id) {
  const panel = $('tab-' + id)
  if (!panel) return
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  panel.classList.add('active')
  const btn = document.querySelector(`.tab-btn[data-tab="${id}"]`)
  if (btn) btn.classList.add('active')
  if (window.location.hash.slice(1) !== id) window.location.hash = id
}

function makeSlider(container, id, label, value, min, max, step, onchange, extraClass='') {
  const d = document.createElement('div')
  d.className = 'slider-row'
  d.innerHTML = `
    <span class="slider-label">
      <span class="name">${label}</span>
      <span class="val" id="${id}-val">${fmt(value)}</span>
    </span>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
      class="${extraClass}" style="flex:1">`
  container.appendChild(d)
  d.querySelector('input').addEventListener('input', e => {
    const v = parseFloat(e.target.value)
    $(`${id}-val`).textContent = fmt(v)
    e.target.className = extraClass + (v < 0 ? ' neg' : '')
    onchange(v)
  })
}

// ══════════════════════════════════════════════════
//  NEURON EXPLORER
// ══════════════════════════════════════════════════
const LOCKED_X = [1.0, 1.0, 0.0, -1.0, 1.0, 0.0]
const TARGET_W = [0.5, 1.0, 1.0,  1.0, 0.5, 1.0]
const TARGET_A = 1.0
const N_DEF_W  = [0.0, 0.0, 0.0,  0.0, 0.0, 0.0]

let nX = [...LOCKED_X]
let nW = [...N_DEF_W]

// ── Interaction log & timer ──────────────────────
let nLog       = []
let nStartTime = null
let nTimerTick = null

function nElapsed() {
  if (!nStartTime) return '00:00'
  const s = Math.floor((Date.now() - nStartTime) / 1000)
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

function nStartTimer() {
  if (nStartTime) return
  nStartTime = Date.now()
  nTimerTick = setInterval(() => {
    const t=$('n-timer'); if(t) t.textContent = nElapsed()
    const m=$('n-timer-meta'); if(m) m.textContent = `${nLog.length} interaction${nLog.length !== 1 ? 's' : ''} recorded`
  }, 1000)
}

// ── Init ─────────────────────────────────────────
function initNeuron() {
  // Locked inputs grid
  const ic = $('n-locked-inputs')
  ic.innerHTML = ''
  const grid = document.createElement('div')
  grid.className = 'locked-grid'
  LOCKED_X.forEach((x, i) => {
    const item = document.createElement('div')
    item.className = 'locked-item'
    const valColor = x > 0 ? '#1d4ed8' : x < 0 ? '#dc2626' : '#8a7a6e'
    item.innerHTML = `
      <span class="lock-name">x<sub>${i+1}</sub> <span class="lock-badge">🔒</span></span>
      <span class="lock-val" style="color:${valColor}">${x >= 0 ? '+' : ''}${x.toFixed(1)}</span>`
    grid.appendChild(item)
  })
  ic.appendChild(grid)

  // Weight sliders only
  const wc = $('n-weights')
  wc.innerHTML = ''
  nW.forEach((v, i) => makeSlider(wc, `n-w${i}`, `w${i+1}`, v, -3, 3, 0.5, val => {
    const prev = nW[i]
    nW[i] = val
    nStartTimer()
    const a = nX.reduce((s, x, j) => s + x * nW[j], 0)
    nLog.unshift({
      time: nElapsed(),
      weight: `w${i+1}`,
      from: prev.toFixed(2),
      to: val.toFixed(2),
      a_j: a.toFixed(4),
      sign: (val - prev) > 0 ? '▲' : '▼'
    })
    if (nLog.length > 30) nLog.pop()
    updateNeuron()
  }, 'wt'))

  // Problem statement — formula + plain-text explanation
  const eq = $('n-prob-eq')
  eq.innerHTML = `
    <div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden">

      <!-- Weighted sum formula -->
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#b45309">$$a_j = \\sum_{i=1}^{N} x_i \\cdot w_i$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">
          <strong style="color:var(--text)">aⱼ is the sum of xᵢ · wᵢ from i = 1 to N.</strong><br>
          Multiply each input by its matching weight, then add all N products together.
        </div>
      </div>

      <!-- ReLU activation formula -->
      <div style="padding:16px 20px;text-align:center">
        <div style="color:#16a34a">$$o_j = \\text{ReLU}(a_j) = \\max(0,\\; a_j)$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">
          If aⱼ is <strong style="color:var(--text)">zero or negative → oⱼ = 0</strong> (neuron is silent).
          If aⱼ is <strong style="color:var(--text)">positive → oⱼ = aⱼ</strong> (neuron fires).
        </div>
      </div>

    </div>`
  typeset(eq)

  updateNeuron()
}

function resetNeuron() {
  nW = [...N_DEF_W]
  nW.forEach((v, i) => {
    $(`n-w${i}`).value = v
    $(`n-w${i}-val`).textContent = fmt(v)
    $(`n-w${i}`).className = 'wt'
  })
  updateNeuron()
}

function updateNeuron() {
  const a = nX.reduce((s, x, i) => s + x * nW[i], 0)
  const o = Math.max(0, a)
  renderNeuronSVG(a, o)
  renderNeuronAlgebra(a, o)
  renderNeuronContributions(a, o)
  renderNeuronGuidance(a, o)
  renderNeuronLog()
  renderNeuronSubmitSummary(a, o)
}

function typeset(el) {
  if (window.renderMathInElement) {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$',  right: '$',  display: false }
      ],
      throwOnError: false
    })
  }
}

// ── SVG diagram ───────────────────────────────────
function renderNeuronSVG(a_j, o_j) {
  const W=580,H=380,cx=300,cy=190,r=58,ys=[32,90,148,206,264,322],ix=50,ox=W-46
  const wColor=w=>{const t=Math.min(1,Math.abs(w)*.45+.25);return w>=0?`rgba(59,130,246,${t})`:`rgba(239,68,68,${t})`}
  const wWidth=w=>Math.max(1,Math.min(6,Math.abs(w)*2.6+1))
  let lines='',inodes='',wlabels='',prodlabels=''
  nX.forEach((x,i)=>{
    const y=ys[i],prod=x*nW[i],mx=(ix+18+cx-r)*.5,my=y+(cy-y)*.25
    lines+=`<line x1="${ix+18}" y1="${y}" x2="${cx-r}" y2="${cy}" stroke="${wColor(nW[i])}" stroke-width="${wWidth(nW[i])}"/>`
    wlabels+=`<text x="${ix+46}" y="${y+(cy-y)*.18+12}" fill="${nW[i]>=0?'#b45309':'#dc2626'}" font-size="12" font-family="Courier New">w${i+1}=${fmt(nW[i])}</text>`
    prodlabels+=`<text x="${mx+14}" y="${my-6}" fill="${prod>=0?'#1d4ed8':'#dc2626'}" font-size="13" font-family="Courier New" text-anchor="middle">${prod>=0?'+':''}${prod.toFixed(2)}</text>`
    const fc=x>=0?'#1d4ed8':'#991b1b',sc=x>=0?'#3b82f6':'#ef4444'
    inodes+=`<circle cx="${ix}" cy="${y}" r="17" fill="${fc}" stroke="${sc}" stroke-width="2.5"/><text x="${ix}" y="${y+5}" text-anchor="middle" fill="white" font-size="13" font-weight="700" font-family="Courier New">${x.toFixed(1)}</text><text x="${ix}" y="${y-23}" text-anchor="middle" fill="#8a7a6e" font-size="12">x${i+1}</text>`
    inodes+=`<text x="${ix+19}" y="${y-13}" fill="#334155" font-size="11">🔒</text>`
  })
  const nc=o_j>0?'#16a34a':'#8a7a6e',outFill=o_j>0?'#15803d':'#e2d9cc'
  $('n-svg').innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:100%">
    ${lines}${wlabels}${prodlabels}${inodes}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f5f0e8" stroke="${nc}" stroke-width="3"/>
    <text x="${cx}" y="${cy-16}" text-anchor="middle" fill="#8a7a6e" font-size="13">aⱼ = ${a_j.toFixed(3)}</text>
    <text x="${cx}" y="${cy+7}" text-anchor="middle" fill="${nc}" font-size="15" font-weight="700">ReLU</text>
    <text x="${cx}" y="${cy+28}" text-anchor="middle" fill="${nc}" font-size="13">oⱼ = ${o_j.toFixed(3)}</text>
    <defs><marker id="arr" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L0,9 L9,4.5 z" fill="${nc}"/></marker></defs>
    <line x1="${cx+r}" y1="${cy}" x2="${ox-16}" y2="${cy}" stroke="${nc}" stroke-width="2.5" marker-end="url(#arr)"/>
    <circle cx="${ox}" cy="${cy}" r="17" fill="${outFill}" stroke="${nc}" stroke-width="2"/>
    <text x="${ox}" y="${cy+5}" text-anchor="middle" fill="white" font-size="12" font-weight="700" font-family="Courier New">${o_j.toFixed(2)}</text>
    <text x="${ox}" y="${cy-24}" text-anchor="middle" fill="#8a7a6e" font-size="12">oⱼ</text>
  </svg>`
}

// ── Algebra ───────────────────────────────────────
function renderNeuronAlgebra(a_j, o_j) {
  const products = nX.map((x,i) => {
    const p = x * nW[i]
    return `<span style="color:${p>=0?'#1d4ed8':'#dc2626'}">${p>=0?'+':''}${p.toFixed(4)}</span>`
  }).join(' ')
  const aC = a_j>=0 ? '#1d4ed8' : '#dc2626'
  const oC = o_j>0  ? '#16a34a' : '#8a7a6e'
  const el = $('n-algebra')
  el.innerHTML = `
  <div class="algebra">
    <div class="alg-step" style="text-align:center;margin-bottom:4px">$$a_j = \\sum_{i=1}^{6} x_i \\cdot w_i$$</div>
    <div class="alg-step" style="margin-left:10px">
      ${nX.map((x,i)=>`<span style="color:var(--muted)">(</span><span style="color:#1d4ed8">${x>=0?'':'-'}${Math.abs(x).toFixed(2)}</span><span style="color:var(--muted)"> × </span><span style="color:#b45309">${nW[i]>=0?'+':''}${nW[i].toFixed(2)}</span><span style="color:var(--muted)">)</span>`).join('<span style="color:var(--muted)"> + </span>')}
    </div>
    <div class="alg-res" style="color:${aC}">aⱼ = ${a_j.toFixed(4)}</div>
  </div>
  <div class="algebra" style="margin-top:10px">
    <div class="alg-step" style="text-align:center;margin-bottom:4px">$$o_j = \\text{ReLU}(a_j) = \\max(0,\\; a_j)$$</div>
    <div class="alg-step" style="margin-left:10px">max(0, <span style="color:${aC}">${a_j.toFixed(4)}</span>) = ${o_j.toFixed(4)}</div>
    <div class="alg-res" style="color:${oC}">oⱼ = ${o_j.toFixed(4)}${a_j<0?' <span style="color:var(--muted);font-size:13.5px;font-weight:500">(negative → ReLU clamps to 0)</span>':''}</div>
  </div>`
  typeset(el)
}

// ── Contributions ─────────────────────────────────
function renderNeuronContributions(a_j, o_j) {
  const el = $('n-contributions')
  let rows = ''
  LOCKED_X.forEach((x, i) => {
    const contrib = x * nW[i]
    let effectHtml
    if (Math.abs(x) < 1e-6) {
      effectHtml = `<span style="color:#8a7a6e">No effect — x = 0, so this product is always 0</span>`
    } else if (x > 0) {
      effectHtml = `<span style="color:#16a34a">Raise w${i+1} → aⱼ goes up by the same amount</span>`
    } else {
      effectHtml = `<span style="color:#dc2626">Raise w${i+1} → aⱼ goes DOWN by the same amount</span>`
    }
    rows += `<tr>
      <td style="color:var(--muted)">${i+1}</td>
      <td style="color:${x>0?'#1d4ed8':x<0?'#dc2626':'#8a7a6e'}">${x>=0?'+':''}${x.toFixed(1)}</td>
      <td style="color:#b45309">${nW[i]>=0?'+':''}${nW[i].toFixed(2)}</td>
      <td style="color:${contrib>=0?'#1d4ed8':'#dc2626'}">${contrib>=0?'+':''}${contrib.toFixed(4)}</td>
      <td>${effectHtml}</td>
    </tr>`
  })
  el.innerHTML = `
    <div style="margin-bottom:10px;padding:10px 14px;background:var(--surf2);border-radius:6px;border:1px solid var(--border)">
      <div style="text-align:center;margin-bottom:4px">$$a_j = \\sum_{i=1}^{6} x_i \\cdot w_i$$</div>
    </div>
    <table class="contrib-table">
      <thead><tr><th>#</th><th>xᵢ (locked)</th><th>wᵢ (yours)</th><th>xᵢ × wᵢ</th><th>What changing wᵢ does to aⱼ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:10px;font-size:14.5px;font-weight:600;color:var(--muted);font-family:'Courier New',monospace">
      Running total → aⱼ = <strong style="color:${a_j>=0?'#1d4ed8':'#b91c1c'}">${a_j.toFixed(4)}</strong>
      &nbsp;·&nbsp; oⱼ = max(0, ${a_j.toFixed(4)}) = <strong style="color:${o_j>0?'#15803d':'#5c4a3a'}">${o_j.toFixed(4)}</strong>
    </div>`
  typeset(el)
}

// ── Guidance ──────────────────────────────────────
function renderNeuronGuidance(a_j, o_j) {
  const el = $('n-guidance')
  const diff    = TARGET_A - a_j
  const absDiff = Math.abs(diff)
  let cls, msg

  if (absDiff < 0.001) {
    cls = 'done'
    msg = `<strong>🎯 Correct!</strong> aⱼ = ${a_j.toFixed(4)} and oⱼ = ${o_j.toFixed(4)}.<br>
      The neuron is active and your weights match the Activity target.`
  } else if (absDiff < 0.1) {
    const hint = diff > 0
      ? 'Try nudging w₁, w₂, or w₅ up slightly (their inputs are +1).'
      : 'Try nudging w₁, w₂, or w₅ down slightly, or push w₄ higher.'
    cls = 'hot'
    msg = `<strong>🔥 Very close!</strong> aⱼ = ${a_j.toFixed(4)}, need aⱼ = 1.0 (off by ${diff>=0?'+':''}${diff.toFixed(4)}).<br>${hint}`
  } else if (absDiff < 0.6) {
    const dir = diff > 0 ? 'higher' : 'lower'
    cls = 'warm'
    msg = `<strong>🌡 Getting warmer.</strong> aⱼ = ${a_j.toFixed(4)}, target is aⱼ = 1.0 — need it ${dir} by ${Math.abs(diff).toFixed(4)}.`
    if (diff > 0) {
      msg += `<br>• <strong>x₁=+1, x₂=+1, x₅=+1</strong>: increasing these weights <em>increases</em> aⱼ.`
      msg += `<br>• <strong>x₄=−1</strong>: increasing w₄ <em>decreases</em> aⱼ — keep it low.`
    } else {
      msg += `<br>• Decrease w₁, w₂, or w₅, or increase w₄ to bring aⱼ down.`
    }
  } else {
    cls = 'cold'
    if (!nLog.length) {
      msg = `Start adjusting the weight sliders above.
        <br><br>Remember: aⱼ is the sum of xᵢ · wᵢ from i = 1 to 6.
        Since x₃ = 0 and x₆ = 0, those weights have <strong>no effect</strong> on aⱼ no matter what you set them to.`
    } else {
      msg = `aⱼ = ${a_j.toFixed(4)}, target: aⱼ = 1.0.
        <br>• x₁=+1, x₂=+1, x₅=+1 → raising w₁, w₂, or w₅ <em>raises</em> aⱼ.
        <br>• x₄=−1 → raising w₄ <em>lowers</em> aⱼ — set it carefully.
        <br>• x₃=0, x₆=0 → w₃ and w₆ do <strong>nothing</strong>.`
    }
  }

  el.innerHTML = `<div class="guidance-box ${cls}">${msg}</div>`
}

// ── Interaction log ───────────────────────────────
function renderNeuronLog() {
  const el = $('n-log')
  if (!el) return
  if (!nLog.length) {
    el.innerHTML = '<p style="font-size:14.5px;color:var(--muted);font-weight:500;padding:8px 0">No interactions yet — adjust a weight slider to start.</p>'
    return
  }
  const rows = nLog.map((e, idx) => `
    <tr>
      <td>${e.time}</td>
      <td style="color:#b45309">${e.weight}</td>
      <td style="color:var(--muted)">${e.from}</td>
      <td style="color:${e.sign==='▲'?'#16a34a':'#dc2626'}">${e.sign} ${e.to}</td>
      <td style="color:#1d4ed8">${e.a_j}</td>
    </tr>`).join('')
  el.innerHTML = `
    <table class="log-table">
      <thead><tr><th>Time</th><th>Weight</th><th>From</th><th>To</th><th>aⱼ after</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
}

// ── Submit summary ────────────────────────────────
function renderNeuronSubmitSummary(a_j, o_j) {
  const match = Math.abs(a_j - TARGET_A) < 0.001
  const el=$('n-submit-summary'); if(el){
  const elapsed = nStartTime ? nElapsed() : '—'
  el.innerHTML = `
    <p><strong>aⱼ</strong> = ${a_j.toFixed(4)} &nbsp;·&nbsp; <strong>oⱼ</strong> = ${o_j.toFixed(4)}
      &nbsp;·&nbsp; Neuron is <strong style="color:${o_j>0?'var(--green)':'var(--red)'}">${o_j>0?'active':'inactive'}</strong></p>
    <p style="margin-top:4px">Inputs (locked): [${LOCKED_X.map(v=>v.toFixed(1)).join(', ')}]</p>
    <p>Weights: [${nW.map(v=>v.toFixed(2)).join(', ')}]</p>
    ${match ? '<p style="color:var(--green);margin-top:4px">✓ Matches Activity 1 target (aⱼ = 1.0, oⱼ = 1.0)</p>' : ''}`
  }
  updateBadge('n-completed', isComplete('neuron'))
}

// ══════════════════════════════════════════════════
//  BIAS ABSORPTION (Activity 6.1)
// ══════════════════════════════════════════════════
const BA_X = [[0,0],[0,1],[1,0],[1,1]]
const BA_W = [[1,1],[1,1]]
const BA_C = [0,-1]

let baStage      = 1
let baXcol       = [null,null,null,null]
let baWrow       = [null,null]
let baXshapeOk   = false
let baWshapeOk   = false
let baStartTime  = null
let baShapeAttempts = {x:0,w:0}
let baValueAttempts = {x:0,w:0}

function baMatMul(A, B) {
  return A.map(row => B[0].map((_,j) => row.reduce((s,v,k) => s + v * B[k][j], 0)))
}
function baXW()    { return baMatMul(BA_X, BA_W) }
function baXWplusC(){ return baXW().map(row => row.map((v,j) => v + BA_C[j])) }
function baY()     { return baXWplusC().map(row => row.map(v => Math.max(0,v))) }
function baXnewWnew() {
  if (baXcol.some(v=>v===null) || baWrow.some(v=>v===null)) return null
  const Xn = BA_X.map((row,i) => [...row, baXcol[i]])
  const Wn = [...BA_W.map(r=>[...r]), [...baWrow]]
  return baMatMul(Xn, Wn)
}

function baSetActive(id, on) {
  const el=$(id); if(!el) return
  if(on){ el.classList.add('unlocked') } else { el.classList.remove('unlocked') }
}

function baLockStage(stageNum) {
  if (stageNum === 1) {
    const btn = document.querySelector('#ba-stage1 .btn')
    if (btn) { btn.disabled = true; btn.textContent = '✓ Stage complete'; btn.className = 'btn btn-g' }
    const b = $('ba-s1-badge'); if(b){ b.textContent = 'Complete ✓'; b.className = 'badge gg' }
  } else if (stageNum === 2) {
    const btn = document.querySelector('#ba-stage2 .btn')
    if (btn) { btn.disabled = true; btn.textContent = '✓ Stage complete'; btn.className = 'btn btn-g' }
    const b = $('ba-s2-badge'); if(b){ b.textContent = 'Complete ✓'; b.className = 'badge gg' }
  } else if (stageNum === 3) {
    document.querySelectorAll('input[name="xshape"], input[name="wshape"]').forEach(inp => inp.disabled = true)
    const btn = document.querySelector('#ba-shape-confirm .btn')
    if (btn) { btn.disabled = true; btn.textContent = '✓ Shapes locked'; btn.className = 'btn btn-g' }
    const b = $('ba-s3-badge'); if(b){ b.textContent = 'Shapes locked ✓'; b.className = 'badge gg' }
  }
}

function baUnlock(stage) {
  if (stage <= baStage) return
  baLockStage(baStage)
  baStage = stage
  baRenderStages()
}

function baRenderStages() {
  baSetActive('ba-stage2', baStage >= 2)
  const s2b = $('ba-s2-badge')
  if(s2b){ s2b.textContent = baStage>=2 ? 'Step 2 of 6' : 'Step 2 of 6 — locked'; s2b.className = baStage>=2 ? 'badge bg' : 'badge og' }
  baSetActive('ba-stage3', baStage >= 3)
  const s3b = $('ba-s3-badge')
  if(s3b){ s3b.textContent = baStage>=3 ? 'Step 3 of 6' : 'Step 3 of 6 — locked'; s3b.className = baStage>=3 ? 'badge bg' : 'badge og' }
  baSetActive('ba-stage4', baStage >= 4)
  baUpdateSBSCheck()
  baUpdateSteps()
  baUpdateVerification()
  baUpdateSubmitSummary()
}

function initBias() {
  baRenderStages()
  document.querySelectorAll('input[name="xshape"]').forEach(inp => inp.addEventListener('change', () => baHandleXShape(inp.value)))
  document.querySelectorAll('input[name="wshape"]').forEach(inp => inp.addEventListener('change', () => baHandleWShape(inp.value)))
  baRenderXGrid()
  baRenderWGrid()
  baUpdateSteps()
}

function baHandleXShape(val) {
  baShapeAttempts.x++
  $('ba-xshape-opts').querySelectorAll('.ba-shape-opt').forEach(l => l.classList.remove('sel-ok','sel-bad'))
  const lbl = $('ba-xshape-opts').querySelector(`[data-val="${val}"]`)
  const fb  = $('ba-xshape-fb'); fb.style.display = 'block'
  if (val === '4x3') {
    lbl && lbl.classList.add('sel-ok')
    fb.className = 'guidance-box done'
    fb.innerHTML = '<strong>✓ Correct!</strong> X has 4 rows and 2 features — add 1 column of 1s → shape (4×3). Now X_new × W_new must still output (4×2), so W_new must absorb the extra dimension.'
    baXshapeOk = true
    $('ba-wshape-section').classList.add('unlocked')
  } else {
    lbl && lbl.classList.add('sel-bad')
    fb.className = 'guidance-box warm'
    const why = {'4x1':'That drops x₁ and x₂ — only one column means only the bias contributes.','4x2':'That is just the original X unchanged. We need one extra column to carry the bias.','4x4':'That adds two extra columns; we only need one — one per bias add.'}
    fb.innerHTML = `<strong>Not quite.</strong> ${why[val]||''} We add exactly one column of 1s to X.`
    baXshapeOk = false
  }
  baCheckShapeDone()
}

function baHandleWShape(val) {
  baShapeAttempts.w++
  $('ba-wshape-opts').querySelectorAll('.ba-shape-opt').forEach(l => l.classList.remove('sel-ok','sel-bad'))
  const lbl = $('ba-wshape-opts').querySelector(`[data-val="${val}"]`)
  const fb  = $('ba-wshape-fb'); fb.style.display = 'block'
  if (val === '3x2') {
    lbl && lbl.classList.add('sel-ok')
    fb.className = 'guidance-box done'
    fb.innerHTML = '<strong>✓ Correct!</strong> X_new is (4×3) and the output must be (4×2), so W_new is (3×2). c is (1×2) — one value per output neuron — so it becomes the new bottom <em>row</em>.'
    baWshapeOk = true
  } else {
    lbl && lbl.classList.add('sel-bad')
    fb.className = 'guidance-box warm'
    const why = {'2x2':'That is just the original W — no bias row added.','2x3':'(4×3)×(2×3) — inner dims 3 and 2 do not match, so the multiply is invalid.','3x3':'Output would be (4×3), not (4×2). The number of output columns must stay at 2.'}
    fb.innerHTML = `<strong>Not quite.</strong> ${why[val]||''} X_new is (4×3); what W_new produces (4×2)?`
    baWshapeOk = false
  }
  baCheckShapeDone()
}

function baCheckShapeDone() {
  const btn = $('ba-shape-confirm')
  const s3b = $('ba-s3-badge')
  if (baXshapeOk && baWshapeOk) {
    btn.style.display = 'block'
    if(s3b){ s3b.textContent = 'Both shapes correct ✓'; s3b.className = 'badge gg' }
  } else {
    btn.style.display = 'none'
  }
}

function baRenderXGrid() {
  const grid = $('ba-xnew-grid'); if(!grid) return
  grid.innerHTML = ''
  const hdr = ['col 1','col 2','new col ↓']
  hdr.forEach((h,i) => {
    const d=document.createElement('div')
    d.style.cssText=`font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:center;padding:3px 4px;color:${i===2?'#15803d':'var(--muted)'}`
    d.textContent=h; grid.appendChild(d)
  })
  BA_X.forEach((row,ri) => {
    row.forEach(v => {
      const c=document.createElement('div'); c.className='ba-cell-locked'; c.textContent=v; grid.appendChild(c)
    })
    const inp=document.createElement('input')
    inp.type='number'; inp.id=`ba-xcol-${ri}`; inp.className='ba-cell-input'
    inp.placeholder='?'; inp.step=1; inp.min=-9; inp.max=9
    inp.addEventListener('input', () => {
      const v=parseFloat(inp.value)
      baXcol[ri]=isNaN(v)?null:v
      baValueAttempts.x++
      if(!baStartTime && baXcol.some(x=>x!==null)) baStartTime=Date.now()
      baCheckXcol(); baUpdateSBSCheck(); baUpdateSteps(); baUpdateVerification(); baUpdateSubmitSummary()
    })
    grid.appendChild(inp)
  })
}

function baCheckXcol() {
  let n=0
  BA_X.forEach((_,ri) => {
    const inp=$(`ba-xcol-${ri}`); if(!inp) return
    const v=baXcol[ri]
    if(v===null){inp.className='ba-cell-input';return}
    if(v===1){inp.className='ba-cell-input ok';n++}else{inp.className='ba-cell-input bad'}
  })
  const badge=$('ba-xval-badge')
  badge.textContent=`${n}/4 correct`; badge.className=`badge ${n===4?'gg':n>0?'og':'rg'}`
  const hint=$('ba-xval-hint')
  if(n===4){hint.className='guidance-box done';hint.innerHTML='<strong>✓ All 1s!</strong> Every sample now carries a constant signal of 1, which activates the bias row in W_new for every row.'}
  else if(baXcol.some(v=>v!==null&&v!==1)){hint.className='guidance-box warm';hint.innerHTML='<strong>Hint:</strong> We need <code>? × c = c</code>. That only works when <code>? = 1</code>, because 1 is the multiplicative identity.'}
  else{hint.className='guidance-box cold';hint.innerHTML='Fill the new column. What value, multiplied by c, always returns c unchanged?'}
  baCheckAllFilled()
}

function baRenderWGrid() {
  const grid=$('ba-wnew-grid'); if(!grid) return
  grid.innerHTML=''
  const hdr=['col 1','col 2']
  hdr.forEach(h=>{const d=document.createElement('div');d.style.cssText='font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:center;padding:3px 4px;color:var(--muted)';d.textContent=h;grid.appendChild(d)})
  BA_W.forEach(row=>{
    row.forEach(v=>{const c=document.createElement('div');c.className='ba-cell-locked';c.textContent=v;grid.appendChild(c)})
  })
  BA_C.forEach((_,ci)=>{
    const inp=document.createElement('input')
    inp.type='number'; inp.id=`ba-wrow-${ci}`; inp.className='ba-cell-input bias-col'
    inp.placeholder='?'; inp.step=1; inp.min=-9; inp.max=9
    inp.addEventListener('input',()=>{
      const v=parseFloat(inp.value)
      baWrow[ci]=isNaN(v)?null:v
      baValueAttempts.w++
      if(!baStartTime) baStartTime=Date.now()
      baCheckWrow(); baUpdateSBSCheck(); baUpdateSteps(); baUpdateVerification(); baUpdateSubmitSummary()
    })
    grid.appendChild(inp)
  })
}

function baCheckWrow() {
  let n=0
  BA_C.forEach((cv,ci)=>{
    const inp=$(`ba-wrow-${ci}`); if(!inp) return
    const v=baWrow[ci]
    if(v===null){inp.className='ba-cell-input bias-col';return}
    if(v===cv){inp.className='ba-cell-input ok';n++}else{inp.className='ba-cell-input bad'}
  })
  const badge=$('ba-wval-badge')
  badge.textContent=`${n}/2 correct`; badge.className=`badge ${n===2?'gg':n>0?'og':'rg'}`
  const hint=$('ba-wval-hint')
  if(n===2){hint.className='guidance-box done';hint.innerHTML='<strong>✓ Correct!</strong> The bias row is c = [0, −1]. Every sample row will add this via the 1s column in X_new.'}
  else if(baWrow.some(v=>v!==null)){hint.className='guidance-box warm';hint.innerHTML='<strong>Hint:</strong> The new bottom row of W_new should equal <code style="color:#0d9488">c = [0, −1]</code> exactly.'}
  else{hint.className='guidance-box cold';hint.innerHTML='Fill the bias row with the values from c. c has shape (1×2) — one value per output neuron, so it slots in as a row.'}
  baCheckAllFilled()
}

function baCheckAllFilled() {
  const xOk=baXcol.every(v=>v===1)
  const wOk=baWrow[0]===BA_C[0]&&baWrow[1]===BA_C[1]
  if(xOk&&wOk){ baSetActive('ba-stage6',true); baSetActive('ba-stage7',true) }
}

function baUpdateSBSCheck() {
  const el=$('ba-sbs-check'); if(!el) return
  if(baXcol.every(v=>v===null)&&baWrow.every(v=>v===null)){el.innerHTML='<span style="color:var(--muted)">Enter values above to see the check.</span>';return}
  const rows=BA_X.map((_,ri)=>{
    const xv=baXcol[ri], w0=baWrow[0], w1=baWrow[1]
    const xs=xv!==null?xv:'?', w0s=w0!==null?w0:'?', w1s=w1!==null?w1:'?'
    const r0=(xv!==null&&w0!==null)?xv*w0:null
    const r1=(xv!==null&&w1!==null)?xv*w1:null
    const ok0=r0===BA_C[0], ok1=r1===BA_C[1]
    const c0=r0!==null?(ok0?'#16a34a':'#dc2626'):'#8a7a6e'
    const c1=r1!==null?(ok1?'#16a34a':'#dc2626'):'#8a7a6e'
    const tick=(r0!==null&&r1!==null)?(ok0&&ok1?'<span style="color:#16a34a"> ✓</span>':'<span style="color:#dc2626"> ✗</span>'):'<span style="color:var(--muted)"> ?</span>'
    return `<div>Row ${ri+1}: <span style="color:#b45309">${xs}</span> × [<span style="color:#0d9488">${w0s}, ${w1s}</span>] = [<span style="color:${c0}">${r0!==null?r0:'?'}</span>, <span style="color:${c1}">${r1!==null?r1:'?'}</span>] &nbsp;need [<span style="color:#0d9488">0, −1</span>]${tick}</div>`
  })
  el.innerHTML=rows.join('')
}

function baMatHtml(rows, color) {
  const body = rows.map(r =>
    `<div class="ba-matrix-row">${r.map(v => `<span class="ba-matrix-cell">${v}</span>`).join('')}</div>`
  ).join('')
  return `<div class="ba-matrix" style="color:${color}"><div class="ba-matrix-bracket-l"></div><div class="ba-matrix-body">${body}</div><div class="ba-matrix-bracket-r"></div></div>`
}

function baUpdateSteps() {
  const el=$('ba-steps'); if(!el) return
  const XW=baXW(), XWC=baXWplusC(), Y=baY(), XnWn=baXnewWnew()
  el.innerHTML=`
    <div class="ba-step-block">
      <div class="ba-step-label" style="color:#1d4ed8">Step 1 — XW</div>
      ${baMatHtml(XW,'#1d4ed8')}
    </div>
    <div class="ba-step-block">
      <div class="ba-step-label" style="color:#d97706">Step 2 — XW + c &nbsp;(add [0, −1] to every row)</div>
      ${baMatHtml(XWC,'#d97706')}
    </div>
    <div class="ba-step-block">
      <div class="ba-step-label" style="color:#16a34a">Step 3 — ReLU = max(0, XW + c)</div>
      ${baMatHtml(Y,'#16a34a')}
    </div>
    ${XnWn?`<div class="ba-step-block" style="border-color:#7c3aed">
      <div class="ba-step-label" style="color:#7c3aed">Your X_new W_new (before ReLU)</div>
      ${baMatHtml(XnWn,'#7c3aed')}
    </div>`:'<div style="font-size:14.5px;color:var(--muted);font-weight:500;padding:8px 0">Fill both matrices above to see X_new W_new here.</div>'}`
}

function baUpdateVerification() {
  const pA=$('ba-path-a'),pB=$('ba-path-b'),badge=$('ba-verify-badge'),res=$('ba-verify-result')
  if(!pA) return
  const Y=baY(), XnWn=baXnewWnew()
  const Yn=XnWn?XnWn.map(row=>row.map(v=>Math.max(0,v))):null
  let matches=0, total=8
  pA.innerHTML=baMatHtml(Y,'#1d4ed8')
  if(Yn){
    const bodyRows=Yn.map((row,ri)=>
      `<div class="ba-matrix-row">${row.map((v,ci)=>{
        const m=Math.abs(v-Y[ri][ci])<1e-9; if(m)matches++
        return `<span class="ba-matrix-cell" style="color:${m?'#16a34a':'#dc2626'}">${v}</span>`
      }).join('')}</div>`
    ).join('')
    pB.innerHTML=`<div class="ba-matrix" style="color:#8a7a6e"><div class="ba-matrix-bracket-l"></div><div class="ba-matrix-body">${bodyRows}</div><div class="ba-matrix-bracket-r"></div></div>`
  }else{
    pB.innerHTML='<div style="color:var(--muted);font-size:14.5px;font-weight:500">Fill both matrices to see result…</div>'
  }
  badge.textContent=Yn?`${matches}/${total} cells match`:'—'
  badge.className=`badge ${matches===total?'gg':matches>0?'og':'rg'}`
  if(matches===total){
    res.innerHTML=`<div style="background:#dcfce7;border:2px solid #16a34a;border-radius:8px;padding:12px 16px;font-size:14.5px;color:#166534;font-weight:600">✅ ${total}/${total} cells match — max(0, XW + c) = max(0, X_new W_new)</div>`
    $('ba-s1-badge').textContent='Activity Complete ✓'; $('ba-s1-badge').className='badge gg'
  }else if(Yn){
    res.innerHTML=`<div style="background:#fee2e2;border:1px solid var(--red);border-radius:8px;padding:12px 16px;font-size:14.5px;font-weight:600;color:#7f1d1d">${matches}/${total} cells match — check your matrix values above.</div>`
  }else{ res.innerHTML='' }
}

function baElapsed() {
  if(!baStartTime) return '—'
  const s=Math.floor((Date.now()-baStartTime)/1000)
  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')
}

function baUpdateSubmitSummary() {
  const el=$('ba-submit-summary')
  const xOk=baXcol.every(v=>v===1)
  const wOk=baWrow[0]===BA_C[0]&&baWrow[1]===BA_C[1]
  const XnWn=baXnewWnew(), Y=baY()
  const Yn=XnWn?XnWn.map(r=>r.map(v=>Math.max(0,v))):null
  const allMatch=Yn?Y.every((row,ri)=>row.every((v,ci)=>Math.abs(v-Yn[ri][ci])<1e-9)):false
  if(el) el.innerHTML=`
    <p><strong>X_new extra column:</strong> [${baXcol.map(v=>v!==null?v:'?').join(', ')}] ${xOk?'<span style="color:var(--green)">✓</span>':''}</p>
    <p><strong>W_new bias row:</strong> [${baWrow.map(v=>v!==null?v:'?').join(', ')}] ${wOk?'<span style="color:var(--green)">✓</span>':''}</p>
    <p style="margin-top:4px">Stage reached: <strong>${baStage}/6</strong> &nbsp;·&nbsp; Time: <strong>${baElapsed()}</strong></p>
    ${allMatch?'<p style="color:var(--green);margin-top:4px">✓ max(0, XW+c) = max(0, X_new W_new) — bias absorbed!</p>':''}`
  updateBadge('ba-completed', isComplete('bias'))
}

// ══════════════════════════════════════════════════
//  CROSS-ENTROPY COST (Activity 3)
// ══════════════════════════════════════════════════
const CE_Y = [[0,1],[1,0],[0,1]]
const CE_P = [[0.5,0.5],[0.9,0.1],[0.9,0.1]]
const CE_LOGP_ANS  = [[-1,-1],[-0.152,-3.322],[-0.152,-3.322]]
const CE_YLOGP_ANS = [[0,-1],[-0.152,0],[0,-3.322]]
const CE_JW_ANS    = [0.0507, 1.4407]

let ceStage=1, ceLogP=[[null,null],[null,null],[null,null]]
let ceYlogP=[[null,null],[null,null],[null,null]], ceJW=[null,null]
let ceLogPOk=false, ceYlogPOk=false, ceJWOk=false

function ceSetActive(id,on){const el=$(id);if(!el)return;if(on)el.classList.add('unlocked');else el.classList.remove('unlocked')}

function ceLockStage(n){
  if(n===1){const btn=document.querySelector('#ce-stage1 .btn');if(btn){btn.disabled=true;btn.textContent='✓ Stage complete';btn.className='btn btn-g'}const b=$('ce-s1-badge');if(b){b.textContent='Complete ✓';b.className='badge gg'}}
  else if(n===2){const btn=document.querySelector('#ce-stage2 .btn');if(btn){btn.disabled=true;btn.textContent='✓ Stage complete';btn.className='btn btn-g'}const b=$('ce-s2-badge');if(b){b.textContent='Complete ✓';b.className='badge gg'}}
}

function ceUnlock(stage){if(stage<=ceStage)return;ceLockStage(ceStage);ceStage=stage;ceRenderStages()}

function ceRenderStages(){
  ceSetActive('ce-stage2',ceStage>=2)
  const s2b=$('ce-s2-badge');if(s2b){s2b.textContent=ceStage>=2?'Step 2 of 5':'Step 2 of 5 — locked';s2b.className=ceStage>=2?'badge bg':'badge og'}
  ceSetActive('ce-stage3',ceStage>=3)
  ceUpdateSteps();ceUpdateSubmitSummary()
}

function initCE(){ceRenderStages();ceRenderLogPGrid();ceRenderYlogPGrid();ceRenderJWInputs()}

function ceRenderLogPGrid(){
  const grid=$('ce-logp-grid');if(!grid)return
  grid.innerHTML=''
  const colHdrs=['','class 0','class 1']
  colHdrs.forEach(h=>{const d=document.createElement('div');d.style.cssText='font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:center;padding:3px 6px;color:var(--muted)';d.textContent=h;grid.appendChild(d)})
  CE_P.forEach((prow,ri)=>{
    const lbl=document.createElement('div');lbl.style.cssText='font-size:13.5px;font-weight:600;color:var(--muted);font-family:Courier New,monospace;padding-right:8px;display:flex;align-items:center';lbl.textContent=`row ${ri+1}`;grid.appendChild(lbl)
    prow.forEach((_,ci)=>{
      const inp=document.createElement('input');inp.type='number';inp.id=`ce-logp-${ri}-${ci}`;inp.className='ba-cell-input';inp.placeholder='?';inp.step=0.001;inp.style.width='80px'
      inp.addEventListener('input',()=>{const v=parseFloat(inp.value);ceLogP[ri][ci]=isNaN(v)?null:v;ceCheckLogP();ceUpdateSteps();ceUpdateSubmitSummary()})
      grid.appendChild(inp)
    })
  })
}

function ceCheckLogP(){
  let n=0
  CE_LOGP_ANS.forEach((row,ri)=>row.forEach((ans,ci)=>{
    const inp=$(`ce-logp-${ri}-${ci}`);if(!inp)return
    const v=ceLogP[ri][ci];if(v===null){inp.className='ba-cell-input';return}
    if(Math.abs(v-ans)<0.02){inp.className='ba-cell-input ok';n++}else{inp.className='ba-cell-input bad'}
  }))
  const badge=$('ce-logp-badge');badge.textContent=`${n}/6 correct`;badge.className=`badge ${n===6?'gg':n>0?'og':'rg'}`
  const hint=$('ce-logp-hint');ceLogPOk=(n===6)
  if(ceLogPOk){hint.className='guidance-box done';hint.innerHTML='<strong>✓ All log₂(p) correct!</strong> All negative — expected since p ≤ 1 always.'}
  else if(ceLogP.flat().some(v=>v!==null)){hint.className='guidance-box warm';hint.innerHTML='<strong>Hint:</strong> log₂(0.5) = −1, log₂(0.9) ≈ −0.152, log₂(0.1) ≈ −3.322. Use log₂(x) = ln(x)/ln(2).'}
  else{hint.className='guidance-box cold';hint.innerHTML='Fill each log₂(p) value. Remember: log₂(p) = ln(p)/ln(2). All values will be negative or zero.'}
  if(ceLogPOk&&ceStage>=3){const c=$('ce-ylogp-card');if(c){c.style.opacity='1';c.style.pointerEvents='auto'}}
}

function ceRenderYlogPGrid(){
  const grid=$('ce-ylogp-grid');if(!grid)return
  grid.innerHTML=''
  const colHdrs=['','class 0','class 1']
  colHdrs.forEach(h=>{const d=document.createElement('div');d.style.cssText='font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:center;padding:3px 6px;color:var(--muted)';d.textContent=h;grid.appendChild(d)})
  CE_Y.forEach((_,ri)=>{
    const lbl=document.createElement('div');lbl.style.cssText='font-size:13.5px;font-weight:600;color:var(--muted);font-family:Courier New,monospace;padding-right:8px;display:flex;align-items:center';lbl.textContent=`row ${ri+1}`;grid.appendChild(lbl)
    ;[0,1].forEach(ci=>{
      const inp=document.createElement('input');inp.type='number';inp.id=`ce-ylogp-${ri}-${ci}`;inp.className='ba-cell-input bias-col';inp.placeholder='?';inp.step=0.001;inp.style.width='80px'
      inp.addEventListener('input',()=>{const v=parseFloat(inp.value);ceYlogP[ri][ci]=isNaN(v)?null:v;ceCheckYlogP();ceUpdateSteps();ceUpdateSubmitSummary()})
      grid.appendChild(inp)
    })
  })
}

function ceCheckYlogP(){
  let n=0
  CE_YLOGP_ANS.forEach((row,ri)=>row.forEach((ans,ci)=>{
    const inp=$(`ce-ylogp-${ri}-${ci}`);if(!inp)return
    const v=ceYlogP[ri][ci];if(v===null){inp.className='ba-cell-input bias-col';return}
    if(Math.abs(v-ans)<0.02){inp.className='ba-cell-input ok';n++}else{inp.className='ba-cell-input bad'}
  }))
  const badge=$('ce-ylogp-badge');badge.textContent=`${n}/6 correct`;badge.className=`badge ${n===6?'gg':n>0?'og':'rg'}`
  const hint=$('ce-ylogp-hint');ceYlogPOk=(n===6)
  if(ceYlogPOk){hint.className='guidance-box done';hint.innerHTML='<strong>✓ Correct!</strong> The y=0 cells are all zero — they mask the irrelevant class. Only the true class log₂(p) survives.';const c=$('ce-jw-card');if(c){c.style.opacity='1';c.style.pointerEvents='auto'}}
  else if(ceYlogP.flat().some(v=>v!==null)){hint.className='guidance-box warm';hint.innerHTML='<strong>Hint:</strong> When y = 0, the product is 0. When y = 1, the product equals log₂(p) from Step A.'}
  else{hint.className='guidance-box cold';hint.innerHTML='When y = 0, the product is always 0. When y = 1, the product equals log₂(p) — it "selects" the loss for the true class.'}
}

function ceRenderJWInputs(){
  const c=$('ce-jw-inputs');if(!c)return
  c.innerHTML=`
    <span style="font-family:'Courier New',monospace;font-size:14.5px;font-weight:600;color:var(--muted)">J(W) = (</span>
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:12.5px;font-weight:700;color:var(--muted)">class 0</span><input type="number" id="ce-jw-0" class="ba-cell-input" placeholder="?" step="0.01" style="width:80px"></div>
    <span style="font-family:'Courier New',monospace;font-size:14.5px;font-weight:600;color:var(--muted)">,</span>
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:12.5px;font-weight:700;color:var(--muted)">class 1</span><input type="number" id="ce-jw-1" class="ba-cell-input" placeholder="?" step="0.01" style="width:80px"></div>
    <span style="font-family:'Courier New',monospace;font-size:14.5px;font-weight:600;color:var(--muted)">)</span>`
  ;[0,1].forEach(ci=>{$(`ce-jw-${ci}`).addEventListener('input',()=>{const v=parseFloat($(`ce-jw-${ci}`).value);ceJW[ci]=isNaN(v)?null:v;ceCheckJW();ceUpdateSteps();ceUpdateSubmitSummary()})})
}

function ceCheckJW(){
  let n=0
  ;[0,1].forEach(ci=>{const inp=$(`ce-jw-${ci}`);if(!inp)return;const v=ceJW[ci];if(v===null){inp.className='ba-cell-input';return};if(Math.abs(v-CE_JW_ANS[ci])<0.02){inp.className='ba-cell-input ok';n++}else{inp.className='ba-cell-input bad'}})
  const badge=$('ce-jw-badge');ceJWOk=(n===2)
  badge.textContent=ceJWOk?'✓ Correct!':'not yet';badge.className=`badge ${ceJWOk?'gg':'rg'}`
  const hint=$('ce-jw-hint')
  if(ceJWOk){
    hint.className='guidance-box done';hint.innerHTML=`<strong>✓ J(W) = (0.05, 1.44) — correct!</strong> Class 1 cost is much higher: the model was confidently wrong.`
    ceSetActive('ce-stage5',true);ceUpdateSubmitSummary()
  }else if(ceJW.some(v=>v!==null)){hint.className='guidance-box warm';hint.innerHTML='<strong>Hint:</strong> Sum col 0 of Y⊙log₂(P): (0+(−0.152)+0)=−0.152. J₀=−(1/3)×(−0.152)≈0.05. Repeat for col 1.'}
  else{hint.className='guidance-box cold';hint.innerHTML='J(W) has one cost per output class. Fill in both components rounded to 2 decimal places.'}
}

function ceUpdateSteps(){
  const el=$('ce-steps');if(!el)return
  const lR=CE_P.map((pr,ri)=>pr.map((_,ci)=>{const v=ceLogP[ri][ci];return v!==null?v.toFixed(3):'?'}))
  const yR=CE_Y.map((_,ri)=>[0,1].map(ci=>{const v=ceYlogP[ri][ci];return v!==null?v.toFixed(3):'?'}))
  el.innerHTML=`
    <div class="ba-step-block">
      <div class="ba-step-label" style="color:#7c3aed">Step A — log₂(P)</div>
      ${baMatHtml(lR,'#7c3aed')}
    </div>
    <div class="ba-step-block">
      <div class="ba-step-label" style="color:#0d9488">Step B — Y ⊙ log₂(P)</div>
      ${baMatHtml(yR,'#0d9488')}
    </div>
    <div class="ba-step-block">
      <div class="ba-step-label" style="color:#b45309">Step C — J(W) = −(1/3) × col sums</div>
      <div style="font-family:'Courier New',monospace;font-size:14.5px;font-weight:500;color:var(--muted)">
        col 0 sum: (0+(−0.152)+0) = −0.152<br>
        col 1 sum: ((−1)+0+(−3.322)) = −4.322<br>
        <span style="color:#c2610c;font-weight:700">J(W) = −(1/3)×(−0.152,−4.322) ≈ (0.05, 1.44)</span>
      </div>
    </div>`
}

function ceUpdateSubmitSummary(){
  const el=$('ce-submit-summary')
  if(el) el.innerHTML=`
    <p><strong>log₂(P):</strong> ${ceLogPOk?'<span style="color:#16a34a">✓ correct</span>':'<span style="color:#5c4a3a;font-weight:600">not yet</span>'}</p>
    <p><strong>Y⊙log₂(P):</strong> ${ceYlogPOk?'<span style="color:#16a34a">✓ correct</span>':'<span style="color:#5c4a3a;font-weight:600">not yet</span>'}</p>
    <p><strong>J(W):</strong> ${ceJWOk?`<span style="color:#16a34a">✓ (${ceJW[0].toFixed(2)}, ${ceJW[1].toFixed(2)})</span>`:'<span style="color:#5c4a3a;font-weight:600">not yet</span>'}</p>
    <p style="margin-top:4px">Stage: <strong>${ceStage}/5</strong></p>
    ${ceJWOk?'<p style="color:#16a34a;margin-top:4px">✓ All stages complete!</p>':''}`
  updateBadge('ce-completed', isComplete('ce'))
}

// ══════════════════════════════════════════════════
//  COMPLETION BADGE
// ══════════════════════════════════════════════════
function updateBadge(id, done) {
  const el = $(id)
  if (el) el.style.display = done ? 'inline-block' : 'none'
  const banner = $(id.replace('-completed', '-done'))
  if (banner) banner.style.display = done ? 'block' : 'none'
}

function isComplete(module) {
  try {
    if (module === 'neuron') { const a = nX.reduce((s,x,i)=>s+x*nW[i],0); return Math.abs(a - TARGET_A) < 0.001 }
    if (module === 'bias') { const XnWn=baXnewWnew(),Y=baY(); const Yn=XnWn?XnWn.map(r=>r.map(v=>Math.max(0,v))):null; return Yn?Y.every((row,ri)=>row.every((v,ci)=>Math.abs(v-Yn[ri][ci])<1e-9)):false }
    if (module === 'ce') return ceJWOk
    if (module === 'a422') return a4ScDone.every(Boolean)
    if (module === 'a423') return a4QuizDone
    if (module === 'maxout') return mxVerifyCount() === MX_TEST_X.length
    if (module === 'regions') return lrCountCorrectSteps() === 5
    if (module === 'compgraph') return cgCountClassifyCorrect() === 8 && Object.values(cgWired).filter(Boolean).length === 4
    if (module === 'backprop') return bpCountCorrect() === 6 && !!bpMcqCorrect
    if (module === 'regrace') return rrCountOk() === 16 && rrNoreg === true && rrL1mcq === true && rrL2mcq === true
    if (module === 'earlystop') return esStopMcq === true && esEpochOk === true
    if (module === 'dropout') return Object.values(dpMcq).filter(v=>v===true).length === 3 && dpBestMcq === true
    if (module === 'taxonomy') return kdAllDistsOk() && Object.values(kdMcq).filter(v=>v===true).length === 4
    if (module === 'surrogate') return SL.warmupCorrect && SL.flashSeen.size===SL_FLASH.length && SL.matchAllOk && Object.values(SL.mcq).filter(v=>v===true).length === 11
    if (module === 'gradnorm') return Object.values(gnMcq).filter(v=>v===true).length === 4 && gnMcqClip === true
    if (module === 'momentum') return mmCountNoMomOk() === 3 && mmCountMomOk() === 3 && mmMcq.accum === true && mmMcq.carry === true
    if (module === 'transferlearn') return Object.values(tlMcq).filter(v=>v===true).length === 4 && tlPxOk
    if (module === 'optrace') return Object.values(orMcq).filter(v=>v===true).length === 4 && orFinal === true
    if (module === 'batchnorm') return bnMeansOk && bnWpOk && bnBetaOk && bnWhyOk
    if (module === 'conv91') return cvSolved.every(Boolean) && cvDesignOk && Object.values(cvQ).every(v=>v===true) && Object.values(cvSize).every(v=>v===true)
    if (module === 'pool93') return plMaxOk && plFix===true && plAdapt===true && Object.values(plQ).every(v=>v===true)
    if (module === 'gcmech') return gmFillOk && gmLearnOk && Object.values(gmQ).every(v=>v===true)
    if (module === 'gceq') return geRowOk && geStencilOk && Object.values(geQ).every(v=>v===true)
    if (module === 'textcnn') return Object.values(tcFill).every(v=>v===true) && tcRnnDone && Object.values(tcQ).every(v=>v===true)
    if (module === 'rnnfwd') return rfOk[1] && rfOk[2] && rfRun[2] && rfRun[3] && Object.values(rfQ).every(v=>v===true)
    if (module === 'rnndesign') return rdTasks.greedy && rdTasks.nofb && Object.values(rdQ).every(v=>v===true)
    if (module === 'rnntanh') return rnZOk && rnSeen.tuned && rnSeen.big && Object.values(rnQ).every(v=>v===true)
    if (module === 'birnn') return brDepsOk[0] && brDepsOk[1] && brCalcOk && brEqOk && Object.values(brQ).every(v=>v===true)
    if (module === 'nerseq') return nsTag1Ok && nsNestOk && Object.values(nsFill).every(Boolean) && Object.values(nsQ).every(v=>v===true)
    if (module === 'recnets') return rcCalcOk && rcInflOk && rcFill.chain && rcFill.bal && rcMatchOk && Object.values(rcQ).every(v=>v===true)
    if (module === 'linrnn') return lmUnrollOk && Object.values(lmFill).every(Boolean) && Object.values(lmQ).every(v=>v===true)
    if (module === 'grucomp') return Object.values(ggTasks).every(Boolean) && ggMapOk && Object.values(ggFill).every(Boolean) && Object.values(ggQ).every(v=>v===true)
    if (module === 'trfpos') return poSeen.order2 && poSeen.pe && Object.values(poFill).every(Boolean) && poMatchOk && Object.values(poQ).every(v=>v===true)
    if (module === 'cancernlp') return Object.values(cnFill).every(Boolean) && cnTasks.accmax && cnTasks.rec98 && Object.values(cnQ).every(v=>v===true)
    if (module === 'learncurve') return lcGapsOk && lcDiagOk && lcFill.dbl && lcSeen256 && lcMatchOk && Object.values(lcQ).every(v=>v===true)
    if (module === 'hypband') return hbRace.reveal && hbNOk && Object.values(hbFill).every(Boolean) && Object.values(hbQ).every(v=>v===true)
    if (module === 'limeeeg') return leOneDrop && leFill.comp && leFits.n100 && leFits.n20>=2 && leFits.zero && Object.values(leQ).every(v=>v===true)
    if (module === 'gradattr') return Object.values(gaFill).every(Boolean) && gaMatchOk && Object.values(gaQ).every(v=>v===true)
  } catch(e) {}
  return false
}

// ══════════════════════════════════════════════════
//  SUBMISSION
// ══════════════════════════════════════════════════
// ══════════════════════════════════════════════════
//  INIT — wait for KaTeX (defer scripts) to be ready
// ══════════════════════════════════════════════════
function initDoneBanners() {
  const pairs = [
    ['tab-0.0','n'],['tab-6.1','ba'],['tab-6.2.1','ce'],
    ['tab-6.2.2','a422'],['tab-6.2.3','a423'],['tab-6.3','mx'],
    ['tab-6.4','lr'],['tab-6.5.1','cg'],['tab-6.5.2','bp'],
    ['tab-7.1','rr'],['tab-7.8','es'],['tab-7.12','dp'],
    ['tab-7.KD','kd'],['tab-8.1','sl'],['tab-8.2','gn'],
    ['tab-8.3','mm'],['tab-8.4','tl'],['tab-8.5','or'],
    ['tab-8.7.1','bn'],['tab-9.1','cv'],['tab-9.3','pl'],
    ['tab-9.GC.1','gm'],['tab-9.GC.2','ge'],
    ['tab-10.1.1','tcnn'],['tab-10.1.2','rfwd'],['tab-10.2.1','rdes'],['tab-10.2.2','rtnh'],
    ['tab-10.3','birnn'],['tab-10.4','nerseq'],['tab-10.6','recnets'],['tab-10.7','linrnn'],
    ['tab-10.10','grucomp'],['tab-10.TF','trfpos'],['tab-11.1','cancernlp'],['tab-11.3','learncurve'],
    ['tab-11.4','hypband'],['tab-11.LS','limeeeg'],['tab-11.GA','gradattr']
  ]
  for (const [tabId, prefix] of pairs) {
    const tab = $(tabId)
    if (!tab) continue
    const banner = document.createElement('div')
    banner.id = prefix + '-done'
    banner.className = 'activity-done-banner'
    banner.textContent = '✓ Activity Complete'
    tab.appendChild(banner)
  }
}


// ══════════════════════════════════════════════════
//  ACTIVITY 4 — PART 1: Sigmoid Cross-Entropy Cost
// ══════════════════════════════════════════════════
let a4Y=0, a4Z=0
const a4ScDone=[false,false,false,false]
let a4Explored=false, a4QuizUnlocked=false, a4QuizDone=false
const a4QuizAnswers={}

const softplus = z => z > 50 ? z : Math.log(1 + Math.exp(z))
const a4Cost   = (y, z) => softplus((1-2*y)*z)

function a4SetY(y) {
  a4Y=y
  $('a4-y0-btn').className = y===0 ? 'btn btn-p' : 'btn btn-g'
  $('a4-y1-btn').className = y===1 ? 'btn btn-s' : 'btn btn-g'
  a4Refresh()
}

function a4UpdateZ(val) {
  a4Z=parseFloat(val)
  $('a4-z-val').textContent=a4Z.toFixed(1)
  a4Refresh()
}

function a4SnapScenario(y, z) {
  a4Y=y
  $('a4-y0-btn').className = y===0 ? 'btn btn-p' : 'btn btn-g'
  $('a4-y1-btn').className = y===1 ? 'btn btn-s' : 'btn btn-g'
  a4Z=z; $('a4-z-slider').value=z; $('a4-z-val').textContent=z.toFixed(1)

  // Mark scenarios — only ever triggered by an explicit click on a case card, never by the z slider
  if(y===0&&z<-0.5&&!a4ScDone[0]){a4ScDone[0]=true;a4MarkScenario(0)}
  if(y===0&&z>0.5 &&!a4ScDone[1]){a4ScDone[1]=true;a4MarkScenario(1)}
  if(y===1&&z<-0.5&&!a4ScDone[2]){a4ScDone[2]=true;a4MarkScenario(2)}
  if(y===1&&z>0.5 &&!a4ScDone[3]){a4ScDone[3]=true;a4MarkScenario(3)}

  a4Refresh()
}

function a4Refresh() {
  const y=a4Y, z=a4Z
  const flip=1-2*y, arg=-flip*z, sig=sigmoid(arg), cost=a4Cost(y,z)

  // Formula expansion
  $('a4-exp-y').textContent=y
  $('a4-exp-y').style.color=y===0?'#1d4ed8':'#15803d'
  $('a4-exp-flip').textContent=flip>0?'+'+flip:flip
  $('a4-exp-flip').style.color='#6d28d9'
  $('a4-exp-neg').textContent=arg.toFixed(4)
  $('a4-exp-neg').style.color=arg>=0?'#c2610c':'#1d4ed8'
  $('a4-exp-sig').textContent=sig.toFixed(5)
  $('a4-exp-sig2').textContent=sig.toFixed(5)
  const costEl=$('a4-cost-big'), col=cost<0.5?'#15803d':cost<2?'#c2610c':'#b91c1c'
  costEl.textContent=cost.toFixed(5); costEl.style.color=col

  a4DrawPlot(y,z,cost)
  a4UpdatePlotLabel(y,z,cost)
  a4CheckScenariosAll()
  a4UpdateSubmit()
}

const a4ScInsights=[
  'Cost ≈ 0 ✓ — model leans negative (class 0) and that is correct.',
  'Cost is HIGH ✗ — model leans positive (class 1) but truth is y=0. Wrong confidence is penalised heavily.',
  'Cost is HIGH ✗ — model leans negative (class 0) but truth is y=1. The (1−2y) flip makes this expensive too.',
  'Cost ≈ 0 ✓ — model leans positive (class 1) and that is correct. ζ(−z) ≈ 0 when z≫0.'
]

function a4MarkScenario(i) {
  const el=$(`a4-sc${i}`)
  el.classList.add('done')
  el.querySelector('.a4-sc-icon').textContent='✓'
  const ins=document.createElement('div')
  ins.style.cssText='font-size:13.5px;color:#14532d;margin-top:5px;font-weight:500;line-height:1.6'
  ins.textContent=a4ScInsights[i]
  el.appendChild(ins)
}

function a4CheckScenariosAll() {
  const done=a4ScDone.filter(Boolean).length
  const guide=$('a4-sc-guidance')
  if(done===4) {
    guide.className='guidance-box done'
    guide.innerHTML='<strong>✓ All four cases explored!</strong> The (1−2y) term flips the sign so the same formula correctly penalises errors for both y=0 and y=1.'
  } else {
    guide.className='guidance-box cold'
    guide.innerHTML=`${done}/4 cases explored. Click each scenario below to mark it explored.`
  }
}

function a4UpdatePlotLabel(y,z,cost) {
  const el=$('a4-plot-label')
  const correct=(y===0&&z<0)||(y===1&&z>0)
  const col=correct?'#15803d':cost>2?'#b91c1c':'#c2610c'
  el.style.color=col
  el.innerHTML=`z = ${z.toFixed(2)},&nbsp; y = ${y}&nbsp;&nbsp;→&nbsp;&nbsp;J(w) = <strong>${cost.toFixed(4)}</strong>&nbsp;&nbsp;&nbsp;${correct?'✓ low cost (correct direction)':cost>2?'✗ high cost (confidently wrong)':'⚠ moderate cost'}`
}

function a4DrawPlot(activeY, z, cost) {
  const svg=$('a4-plot'); if(!svg)return
  const W=420,H=280,ml=46,mr=16,mt=16,mb=36
  const pw=W-ml-mr, ph=H-mt-mb
  const zMin=-10,zMax=10,cMax=10
  const px=z=>ml+(z-zMin)/(zMax-zMin)*pw
  const py=c=>mt+ph-Math.min(c/cMax,1.0)*ph

  const curvePts=y=>Array.from({length:241},(_,i)=>{
    const zv=zMin+i*(zMax-zMin)/240
    return `${px(zv).toFixed(1)},${py(a4Cost(y,zv)).toFixed(1)}`
  }).join(' ')

  const xTicks=[-10,-5,0,5,10]
  const yTicks=[0,2,4,6,8,10]
  const gridX=xTicks.map(v=>`
    <line x1="${px(v).toFixed(1)}" y1="${mt}" x2="${px(v).toFixed(1)}" y2="${mt+ph}" stroke="var(--border)" stroke-width=".6" stroke-dasharray="4,4"/>
    <line x1="${px(v).toFixed(1)}" y1="${mt+ph}" x2="${px(v).toFixed(1)}" y2="${mt+ph+5}" stroke="var(--muted)" stroke-width="1"/>
    <text x="${px(v).toFixed(1)}" y="${mt+ph+20}" text-anchor="middle" font-size="12" fill="var(--muted)">${v}</text>`).join('')
  const gridY=yTicks.map(v=>`
    <line x1="${ml}" y1="${py(v).toFixed(1)}" x2="${ml+pw}" y2="${py(v).toFixed(1)}" stroke="var(--border)" stroke-width=".6" stroke-dasharray="4,4"/>
    <line x1="${ml-5}" y1="${py(v).toFixed(1)}" x2="${ml}" y2="${py(v).toFixed(1)}" stroke="var(--muted)" stroke-width="1"/>
    <text x="${ml-8}" y="${(py(v)+5).toFixed(1)}" text-anchor="end" font-size="12" fill="var(--muted)">${v}</text>`).join('')

  const dotCost=Math.min(cost,cMax)
  const dx=px(z).toFixed(1), dy=py(dotCost).toFixed(1)
  const dotCol=activeY===0?'#1d4ed8':'#15803d'
  const correct=(activeY===0&&z<0)||(activeY===1&&z>0)
  const dotRing=correct?'#dcfce7':'#fee2e2'

  svg.innerHTML=`
    <rect width="${W}" height="${H}" fill="var(--surface)"/>
    ${gridX}${gridY}
    <line x1="${ml}" y1="${mt}" x2="${ml}" y2="${mt+ph}" stroke="var(--text)" stroke-width="1.5"/>
    <line x1="${ml}" y1="${mt+ph}" x2="${ml+pw}" y2="${mt+ph}" stroke="var(--text)" stroke-width="1.5"/>
    <line x1="${px(0).toFixed(1)}" y1="${mt}" x2="${px(0).toFixed(1)}" y2="${mt+ph}" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="6,4"/>
    <text x="${(px(0)+4).toFixed(1)}" y="${mt+14}" font-size="11" fill="var(--muted)">z=0</text>
    <polyline points="${curvePts(0)}" fill="none" stroke="#1d4ed8" stroke-width="${activeY===0?2.8:1.2}" opacity="${activeY===0?1:0.25}" stroke-linejoin="round"/>
    <polyline points="${curvePts(1)}" fill="none" stroke="#15803d" stroke-width="${activeY===1?2.8:1.2}" opacity="${activeY===1?1:0.25}" stroke-linejoin="round"/>
    <circle cx="${dx}" cy="${dy}" r="8" fill="${dotRing}" stroke="${dotCol}" stroke-width="2.5"/>
    <circle cx="${dx}" cy="${dy}" r="4" fill="${dotCol}"/>
    <line x1="${dx}" y1="${mt+ph}" x2="${dx}" y2="${dy}" stroke="${dotCol}" stroke-width="1" stroke-dasharray="4,3" opacity=".5"/>
    <text x="${W-mr-2}" y="${mt+ph-4}" text-anchor="end" font-size="11" fill="#1d4ed8" font-weight="700">y=0: ζ(z)</text>
    <text x="${W-mr-2}" y="${mt+ph-18}" text-anchor="end" font-size="11" fill="#15803d" font-weight="700">y=1: ζ(−z)</text>
    <text x="${ml+pw/2}" y="${H-2}" text-anchor="middle" font-size="13" fill="var(--muted)" font-weight="600">z = wᵀh + b</text>
    <text x="13" y="${mt+ph/2}" text-anchor="middle" font-size="12" fill="var(--muted)" transform="rotate(-90,13,${mt+ph/2})">J(w)</text>`
}

// ══════════════════════════════════════════════════
//  ACTIVITY 4 — PART 2: n Sigmoid vs Softmax
// ══════════════════════════════════════════════════
let a4Scores=[2,-1,0.5]
const a4Labels=['a<sub>1</sub>','a<sub>2</sub>','a<sub>3</sub>']
const a4Colors=['#1d4ed8','#c2610c','#6d28d9']

function a4Preset(vals) {
  a4Scores=[...vals]
  vals.forEach((v,i)=>{
    const sl=$(`a4-score-${i}`)
    if(sl){sl.value=v; $(`a4-score-val-${i}`).textContent=v.toFixed(1)}
  })
  a4Explored=true
  a4TryUnlockQuiz()
  a4UpdateComparison()
}

function a4RenderScoreSliders() {
  const c=$('a4-score-sliders'); if(!c)return
  c.innerHTML=''
  a4Scores.forEach((val,i)=>{
    const row=document.createElement('div'); row.className='slider-row'
    row.innerHTML=`
      <div class="slider-label" style="width:120px">
        <span style="font-size:17px;font-weight:700;font-family:'Courier New',monospace;color:${a4Colors[i]}">${a4Labels[i]}</span>
        <span id="a4-score-val-${i}" style="font-family:'Courier New',monospace;font-weight:700;color:${a4Colors[i]}">${val.toFixed(1)}</span>
      </div>
      <input type="range" id="a4-score-${i}" min="-6" max="6" step="0.1" value="${val}" style="flex:1" oninput="a4ScoreChange(${i},this.value)">`
    c.appendChild(row)
  })
}

function a4ScoreChange(i,val) {
  a4Scores[i]=parseFloat(val)
  $(`a4-score-val-${i}`).textContent=a4Scores[i].toFixed(1)
  a4Explored=true
  a4TryUnlockQuiz()
  a4UpdateComparison()
}

function a4SigOuts()  { return a4Scores.map(a=>sigmoid(a)) }
function a4SmxOuts()  {
  const ex=a4Scores.map(a=>Math.exp(Math.min(a,50)))
  const Z=ex.reduce((s,e)=>s+e,0)
  return ex.map(e=>e/Z)
}

function a4BarHTML(label,val,color,formula) {
  const pct=(val*100).toFixed(1)
  return `<div>
    <div class="a4-bar-row">
      <div class="a4-bar-label" style="color:${color};font-size:19px;width:38px">${label}</div>
      <div class="a4-bar-track">
        <div class="a4-bar-fill" style="width:${pct}%;background:${color}25;border-right:3px solid ${color}"></div>
      </div>
      <span class="a4-bar-val" style="color:${color}">${val.toFixed(4)}</span>
    </div>
    <div style="font-family:'Courier New',monospace;font-size:14.5px;color:var(--muted);padding-left:40px;margin-top:2px">${formula}</div>
  </div>`
}

function a4UpdateComparison() {
  const sigs=a4SigOuts(), smxs=a4SmxOuts()
  const sigSum=sigs.reduce((s,v)=>s+v,0)

  // Sigmoid bars
  const sigC=$('a4-sig-bars')
  if(sigC) sigC.innerHTML=sigs.map((v,i)=>a4BarHTML(
    a4Labels[i], v, a4Colors[i], `= σ(${a4Scores[i].toFixed(2)})`
  )).join('')

  // Sigmoid sum
  const sumEl=$('a4-sig-sum'), noteEl=$('a4-sig-note')
  if(sumEl) {
    const s=sigSum.toFixed(4)
    const far=Math.abs(sigSum-1)>0.05
    sumEl.textContent=s
    sumEl.style.color=far?'#b91c1c':'#c2610c'
    if(noteEl) noteEl.innerHTML=sigSum>1.05
      ?`<span style="color:#b91c1c;font-weight:600">⚠ Sum = ${s} — exceeds 1. Not a probability distribution.</span>`
      :sigSum<0.95
        ?`<span style="color:#c2610c;font-weight:600">⚠ Sum = ${s} — below 1. Not a probability distribution.</span>`
        :`<span style="color:#c2610c;font-weight:500">Sum ≈ 1 here by coincidence — not guaranteed in general.</span>`
  }

  // Softmax bars
  const smxC=$('a4-smx-bars')
  const Z=a4Scores.map(a=>Math.exp(Math.min(a,50))).reduce((s,e)=>s+e,0)
  if(smxC) smxC.innerHTML=smxs.map((v,i)=>a4BarHTML(
    a4Labels[i], v, a4Colors[i], `= e<sup>${a4Scores[i].toFixed(2)}</sup> / ${Z.toFixed(2)}`
  )).join('')

  // Key difference panel
  const dp=$('a4-diff-panel')
  if(dp) dp.innerHTML=`
    <div>
      <div style="font-size:13.5px;font-weight:800;color:#1d4ed8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Sigmoid — Independent</div>
      <div style="font-size:15.5px;color:var(--muted);font-weight:500;line-height:2">
        Changing <strong style="color:${a4Colors[0]}">a<sub>1</sub></strong> only changes <strong style="color:${a4Colors[0]}">p<sub>1</sub></strong>.<br>
        p<sub>2</sub> = σ(a<sub>2</sub>) = <strong style="color:${a4Colors[1]}">${sigs[1].toFixed(4)}</strong> — unaffected by a<sub>1</sub>.<br>
        p<sub>3</sub> = σ(a<sub>3</sub>) = <strong style="color:${a4Colors[2]}">${sigs[2].toFixed(4)}</strong> — unaffected by a<sub>1</sub>.<br>
        <span style="color:#c2610c;font-weight:600">Σ p<sub>k</sub> = ${sigSum.toFixed(4)} — no constraint on sum.</span>
      </div>
    </div>
    <div>
      <div style="font-size:13.5px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Softmax — Competitive</div>
      <div style="font-size:15.5px;color:var(--muted);font-weight:500;line-height:2">
        Boosting <strong style="color:${a4Colors[0]}">a<sub>1</sub></strong> forces p<sub>2</sub> and p<sub>3</sub> to shrink.<br>
        All three share a common normaliser Z = ${Z.toFixed(3)}.<br>
        p<sub>1</sub> = ${smxs[0].toFixed(4)}, p<sub>2</sub> = ${smxs[1].toFixed(4)}, p<sub>3</sub> = ${smxs[2].toFixed(4)}.<br>
        <span style="color:#15803d;font-weight:600">Σ p<sub>k</sub> = 1.000 — always. ✓</span>
      </div>
    </div>`

  a4UpdateSubmit()
}

// ── Quiz ──────────────────────────────────────────
const a4QuizData=[
  {q:'An image can be tagged "cat" AND "dog" simultaneously.',answer:'sigmoid',reason:'Labels are not mutually exclusive. Each tag is an independent yes/no decision.'},
  {q:'Classify a handwritten digit — exactly one answer from 0 to 9.',answer:'softmax',reason:'Mutually exclusive classes. Exactly one digit wins; outputs must sum to 1.'},
  {q:'Detect multiple objects in a scene — each object either present or absent.',answer:'sigmoid',reason:'Each object detection is independent. An image can contain 0 to n objects.'},
  {q:'Predict the next word from a vocabulary of 50,000 words.',answer:'softmax',reason:'Exactly one word follows — this is a competitive distribution over the vocabulary.'},
]

function a4TryUnlockQuiz() {}

function a4RenderQuiz() {
  const c=$('a4-quiz-items'); if(!c)return
  c.innerHTML=a4QuizData.map((item,i)=>`
    <div style="background:var(--surf2);border:1px solid var(--border);border-radius:8px;padding:14px 16px" id="a4-qi-${i}">
      <div style="font-size:15.5px;font-weight:600;color:var(--text);margin-bottom:10px">${i+1}. ${item.q}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-g" id="a4-qb-${i}-sigmoid" onclick="a4Answer(${i},'sigmoid')">Sigmoid</button>
        <button class="btn btn-g" id="a4-qb-${i}-softmax" onclick="a4Answer(${i},'softmax')">Softmax</button>
      </div>
      <div id="a4-qr-${i}" style="font-size:14.5px;margin-top:8px;min-height:18px;font-weight:500"></div>
    </div>`).join('')
}

function a4Answer(i,choice) {
  if(a4QuizAnswers[i]!==undefined)return
  a4QuizAnswers[i]=choice
  const item=a4QuizData[i], ok=choice===item.answer
  const box=$(`a4-qi-${i}`), res=$(`a4-qr-${i}`)
  box.style.borderColor=ok?'#15803d':'#b91c1c'
  box.style.background=ok?'#f0fdf4':'#fff5f5'
  res.innerHTML=ok
    ?`<span style="color:#15803d;font-weight:700">✓ Correct!</span> ${item.reason}`
    :`<span style="color:#b91c1c;font-weight:700">✗ Not quite.</span> The answer is <strong>${item.answer}</strong>. ${item.reason}`
  ;['sigmoid','softmax'].forEach(o=>{ const b=$(`a4-qb-${i}-${o}`); if(b)b.disabled=true })
  if(Object.keys(a4QuizAnswers).length===a4QuizData.length) {
    const nOk=a4QuizData.filter((_,j)=>a4QuizAnswers[j]===a4QuizData[j].answer).length
    $('a4-quiz-guidance').className='guidance-box done'
    $('a4-quiz-guidance').innerHTML=`<strong>Quiz complete — ${nOk}/${a4QuizData.length} correct.</strong> ${nOk===4?'Perfect understanding!':'Review the explanations above.'}`
    $('a4-quiz-badge').textContent=`${nOk}/4 correct`
    $('a4-quiz-badge').className=`badge ${nOk===4?'gg':'og'}`
    a4QuizDone=true
    a4UpdateSubmit()
  }
}

function a4UpdateSubmit() {
  const p1=a4ScDone.filter(Boolean).length
  const nOk=a4QuizDone?a4QuizData.filter((_,i)=>a4QuizAnswers[i]===a4QuizData[i].answer).length:0
  const el1=$('a422-submit-summary')
  if(el1) el1.innerHTML=`
    <p><strong>Cases explored:</strong> ${p1}/4 ${p1===4?'<span style="color:#15803d">✓</span>':''}</p>
    <p><strong>Last state:</strong> y=${a4Y}, z=${a4Z.toFixed(1)}</p>
    ${p1===4?'<p style="color:#15803d;margin-top:4px;font-weight:600">✓ All cases explored</p>':''}`
  const el2=$('a423-submit-summary')
  if(el2) el2.innerHTML=`
    <p><strong>Slider interaction:</strong> ${a4Explored?'<span style="color:#15803d">✓ done</span>':'not yet — drag the score sliders'}</p>
    <p><strong>Quiz:</strong> ${a4QuizDone?`<span style="color:#15803d">${nOk}/4 correct ✓</span>`:'not yet answered'}</p>
    ${(a4Explored&&a4QuizDone)?'<p style="color:#15803d;margin-top:4px;font-weight:600">✓ All done!</p>':''}`
  updateBadge('a422-completed', isComplete('a422'))
  updateBadge('a423-completed', isComplete('a423'))
}

function initAct4() {
  a4SetY(0)
  a4UpdateZ(0)
  a4RenderScoreSliders()
  a4UpdateComparison()
  a4RenderQuiz()
  a4DrawPlot(0,0,a4Cost(0,0))
  a4UpdatePlotLabel(0,0,a4Cost(0,0))
}

// ══════════════════════════════════════════════════
//  ACTIVITY 6.3 — MAXOUT UNITS
// ══════════════════════════════════════════════════
const MX_COLORS=['#1d4ed8','#c2610c','#6d28d9']
const MX_TEST_X=[-3,-2,-1,-0.5,0,0.5,1,2,3]
let mxMode='relu'
let mxPieces=[{w:0,b:0},{w:0,b:0},{w:0,b:-3}]
let mxPiece3On=false
let mxX=1.5
let mxLog=[], mxStartTime=null, mxTimerTick=null

function mxTarget(x){ return mxMode==='relu' ? Math.max(0,x) : Math.abs(x) }
function mxActivePieces(){ return mxPieces.slice(0, mxPiece3On?3:2) }
function mxValue(x){ return Math.max(...mxActivePieces().map(p=>p.w*x+p.b)) }
function mxVerifyCount(){ return MX_TEST_X.filter(x=>Math.abs(mxValue(x)-mxTarget(x))<1e-6).length }
function mxAvgError(){
  let sum=0,c=0
  for(let x=-3;x<=3.001;x+=0.1){ sum+=Math.abs(mxValue(x)-mxTarget(x)); c++ }
  return sum/c
}

function mxElapsed(){
  if(!mxStartTime) return '00:00'
  const s=Math.floor((Date.now()-mxStartTime)/1000)
  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')
}
function mxStartTimer(){
  if(mxStartTime) return
  mxStartTime=Date.now()
  mxTimerTick=setInterval(()=>{
    const t=$('mx-timer'); if(t) t.textContent=mxElapsed()
    const m=$('mx-timer-meta'); if(m) m.textContent=`${mxLog.length} interaction${mxLog.length!==1?'s':''} recorded`
  },1000)
}
function mxLogEvent(field,from,to){
  mxStartTimer()
  mxLog.unshift({time:mxElapsed(),field,from,to})
  if(mxLog.length>30) mxLog.pop()
}

function mxRenderPieces(){
  const c=$('mx-pieces'); c.innerHTML=''
  const active=mxPiece3On?3:2
  for(let i=0;i<active;i++){
    const wrap=document.createElement('div')
    wrap.style.cssText=`margin-bottom:14px;padding-bottom:10px${i<active-1?';border-bottom:1px solid var(--border)':''}`
    const title=document.createElement('div')
    title.style.cssText=`font-family:"Courier New",monospace;font-size:14.5px;font-weight:700;margin-bottom:8px;color:${MX_COLORS[i]}`
    title.textContent=`Piece ${i+1}: z${i+1} = w${i+1}·x + b${i+1}`
    wrap.appendChild(title)
    c.appendChild(wrap)
    makeSlider(wrap,`mx-w${i}`,`w${i+1}`,mxPieces[i].w,-2,2,0.25,val=>{
      mxLogEvent('w'+(i+1), mxPieces[i].w.toFixed(2), val.toFixed(2)); mxPieces[i].w=val; mxRefresh()
    },'wt')
    makeSlider(wrap,`mx-b${i}`,`b${i+1}`,mxPieces[i].b,-3,3,0.25,val=>{
      mxLogEvent('b'+(i+1), mxPieces[i].b.toFixed(2), val.toFixed(2)); mxPieces[i].b=val; mxRefresh()
    })
  }
}

function mxSetMode(mode){
  const prev=mxMode
  mxMode=mode
  $('mx-mode-relu').className = mode==='relu' ? 'btn btn-p' : 'btn btn-g'
  $('mx-mode-abs').className  = mode==='abs'  ? 'btn btn-p' : 'btn btn-g'
  $('mx-target-label').textContent = mode==='relu' ? 'ReLU(x) = max(0, x)' : '|x| = max(x, −x)'
  if(prev!==mode) mxLogEvent('mode', prev, mode)
  mxRefresh()
}

function mxTogglePiece3(checked){
  mxPiece3On=checked
  mxLogEvent('piece3', checked?'off':'on', checked?'on':'off')
  mxRenderPieces()
  mxRefresh()
}

function mxUpdateX(val){
  mxX=parseFloat(val)
  $('mx-x-val').textContent=mxX.toFixed(2)
  mxRefresh()
}

function mxRefresh(){
  mxDrawPlot()
  mxRenderAlgebra()
  mxRenderVerification()
  mxRenderGuidance()
  mxRenderLog()
  mxRenderSubmitSummary()
}

function mxRenderAlgebra(){
  const pieces=mxActivePieces(), x=mxX
  const zs=pieces.map(p=>p.w*x+p.b)
  const win=zs.indexOf(Math.max(...zs))
  const h=zs[win], t=mxTarget(x), match=Math.abs(h-t)<1e-6
  const rows=zs.map((z,i)=>`<div class="alg-step" style="color:${i===win?MX_COLORS[i]:'var(--muted)'};font-weight:${i===win?700:500}">z${i+1} = ${pieces[i].w.toFixed(2)}×${x.toFixed(2)} + ${pieces[i].b.toFixed(2)} = ${z.toFixed(3)}${i===win?' ← max':''}</div>`).join('')
  $('mx-algebra').innerHTML = `
    ${rows}
    <div class="alg-res" style="color:${MX_COLORS[win]}">h(x) = max(${zs.map(z=>z.toFixed(2)).join(', ')}) = ${h.toFixed(3)}</div>
    <div style="margin-top:8px;font-size:14.5px;font-weight:600;color:${match?'#15803d':'#b91c1c'}">target(x) = ${t.toFixed(3)} ${match?'✓ match':'✗ no match'}</div>`
}

function mxRenderVerification(){
  const rows=MX_TEST_X.map(x=>{
    const t=mxTarget(x), v=mxValue(x), ok=Math.abs(t-v)<1e-6
    return `<tr class="${ok?'good':'bad'}"><td>${x}</td><td>${t.toFixed(2)}</td><td>${v.toFixed(2)}</td><td>${ok?'✓':'✗'}</td></tr>`
  }).join('')
  $('mx-verify-body').innerHTML=rows
  const n=mxVerifyCount(), badge=$('mx-verify-badge')
  badge.textContent=`${n}/${MX_TEST_X.length} match`
  badge.className=`badge ${n===MX_TEST_X.length?'gg':n>0?'og':'rg'}`
}

function mxRenderGuidance(){
  const el=$('mx-guidance')
  const err=mxAvgError(), n=mxVerifyCount(), total=MX_TEST_X.length
  const modeName = mxMode==='relu' ? 'ReLU' : '|x|'
  let cls,msg
  if(err<1e-6){
    cls='done'
    msg=`<strong>🎯 Correct!</strong> Every sample matches ${modeName} exactly. ${mxMode==='relu' ? 'One piece is the zero-function (w=0, b=0), the other is the identity (w=1, b=0) — the max picks whichever is positive.' : 'One piece is +x, the other is −x — the max always picks the positive one.'}`
  } else if(n>0 || err<1.5){
    cls = n>=Math.floor(total*0.6) ? 'hot' : 'warm'
    msg = mxMode==='relu'
      ? `<strong>Getting closer.</strong> ReLU is 0 for x&lt;0 and equals x for x≥0. Try making one piece always equal <code>0</code> (w=0, b=0) and the other always equal <code>x</code> (w=1, b=0).`
      : `<strong>Getting closer.</strong> |x| equals x for x≥0 and −x for x&lt;0. Try one piece as <code>+x</code> (w=1, b=0) and the other as <code>−x</code> (w=−1, b=0).`
  } else {
    cls='cold'
    msg = !mxLog.length
      ? `Adjust the piece sliders above. Think of it as a question: what linear function of x always equals ${mxMode==='relu'?'0':'x'}? What about ${mxMode==='relu'?'x':'−x'}?`
      : `Average error is still high (${err.toFixed(2)}). Each piece is a straight line <code>wx+b</code> — pick two lines whose upper envelope traces ${modeName}.`
  }
  el.innerHTML=`<div class="guidance-box ${cls}">${msg}</div>`
}

function mxRenderLog(){
  const el=$('mx-log')
  if(!el) return
  if(!mxLog.length){ el.innerHTML='<p style="font-size:14.5px;color:var(--muted);font-weight:500;padding:8px 0">No interactions yet — adjust a piece slider to start.</p>'; return }
  const rows=mxLog.map(e=>`<tr><td>${e.time}</td><td style="color:#b45309">${e.field}</td><td style="color:var(--muted)">${e.from}</td><td style="color:var(--text)">${e.to}</td></tr>`).join('')
  el.innerHTML=`<table class="log-table"><thead><tr><th>Time</th><th>Field</th><th>From</th><th>To</th></tr></thead><tbody>${rows}</tbody></table>`
}

function mxRenderSubmitSummary(){
  const err=mxAvgError(), n=mxVerifyCount(), total=MX_TEST_X.length
  const el=$('mx-submit-summary'); if(el){
  const elapsed = mxStartTime ? mxElapsed() : '—'
  el.innerHTML = `
    <p><strong>Mode:</strong> ${mxMode==='relu'?'ReLU':'|x|'} &nbsp;·&nbsp; <strong>Match:</strong> ${n}/${total} test points &nbsp;·&nbsp; avg error ${err.toFixed(4)}</p>
    <p style="margin-top:4px">Pieces: ${mxActivePieces().map((p,i)=>`z${i+1}=${p.w.toFixed(2)}x+${p.b.toFixed(2)}`).join(', ')}</p>
    ${n===total?'<p style="color:var(--green);margin-top:4px">✓ Matches target exactly</p>':''}`
  }
  updateBadge('mx-completed', isComplete('maxout'))
}

function mxDrawPlot(){
  const svg=$('mx-plot'); if(!svg) return
  const W=420,H=320,ml=40,mr=14,mt=14,mb=34
  const pw=W-ml-mr, ph=H-mt-mb
  const xMin=-3,xMax=3,yMin=-4,yMax=4
  const px=x=>ml+(x-xMin)/(xMax-xMin)*pw
  const py=y=>mt+ph-(y-yMin)/(yMax-yMin)*ph
  const clampY=y=>Math.max(yMin,Math.min(yMax,y))

  const N=120
  const xs=Array.from({length:N+1},(_,i)=>xMin+i*(xMax-xMin)/N)
  const targetPts=xs.map(x=>`${px(x).toFixed(1)},${py(clampY(mxTarget(x))).toFixed(1)}`).join(' ')

  const pieces=mxActivePieces()
  const piecePolys=pieces.map((p,i)=>{
    const pts=xs.map(x=>`${px(x).toFixed(1)},${py(clampY(p.w*x+p.b)).toFixed(1)}`).join(' ')
    return `<polyline points="${pts}" fill="none" stroke="${MX_COLORS[i]}" stroke-width="1.4" stroke-dasharray="5,4" opacity="0.55"/>`
  }).join('')

  let segs=[], curSeg=null, curWin=null
  xs.forEach(x=>{
    const zs=pieces.map(p=>p.w*x+p.b)
    const win=zs.indexOf(Math.max(...zs))
    const pt=`${px(x).toFixed(1)},${py(clampY(zs[win])).toFixed(1)}`
    if(win!==curWin){ if(curSeg) segs.push(curSeg); curSeg={win,pts:[pt]}; curWin=win }
    else curSeg.pts.push(pt)
  })
  if(curSeg) segs.push(curSeg)
  const envelopePolys=segs.map(s=>`<polyline points="${s.pts.join(' ')}" fill="none" stroke="${MX_COLORS[s.win]}" stroke-width="3.2" stroke-linejoin="round"/>`).join('')

  const hxClamped=clampY(mxValue(mxX))
  const dx=px(mxX).toFixed(1), dy=py(hxClamped).toFixed(1)
  const zsAtX=pieces.map(p=>p.w*mxX+p.b), winAtX=zsAtX.indexOf(Math.max(...zsAtX))

  const xTicks=[-3,-1.5,0,1.5,3], yTicks=[-4,-2,0,2,4]
  const gridX=xTicks.map(v=>`<line x1="${px(v).toFixed(1)}" y1="${mt}" x2="${px(v).toFixed(1)}" y2="${mt+ph}" stroke="var(--border)" stroke-width=".6" stroke-dasharray="4,4"/><text x="${px(v).toFixed(1)}" y="${mt+ph+18}" text-anchor="middle" font-size="11" fill="var(--muted)">${v}</text>`).join('')
  const gridY=yTicks.map(v=>`<line x1="${ml}" y1="${py(v).toFixed(1)}" x2="${ml+pw}" y2="${py(v).toFixed(1)}" stroke="var(--border)" stroke-width=".6" stroke-dasharray="4,4"/><text x="${ml-8}" y="${(py(v)+4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--muted)">${v}</text>`).join('')

  svg.innerHTML = `
    <rect width="${W}" height="${H}" fill="var(--surface)"/>
    ${gridX}${gridY}
    <line x1="${ml}" y1="${mt}" x2="${ml}" y2="${mt+ph}" stroke="var(--text)" stroke-width="1.5"/>
    <line x1="${ml}" y1="${mt+ph}" x2="${ml+pw}" y2="${mt+ph}" stroke="var(--text)" stroke-width="1.5"/>
    <polyline points="${targetPts}" fill="none" stroke="#94a3b8" stroke-width="2.4" stroke-dasharray="2,3" opacity="0.85"/>
    ${piecePolys}
    ${envelopePolys}
    <circle cx="${dx}" cy="${dy}" r="7" fill="#fff" stroke="${MX_COLORS[winAtX]}" stroke-width="2.5"/>
    <circle cx="${dx}" cy="${dy}" r="3.2" fill="${MX_COLORS[winAtX]}"/>
    <text x="${ml+pw/2}" y="${H-4}" text-anchor="middle" font-size="12" fill="var(--muted)" font-weight="600">x</text>`

  $('mx-legend').innerHTML = `
    <div style="display:flex;align-items:center;gap:6px"><span style="width:24px;height:2px;background:#94a3b8;display:inline-block;border-radius:2px"></span>target</div>
    ${pieces.map((p,i)=>`<div style="display:flex;align-items:center;gap:6px"><span style="width:24px;height:3px;background:${MX_COLORS[i]};display:inline-block;border-radius:2px"></span>piece ${i+1} (bold where it wins)</div>`).join('')}`
}

function initMaxout(){
  mxRenderPieces()
  mxSetMode('relu')
}

// ══════════════════════════════════════════════════
//  ACTIVITY 6.4 — LINEAR REGIONS OF A DEEP RELU NETWORK
// ══════════════════════════════════════════════════
let lrL=3, lrN=2
let lrNet=null
let lrLog=[], lrStartTime=null, lrTimerTick=null
let lrHistory=[]
let lrReflect={q1:'',q2:''}
let lrSteps={A:null,B:null,C:null,D:null,E:null}

function lrTargetA(){ return lrN }
function lrTargetB(){ return lrL-1 }
function lrTargetC(){ return Math.pow(lrN, lrL-1) }
function lrTargetD(){ return lrN }
function lrTargetE(){ return Math.pow(lrN, lrL) }
const LR_TARGETS = { A: lrTargetA, B: lrTargetB, C: lrTargetC, D: lrTargetD, E: lrTargetE }

function lrElapsed(){
  if(!lrStartTime) return '00:00'
  const s=Math.floor((Date.now()-lrStartTime)/1000)
  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')
}
function lrStartTimer(){
  if(lrStartTime) return
  lrStartTime=Date.now()
  lrTimerTick=setInterval(()=>{
    const t=$('lr-timer'); if(t) t.textContent=lrElapsed()
    const m=$('lr-timer-meta'); if(m) m.textContent=`${lrLog.length} interaction${lrLog.length!==1?'s':''} recorded`
  },1000)
}
function lrLogEvent(field,from,to){
  lrStartTimer()
  lrLog.unshift({time:lrElapsed(),field,from:String(from),to:String(to)})
  if(lrLog.length>30) lrLog.pop()
}

function lrBuildNetwork(l,n){
  const hidden=[]
  let prevDim=1
  for(let i=0;i<l;i++){
    const W=Array.from({length:prevDim},()=>Array.from({length:n},()=>Math.random()*3-1.5))
    const b=Array.from({length:n},()=>Math.random()*2-1)
    hidden.push({W,b})
    prevDim=n
  }
  const outW=Array.from({length:prevDim},()=>Math.random()*3-1.5)
  const outB=Math.random()*2-1
  return {hidden, out:{W:outW,b:outB}}
}

function lrForward(x){
  let a=[x]
  for(const layer of lrNet.hidden){
    const n=layer.b.length
    const z=new Array(n).fill(0)
    for(let j=0;j<n;j++){
      let s=layer.b[j]
      for(let i2=0;i2<a.length;i2++) s+=a[i2]*layer.W[i2][j]
      z[j]=Math.max(0,s)
    }
    a=z
  }
  let s=lrNet.out.b
  for(let i2=0;i2<a.length;i2++) s+=a[i2]*lrNet.out.W[i2]
  return s
}

function lrSampleCurve(){
  const M=600
  const xs=[],ys=[]
  for(let i=0;i<=M;i++){ const x=-3+i*6/M; xs.push(x); ys.push(lrForward(x)) }
  return {xs,ys}
}

function lrDetectKinks(xs,ys){
  const n=xs.length
  const slopes=[]
  for(let i=0;i<n-1;i++) slopes.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]))
  const avgAbs=slopes.reduce((s,v)=>s+Math.abs(v),0)/slopes.length || 1
  const thresh=Math.max(1e-4, avgAbs*0.06)
  const flags=[]
  for(let i=0;i<slopes.length-1;i++){ if(Math.abs(slopes[i+1]-slopes[i])>thresh) flags.push(i+1) }
  const merged=[]
  flags.forEach(f=>{
    if(merged.length && f-merged[merged.length-1].last<=3) merged[merged.length-1].last=f
    else merged.push({first:f,last:f})
  })
  return merged.map(m=>xs[Math.round((m.first+m.last)/2)])
}

function lrRandomize(){
  lrNet=lrBuildNetwork(lrL,lrN)
  lrLogEvent('randomize weights', '-', `l=${lrL},n=${lrN}`)
  lrRefreshLeft()
}

function lrDrawNetwork(){
  const svg=$('lr-net'); if(!svg) return
  const l=lrL, n=lrN
  const cols=l+2
  const W=580,H=220
  const colX=i=> 40 + i*(W-80)/(cols-1)
  const nodesPerCol=i=> (i===0||i===cols-1) ? 1 : n
  const colNodeY=i=>{
    const cnt=nodesPerCol(i)
    const gap=cnt>1 ? Math.min(36,(H-40)/(cnt-1)) : 0
    const totalH=(cnt-1)*gap
    const startY=(H-totalH)/2
    return Array.from({length:cnt},(_,k)=>startY+k*gap)
  }
  const positions=Array.from({length:cols},(_,i)=>colNodeY(i).map(y=>({x:colX(i),y})))
  let lines=''
  for(let c=0;c<cols-1;c++){
    positions[c].forEach(p1=>{ positions[c+1].forEach(p2=>{
      lines+=`<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`
    })})
  }
  let nodes=''
  positions.forEach((col,c)=>{
    col.forEach(p=>{
      const isIO = c===0||c===cols-1
      nodes+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isIO?10:9}" fill="${isIO?'#f5f0e8':'#dbeafe'}" stroke="${isIO?'var(--muted)':'#1d4ed8'}" stroke-width="2"/>`
    })
  })
  let labels=`<text x="${colX(0).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="11" fill="var(--muted)">input (d=1)</text>`
  labels+=`<text x="${colX(cols-1).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="11" fill="var(--muted)">output</text>`
  labels+=`<text x="${((colX(1)+colX(cols-2))/2).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="11" fill="var(--muted)">${l} hidden layer${l!==1?'s':''} × ${n} ReLU units</text>`
  svg.innerHTML = `${lines}${nodes}${labels}`
}

function lrDrawPlot(){
  const svg=$('lr-plot'); if(!svg) return
  const {xs,ys}=lrSampleCurve()
  const kinksRaw=lrDetectKinks(xs,ys)
  const bound=lrTargetE()
  const kinks=kinksRaw.slice(0, Math.max(0,bound-1))
  const W=420,H=280,ml=44,mr=14,mt=14,mb=34
  const pw=W-ml-mr, ph=H-mt-mb
  const yMin0=Math.min(...ys), yMax0=Math.max(...ys)
  const pad=(yMax0-yMin0)*0.12 || 1
  const yMin=yMin0-pad, yMax=yMax0+pad
  const px=x=>ml+(x+3)/6*pw
  const py=y=>mt+ph-(y-yMin)/(yMax-yMin)*ph

  const bounds=[-3,...[...kinks].sort((a,b)=>a-b),3]
  const bands=bounds.slice(0,-1).map((b,i)=>{
    const x1=px(b), x2=px(bounds[i+1])
    const fill = i%2===0 ? 'rgba(59,130,246,0.06)' : 'rgba(100,116,139,0.06)'
    return `<rect x="${x1.toFixed(1)}" y="${mt}" width="${(x2-x1).toFixed(1)}" height="${ph}" fill="${fill}"/>`
  }).join('')

  const curvePts=xs.map((x,i)=>`${px(x).toFixed(1)},${py(ys[i]).toFixed(1)}`).join(' ')
  const kinkLines=kinks.map(k=>`<line x1="${px(k).toFixed(1)}" y1="${mt}" x2="${px(k).toFixed(1)}" y2="${mt+ph}" stroke="#b91c1c" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>`).join('')

  const yTicks=[yMin,(yMin+yMax)/2,yMax]
  const gridY=yTicks.map(v=>`<line x1="${ml}" y1="${py(v).toFixed(1)}" x2="${ml+pw}" y2="${py(v).toFixed(1)}" stroke="var(--border)" stroke-width=".6" stroke-dasharray="4,4"/><text x="${ml-8}" y="${(py(v)+4).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--muted)">${v.toFixed(1)}</text>`).join('')
  const xTicks=[-3,-1.5,0,1.5,3]
  const gridX=xTicks.map(v=>`<text x="${px(v).toFixed(1)}" y="${mt+ph+18}" text-anchor="middle" font-size="11" fill="var(--muted)">${v}</text>`).join('')

  svg.innerHTML=`
    <rect width="${W}" height="${H}" fill="var(--surface)"/>
    ${bands}
    ${gridY}${gridX}
    <line x1="${ml}" y1="${mt}" x2="${ml}" y2="${mt+ph}" stroke="var(--text)" stroke-width="1.5"/>
    <line x1="${ml}" y1="${mt+ph}" x2="${ml+pw}" y2="${mt+ph}" stroke="var(--text)" stroke-width="1.5"/>
    ${kinkLines}
    <polyline points="${curvePts}" fill="none" stroke="#1d4ed8" stroke-width="2.4" stroke-linejoin="round"/>
    <text x="${ml+pw/2}" y="${H-4}" text-anchor="middle" font-size="12" fill="var(--muted)" font-weight="600">x</text>`

  const actualRaw=kinksRaw.length+1
  const actual=Math.min(actualRaw,bound)
  const readout=$('lr-region-readout')
  readout.innerHTML = `<strong>Actual regions found:</strong> ${actual} &nbsp;·&nbsp; <strong>Bound O(n,l):</strong> ${bound}
    ${actual<bound ? `<br><span style="color:var(--muted);font-weight:500">Fewer than the bound — typical for random weights; the bound is the maximum achievable.</span>` : `<br><span style="color:#15803d;font-weight:500">At the bound — this random network achieves the maximum!</span>`}
    ${actualRaw>bound ? `<br><span style="color:var(--muted);font-weight:500;font-size:13.5px">(capped at the theoretical bound — dense sampling can slightly overcount near-flat kinks)</span>` : ''}`
}

function lrRenderSteps(){
  const c=$('lr-steps')
  const rows=[
    {id:'A', label:`Step A: C(n,d) = C(${lrN}, 1) =`},
    {id:'B', label:`Step B: d(l−1) = 1×(${lrL}−1) =`},
    {id:'C', label:`Step C: C(n,d)^(d(l−1)) = ${lrN}^${lrL-1} =`},
    {id:'D', label:`Step D: n^d = ${lrN}^1 =`},
    {id:'E', label:`Step E: O = Step C × Step D =`}
  ]
  c.innerHTML = rows.map(r=>`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">
      <span style="font-family:'Courier New',monospace;font-size:14.5px;color:var(--text)">${r.label}</span>
      <input type="number" id="lr-step${r.id}" class="ba-cell-input" style="width:84px" placeholder="?" oninput="lrCheckStep('${r.id}')">
    </div>`).join('')
}

function lrCheckStep(id){
  const inp=$('lr-step'+id)
  const v=parseFloat(inp.value)
  const prev=lrSteps[id]
  lrSteps[id]=isNaN(v)?null:v
  if(prev===null && lrSteps[id]!==null) lrLogEvent('Step '+id, '—', String(lrSteps[id]))
  const target=LR_TARGETS[id]()
  if(lrSteps[id]===null) inp.className='ba-cell-input'
  else if(lrSteps[id]===target) inp.className='ba-cell-input ok'
  else inp.className='ba-cell-input bad'
  lrUpdateStepsBadge()
}

function lrCountCorrectSteps(){
  let n=0
  ;['A','B','C','D','E'].forEach(id=>{ if(lrSteps[id]===LR_TARGETS[id]()) n++ })
  return n
}

function lrUpdateStepsBadge(){
  const n=lrCountCorrectSteps()
  const badge=$('lr-steps-badge')
  badge.textContent=`${n}/5 correct`
  badge.className=`badge ${n===5?'gg':n>0?'og':'rg'}`
  const g=$('lr-steps-guidance')
  if(n===5){
    g.className='guidance-box done'
    g.innerHTML=`<strong>✓ O(${lrN}, ${lrL}) = ${lrTargetE()}.</strong> Notice Step A and Step D both equal n — that's because with d=1, C(n,1)=n and n¹=n are the same number. The whole formula collapses to <strong>O = n^l</strong> whenever d=1.`
    lrRecordHistory()
  } else {
    g.className='guidance-box warm'
    g.innerHTML=`<strong>Hint:</strong> with d=1 locked, C(n,d)=C(${lrN},1)=${lrN} and n^d=${lrN}^1=${lrN} — both just equal n. Work through each step in order.`
  }
  lrUpdateOverallGuidance()
  lrRenderSubmitSummary()
}

function lrRecordHistory(){
  const last=lrHistory[lrHistory.length-1]
  if(last && last.l===lrL && last.n===lrN) return
  lrHistory.push({l:lrL,n:lrN,O:lrTargetE()})
  if(lrHistory.length>4) lrHistory.shift()
  lrRenderHistory()
}

function lrRenderHistory(){
  const el=$('lr-history')
  if(!lrHistory.length){ el.innerHTML='<p style="font-size:14.5px;color:var(--muted);font-weight:500">No completed runs yet.</p>'; return }
  const maxO=Math.max(...lrHistory.map(h=>h.O),1)
  const rows=lrHistory.map(h=>{
    const pct=Math.max(6, Math.log2(h.O+1)/Math.log2(maxO+1)*100)
    return `<div class="a4-bar-row" style="margin-bottom:8px">
      <span class="a4-bar-label" style="width:auto;font-size:13.5px">l=${h.l},n=${h.n}</span>
      <div class="a4-bar-track"><div class="a4-bar-fill" style="width:${pct.toFixed(0)}%;background:#1d4ed8"></div></div>
      <span class="a4-bar-val">${h.O}</span>
    </div>`
  }).join('')
  let compare=''
  if(lrHistory.length>=2){
    const prev=lrHistory[lrHistory.length-2], cur=lrHistory[lrHistory.length-1]
    const factor=cur.O/prev.O
    compare=`<p style="font-size:14.5px;margin-top:10px;color:var(--text);font-weight:500">O went from <strong>${prev.O}</strong> (l=${prev.l}) to <strong>${cur.O}</strong> (l=${cur.l}) — a <strong>${factor.toFixed(1)}×</strong> increase${cur.l===prev.l*2?' from only doubling the depth':''}.</p>`
  }
  el.innerHTML = rows + compare
}

function lrReflectInput(n,val){
  lrReflect['q'+n]=val
  lrUpdateOverallGuidance()
  lrRenderSubmitSummary()
}

function lrUpdateOverallGuidance(){
  const el=$('lr-guidance'); if(!el) return
  const stepsOk=lrCountCorrectSteps()===5
  const reflectOk=lrReflect.q1.trim().length>0 && lrReflect.q2.trim().length>0
  let cls,msg
  if(stepsOk && reflectOk){ cls='done'; msg='<strong>✓ Complete!</strong> Computation correct and both reflections answered.' }
  else if(stepsOk){ cls='hot'; msg='Computation correct. Now answer both reflection questions below.' }
  else if(lrLog.length){ cls='warm'; msg='Keep working through the guided computation steps.' }
  else { cls='cold'; msg='Adjust l/n and work through the guided computation to find O(n,l).' }
  el.innerHTML=`<div class="guidance-box ${cls}">${msg}</div>`
}

function lrSetL(val){
  const v=parseInt(val), prev=lrL
  lrL=v
  $('lr-l-label').textContent=`l = ${lrL}`
  $('lr-l-slider').value=lrL
  if(prev!==lrL) lrLogEvent('l', prev, lrL)
  lrOnDimsChanged()
}
function lrSetN(val){
  const v=parseInt(val), prev=lrN
  lrN=v
  $('lr-n-label').textContent=`n = ${lrN}`
  $('lr-n-slider').value=lrN
  if(prev!==lrN) lrLogEvent('n', prev, lrN)
  lrOnDimsChanged()
}
function lrDoubleDepth(){
  const newL=Math.min(6, lrL*2)
  $('lr-l-slider').value=newL
  lrSetL(newL)
}
function lrOnDimsChanged(){
  lrNet=lrBuildNetwork(lrL,lrN)
  lrSteps={A:null,B:null,C:null,D:null,E:null}
  lrRenderSteps()
  lrUpdateStepsBadge()
  lrRefreshLeft()
}

function lrRefreshLeft(){
  lrDrawNetwork()
  lrDrawPlot()
  lrRenderLog()
  lrRenderSubmitSummary()
}

function lrRenderLog(){
  const el=$('lr-log')
  if(!el) return
  if(!lrLog.length){ el.innerHTML='<p style="font-size:14.5px;color:var(--muted);font-weight:500;padding:8px 0">No interactions yet — adjust l, n, or fill a step to start.</p>'; return }
  const rows=lrLog.map(e=>`<tr><td>${e.time}</td><td style="color:#b45309">${e.field}</td><td style="color:var(--muted)">${e.from}</td><td style="color:var(--text)">${e.to}</td></tr>`).join('')
  el.innerHTML=`<table class="log-table"><thead><tr><th>Time</th><th>Field</th><th>From</th><th>To</th></tr></thead><tbody>${rows}</tbody></table>`
}

function lrRenderSubmitSummary(){
  const {xs,ys}=lrSampleCurve(), kinks=lrDetectKinks(xs,ys)
  const bound=lrTargetE(), actual=Math.min(kinks.length+1,bound)
  const stepsOk=lrCountCorrectSteps()
  const el=$('lr-submit-summary'); if(el){
  const elapsed = lrStartTime ? lrElapsed() : '—'
  el.innerHTML = `
    <p><strong>l</strong> = ${lrL} &nbsp;·&nbsp; <strong>n</strong> = ${lrN} &nbsp;·&nbsp; <strong>O(n,l)</strong> = ${bound} &nbsp;·&nbsp; actual regions found: ${actual}</p>
    <p style="margin-top:4px">Guided steps: ${stepsOk}/5 correct &nbsp;·&nbsp; Completed runs logged: ${lrHistory.length}</p>
    ${stepsOk===5 ? '<p style="color:var(--green);margin-top:4px">✓ Guided computation complete</p>' : ''}`
  }
  updateBadge('lr-completed', isComplete('regions'))
}

function initRegions(){
  lrNet=lrBuildNetwork(lrL,lrN)
  lrRenderSteps()
  lrRenderHistory()
  lrDrawNetwork()
  lrDrawPlot()
  lrRenderLog()
  lrUpdateOverallGuidance()
  lrUpdateStepsBadge()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 6.5.1 — COMPUTATIONAL GRAPH
// ══════════════════════════════════════════════════
let cgStage = 1
let cgNodeTypes = {}   // variable -> 'input' | 'computed' | ''
let cgWired = {z:false, r:false, n:false, y:false}
let cgWiredAnswers = {}
let cgAttempts = {classify:0, wire:0}
let cgReflect = ''

const CG_ALL_NODES = ['p','W_z','W_r','W_n','z','r','n','y']
const CG_INPUTS_SET = new Set(['p','W_z','W_r','W_n'])

const CG_WIRE_Q = [
  {node:'z', label:'z = σ(W<sub>z</sub> × p)', color:'#1d4ed8',
   opts:[
     {text:'W<sub>z</sub> and p (matrix multiply, then σ)', correct:true},
     {text:'W<sub>r</sub> and p (matrix multiply, then σ)', correct:false},
     {text:'W<sub>n</sub>, r, and p (element-wise ⊙, then tanh)', correct:false}
   ]},
  {node:'r', label:'r = σ(W<sub>r</sub> × p)', color:'#c2610c',
   opts:[
     {text:'W<sub>z</sub> and p (matrix multiply, then σ)', correct:false},
     {text:'W<sub>r</sub> and p (matrix multiply, then σ)', correct:true},
     {text:'r and p (element-wise product)', correct:false}
   ]},
  {node:'n', label:'n = tanh(W<sub>n</sub> × (r ⊙ p))', color:'#6d28d9',
   opts:[
     {text:'W<sub>n</sub> and r only', correct:false},
     {text:'r and p only (element-wise ⊙)', correct:false},
     {text:'W<sub>n</sub>, r, and p (r⊙p first, then ×W<sub>n</sub>, then tanh)', correct:true}
   ]},
  {node:'y', label:'y = (1−z) ⊙ p + z ⊙ n', color:'#15803d',
   opts:[
     {text:'z and n only', correct:false},
     {text:'p and n only', correct:false},
     {text:'z, p, and n via (1−z)⊙p + z⊙n', correct:true}
   ]}
]

// Edge list: [fromNode, toNode, label, color]
const CG_EDGES = [
  ['W_z','z','×,σ','#1d4ed8'], ['p','z','×,σ','#1d4ed8'],
  ['W_r','r','×,σ','#c2610c'], ['p','r','×,σ','#c2610c'],
  ['p','n','⊙','#6d28d9'],     ['r','n','⊙','#6d28d9'], ['W_n','n','×,tanh','#6d28d9'],
  ['z','y','(1−z)⊙','#15803d'],['p','y','⊙','#15803d'], ['n','y','z⊙','#15803d']
]

// Which edges belong to which node (for progressive reveal)
const CG_EDGE_FOR = {
  z: ['W_z','z','p'],
  r: ['W_r','r','p'],
  n: ['p_n','r_n','W_n'],  // special keys
  y: ['z','p_y','n']
}

// Node positions in viewBox 560×340
const CG_POS = {
  p:   {x:80, y:160},
  W_z: {x:80, y:55},
  W_r: {x:80, y:255},
  W_n: {x:80, y:315},
  z:   {x:270, y:55},
  r:   {x:270, y:255},
  n:   {x:410, y:155},
  y:   {x:520, y:105}
}

const CG_NODE_WHICH = {
  z: 0, r: 1, n: 2, y: 3
}

function cgUnlock(stage){
  if(stage<=cgStage) return
  cgStage=stage
  cgRenderStages()
  if(stage===2) cgRenderClassify()
  if(stage===3) cgRenderWireQ()
  if(stage===4) cgRenderStage4()
  cgDrawGraph()
  cgUpdateSubmitSummary()
}

function cgRenderStages(){
  $('cg-stage2') && $('cg-stage2').classList[cgStage>=2?'add':'remove']('unlocked')
  $('cg-stage3') && $('cg-stage3').classList[cgStage>=3?'add':'remove']('unlocked')
  $('cg-stage4') && $('cg-stage4').classList[cgStage>=4?'add':'remove']('unlocked')
  const cb=$('cg-classify-badge')
  if(cb && cgStage<2) { cb.textContent='0/8 correct — locked'; cb.className='badge og' }
}

function cgRenderClassify(){
  const c=$('cg-classify-grid'); if(!c) return
  c.innerHTML=''
  CG_ALL_NODES.forEach(name=>{
    const key=name.replace('_','')
    const chip=document.createElement('div')
    chip.className='cg-var-chip'
    chip.id=`cg-chip-${key}`
    chip.innerHTML=`<span style="font-size:17px">${name.replace('_z','<sub>z</sub>').replace('_r','<sub>r</sub>').replace('_n','<sub>n</sub>')}</span><span id="cg-lbl-${key}" style="font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">click</span>`
    chip.onclick=()=>cgToggleChip(name)
    c.appendChild(chip)
  })
}

function cgToggleChip(name){
  const key=name.replace('_','')
  const cur=cgNodeTypes[name]||''
  const next=cur===''?'input':cur==='input'?'computed':''
  cgNodeTypes[name]=next
  cgAttempts.classify++
  cgApplyChipStyle(name)
  cgCheckClassify()
}

function cgApplyChipStyle(name){
  const key=name.replace('_','')
  const chip=$(`cg-chip-${key}`), lbl=$(`cg-lbl-${key}`)
  if(!chip) return
  const choice=cgNodeTypes[name]||''
  chip.className='cg-var-chip'+(choice===''?' ':choice==='input'?' cg-input':' cg-computed')
  lbl.textContent=choice||'click'
  lbl.style.color=choice===''?'var(--muted)':choice==='input'?'#1e3a8a':'#7c2d12'
}

function cgCheckClassify(){
  let correct=0
  CG_ALL_NODES.forEach(name=>{
    const key=name.replace('_','')
    const chip=$(`cg-chip-${key}`); if(!chip) return
    const isInput=CG_INPUTS_SET.has(name)
    const choice=cgNodeTypes[name]||''
    if(!choice) { chip.className='cg-var-chip'; return }
    const ok=(isInput&&choice==='input')||(!isInput&&choice==='computed')
    chip.className='cg-var-chip '+(ok?(isInput?'cg-ok-input':'cg-ok-computed'):'cg-wrong')
    if(ok) correct++
  })
  const badge=$('cg-classify-badge')
  if(badge){ badge.textContent=`${correct}/8 correct`; badge.className=`badge ${correct===8?'gg':correct>0?'og':'rg'}` }
  const hint=$('cg-classify-hint')
  if(hint){
    if(correct===8){ hint.className='guidance-box done'; hint.innerHTML='<strong>✓ Correct!</strong> The 4 weight matrices and p are leaf inputs with no defining formula. z, r, n, y each have a formula that computes them.' }
    else if(cgAttempts.classify>0){ hint.className='guidance-box warm'; hint.innerHTML='<strong>Hint:</strong> An INPUT has no equation that defines it — it comes from outside. A COMPUTED node appears on the left-hand side of one of the four equations.' }
  }
  if(correct===8) cgUnlock(3)
}

function cgCountClassifyCorrect(){
  let n=0
  CG_ALL_NODES.forEach(name=>{
    const isInput=CG_INPUTS_SET.has(name)
    const choice=cgNodeTypes[name]||''
    if((isInput&&choice==='input')||(!isInput&&choice==='computed')) n++
  })
  return n
}

function cgRenderWireQ(){
  const c=$('cg-wire-questions'); if(!c) return
  c.innerHTML=''
  CG_WIRE_Q.forEach((q,qi)=>{
    const block=document.createElement('div')
    block.id=`cg-wq-${q.node}`
    block.style.cssText='padding-bottom:14px;border-bottom:1px solid var(--border)'
    block.innerHTML=`
      <div style="font-size:14.5px;font-weight:700;color:var(--text);margin-bottom:8px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${q.color};margin-right:6px;vertical-align:middle"></span>
        What feeds into <strong style="color:${q.color}">${q.label}</strong>?
      </div>
      <div id="cg-opts-${q.node}" style="display:flex;flex-direction:column;gap:6px">
        ${q.opts.map((o,oi)=>`
          <div class="cg-mcq-opt" id="cg-opt-${q.node}-${oi}" onclick="cgWireAnswer('${q.node}',${oi})">
            <span style="flex-shrink:0;font-weight:700;color:var(--muted)">${String.fromCharCode(65+oi)}.</span>
            <span>${o.text}</span>
          </div>`).join('')}
      </div>
      <div id="cg-wfb-${q.node}" style="font-size:14.5px;margin-top:8px;min-height:14px;font-weight:500"></div>`
    if(qi===CG_WIRE_Q.length-1) block.style.borderBottom='none'
    c.appendChild(block)
  })
  cgDrawGraph()
}

function cgWireAnswer(node, optIdx){
  const q=CG_WIRE_Q.find(q=>q.node===node)
  if(!q||cgWired[node]) return
  cgAttempts.wire++
  cgWiredAnswers[node]=optIdx
  const opt=q.opts[optIdx]
  const opts=$(`cg-opts-${node}`)
  if(opts) opts.querySelectorAll('.cg-mcq-opt').forEach((el,i)=>{
    el.classList.remove('sel-ok','sel-bad')
    if(i===optIdx) el.classList.add(opt.correct?'sel-ok':'sel-bad')
    el.onclick=null
  })
  const fb=$(`cg-wfb-${node}`)
  if(opt.correct){
    if(fb){ fb.innerHTML=`<span style="color:#15803d;font-weight:700">✓ Correct!</span>` }
    cgWired[node]=true
  } else {
    if(fb){ fb.innerHTML=`<span style="color:#b91c1c;font-weight:700">✗ Not quite.</span> <span style="color:var(--muted)">Try again — check the equation for ${node}.</span>` }
    // re-enable others
    if(opts) opts.querySelectorAll('.cg-mcq-opt').forEach((el,i)=>{
      if(i!==optIdx){ el.onclick=()=>cgWireAnswer(node,i) }
    })
  }
  const correct=Object.values(cgWired).filter(Boolean).length
  const badge=$('cg-wire-badge')
  if(badge){ badge.textContent=`${correct}/4 wired`; badge.className=`badge ${correct===4?'gg':correct>0?'og':'og'}` }
  const hint=$('cg-wire-hint')
  if(hint){
    if(correct===4){ hint.className='guidance-box done'; hint.innerHTML='<strong>✓ All connections wired!</strong> The graph is complete. Notice p appears only once but has edges to z, r, n, and y.' }
    else{ hint.className='guidance-box warm'; hint.innerHTML=`${correct}/4 complete. Trace each equation to find its inputs.` }
  }
  cgDrawGraph()
  if(correct===4) setTimeout(()=>cgUnlock(4),400)
}

function cgRenderStage4(){
  cgUpdateSubmitSummary()
}

function cgReflectInput(val){
  cgReflect=val
  cgUpdateSubmitSummary()
}

function cgUpdateSubmitSummary(){
  const el=$('cg-submit-summary')
  const c=cgCountClassifyCorrect(), w=Object.values(cgWired).filter(Boolean).length
  if(el) el.innerHTML=`
    <p><strong>Node classification:</strong> ${c}/8 correct ${c===8?'<span style="color:var(--green)">✓</span>':''}</p>
    <p><strong>Connections wired:</strong> ${w}/4 ${w===4?'<span style="color:var(--green)">✓</span>':''}</p>
    <p><strong>Reflection:</strong> ${cgReflect.trim().length>0?'<span style="color:var(--green)">✓ answered</span>':'<span style="color:var(--muted)">not yet</span>'}</p>
    ${c===8&&w===4?'<p style="color:var(--green);margin-top:4px;font-weight:600">✓ All parts complete!</p>':''}`
  updateBadge('cg-completed', isComplete('compgraph'))
}

// ── Computational Graph SVG ─────────────────────────
function cgDrawGraph(){
  const svg=$('cg-graph-svg'); if(!svg) return
  const W=560, H=340, nr=20

  const nodeColor = n => CG_INPUTS_SET.has(n)?'#dbeafe':n==='y'?'#dcfce7':'#ede9e0'
  const nodeStroke = n => CG_INPUTS_SET.has(n)?'#1d4ed8':n==='y'?'#15803d':'#8a7a6e'
  const nodeFontColor = n => CG_INPUTS_SET.has(n)?'#1e3a8a':n==='y'?'#14532d':'#1a1210'

  // Determine which edges to show based on which nodes are wired
  const showEdge = (from, to) => {
    if(to==='z') return cgWired.z
    if(to==='r') return cgWired.r
    if(to==='n') return cgWired.n
    if(to==='y') return cgWired.y
    return false
  }

  // Draw edges
  let edgeSvg=''
  const edgeData = [
    {from:'W_z',to:'z',label:'×,σ',color:'#1d4ed8'},
    {from:'p',  to:'z',label:'×,σ',color:'#1d4ed8'},
    {from:'W_r',to:'r',label:'×,σ',color:'#c2610c'},
    {from:'p',  to:'r',label:'×,σ',color:'#c2610c'},
    {from:'p',  to:'n',label:'⊙',  color:'#6d28d9'},
    {from:'r',  to:'n',label:'⊙',  color:'#6d28d9'},
    {from:'W_n',to:'n',label:'×,tanh',color:'#6d28d9'},
    {from:'z',  to:'y',label:'(1−z)⊙',color:'#15803d'},
    {from:'p',  to:'y',label:'⊙', color:'#15803d'},
    {from:'n',  to:'y',label:'z⊙',color:'#15803d'}
  ]

  edgeData.forEach(e=>{
    const show=showEdge(e.from,e.to)
    const p1=CG_POS[e.from], p2=CG_POS[e.to]
    const dx=p2.x-p1.x, dy=p2.y-p1.y, len=Math.sqrt(dx*dx+dy*dy)
    const ux=dx/len, uy=dy/len
    const x1=p1.x+ux*nr, y1=p1.y+uy*nr, x2=p2.x-ux*(nr+6), y2=p2.y-uy*(nr+6)
    const mx=(x1+x2)/2, my=(y1+y2)/2
    const col=show?e.color:'#e2d9cc'
    const opacity=show?1:0.3
    const id=`cg-arrow-${e.from.replace('_','')}-${e.to}`
    edgeSvg+=`
      <defs><marker id="${id}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L0,8 L8,4 z" fill="${col}"/></marker></defs>
      <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
            stroke="${col}" stroke-width="${show?2:1}" opacity="${opacity}"
            stroke-dasharray="${show?'none':'4,4'}" marker-end="url(#${id})"/>
      ${show?`<text x="${mx.toFixed(1)}" y="${(my-6).toFixed(1)}" text-anchor="middle" font-size="10" fill="${col}" font-family="Courier New" font-weight="700">${e.label}</text>`:''}
    `
  })

  // Draw nodes
  let nodeSvg=''
  Object.entries(CG_POS).forEach(([name,pos])=>{
    const shown=cgStage>=2||(name==='p'||CG_INPUTS_SET.has(name))
    const label=name.replace('_z','z').replace('_r','r').replace('_n','n')
    nodeSvg+=`
      <circle cx="${pos.x}" cy="${pos.y}" r="${nr}" fill="${nodeColor(name)}" stroke="${nodeStroke(name)}" stroke-width="2"/>
      <text x="${pos.x}" y="${pos.y+5}" text-anchor="middle" fill="${nodeFontColor(name)}" font-size="13" font-weight="700" font-family="Courier New">${label}</text>
    `
  })

  // Column labels
  const labels=`
    <text x="80" y="338" text-anchor="middle" font-size="11" fill="var(--muted)">inputs (leaves)</text>
    <text x="270" y="290" text-anchor="middle" font-size="11" fill="var(--muted)">z, r</text>
    <text x="410" y="195" text-anchor="middle" font-size="11" fill="var(--muted)">n</text>
    <text x="520" y="145" text-anchor="middle" font-size="11" fill="var(--muted)">output</text>
  `

  svg.innerHTML=`<rect width="${W}" height="${H}" fill="var(--surface)"/>${edgeSvg}${nodeSvg}${labels}`

  const legend=$('cg-graph-legend'); if(legend){
    if(cgStage<3) legend.textContent='Classify nodes above to unlock graph wiring.'
    else legend.innerHTML=`<span style="color:#1d4ed8;font-weight:700">●</span> inputs &nbsp;&nbsp;<span style="color:#8a7a6e;font-weight:700">●</span> computed &nbsp;&nbsp;<span style="color:#15803d;font-weight:700">●</span> output y &nbsp;&nbsp; Dashed = not yet wired`
  }
}

function initCompGraph(){
  cgDrawGraph()
  cgRenderStages()
  cgUpdateSubmitSummary()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 6.5.2 — BACKPROP TABLE
// ══════════════════════════════════════════════════
let bpStage = 1
let bpAnswers = {}  // cell id -> value entered
let bpMcqCorrect = false

// Table structure: 4 rows
// Row 1: u6 — all given (seed)
// Row 2: u5 — all given (reference)
// Row 3: u4 — dC/dV, dCdV_x_D, G to fill
// Row 4: u1 — dC/dV, dCdV_x_D, G to fill

const BP_ROWS = [
  {V:'u⁽⁶⁾', C:'—',   op:'—',               dcdv:'—',    dcdvD:'—',  G:'1',   given:true,  note:'seed: grad_table[u⁽⁶⁾]=1'},
  {V:'u⁽⁵⁾', C:'u⁽⁶⁾',op:'|u⁽⁵⁾|',          dcdv:'−1',   dcdvD:'−1', G:'−1',  given:true,  note:'u⁽⁵⁾=−2<0 → sign=−1'},
  {V:'u⁽⁴⁾', C:'u⁽⁵⁾',op:'u⁽⁴⁾+u⁽³⁾',       dcdv:null,   dcdvD:null, G:null,  given:false, ans:{dcdv:1, dcdvD:-1, G:-1}},
  {V:'u⁽¹⁾', C:'u⁽⁴⁾',op:'u⁽¹⁾×u⁽²⁾',       dcdv:null,   dcdvD:null, G:null,  given:false, ans:{dcdv:5, dcdvD:-5, G:-5}}
]

const BP_MCQ = [
  {text:'If u⁽¹⁾ increases by ε, u⁽⁶⁾ increases by 5ε', correct:false},
  {text:'If u⁽¹⁾ increases by ε, u⁽⁶⁾ decreases by 5ε', correct:true},
  {text:'u⁽¹⁾ contributes exactly 5 times to the final loss', correct:false},
  {text:'The gradient is wrong because u⁽¹⁾ is negative', correct:false}
]

function bpUnlock(stage){
  if(stage<=bpStage) return
  bpStage=stage
  bpRenderStages()
  bpUpdateSubmitSummary()
}

function bpRenderStages(){
  $('bp-stage2') && $('bp-stage2').classList[bpStage>=2?'add':'remove']('unlocked')
  $('bp-stage3') && $('bp-stage3').classList[bpStage>=3?'add':'remove']('unlocked')
  if(bpStage>=2){
    const tbody=$('bp-table-body')
    if(tbody && !tbody.children.length) bpRenderTable()
    bpDrawGraph()
  }
  if(bpStage>=3){ bpRenderMCQ() }
}

function bpRenderTable(){
  const tbody=$('bp-table-body'); if(!tbody) return
  tbody.innerHTML=''
  BP_ROWS.forEach((row,ri)=>{
    const tr=document.createElement('tr')
    tr.className=row.given?'bp-given':'bp-fill'

    const td = (content, isInput=false, fieldId='') => {
      const d=document.createElement('td')
      if(!isInput) d.innerHTML=`<span class="bp-cell${row.given?' given':''}">${content}</span>`
      else {
        d.innerHTML=`<input type="number" id="${fieldId}" class="bp-inp" placeholder="?" step="1" style="width:64px">`
      }
      return d
    }

    tr.appendChild(td(row.V))
    tr.appendChild(td(row.C))
    tr.appendChild(td(`<span style="font-size:12.5px">${row.op}</span>`))

    if(row.given){
      tr.appendChild(td(row.dcdv))
      const dTd=document.createElement('td')
      dTd.innerHTML=`<span class="bp-cell given" id="bp-d-${ri}">${bpDCellText(ri)}</span>`
      tr.appendChild(dTd)
      tr.appendChild(td(row.dcdvD))
      tr.appendChild(td(row.G))
    } else {
      const fieldBase=`bp-r${ri}`
      tr.appendChild(td('', true, `${fieldBase}-dcdv`))
      const dTd=document.createElement('td')
      dTd.innerHTML=`<span class="bp-cell" id="bp-d-${ri}">${bpDCellText(ri)}</span>`
      tr.appendChild(dTd)
      tr.appendChild(td('', true, `${fieldBase}-dcdvD`))
      tr.appendChild(td('', true, `${fieldBase}-G`))
    }

    // note cell
    const nt=document.createElement('td')
    nt.style.cssText='font-size:12.5px;color:var(--muted);text-align:left;padding-left:8px'
    nt.textContent=row.note||''
    tr.appendChild(nt)

    tbody.appendChild(tr)
  })

  // wire inputs
  BP_ROWS.forEach((row,ri)=>{
    if(row.given) return
    const fieldBase=`bp-r${ri}`
    ;['dcdv','dcdvD','G'].forEach(field=>{
      const inp=$(`${fieldBase}-${field}`)
      if(inp) inp.addEventListener('input',()=>{
        const v=parseFloat(inp.value)
        bpAnswers[`${fieldBase}-${field}`]=isNaN(v)?null:v
        bpCheckCell(ri, field, inp, row.ans[field])
        bpUpdateDColumn()
        bpUpdateChainSteps()
        bpDrawGraph()
        bpUpdateSubmitSummary()
        const correct=bpCountCorrect()
        if(correct===6) bpUnlock(3)
      })
    })
  })

  bpUpdateHint()
}

function bpCheckCell(ri, field, inp, ans){
  const v=bpAnswers[`bp-r${ri}-${field}`]
  if(v===null||isNaN(v)){ inp.className='bp-inp'; return }
  inp.className=v===ans?'bp-inp ok':'bp-inp bad'
}

function bpCountCorrect(){
  let n=0
  BP_ROWS.forEach((row,ri)=>{
    if(row.given) return
    ;['dcdv','dcdvD','G'].forEach(field=>{
      const v=bpAnswers[`bp-r${ri}-${field}`]
      if(v===row.ans[field]) n++
    })
  })
  return n
}

const bpFmtNum = v => v<0 ? ('−'+Math.abs(v)) : String(v)

// D for a row = G(C) — the gradient already found for its consumer, one row up.
function bpGetRowG(V){
  const idx=BP_ROWS.findIndex(r=>r.V===V)
  if(idx<0) return null
  const row=BP_ROWS[idx]
  if(row.given){
    const n=parseFloat(String(row.G).replace(/−/g,'-'))
    return isNaN(n)?null:n
  }
  const v=bpAnswers[`bp-r${idx}-G`]
  return (v!==undefined && v===row.ans.G) ? v : null
}

function bpDCellText(ri){
  const row=BP_ROWS[ri]
  if(row.C==='—') return '—'
  const g=bpGetRowG(row.C)
  return g===null ? '?' : bpFmtNum(g)
}

function bpUpdateDColumn(){
  BP_ROWS.forEach((row,ri)=>{
    const el=$(`bp-d-${ri}`)
    if(el) el.textContent=bpDCellText(ri)
  })
}

function bpUpdateHint(){
  const badge=$('bp-table-badge'), hint=$('bp-table-hint')
  const n=bpCountCorrect()
  if(badge){ badge.textContent=`${n}/6 correct`; badge.className=`badge ${n===6?'gg':n>0?'og':'rg'}` }
  if(hint){
    if(n===6){ hint.className='guidance-box done'; hint.innerHTML='<strong>✓ All 6 cells correct!</strong> G(u⁽¹⁾) = −5. Now interpret what this means.' }
    else{ hint.className='guidance-box warm'; hint.innerHTML='<strong>Hints:</strong> For addition (u⁴+u³), dC/dV = 1. For multiplication (u¹×u²), d/du¹ = u² = 5. Multiply local derivative × D (the upstream G).' }
  }
}

function bpUpdateChainSteps(){
  const el=$('bp-chain-steps'); if(!el) return
  const r2dcdv = bpAnswers['bp-r2-dcdv']
  const r2dcdvD = bpAnswers['bp-r2-dcdvD']
  const r2G = bpAnswers['bp-r2-G']
  const r3dcdv = bpAnswers['bp-r3-dcdv']
  const r3dcdvD = bpAnswers['bp-r3-dcdvD']
  const r3G = bpAnswers['bp-r3-G']

  const show = (v,ans) => v===ans
    ? `<strong style="color:#15803d">${v}</strong>`
    : (v!==null&&v!==undefined ? `<span style="color:#b91c1c">${v}?</span>` : '<span style="color:var(--muted)">?</span>')

  el.innerHTML=`
    <div>G(u⁽⁵⁾) = −1 &nbsp;<span style="color:#15803d">[given]</span></div>
    <div>dC/dV for u⁽⁴⁾ = ${show(r2dcdv,1)} &nbsp;→&nbsp; G(u⁽⁴⁾) = ${show(r2dcdv,1)} × (−1) = ${show(r2G,-1)}</div>
    <div>dC/dV for u⁽¹⁾ = ${show(r3dcdv,5)} &nbsp;→&nbsp; G(u⁽¹⁾) = ${show(r3dcdv,5)} × (−1) = ${show(r3G,-5)}</div>`

  bpUpdateHint()
}

// ── Backprop graph SVG ────────────────────────────
function bpDrawGraph(){
  const svg=$('bp-graph-svg'); if(!svg) return
  const W=460, H=260

  // node positions
  const pos = {
    u1:{x:60,y:200}, u2:{x:60,y:120}, u3:{x:60,y:60},
    u4:{x:200,y:160}, u5:{x:320,y:100}, u6:{x:430,y:100}
  }
  const labels = {u1:'u⁽¹⁾=−1',u2:'u⁽²⁾=5',u3:'u⁽³⁾=3',u4:'u⁽⁴⁾=−5',u5:'u⁽⁵⁾=−2',u6:'u⁽⁶⁾=2'}
  const nr=22

  const gradients = {
    u6: '1',
    u5: '−1',
    u4: bpAnswers['bp-r2-G']===(-1) ? '−1' : '?',
    u1: bpAnswers['bp-r3-G']===(-5) ? '−5' : '?'
  }

  const edges = [
    {from:'u1',to:'u4',label:'×'},{from:'u2',to:'u4',label:'×'},
    {from:'u4',to:'u5',label:'+'},{from:'u3',to:'u5',label:'+'},
    {from:'u5',to:'u6',label:'|·|'}
  ]

  let edgeSvg='', nodeSvg=''

  edges.forEach(e=>{
    const p1=pos[e.from],p2=pos[e.to]
    const dx=p2.x-p1.x,dy=p2.y-p1.y,len=Math.sqrt(dx*dx+dy*dy)
    const ux=dx/len,uy=dy/len
    const x1=p1.x+ux*nr,y1=p1.y+uy*nr,x2=p2.x-ux*(nr+6),y2=p2.y-uy*(nr+6)
    const mx=(x1+x2)/2,my=(y1+y2)/2
    const id=`bpe-${e.from}-${e.to}`
    edgeSvg+=`
      <defs><marker id="${id}" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L0,7 L7,3.5 z" fill="#1d4ed8"/></marker></defs>
      <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1d4ed8" stroke-width="1.5" marker-end="url(#${id})"/>
      <text x="${mx.toFixed(1)}" y="${(my-6).toFixed(1)}" text-anchor="middle" font-size="11" fill="#6d28d9" font-family="Courier New" font-weight="700">${e.label}</text>`
  })

  Object.entries(pos).forEach(([name,p])=>{
    const gKey=name
    const gVal=gradients[gKey]||'?'
    const hasG=gVal!=='?'
    const fill=name==='u6'?'#f0f9ff':name==='u1'?'#fff7ed':'var(--surface)'
    const stroke=name==='u6'?'#0284c7':name==='u1'?'#c2610c':'var(--muted)'
    nodeSvg+=`
      <circle cx="${p.x}" cy="${p.y}" r="${nr}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <text x="${p.x}" y="${p.y-4}" text-anchor="middle" font-size="10" font-weight="700" font-family="Courier New" fill="${stroke}">${labels[name]}</text>
      <text x="${p.x}" y="${p.y+9}" text-anchor="middle" font-size="10" font-family="Courier New" fill="${hasG?'#15803d':'var(--muted)'}">G=${gVal}</text>`
  })

  svg.innerHTML=`<rect width="${W}" height="${H}" fill="var(--surface)"/>${edgeSvg}${nodeSvg}
    <text x="${W/2}" y="${H-4}" text-anchor="middle" font-size="11" fill="var(--muted)">G = gradient flowing back (shown as each row is filled correctly)</text>`
}

function bpRenderMCQ(){
  const c=$('bp-mcq-opts'); if(!c) return
  c.innerHTML=BP_MCQ.map((opt,i)=>`
    <div class="cg-mcq-opt" id="bp-mcq-${i}" onclick="bpAnswer(${i})">
      <span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span>
      <span>${opt.text}</span>
    </div>`).join('')
}

function bpAnswer(i){
  if(bpMcqCorrect) return
  const opt=BP_MCQ[i]
  document.querySelectorAll('.cg-mcq-opt[id^="bp-mcq"]').forEach(el=>el.onclick=null)
  $(`bp-mcq-${i}`).classList.add(opt.correct?'sel-ok':'sel-bad')
  const badge=$('bp-mcq-badge'), hint=$('bp-mcq-hint')
  if(opt.correct){
    bpMcqCorrect=true
    if(badge){ badge.textContent='✓ Correct'; badge.className='badge gg' }
    if(hint){ hint.className='guidance-box done'; hint.innerHTML='<strong>✓ Correct!</strong> G=−5 means u⁽⁶⁾ decreases by 5ε when u⁽¹⁾ increases by ε. Gradient descent would increase u⁽¹⁾ to minimize u⁽⁶⁾.' }
  } else {
    if(badge){ badge.textContent='Try again'; badge.className='badge og' }
    if(hint){ hint.className='guidance-box warm'; hint.innerHTML='<strong>Not quite.</strong> Think about what G represents: ∂u⁽⁶⁾/∂u⁽¹⁾ ≈ G = −5. A <em>negative</em> gradient means output <em>decreases</em> as input increases.' }
    // re-enable others
    document.querySelectorAll('.cg-mcq-opt[id^="bp-mcq"]').forEach((el,j)=>{
      if(j!==i) el.onclick=()=>bpAnswer(j)
    })
  }
  bpUpdateSubmitSummary()
}

function bpUpdateSubmitSummary(){
  const el=$('bp-submit-summary')
  const n=bpCountCorrect()
  if(el) el.innerHTML=`
    <p><strong>Table cells correct:</strong> ${n}/6 ${n===6?'<span style="color:var(--green)">✓</span>':''}</p>
    <p><strong>Interpretation MCQ:</strong> ${bpMcqCorrect?'<span style="color:var(--green)">✓ correct</span>':'not yet answered'}</p>
    <p><strong>Stage reached:</strong> ${bpStage}/3</p>
    ${n===6&&bpMcqCorrect?'<p style="color:var(--green);margin-top:4px;font-weight:600">✓ All parts complete!</p>':''}`
  updateBadge('bp-completed', isComplete('backprop'))
}

function initBackprop(){
  bpRenderStages()
  bpUpdateSubmitSummary()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 7.1 — REGULARIZATION RACE
// ══════════════════════════════════════════════════
let rrStage=0, rrNoreg=null, rrL1mcq=null, rrL2mcq=null, rrReflection=''

const RR_NOREG=[{t:'Model A wins (lower J̃)',c:true},{t:'Model B wins (lower J̃)',c:false},{t:'Tie',c:false}]
const RR_L1=[{t:'Model A wins (lower J̃)',c:true},{t:'Model B wins (lower J̃)',c:false},{t:'Tie',c:false}]
const RR_L2=[{t:'Model A wins (lower J̃)',c:false},{t:'Model B wins (lower J̃)',c:true},{t:'Tie',c:false}]

function rrUnlock(){
  rrStage=Math.max(rrStage,1)
  $('rr-s2').classList.add('unlocked')
  rrDrawBars()
}
function rrCheck(id,ans){
  const el=$(id); if(!el) return
  const v=parseFloat(el.value.trim())
  if(isNaN(v)){el.className='rr-inp';rrOnChange();return}
  el.className='rr-inp '+(Math.abs(v-ans)<0.5?'ok':'bad')
  rrOnChange()
}
function rrCheckD(id,ans){
  const el=$(id); if(!el) return
  const v=parseFloat(el.value.trim())
  if(isNaN(v)){el.className='rr-inp';rrOnChange();return}
  el.className='rr-inp '+(Math.abs(v-ans)<0.07?'ok':'bad')
  rrOnChange()
}
function rrAllMSEOk(){
  return ['rr-e2a0','rr-e2a1','rr-e2a2','rr-msea','rr-e2b0','rr-e2b1','rr-e2b2','rr-mseb'].every(id=>$(id)&&$(id).classList.contains('ok'))
}
function rrOnChange(){
  rrDrawBars(); rrUpdatePens()
  const btn=$('rr-to-s3-btn'); if(btn) btn.disabled=!rrAllMSEOk()
  const hint=$('rr-mse-hint')
  if(hint){
    if(rrAllMSEOk()){hint.className='guidance-box done';hint.textContent='✓ All correct! MSE_a=0.333, MSE_b=1.667. Click "Proceed to penalties" to continue.'}
    else{hint.className='guidance-box cold';hint.textContent='Fill in squared errors (y−ŷ)², then MSE = total ÷ 3. Round to 2 decimal places (e.g. 0.33).'}
  }
  rrUpdateSubmitSummary()
}
function rrToStage3(){
  rrStage=Math.max(rrStage,2)
  $('rr-s3').classList.add('unlocked')
  rrRenderMCQ('noreg',RR_NOREG)
  rrUpdateSubmitSummary()
}
function rrDrawBars(){
  const svg=$('rr-bar-svg'); if(!svg) return
  const mseA=$('rr-msea')&&$('rr-msea').classList.contains('ok')?1/3:0
  const mseB=$('rr-mseb')&&$('rr-mseb').classList.contains('ok')?5/3:0
  const l2aOk=$('rr-jl2a')&&$('rr-jl2a').classList.contains('ok')
  const l2bOk=$('rr-jl2b')&&$('rr-jl2b').classList.contains('ok')
  const l1aOk=$('rr-jl1a')&&$('rr-jl1a').classList.contains('ok')
  const l1bOk=$('rr-jl1b')&&$('rr-jl1b').classList.contains('ok')
  let penA=0,penB=0
  if(l2aOk) penA=14/3; else if(l1aOk) penA=6/3
  if(l2bOk) penB=9/3;  else if(l1bOk) penB=3/3
  const W=280,H=160,pad=30,bW=54,gap=22
  const max=Math.max(mseA+penA,mseB+penB,0.5)
  const sc=(H-pad*1.5)/max
  const ax=W/2-bW-gap/2,bx=W/2+gap/2,bottom=H-pad
  const mhA=mseA*sc,phA=penA*sc,mhB=mseB*sc,phB=penB*sc
  const totalA=(mseA+penA).toFixed(2),totalB=(mseB+penB).toFixed(2)
  const aWins=mseA+penA>0&&mseA+penA<mseB+penB
  svg.innerHTML=`
    <rect x="${ax}" y="${bottom-mhA-phA}" width="${bW}" height="${phA>0?phA:0}" fill="#fb923c" rx="2"/>
    <rect x="${ax}" y="${bottom-mhA}" width="${bW}" height="${mhA>0?mhA:0}" fill="#60a5fa" rx="0 0 2 2"/>
    <rect x="${bx}" y="${bottom-mhB-phB}" width="${bW}" height="${phB>0?phB:0}" fill="#fb923c" rx="2"/>
    <rect x="${bx}" y="${bottom-mhB}" width="${bW}" height="${mhB>0?mhB:0}" fill="#60a5fa" rx="0 0 2 2"/>
    <text x="${ax+bW/2}" y="${H-8}" text-anchor="middle" font-size="12" font-family="system-ui" font-weight="700" fill="#1d4ed8">w_a</text>
    <text x="${bx+bW/2}" y="${H-8}" text-anchor="middle" font-size="12" font-family="system-ui" font-weight="700" fill="#c2610c">w_b</text>
    <rect x="8" y="6" width="10" height="10" fill="#60a5fa" rx="2"/><text x="22" y="15" font-size="10" font-family="system-ui" fill="var(--muted)">MSE</text>
    <rect x="58" y="6" width="10" height="10" fill="#fb923c" rx="2"/><text x="72" y="15" font-size="10" font-family="system-ui" fill="var(--muted)">Penalty</text>
    ${mseA>0||mseB>0?`
    <text x="${ax+bW/2}" y="${Math.max(10,bottom-mhA-phA-4)}" text-anchor="middle" font-size="11" font-family="Courier New" font-weight="700" fill="${aWins?'#15803d':'var(--text)'}">${totalA}</text>
    <text x="${bx+bW/2}" y="${Math.max(10,bottom-mhB-phB-4)}" text-anchor="middle" font-size="11" font-family="Courier New" font-weight="700" fill="${!aWins&&mseB+penB>0?'#15803d':'var(--text)'}">${totalB}</text>`:''}
    <line x1="${pad/2}" y1="${bottom}" x2="${W-pad/2}" y2="${bottom}" stroke="var(--border)" stroke-width="1"/>`
}
function rrUpdatePens(){
  const o1aOk=$('rr-o1a')&&$('rr-o1a').classList.contains('ok')
  const o1bOk=$('rr-o1b')&&$('rr-o1b').classList.contains('ok')
  const o2aOk=$('rr-o2a')&&$('rr-o2a').classList.contains('ok')
  const o2bOk=$('rr-o2b')&&$('rr-o2b').classList.contains('ok')
  const set=(id,v)=>{const e=$(id);if(e)e.textContent=v}
  set('rr-o1a-v',o1aOk?'6':'?'); set('rr-p1a',o1aOk?'2.000':'?'); set('rr-p1a2',o1aOk?'2.000':'?')
  set('rr-o1b-v',o1bOk?'3':'?'); set('rr-p1b',o1bOk?'1.000':'?'); set('rr-p1b2',o1bOk?'1.000':'?')
  set('rr-o2a-v',o2aOk?'14':'?'); set('rr-p2a',o2aOk?'4.667':'?'); set('rr-p2a2',o2aOk?'4.667':'?')
  set('rr-o2b-v',o2bOk?'9':'?'); set('rr-p2b',o2bOk?'3.000':'?'); set('rr-p2b2',o2bOk?'3.000':'?')
}
function rrRenderMCQ(sec,opts){
  const c=$(`rr-${sec}-opts`); if(!c) return
  c.innerHTML=opts.map((o,i)=>`
    <div class="cg-mcq-opt" id="rr-${sec}-${i}" onclick="rrAnswer('${sec}',${i})">
      <span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span>
      <span>${o.t}</span></div>`).join('')
}
function rrAnswer(sec,i){
  const maps={noreg:RR_NOREG,l1:RR_L1,l2:RR_L2}
  const opt=maps[sec][i]
  document.querySelectorAll(`.cg-mcq-opt[id^="rr-${sec}-"]`).forEach(e=>e.onclick=null)
  $(`rr-${sec}-${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  const hint=$(`rr-${sec}-hint`)
  if(sec==='noreg') rrNoreg=opt.c
  if(sec==='l1') rrL1mcq=opt.c
  if(sec==='l2') rrL2mcq=opt.c
  if(opt.c){
    const msgs={noreg:'<strong>✓ Correct!</strong> J_a=0.333 &lt; J_b=1.667. Without regularization, the better-fitting model always wins.',l1:'<strong>✓ Correct!</strong> J̃_a=2.333 &lt; J̃_b=2.667. At α=1/3, model A still wins — its fit advantage outweighs the extra L1 cost.',l2:'<strong>✓ Correct!</strong> J̃_a=5.000 &gt; J̃_b=4.667. The flip! L2 squares −2 into 4, making w_a\'s penalty 4.667 vs w_b\'s 3.000.'}
    if(hint){hint.className='guidance-box done';hint.innerHTML=msgs[sec].replace('<strong>✓ Correct!</strong>','<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong>')}
    if(sec==='noreg'){$('rr-l1-s').classList.add('unlocked');rrRenderMCQ('l1',RR_L1)}
    if(sec==='l1'){$('rr-l2-s').classList.add('unlocked');rrRenderMCQ('l2',RR_L2)}
    if(sec==='l2') $('rr-s4').classList.add('unlocked')
  } else {
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Compare the J̃ values — which is numerically smaller?'}
    document.querySelectorAll(`.cg-mcq-opt[id^="rr-${sec}-"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>rrAnswer(sec,j)})
  }
  rrUpdateSubmitSummary()
}
function rrCountOk(){
  return ['rr-e2a0','rr-e2a1','rr-e2a2','rr-msea','rr-e2b0','rr-e2b1','rr-e2b2','rr-mseb',
          'rr-o1a','rr-o1b','rr-jl1a','rr-jl1b','rr-o2a','rr-o2b','rr-jl2a','rr-jl2b'].filter(id=>$(id)&&$(id).classList.contains('ok')).length
}
function rrUpdateSubmitSummary(){
  const el=$('rr-submit-summary')
  if(el) el.innerHTML=`<p><strong>Cells correct:</strong> ${rrCountOk()}/16</p>
    <p><strong>No-reg MCQ:</strong> ${rrNoreg===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>L1 MCQ:</strong> ${rrL1mcq===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>L2 MCQ:</strong> ${rrL2mcq===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('rr-completed', isComplete('regrace'))
}
function initRegRace(){
  const eq=$('rr-prob-eq')
  if(eq){
    eq.innerHTML=`
      <div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);text-align:center">
          <div style="color:#b45309">$J(\\mathbf{w})=\\dfrac{1}{|X|}\\sum_{i}(y_i - \\mathbf{x}_i\\mathbf{w}^\\top)^2$</div>
          <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8"><strong style="color:var(--text)">Data loss</strong> — mean squared error over all samples. Lower means better fit to training data.</div>
        </div>
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);text-align:center">
          <div style="color:#6d28d9">$\\Omega_1=\\sum_i|w_i| \\qquad \\Omega_2=\\sum_i w_i^2$</div>
          <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8"><strong style="color:var(--text)">L1</strong> penalises absolute size — drives small weights to exactly 0 (sparse). &nbsp;<strong style="color:var(--text)">L2</strong> penalises squared size — shrinks all weights but rarely zeros them.</div>
        </div>
        <div style="padding:16px 20px;text-align:center">
          <div style="color:#15803d">$\\tilde{J}(\\mathbf{w})=J(\\mathbf{w})+\\alpha\\,\\Omega(\\mathbf{w})$</div>
          <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8">α trades off fit vs. simplicity. A large α can flip the winner — <strong style="color:var(--text)">for which weight does the choice of L1 vs L2 matter most?</strong></div>
        </div>
      </div>`
    typeset(eq)
  }
  rrUpdateSubmitSummary()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 7.8 — EARLY STOPPING
// ══════════════════════════════════════════════════
let esStage=0, esTrain=70, esVal=20, esEpoch=50
let esStopMcq=null, esWhyMcq=null, esEpochOk=false

const ES_STOP=[
  {t:'When training loss stops decreasing',c:false},
  {t:'When validation loss is at its minimum',c:true},
  {t:'After a fixed number of epochs set in advance',c:false},
  {t:'When the training and validation curves cross',c:false}
]
const ES_WHY=[
  {t:'It prevents the optimizer from ever converging to a minimum',c:false},
  {t:'It limits how long the model has to memorize the training set',c:true},
  {t:'It adds a penalty term proportional to weight magnitudes',c:false},
  {t:'It reduces the number of parameters in the model',c:false}
]

function esUnlock(){
  esStage=Math.max(esStage,1)
  $('es-s2').classList.add('unlocked')
  esUpdateSplit()
}
function esUpdateSplit(source){
  let t=parseInt($('es-train-slider').value)||70
  let v=parseInt($('es-val-slider').value)||20
  if(t+v>100){
    if(source==='val'){ v=100-t; $('es-val-slider').value=v }
    else { t=100-v; $('es-train-slider').value=t }
  }
  const te=Math.max(0,100-t-v)
  esTrain=t; esVal=v
  $('es-train-v').textContent=t
  $('es-val-v').textContent=v
  const tv=$('es-test-v'); if(tv) tv.textContent=te
  $('es-n-train').textContent=t*10
  $('es-n-val').textContent=v*10
  $('es-n-test').textContent=te*10
  const n2=$('es-n-train2'); if(n2) n2.textContent=t*10
  const bar=$('es-split-bar')
  if(bar) bar.innerHTML=`
    <div style="flex:${t};background:#60a5fa;height:32px;display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:700;color:#fff;overflow:hidden;min-width:0">${t>12?t+'%':''}</div>
    <div style="flex:${v};background:#fb923c;height:32px;display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:700;color:#fff;overflow:hidden;min-width:0">${v>6?v+'%':''}</div>
    <div style="flex:${te};background:#86efac;height:32px;display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:700;color:#14532d;overflow:hidden;min-width:0">${te>6?te+'%':''}</div>`
  const warn=$('es-val-warn')
  if(warn){warn.style.display=v<5?'block':'none';warn.textContent='⚠ You need validation data to know when to stop — increase the validation %!'}
  const btn=$('es-to-s3-btn'); if(btn) btn.disabled=v<5
}
function esUpdateEpoch(){
  esEpoch=parseInt($('es-epoch-slider').value)||50
  $('es-epoch-v').textContent=esEpoch
  esDrawCurves()
}
function esToStage3(){
  esStage=Math.max(esStage,2)
  $('es-s3').classList.add('unlocked')
  esDrawCurves()
  esRenderStopMCQ()
}
function esFTrain(t){return 0.1+2.1*Math.exp(-0.1*t)}
function esFVal(t){return 0.38+Math.pow(t-40,2)*0.00115+0.38*Math.exp(-0.1*t)}
function esComputeMinT(){
  let minV=Infinity,minT=0
  for(let t=0;t<=100;t++){const v=esFVal(t);if(v<minV){minV=v;minT=t}}
  return minT
}
function esCheckEpochAnswer(){
  const inp=$('es-epoch-answer'); if(!inp) return
  const v=parseInt(inp.value)
  const minT=esComputeMinT()
  const hint=$('es-epoch-hint')
  if(isNaN(v)){
    inp.className='ba-cell-input'; esEpochOk=false
    if(hint){hint.className='guidance-box cold';hint.innerHTML='Enter the epoch number where the validation loss curve is in the Optimal Zone.'}
  } else if(Math.abs(v-minT)<=8){
    inp.className='ba-cell-input ok'; esEpochOk=true
    if(hint){hint.className='guidance-box done';hint.innerHTML=`<strong>✓ Correct!</strong> Around epoch ${minT}, validation loss is at its minimum — that's the Optimal Zone.`}
  } else {
    inp.className='ba-cell-input bad'; esEpochOk=false
    if(hint){hint.className='guidance-box warm';hint.innerHTML='Not quite — drag the slider above until its label reads "Optimal Zone!", then enter that epoch number.'}
  }
  esUpdateSubmitSummary()
}
function esDrawCurves(){
  const svg=$('es-curve-svg'); if(!svg) return
  const W=460,H=200,pL=44,pR=12,pT=14,pB=32
  const E=100,maxY=3.2
  const xs=t=>pL+(t/E)*(W-pL-pR)
  const ys=v=>H-pB-(v/maxY)*(H-pT-pB)
  let pathT='',pathV=''
  for(let t=0;t<=E;t++){
    pathT+=(t===0?'M':'L')+xs(t).toFixed(1)+','+ys(esFTrain(t)).toFixed(1)+' '
    pathV+=(t===0?'M':'L')+xs(t).toFixed(1)+','+ys(esFVal(t)).toFixed(1)+' '
  }
  const minT=esComputeMinT()
  const sx=xs(esEpoch)
  const zone=esEpoch<minT-8?'Too Early':esEpoch>minT+8?'Overfitting!':'Optimal Zone!'
  const zc=esEpoch<minT-8?'#fef08a':esEpoch>minT+8?'#fca5a5':'#86efac'
  const grid=[0,1,2,3].map(v=>`<line x1="${pL}" y1="${ys(v).toFixed(1)}" x2="${W-pR}" y2="${ys(v).toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/><text x="${pL-3}" y="${ys(v)+4}" text-anchor="end" font-size="10" font-family="Courier New" fill="var(--muted)">${v}</text>`).join('')
  const ticks=[0,20,40,60,80,100].map(t=>`<text x="${xs(t).toFixed(1)}" y="${H-pB+13}" text-anchor="middle" font-size="10" font-family="Courier New" fill="var(--muted)">${t}</text>`).join('')
  svg.innerHTML=`
    <rect x="${pL}" y="${pT}" width="${W-pL-pR}" height="${H-pT-pB}" fill="var(--surf2)" rx="3"/>
    ${grid}${ticks}
    <text x="${W/2}" y="${H-1}" text-anchor="middle" font-size="11" font-family="system-ui" fill="var(--muted)">Epoch</text>
    <line x1="${xs(minT).toFixed(1)}" y1="${pT}" x2="${xs(minT).toFixed(1)}" y2="${H-pB}" stroke="#15803d" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${xs(minT).toFixed(1)}" y="${pT+10}" text-anchor="middle" font-size="9" fill="#15803d" font-weight="700">opt≈${minT}</text>
    <path d="${pathT}" fill="none" stroke="#1d4ed8" stroke-width="2"/>
    <path d="${pathV}" fill="none" stroke="#c2610c" stroke-width="2"/>
    <rect x="${sx-1}" y="${pT}" width="2" height="${H-pT-pB}" fill="#6d28d9"/>
    <rect x="${Math.min(W-pR-80,Math.max(pL,sx-38))}" y="${pT+2}" width="76" height="16" rx="4" fill="${zc}" opacity="0.92"/>
    <text x="${Math.min(W-pR-42,Math.max(pL+38,sx))}" y="${pT+13}" text-anchor="middle" font-size="10" font-weight="700" font-family="system-ui" fill="#1a1210">${zone}</text>
    <line x1="${W-120}" y1="16" x2="${W-105}" y2="16" stroke="#1d4ed8" stroke-width="2"/>
    <text x="${W-100}" y="20" font-size="11" font-family="system-ui" fill="var(--text)">Train</text>
    <line x1="${W-60}" y1="16" x2="${W-45}" y2="16" stroke="#c2610c" stroke-width="2"/>
    <text x="${W-40}" y="20" font-size="11" font-family="system-ui" fill="var(--text)">Val</text>`
  const info=$('es-stop-info')
  if(info) info.innerHTML=`Epoch ${esEpoch}: Train loss=${esFTrain(esEpoch).toFixed(3)} &nbsp;·&nbsp; Val loss=${esFVal(esEpoch).toFixed(3)} &nbsp;·&nbsp; <strong style="color:${esEpoch>=minT-8&&esEpoch<=minT+8?'var(--green)':'var(--orange)'}">${zone}</strong>`
}
function esRenderStopMCQ(){
  const c=$('es-stop-opts'); if(!c) return
  c.innerHTML=ES_STOP.map((o,i)=>`<div class="cg-mcq-opt" id="es-stop-${i}" onclick="esAnswer('stop',${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span>${o.t}</span></div>`).join('')
}
function esRenderWhyMCQ(){
  const c=$('es-why-opts'); if(!c) return
  c.innerHTML=ES_WHY.map((o,i)=>`<div class="cg-mcq-opt" id="es-why-${i}" onclick="esAnswer('why',${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span>${o.t}</span></div>`).join('')
}
function esAnswer(sec,i){
  const maps={stop:ES_STOP,why:ES_WHY}
  const opt=maps[sec][i]
  document.querySelectorAll(`.cg-mcq-opt[id^="es-${sec}-"]`).forEach(e=>e.onclick=null)
  $(`es-${sec}-${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  if(sec==='stop') esStopMcq=opt.c
  if(sec==='why') esWhyMcq=opt.c
  const hint=$(`es-${sec}-hint`)
  if(opt.c){
    const msgs={stop:'<strong>✓ Correct!</strong> The minimum validation loss is your stopping signal. Drag the slider to epoch ≈40 to see this.',why:'<strong>✓ Correct!</strong> Early stopping is regularization because it prevents the model from spending too many epochs fitting noise in the training set.'}
    if(hint){hint.className='guidance-box done';hint.innerHTML=msgs[sec].replace('<strong>✓ Correct!</strong>','<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong>')}
    if(sec==='stop'){$('es-s4').classList.add('unlocked');esRenderWhyMCQ()}
  } else {
    const fails={stop:'Training loss always decreases — it can\'t tell you when to stop. You need validation loss, which dips then rises.',why:'No penalty term is added. Instead, training is simply stopped early — before the model has time to memorize the training set.'}
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> '+fails[sec]}
    document.querySelectorAll(`.cg-mcq-opt[id^="es-${sec}-"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>esAnswer(sec,j)})
  }
  esUpdateSubmitSummary()
}
function esUpdateSubmitSummary(){
  const el=$('es-submit-summary')
  if(el) el.innerHTML=`<p><strong>Validation split:</strong> ${esVal>=5?'<span style="color:var(--green)">✓ '+esVal+'%</span>':'⚠ needs validation'}</p>
    <p><strong>Stop criterion MCQ:</strong> ${esStopMcq===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>Optimal epoch found:</strong> ${esEpochOk===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>Regularization MCQ:</strong> ${esWhyMcq===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>Stage reached:</strong> ${esStage}/2</p>`
  updateBadge('es-completed', isComplete('earlystop'))
}
function initEarlyStop(){
  esUpdateSplit()
  esUpdateSubmitSummary()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 7.12 — INPUT DROPOUT
// ══════════════════════════════════════════════════
let dpStage=0, dpDomain='image', dpRate=0.4
let dpMcq={image:null,words:null,chars:null}, dpBestMcq=null, dpReflection=''

function dpRng(seed,i){const x=Math.sin(seed*31.7+i*17.3)*43758.5453;return x-Math.floor(x)}

const DP_DOMAIN_EXPLAINS={
  image:'<strong style="color:var(--blue)">Image classification:</strong> Each input unit is one pixel value. Dropping it zeroes that pixel for this training step — like randomly occluding parts of the image. The model must recognize objects even with pieces missing.',
  words:'<strong style="color:var(--orange)">Word-bag text:</strong> Each input unit counts occurrences of one word type. Dropping it means pretending that word never appeared in this example — the model must classify without relying on any single word.',
  chars:'<strong style="color:var(--purple)">Character-level text:</strong> Each input unit represents one character type. Dropping it masks that character everywhere it appears in this example — forcing the model to read despite missing characters.'
}
const DP_MCQ={
  image:[{t:'Randomly removing entire training images from the dataset',c:false},{t:'Randomly occluding pixels — making the model robust to partial visibility',c:true},{t:'Reducing the resolution of the image',c:false},{t:'Adding Gaussian noise to pixel values',c:false}],
  words:[{t:'Removing that word from the training vocabulary permanently',c:false},{t:'Replacing the word with a random synonym',c:false},{t:'Pretending this word never appeared in this training example',c:true},{t:'Reducing the word\'s embedding dimension',c:false}],
  chars:[{t:'Permanently removing that character from the character set',c:false},{t:'Forcing the model to recognize text despite missing characters',c:true},{t:'Converting that character to lowercase',c:false},{t:'Slowing down training convergence',c:false}]
}
const DP_BEST=[
  {t:'Image classification — partial occlusion is a realistic real-world condition (objects behind other objects)',c:true},
  {t:'Word-bag text — important words are rarely entirely absent from a document',c:false},
  {t:'Character-level text — characters are almost never missing in clean text data',c:false}
]

function dpUnlock(){
  dpStage=Math.max(dpStage,1)
  $('dp-s2').classList.add('unlocked')
  dpRender()
  dpRenderDomainMCQs()
  $('dp-s3').classList.add('unlocked')
}
function dpSetDomain(d){
  dpDomain=d
  document.querySelectorAll('.dp-domain-btn').forEach(b=>b.classList.remove('active'))
  $(`dp-btn-${d}`).classList.add('active')
  const exp=$('dp-domain-explain'); if(exp) exp.innerHTML=DP_DOMAIN_EXPLAINS[d]
  dpRender()
}
function dpUpdateRate(){
  dpRate=parseFloat($('dp-rate-slider').value)||0.4
  $('dp-rate-v').textContent=Math.round(dpRate*100)+'%'
  dpRender()
}
function dpRender(){
  if(dpDomain==='image') dpRenderImage()
  else if(dpDomain==='words') dpRenderWords()
  else dpRenderChars()
}
function dpRenderImage(){
  const c=$('dp-vis'); if(!c) return
  const seed=Math.round(dpRate*100)+Math.round(Math.random()*1000)*0
  let html='<div style="display:inline-block;background:var(--surf2);padding:6px;border-radius:6px;border:1px solid var(--border)">'
  for(let r=0;r<8;r++){
    html+='<div style="display:flex">'
    for(let col=0;col<8;col++){
      const masked=dpRng(seed,r*8+col)<dpRate
      const br=Math.round(120+dpRng(seed+77,r*8+col)*100)
      html+=`<div class="dp-pixel${masked?' masked':''}" style="${masked?'':'background:rgb('+br+','+Math.round(br*.92)+','+Math.round(br*.84)+')'}"></div>`
    }
    html+='</div>'
  }
  html+='</div><p style="font-size:13.5px;color:var(--muted);margin-top:8px">'+Math.round(dpRate*100)+'% of pixels are zeroed (blacked out) each forward pass.</p>'
  c.innerHTML=html
}
const DP_WORDS=['the','cat','sat','on','mat','chases','runs','fast','never','stops']
function dpRenderWords(){
  const c=$('dp-vis'); if(!c) return
  const seed=Math.round(dpRate*100)
  let html='<div style="padding:6px 0">'
  DP_WORDS.forEach((w,i)=>{html+=`<span class="dp-word-chip${dpRng(seed,i)<dpRate?' masked':''}">${w}</span>`})
  html+='</div><p style="font-size:13.5px;color:var(--muted);margin-top:8px">Dropped words (<span style="text-decoration:line-through;color:#94a3b8">dummy-word</span>) are treated as absent from this example.</p>'
  c.innerHTML=html
}
const DP_CHARS=[...'Hello World!']
function dpRenderChars(){
  const c=$('dp-vis'); if(!c) return
  const seed=Math.round(dpRate*100)
  const uniq=[...new Set(DP_CHARS.filter(ch=>ch.trim()))]
  const masked=new Set(uniq.filter((_,i)=>dpRng(seed,i)<dpRate))
  let html='<div style="padding:6px 0">'
  DP_CHARS.forEach(ch=>{
    if(ch===' '){html+='<span style="display:inline-block;width:8px"></span>';return}
    html+=`<span class="dp-char-chip${masked.has(ch)?' masked':''}">${masked.has(ch)?'_':ch}</span>`
  })
  html+='</div><p style="font-size:13.5px;color:var(--muted);margin-top:8px">Dropped character types are replaced with "_" wherever they appear.</p>'
  c.innerHTML=html
}
function dpRenderDomainMCQs(){
  ['image','words','chars'].forEach(domain=>{
    const c=$(`dp-${domain}-opts`); if(!c) return
    c.innerHTML=DP_MCQ[domain].map((o,i)=>`<div class="cg-mcq-opt" id="dp-${domain}-${i}" onclick="dpAnswer('${domain}',${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span>${o.t}</span></div>`).join('')
  })
}
function dpAnswer(domain,i){
  const opt=DP_MCQ[domain][i]
  document.querySelectorAll(`.cg-mcq-opt[id^="dp-${domain}-"]`).forEach(e=>e.onclick=null)
  $(`dp-${domain}-${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  dpMcq[domain]=opt.c
  const hint=$(`dp-${domain}-hint`)
  const msgs={image:'<strong>✓ Correct!</strong> Zeroing pixels = partial occlusion. Objects in the real world are often partially hidden — this trains the model to be robust to that.',words:'<strong>✓ Correct!</strong> Each input unit is one word\'s count. Zeroing it means pretending that word simply didn\'t appear — like reading a sentence with words redacted.',chars:'<strong>✓ Correct!</strong> Dropping a character type forces the model to infer meaning even when some characters are always missing — useful for noisy or abbreviated text.'}
  const fails={image:'Think about what a pixel unit represents. Zeroing it doesn\'t remove the whole image — just that one pixel location.',words:'The unit is just one word\'s count for this example. Zeroing it doesn\'t affect other examples or the vocabulary.',chars:'Character types are dropped within this example only. The model still sees other characters — it must fill in the gap.'}
  if(opt.c){
    if(hint){hint.className='guidance-box done';hint.innerHTML=msgs[domain].replace('<strong>✓ Correct!</strong>','<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong>')}
    if(Object.values(dpMcq).every(v=>v===true)){$('dp-s4').classList.add('unlocked');dpRenderBestMCQ()}
  } else {
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> '+fails[domain]}
    document.querySelectorAll(`.cg-mcq-opt[id^="dp-${domain}-"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>dpAnswer(domain,j)})
  }
  dpUpdateSubmitSummary()
}
function dpRenderBestMCQ(){
  const c=$('dp-best-opts'); if(!c) return
  c.innerHTML=DP_BEST.map((o,i)=>`<div class="cg-mcq-opt" id="dp-best-${i}" onclick="dpBestAnswer(${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span>${o.t}</span></div>`).join('')
}
function dpBestAnswer(i){
  const opt=DP_BEST[i]
  document.querySelectorAll(`.cg-mcq-opt[id^="dp-best-"]`).forEach(e=>e.onclick=null)
  $(`dp-best-${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  dpBestMcq=opt.c
  const hint=$('dp-best-hint')
  if(opt.c){
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> In real images, objects are frequently partially occluded. Input dropout directly simulates this condition, making the model more robust to real-world visual noise.'}
  } else {
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Think about which domain most commonly sees "missing" inputs in actual deployment — where would a randomly absent input unit be realistic?'}
    document.querySelectorAll(`.cg-mcq-opt[id^="dp-best-"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>dpBestAnswer(j)})
  }
  dpUpdateSubmitSummary()
}
function dpUpdateSubmitSummary(){
  const el=$('dp-submit-summary')
  const n=Object.values(dpMcq).filter(v=>v===true).length
  if(el) el.innerHTML=`<p><strong>Domain MCQs:</strong> ${n}/3 ${n===3?'<span style="color:var(--green)">✓</span>':''}</p>
    <p><strong>Best domain MCQ:</strong> ${dpBestMcq===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>Stage reached:</strong> ${dpStage}/2</p>`
  updateBadge('dp-completed', isComplete('dropout'))
}
function initDropout(){
  const exp=$('dp-domain-explain'); if(exp) exp.innerHTML=DP_DOMAIN_EXPLAINS['image']
  dpUpdateSubmitSummary()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 7.KD — TAXONOMY REGULARIZER
// ══════════════════════════════════════════════════
let kdStage=0
let kdMcq={sim:null,formula:null,weight:null,effect:null}, kdReflection=''

const KD_SIM=[{t:'Similar — closer classes should have similar predicted probabilities',c:true},{t:'Different — to allow the model to distinguish them sharply',c:false},{t:'Independent — the taxonomy should not affect output probabilities',c:false}]
const KD_FORMULA=[{t:'(pᵢ − pⱼ)² — zero when equal, grows as they diverge',c:true},{t:'pᵢ · pⱼ — a product of the two probabilities',c:false},{t:'log(pᵢ / pⱼ) — a log-ratio penalty',c:false},{t:'pᵢ + pⱼ — always penalizes both classes equally',c:false}]
const KD_WEIGHT=[{t:'Higher for closer pairs (small distance → large weight → penalized more for differing)',c:true},{t:'Higher for more distant pairs (far classes need more nudging)',c:false},{t:'The same weight for all pairs regardless of distance',c:false}]
const KD_EFFECT=[{t:'Forces the model to predict the exact same probability for all related classes',c:false},{t:'Encourages predicted probabilities to respect taxonomic relationships',c:true},{t:'Replaces the cross-entropy loss entirely',c:false},{t:'Always increases training accuracy',c:false}]

function kdUnlock(){
  kdStage=Math.max(kdStage,1)
  $('kd-s2').classList.add('unlocked')
  kdDrawTree()
}
function kdCheckDist(id,ans){
  const el=$(id); if(!el) return
  const v=parseInt(el.value.trim())
  if(isNaN(v)){el.className='kd-inp';return}
  el.className='kd-inp '+(v===ans?'ok':'bad')
  if(kdAllDistsOk()){
    $('kd-to-s3-btn').disabled=false
    const h=$('kd-dist-hint'); if(h){h.className='guidance-box done';h.textContent='✓ All distances correct! Closer classes get smaller numbers — and thus higher regularization weights (1/distance).'}
  }
  kdUpdateSubmitSummary()
}
function kdAllDistsOk(){return ['kd-d1','kd-d2','kd-d3'].every(id=>$(id)&&$(id).classList.contains('ok'))}
function kdToStage3(){
  kdStage=Math.max(kdStage,2)
  $('kd-s3').classList.add('unlocked')
  kdRenderMCQ('sim',KD_SIM)
  kdUpdateSubmitSummary()
}

const KD_NODES={
  lt:{x:210,y:24,label:'living thing',rx:42,ry:13},
  animal:{x:125,y:76,label:'animal',rx:28,ry:12},
  plant:{x:340,y:76,label:'plant',rx:24,ry:12},
  mammal:{x:72,y:136,label:'mammal',rx:27,ry:12},
  bird:{x:185,y:136,label:'bird',rx:21,ry:12},
  tree:{x:340,y:136,label:'tree',rx:19,ry:12,leaf:true},
  lcat:{x:40,y:196,label:'large cat',rx:30,ry:12},
  dog:{x:115,y:196,label:'dog',rx:18,ry:12,leaf:true},
  eagle:{x:185,y:196,label:'eagle',rx:22,ry:12,leaf:true},
  leopard:{x:20,y:256,label:'leopard',rx:25,ry:12,leaf:true},
  cheetah:{x:72,y:256,label:'cheetah',rx:26,ry:12,leaf:true}
}
const KD_EDGES=[['lt','animal'],['lt','plant'],['animal','mammal'],['animal','bird'],['plant','tree'],['mammal','lcat'],['mammal','dog'],['bird','eagle'],['lcat','leopard'],['lcat','cheetah']]
function kdDrawTree(){
  const svg=$('kd-tree-svg'); if(!svg) return
  let s=''
  KD_EDGES.forEach(([a,b])=>{
    const na=KD_NODES[a],nb=KD_NODES[b]
    s+=`<line x1="${na.x}" y1="${na.y+na.ry}" x2="${nb.x}" y2="${nb.y-nb.ry}" stroke="var(--border)" stroke-width="1.5"/>`
  })
  Object.entries(KD_NODES).forEach(([k,n])=>{
    const isLeaf=!!n.leaf
    s+=`<ellipse cx="${n.x}" cy="${n.y}" rx="${n.rx}" ry="${n.ry}" fill="${isLeaf?'#dbeafe':'var(--surf2)'}" stroke="${isLeaf?'#93c5fd':'var(--border)'}" stroke-width="${isLeaf?1.5:1}"/>`
    s+=`<text x="${n.x}" y="${n.y+4}" text-anchor="middle" font-size="${n.rx>26?11:10}" font-family="system-ui" font-weight="${isLeaf?700:600}" fill="${isLeaf?'#1d4ed8':'var(--muted)'}">${n.label}</text>`
  })
  svg.innerHTML=s
}
function kdRenderMCQ(q,opts){
  const c=$(`kd-${q}-opts`); if(!c) return
  c.innerHTML=opts.map((o,i)=>`<div class="cg-mcq-opt" id="kd-${q}-${i}" onclick="kdAnswer('${q}',${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span>${o.t}</span></div>`).join('')
}
function kdAnswer(q,i){
  const maps={sim:KD_SIM,formula:KD_FORMULA,weight:KD_WEIGHT,effect:KD_EFFECT}
  const opt=maps[q][i]
  document.querySelectorAll(`.cg-mcq-opt[id^="kd-${q}-"]`).forEach(e=>e.onclick=null)
  $(`kd-${q}-${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  kdMcq[q]=opt.c
  const hint=$(`kd-${q}-hint`)
  const msgs={
    sim:'<strong>✓ Correct!</strong> A leopard image is, in some sense, closer to a cheetah than to a chair. The regularizer should reflect this — close classes should have similar probabilities.',
    formula:'<strong>✓ Correct!</strong> (pᵢ−pⱼ)² is zero when probabilities match and grows quadratically as they differ. It\'s the natural "distance" between two probability values.',
    weight:'<strong>✓ Correct!</strong> w=1/distance means close pairs (small d) get high weight (strong penalty for differing) and far pairs (large d) get low weight (weak penalty).',
    effect:'<strong>✓ Correct!</strong> The regularizer is a soft nudge, not a hard constraint. It makes the model prefer taxonomy-consistent outputs while still being driven by training data.'
  }
  const fails={
    sim:'Think about what the taxonomy tells you. If two classes share many ancestors, they are "more similar" — their predictions should reflect that.',
    formula:'We want a term that is 0 when pᵢ = pⱼ and positive when they differ. Which formula has that property?',
    weight:'If leopard and cheetah are very close (distance=2), we want to strongly penalize their probabilities being different. Which weight direction achieves this?',
    effect:'A regularization term added to the loss cannot force anything — it only nudges. And it doesn\'t replace the primary loss (cross-entropy) — it supplements it.'
  }
  if(opt.c){
    if(hint){hint.className='guidance-box done';hint.innerHTML=msgs[q].replace('<strong>✓ Correct!</strong>','<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong>')}
    const order=['sim','formula','weight','effect']
    const nxt=order[order.indexOf(q)+1]
    if(nxt){const nxtMaps={formula:KD_FORMULA,weight:KD_WEIGHT,effect:KD_EFFECT};kdRenderMCQ(nxt,nxtMaps[nxt])}
    if(q==='weight') $('kd-s4').classList.add('unlocked')
    if(q==='effect') kdUpdateSubmitSummary()
  } else {
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> '+fails[q]}
    document.querySelectorAll(`.cg-mcq-opt[id^="kd-${q}-"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>kdAnswer(q,j)})
  }
  kdUpdateSubmitSummary()
}
function kdUpdateSubmitSummary(){
  const el=$('kd-submit-summary')
  const n=Object.values(kdMcq).filter(v=>v===true).length
  if(el) el.innerHTML=`<p><strong>Distances correct:</strong> ${kdAllDistsOk()?'3/3 <span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>MCQs correct:</strong> ${n}/4 ${n===4?'<span style="color:var(--green)">✓</span>':''}</p>
    <p><strong>Stage reached:</strong> ${kdStage}/2</p>`
  updateBadge('kd-completed', isComplete('taxonomy'))
}
function initTaxonomy(){
  kdUpdateSubmitSummary()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 8.1 — WHAT LOSS DO WE ACTUALLY CARE ABOUT?
// ══════════════════════════════════════════════════
let SL={
  gtOn:false, predOn:false,
  warmupCorrect:false,
  flashIdx:0, flashFlip:false, flashSeen:new Set(),
  conf:0.5, iou:0.5, quality:'medium', npred:'balanced',
  mcq:{goal:null,conf:null,iou:null,compare:null,sim:null,q1:null,q2:null,q3:null,q4:null,q5:null,q6:null},
  match:[null,null,null,null,null], matchAllOk:false
}

const SL_OBJS=[
  {id:'A', emoji:'🐱', ex:30,  ey:64,  gt:{x:16, y:50,w:92, h:112}, predBox:{x:20, y:56,w:84,h:100}, predStatus:'good'},
  {id:'B', emoji:'🐱', ex:172, ey:44,  gt:{x:154,y:32,w:86, h:122}, predBox:{x:178,y:50,w:76,h:98},  predStatus:'loose'},
  {id:'C', emoji:'🐱', ex:302, ey:76,  gt:{x:286,y:62,w:70, h:106}, predBox:null,                    predStatus:'missing', dim:true},
  {id:'D', emoji:'🐱', ex:398, ey:108, gt:{x:382,y:92,w:86, h:118}, predBox:{x:386,y:96,w:80,h:110},  predStatus:'good', dupBox:{x:396,y:106,w:80,h:110}},
  {id:'P', emoji:'🛋️', ex:222, ey:186, gt:null,                     predBox:{x:206,y:172,w:112,h:78}, predStatus:'fp'}
]

const SL_WARMUP_OPTS=[
  {t:'It finds every cat.',c:true},
  {t:'It draws tight boxes around each cat.',c:true},
  {t:'It avoids detecting non-cats.',c:true},
  {t:'It gives high confidence to correct detections.',c:true},
  {t:'It avoids duplicate boxes.',c:true},
  {t:'It trains quickly.',c:false},
  {t:'It has low training loss.',c:false}
]

const SL_FLASH=[
  {kicker:'Ground truth', q:'What is ground truth?', a:'Ground truth is the correct answer provided in the dataset. For object detection, that means the correct class label and the correct bounding box for each object.<br><br><span class="mono">Cat: [x_min, y_min, x_max, y_max]</span>'},
  {kicker:'Prediction', q:'What does an object detector predict?', a:'For each guess, it predicts a class label (e.g. "cat"), a confidence score, and a bounding box location.<br><br><span class="mono">Cat, confidence = 0.92, box = [50, 40, 180, 220]</span>'},
  {kicker:'IoU', q:'What is Intersection over Union (IoU)?', a:'IoU measures how much a predicted box overlaps the ground-truth box. Higher IoU means a closer match.<br><br>IoU = 0.90 → very good overlap<br>IoU = 0.55 → acceptable, not perfect<br>IoU = 0.20 → poor localization'},
  {kicker:'False positive', q:'What is a false positive?', a:'A false positive happens when the model predicts a cat where there is no cat.<br><br>Example: the model draws a cat box around a pillow.'},
  {kicker:'False negative', q:'What is a false negative?', a:'A false negative happens when the model misses a real cat.<br><br>Example: a cat is in the image, but the model never detects it.'},
  {kicker:'Precision', q:'What does precision measure?', a:'Of all the objects the model predicted as cats, how many were actually cats? High precision means fewer false alarms.'},
  {kicker:'Recall', q:'What does recall measure?', a:'Of all the real cats in the image, how many did the model find? High recall means fewer missed cats.'},
  {kicker:'mAP', q:'What is mAP?', a:'Mean Average Precision. It combines detection confidence, precision, recall, and box overlap into one score — closer to what we actually care about than training loss alone.'},
  {kicker:'Training loss', q:'What is training loss?', a:'The mathematical function the model tries to minimize during training. It gives the model a gradient signal for how to improve.'},
  {kicker:'Surrogate loss', q:'What is a surrogate loss?', a:'A loss we optimize because the metric we really care about is hard to optimize directly. For detection: we care about detection quality, but we train with classification loss + box loss + objectness loss.'}
]

const SL_CANDS=[
  {t:'A',   conf:0.95, dIoU: 0.05},
  {t:'B',   conf:0.83, dIoU:-0.05},
  {t:'D',   conf:0.77, dIoU: 0.00},
  {t:'D',   conf:0.60, dIoU:-0.10},
  {t:null,  conf:0.65, dIoU: 0, label:'Pillow'},
  {t:'C',   conf:0.34, dIoU:-0.25},
  {t:null,  conf:0.45, dIoU: 0, label:'Shadow'},
  {t:null,  conf:0.22, dIoU: 0, label:'Noise'}
]
const SL_NPRED={few:3, balanced:5, many:8}
const SL_QUAL={poor:0.30, medium:0.60, good:0.85}

const SL_MATCH=[
  {t:'The model says "dog" instead of "cat".', a:'cls'},
  {t:'The model finds the cat but the box is too wide.', a:'box'},
  {t:'The model predicts a cat where there is only a pillow.', a:'obj'},
  {t:'The model gives low confidence to a real cat.', a:'obj'},
  {t:'The predicted box barely overlaps the true box.', a:'box'}
]

const SL_MCQ={
  goal:{
    opts:[
      {t:'The model should find all cats and draw accurate boxes around them.',c:true},
      {t:'The model should only reduce the training loss number.',c:false},
      {t:'The model should minimize the number of pixels in the image.',c:false},
      {t:'The model should always predict as many boxes as possible.',c:false}
    ],
    msg:'The real goal is detection quality — finding the cats and boxing them accurately — not the size of the loss number.'
  },
  conf:{
    opts:[
      {t:'More boxes appear, so recall increases and precision drops.',c:false},
      {t:'Fewer boxes appear; this can raise precision but risks missing real cats (lower recall).',c:true},
      {t:'It has no effect on precision or recall.',c:false},
      {t:'It permanently changes the model\'s trained weights.',c:false}
    ],
    msg:'Raising the threshold removes low-confidence predictions. That usually cuts false positives, but it can also cost you real detections.'
  },
  iou:{
    opts:[
      {t:'It decides how accurate a predicted box must be to count as correct — a higher threshold demands tighter overlap.',c:true},
      {t:'It sets how many objects the model can detect at once.',c:false},
      {t:'It controls the learning rate used during training.',c:false},
      {t:'It only affects classification, never localization.',c:false}
    ],
    msg:'A high IoU threshold means "close" boxes no longer count as correct — only tight, accurate ones do.'
  },
  compare:{
    opts:[
      {t:'Model A is always better.',c:false},
      {t:'Model B is always better.',c:false},
      {t:'It depends on what we care about — recall matters more when missing a cat is costly, precision matters more when false alarms are costly.',c:true},
      {t:'Neither model can be evaluated.',c:false}
    ],
    msg:'Object detection is usually a tradeoff. There is rarely one "best" model without knowing which mistake costs more.'
  },
  sim:{
    opts:[
      {t:'Snapshot 1, because it has the lowest training loss.',c:false},
      {t:'Both are equally good since their losses are close.',c:false},
      {t:'Neither — keep training until loss reaches exactly 0.',c:false},
      {t:'Snapshot 2, because it has the higher mAP even though its training loss is higher.',c:true}
    ],
    msg:'Lower training loss does not guarantee better real-world detection. The surrogate loss is a training proxy; mAP is what tells you the detector actually works.'
  },
  q1:{
    opts:[
      {t:'Whether the model uses the smallest number of parameters',c:false},
      {t:'Whether the model finds cats accurately and avoids false detections',c:true},
      {t:'Whether the model always predicts one box per image',c:false},
      {t:'Whether the model has the lowest possible file size',c:false}
    ],
    msg:'Detection quality — accurate cats found, few false alarms — is the real target.'
  },
  q2:{
    opts:[
      {t:'It is unrelated to object detection',c:false},
      {t:'It depends on thresholds, ranking, and matching predictions to ground truth',c:true},
      {t:'It only works for text data',c:false},
      {t:'It ignores bounding boxes',c:false}
    ],
    msg:'mAP requires ranking, thresholding, and matching predictions to ground truth — none of that is smooth and differentiable.'
  },
  q3:{
    opts:[
      {t:'Classification loss',c:false},
      {t:'Box localization loss',c:false},
      {t:'Objectness loss',c:false},
      {t:'All of the above',c:true}
    ],
    msg:'A full detector loss blends classification, box localization, and objectness — each teaches a different sub-skill.'
  },
  q4:{
    opts:[
      {t:'High recall, low precision',c:true},
      {t:'Low recall, high precision',c:false},
      {t:'High precision, high recall',c:false},
      {t:'Low precision, low recall',c:false}
    ],
    msg:'Finding every cat pushes recall up; mislabeling pillows as cats drags precision down.'
  },
  q5:{
    opts:[
      {t:'It has high recall and low precision',c:false},
      {t:'It has low recall and possibly high precision',c:true},
      {t:'It has no false negatives',c:false},
      {t:'It has perfect mAP',c:false}
    ],
    msg:'A cautious, high-confidence-only model trades recall for precision.'
  },
  q6:{
    opts:[
      {t:'Predicting the correct class label',c:false},
      {t:'Reducing the image size',c:false},
      {t:'Making the predicted box closer to the ground-truth box',c:true},
      {t:'Choosing the learning rate',c:false}
    ],
    msg:'Box localization loss (e.g. smooth L1) pulls predicted coordinates toward the ground-truth box.'
  }
}
const SL_QUIZ_KEYS=['q1','q2','q3','q4','q5','q6']

// ── Stage 1: scene + warm-up ─────────────────────
function slToggleGT(){
  SL.gtOn=!SL.gtOn
  $('sl-gt-btn').classList.toggle('on',SL.gtOn)
  slDrawScene()
}
function slTogglePred(){
  SL.predOn=!SL.predOn
  $('sl-pred-btn').classList.toggle('on',SL.predOn)
  slDrawScene()
}
function slDrawScene(){
  const el=$('sl-scene'); if(!el) return
  let h=''
  SL_OBJS.forEach(o=>{
    h+=`<span class="sl-obj" style="left:${o.ex}px;top:${o.ey}px;opacity:${o.dim?0.45:1}">${o.emoji}</span>`
    if(o.gt && SL.gtOn){
      h+=`<div class="sl-box gt show" style="left:${o.gt.x}px;top:${o.gt.y}px;width:${o.gt.w}px;height:${o.gt.h}px"><span class="sl-box-label" style="background:#15803d;color:#fff">GT ${o.id}</span></div>`
    }
    if(SL.predOn){
      if(o.predBox){
        const cls=o.predStatus==='good'?'pred-good':o.predStatus==='loose'?'pred-loose':'pred-fp'
        const bg=o.predStatus==='good'?'#15803d':o.predStatus==='loose'?'#c2610c':'#b91c1c'
        const lbl=o.predStatus==='fp'?'cat? (FP)':o.predStatus==='loose'?'cat (loose)':'cat'
        h+=`<div class="sl-box ${cls} show" style="left:${o.predBox.x}px;top:${o.predBox.y}px;width:${o.predBox.w}px;height:${o.predBox.h}px"><span class="sl-box-label" style="background:${bg};color:#fff">${lbl}</span></div>`
      }
      if(o.dupBox){
        h+=`<div class="sl-box pred-loose show" style="left:${o.dupBox.x}px;top:${o.dupBox.y}px;width:${o.dupBox.w}px;height:${o.dupBox.h}px;border-style:dashed"><span class="sl-box-label" style="background:#6d28d9;color:#fff">duplicate</span></div>`
      }
      if(o.predStatus==='missing'){
        h+=`<span style="position:absolute;left:${o.gt.x}px;top:${o.gt.y+o.gt.h+2}px;font-size:12.5px;font-weight:800;color:#b91c1c">missed!</span>`
      }
    }
  })
  el.innerHTML=h
}
function slRenderWarmup(){
  const c=$('sl-warmup-opts'); if(!c||c.children.length) return
  c.innerHTML=SL_WARMUP_OPTS.map((o,i)=>`<label class="sl-check-opt"><input type="checkbox" id="sl-wu-${i}">${o.t}</label>`).join('')
}
function slCheckWarmup(){
  const picked=SL_WARMUP_OPTS.map((o,i)=>$(`sl-wu-${i}`).checked)
  const correct=SL_WARMUP_OPTS.every((o,i)=>picked[i]===o.c)
  const hint=$('sl-warmup-hint')
  if(correct){
    SL.warmupCorrect=true
    hint.className='guidance-box done'
    hint.innerHTML='<strong>✓ Exactly right.</strong> A good detector finds every cat, localizes them tightly, avoids false alarms, is confident when correct, and avoids duplicates. Low training loss and fast training are nice-to-haves — they are not the goal itself.'
    $('sl-warmup-continue').style.display='inline-flex'
  } else {
    hint.className='guidance-box warm'
    hint.innerHTML='<strong>Not quite.</strong> Think about what a human grading this detector would check for — and notice that "trains quickly" and "low training loss" describe the training process, not the detections themselves.'
  }
  slCheckUnlocks()
}

// ── Stage 2: flash cards ─────────────────────────
function slShowFlash(i){
  SL.flashIdx=Math.max(0,Math.min(SL_FLASH.length-1,i))
  SL.flashFlip=false
  slRenderFlashFace()
}
function slFlashNav(d){ slShowFlash(SL.flashIdx+d) }
function slFlipFlash(){
  SL.flashFlip=!SL.flashFlip
  if(SL.flashFlip) SL.flashSeen.add(SL.flashIdx)
  slRenderFlashFace()
}
function slRenderFlashFace(){
  const f=SL_FLASH[SL.flashIdx]
  const card=$('sl-flash-card')
  if(SL.flashFlip){
    card.innerHTML=`<div class="sl-flash-kicker">${f.kicker} · Card ${SL.flashIdx+1}/${SL_FLASH.length}</div><div class="sl-flash-a">${f.a}</div><div style="font-size:12.5px;color:var(--muted);margin-top:14px;text-align:center">Click to see the question again</div>`
  } else {
    card.innerHTML=`<div class="sl-flash-kicker">${f.kicker} · Card ${SL.flashIdx+1}/${SL_FLASH.length}</div><div class="sl-flash-q">${f.q}</div><div style="font-size:12.5px;color:var(--muted);margin-top:14px">Click to reveal the answer</div>`
  }
  $('sl-flash-dots').innerHTML=SL_FLASH.map((_,i)=>`<span class="sl-flash-dot ${SL.flashSeen.has(i)?'seen':''} ${i===SL.flashIdx?'cur':''}"></span>`).join('')
  $('sl-flash-counter').textContent=`${SL.flashSeen.size}/${SL_FLASH.length} viewed`
  const btn=$('sl-flash-continue')
  if(btn) btn.style.display = SL.flashSeen.size===SL_FLASH.length ? 'inline-flex' : 'none'
  slCheckUnlocks()
}

// ── Stage 3: playground simulation ───────────────
function slSetConf(v){ SL.conf=parseFloat(v); $('sl-conf-val').textContent=SL.conf.toFixed(2); slUpdatePlayground() }
function slSetIou(v){ SL.iou=parseFloat(v); $('sl-iou-val').textContent=SL.iou.toFixed(2); slUpdatePlayground() }
function slSetQuality(q){ SL.quality=q; document.querySelectorAll('.sl-q-btn').forEach(b=>b.classList.toggle('active',b.dataset.v===q)); slUpdatePlayground() }
function slSetNPred(n){ SL.npred=n; document.querySelectorAll('.sl-n-btn').forEach(b=>b.classList.toggle('active',b.dataset.v===n)); slUpdatePlayground() }
function slSimulate(){
  const n=SL_NPRED[SL.npred]
  const base=SL_QUAL[SL.quality]
  let cands=SL_CANDS.slice(0,n).filter(c=>c.conf>=SL.conf)
  cands=cands.slice().sort((a,b)=>b.conf-a.conf)
  const claimed=new Set()
  let TP=0,FP=0
  const tpIoUs=[]
  const objStatus={A:'fn',B:'fn',C:'fn',D:'fn',P:'none'}
  const objIoU={}
  cands.forEach(c=>{
    if(c.t===null){
      FP++
      if(c.label==='Pillow') objStatus.P='fp'
      return
    }
    const iou=Math.max(0.03,Math.min(0.98, base+c.dIoU))
    const isMatch=iou>=SL.iou
    if(isMatch && !claimed.has(c.t)){
      claimed.add(c.t); TP++; tpIoUs.push(iou)
      objStatus[c.t]='tp'; objIoU[c.t]=iou
    } else {
      FP++
      objStatus[c.t] = objStatus[c.t]==='tp' ? 'tp+dup' : 'fp'
    }
  })
  const FN=4-claimed.size
  const precision=(TP+FP)>0 ? TP/(TP+FP) : 0
  const recall=TP/4
  const meanIoU=tpIoUs.length ? tpIoUs.reduce((a,b)=>a+b,0)/tpIoUs.length : 0
  const qscore=(precision+recall+meanIoU)/3
  const qualityLabel = qscore<0.4?'Poor':qscore<0.7?'Medium':'Good'
  const clsLoss=Math.max(0.05,Math.min(1.3, 1.15-0.7*precision-0.15*recall))
  const boxLoss= tpIoUs.length ? Math.max(0.05,Math.min(1.3, 1.05*(1-meanIoU))) : 1.10
  const objLoss=Math.max(0.05,Math.min(1.4, 1.1-0.55*recall+0.04*FP))
  const total=clsLoss*0.4+boxLoss*0.35+objLoss*0.25
  return {TP,FP,FN,precision,recall,meanIoU,qualityLabel,clsLoss,boxLoss,objLoss,total,objStatus,objIoU}
}
function slRenderObjList(sim){
  const rows=[{k:'A',label:'🐱 Cat A'},{k:'B',label:'🐱 Cat B'},{k:'C',label:'🐱 Cat C (hidden)'},{k:'D',label:'🐱 Cat D'},{k:'P',label:'🛋️ Pillow (not a cat)'}]
  const chip=s=>{
    if(s==='tp') return '<span class="sl-chip tp">TP ✓</span>'
    if(s==='fp') return '<span class="sl-chip fp">FP ✗</span>'
    if(s==='tp+dup') return '<span class="sl-chip tp">TP</span> <span class="sl-chip dup">+dup FP</span>'
    if(s==='fn') return '<span class="sl-chip fn">missed (FN)</span>'
    return '<span class="sl-chip off">not raised</span>'
  }
  const iouTxt=k => objIouLookup[k]!==undefined ? ` <span style="color:var(--muted);font-size:12.5px">IoU ${objIouLookup[k].toFixed(2)}</span>` : ''
  const objIouLookup=sim.objIoU
  $('sl-obj-list').innerHTML=rows.map(r=>`<div class="sl-obj-status"><span>${r.label}</span><span>${chip(sim.objStatus[r.k])}${r.k!=='P'?iouTxt(r.k):''}</span></div>`).join('')
}
function slRenderStats(sim){
  $('sl-eval-stats').innerHTML=`
    <div class="sl-stat"><div class="sl-stat-lbl">TP</div><div class="sl-stat-val" style="color:var(--green)">${sim.TP}</div></div>
    <div class="sl-stat"><div class="sl-stat-lbl">FP</div><div class="sl-stat-val" style="color:var(--red)">${sim.FP}</div></div>
    <div class="sl-stat"><div class="sl-stat-lbl">FN</div><div class="sl-stat-val" style="color:var(--orange)">${sim.FN}</div></div>
    <div class="sl-stat"><div class="sl-stat-lbl">Precision</div><div class="sl-stat-val">${sim.precision.toFixed(2)}</div></div>
    <div class="sl-stat"><div class="sl-stat-lbl">Recall</div><div class="sl-stat-val">${sim.recall.toFixed(2)}</div></div>
    <div class="sl-stat"><div class="sl-stat-lbl">Mean IoU</div><div class="sl-stat-val">${sim.meanIoU?sim.meanIoU.toFixed(2):'—'}</div></div>`
  const qEl=$('sl-quality-badge')
  if(qEl){
    qEl.textContent='Detection quality: '+sim.qualityLabel
    qEl.style.color = sim.qualityLabel==='Good'?'var(--green)':sim.qualityLabel==='Medium'?'var(--orange)':'var(--red)'
  }
  $('sl-loss-stats').innerHTML=`
    <div class="sl-stat"><div class="sl-stat-lbl">Cls Loss</div><div class="sl-stat-val">${sim.clsLoss.toFixed(2)}</div></div>
    <div class="sl-stat"><div class="sl-stat-lbl">Box Loss</div><div class="sl-stat-val">${sim.boxLoss.toFixed(2)}</div></div>
    <div class="sl-stat"><div class="sl-stat-lbl">Objectness Loss</div><div class="sl-stat-val">${sim.objLoss.toFixed(2)}</div></div>
    <div class="sl-stat" style="grid-column:1/-1;background:#fff7ed;border-color:#c2610c"><div class="sl-stat-lbl">Total Surrogate Loss</div><div class="sl-stat-val" style="color:var(--orange)">${sim.total.toFixed(2)}</div></div>`
}
function slUpdatePlayground(){
  const sim=slSimulate()
  slRenderObjList(sim)
  slRenderStats(sim)
}
function slContinuePlayground(){ $('sl-s4').classList.add('unlocked') }
function slContinueRecap(){ $('sl-s6').classList.add('unlocked') }

// ── Generic single-select MCQ engine (stages 4, 7, 8) ──
function slRenderMCQ(key){
  const d=SL_MCQ[key]
  const c=$(`sl-mcq-${key}-opts`)
  if(!c||c.children.length) return
  c.innerHTML=d.opts.map((o,i)=>`<div class="cg-mcq-opt" id="sl-mcq-${key}-${i}" onclick="slAnswerMCQ('${key}',${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span>${o.t}</span></div>`).join('')
}
function slAnswerMCQ(key,i){
  const d=SL_MCQ[key]
  const opt=d.opts[i]
  document.querySelectorAll(`.cg-mcq-opt[id^="sl-mcq-${key}-"]`).forEach(e=>e.onclick=null)
  $(`sl-mcq-${key}-${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  const hint=$(`sl-mcq-${key}-hint`)
  SL.mcq[key]=opt.c
  if(opt.c){
    hint.className='guidance-box done'
    hint.innerHTML=`<strong>${String.fromCharCode(65+i)}. ✓ Correct!</strong> ${d.msg}`
  } else {
    hint.className='guidance-box warm'
    hint.innerHTML=`<strong>Not quite.</strong> ${d.msg}`
    document.querySelectorAll(`.cg-mcq-opt[id^="sl-mcq-${key}-"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>slAnswerMCQ(key,j)})
  }
  slCheckUnlocks()
}
function slRenderAllMCQs(){ Object.keys(SL_MCQ).forEach(slRenderMCQ) }

// ── Stage 6: matching ─────────────────────────────
function slRenderMatch(){
  const c=$('sl-match-rows'); if(!c||c.children.length) return
  c.innerHTML=SL_MATCH.map((r,i)=>`
    <div class="sl-match-row">
      <span class="sl-match-txt">${r.t}</span>
      <select class="sl-match-sel" id="sl-match-${i}" onchange="SL.match[${i}]=this.value">
        <option value="">— choose —</option>
        <option value="cls">Classification loss</option>
        <option value="box">Box localization loss</option>
        <option value="obj">Objectness / confidence loss</option>
      </select>
    </div>`).join('')
}
function slCheckMatch(){
  let allOk=true
  SL_MATCH.forEach((r,i)=>{
    const sel=$(`sl-match-${i}`)
    const ok=sel.value===r.a
    sel.className='sl-match-sel '+(sel.value?(ok?'ok':'bad'):'bad')
    if(!ok) allOk=false
  })
  SL.matchAllOk=allOk
  const hint=$('sl-match-hint')
  if(allOk){
    hint.className='guidance-box done'
    hint.innerHTML='<strong>✓ All correct.</strong> Each part of the surrogate loss teaches the model a different piece of the detection task — together they push it toward the real goal.'
  } else {
    hint.className='guidance-box warm'
    hint.innerHTML='<strong>Not all correct yet.</strong> Red rows need another look — think about whether the problem is about the label, the box, or whether an object exists at all.'
  }
  slCheckUnlocks()
}

// ── Progressive unlock + completion ──────────────
function slCheckUnlocks(){
  if(SL.warmupCorrect) $('sl-s2').classList.add('unlocked')
  if(SL.flashSeen.size===SL_FLASH.length) $('sl-s3').classList.add('unlocked')
  if(SL.mcq.goal && SL.mcq.conf && SL.mcq.iou && SL.mcq.compare) $('sl-s5').classList.add('unlocked')
  if(SL.matchAllOk) $('sl-s7').classList.add('unlocked')
  if(SL.mcq.sim) $('sl-s8').classList.add('unlocked')
  if(SL_QUIZ_KEYS.every(k=>SL.mcq[k])) $('sl-s9').classList.add('unlocked')
  updateBadge('sl-completed', isComplete('surrogate'))
}
function initSurrogateLoss(){
  slRenderWarmup()
  slDrawScene()
  slShowFlash(0)
  slRenderAllMCQs()
  slRenderMatch()
  slUpdatePlayground()
  slCheckUnlocks()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 8.2 — GRADIENT NORM STORIES
// ══════════════════════════════════════════════════
let gnStage=0
let gnMcq={illcond:null,localmin:null,saddle:null,cliff:null}
let gnMcqClip=null
let gnMcqIdx=0
const GN_SCENARIOS=[
  {key:'illcond',
   q:'Which scenario produces a gradient norm that <strong>oscillates up and down persistently</strong> without steadily decreasing?',
   opts:['Ill-conditioned Hessian','Local minimum','Saddle point','Cliff'],correct:0},
  {key:'localmin',
   q:'Which scenario causes gradient norm to <strong>decrease monotonically and smoothly toward ~0</strong> and stay there?',
   opts:['Cliff','Ill-conditioned Hessian','Saddle point','Local minimum'],correct:3},
  {key:'saddle',
   q:'Which scenario produces gradient norm that decreases to near-0, then <strong>plateaus for many steps</strong>, then may rise slightly?',
   opts:['Local minimum','Cliff','Saddle point','Ill-conditioned Hessian'],correct:2},
  {key:'cliff',
   q:'Which scenario causes gradient norm to remain moderate for many steps then <strong>spike suddenly by 10–100×</strong> in a single step?',
   opts:['Saddle point','Ill-conditioned Hessian','Local minimum','Cliff'],correct:3}
]
const GN_CLIP=[
  {t:'Conclude the model has converged — the norm spikes at minima',c:false},
  {t:'Apply gradient clipping — the norm exploded at a cliff',c:true},
  {t:'Increase the learning rate to power through the cliff region',c:false},
  {t:'Reduce batch size to smooth the gradient estimates',c:false}
]
function gnCurveIllCond(t,N=100){ const x=t/N; return 0.6+1.2*Math.abs(Math.sin(x*Math.PI*7))*Math.exp(-x*0.3)+0.05 }
function gnCurveLocalMin(t,N=100){ return 2.5*Math.exp(-5*t/N)+0.01 }
function gnCurveSaddle(t,N=100){ const x=t/N; return 2.5*Math.exp(-9*x)+0.03+(x>0.75?0.12*(x-0.75)*4:0) }
function gnCurveCliff(t,N=100){ const x=t/N; return 0.28+0.08*Math.sin(x*25)+Math.exp(-Math.pow(x-0.62,2)/0.0008)*18 }
function gnDrawCurve(svgId,curveFn,color,N=100){
  const svg=$(svgId); if(!svg) return
  const W=parseInt(svg.getAttribute('width'))||220
  const H=parseInt(svg.getAttribute('height'))||80
  const pL=22,pR=6,pT=6,pB=20
  let maxV=0.1
  for(let t=0;t<=N;t++) maxV=Math.max(maxV,curveFn(t,N))
  maxV*=1.1
  const xs=t=>pL+(t/N)*(W-pL-pR)
  const ys=v=>H-pB-(v/maxV)*(H-pT-pB)
  let path=''
  for(let t=0;t<=N;t++) path+=(t===0?'M':'L')+xs(t).toFixed(1)+','+ys(curveFn(t,N)).toFixed(1)+' '
  svg.innerHTML=`<rect x="${pL}" y="${pT}" width="${W-pL-pR}" height="${H-pT-pB}" fill="var(--surf2)" rx="2"/>
    <line x1="${pL}" y1="${H-pB}" x2="${W-pR}" y2="${H-pB}" stroke="#e2e8f0" stroke-width="1"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>
    <text x="${pL-2}" y="${pT+8}" text-anchor="end" font-size="9" font-family="Courier New" fill="var(--muted)">‖∇‖</text>
    <text x="${W/2}" y="${H-4}" text-anchor="middle" font-size="9" font-family="system-ui" fill="var(--muted)">steps</text>`
}
function gnUnlock(){
  gnStage=Math.max(gnStage,1)
  $('gn-s2').classList.add('unlocked')
  gnDrawCurve('gn-svg-illcond',gnCurveIllCond,'#1d4ed8')
  gnDrawCurve('gn-svg-localmin',gnCurveLocalMin,'#15803d')
  gnDrawCurve('gn-svg-saddle',gnCurveSaddle,'#c2610c')
  gnDrawCurve('gn-svg-cliff',gnCurveCliff,'#b91c1c')
}
function gnToStage3(){
  gnStage=Math.max(gnStage,2)
  $('gn-s3').classList.add('unlocked')
  gnMcqIdx=0
  gnRenderNextMCQ()
}
function gnRenderNextMCQ(){
  const c=$('gn-mcq-container'); if(!c) return
  if(gnMcqIdx>=GN_SCENARIOS.length){
    $('gn-s4').classList.add('unlocked')
    gnRenderClipMCQ()
    return
  }
  const sc=GN_SCENARIOS[gnMcqIdx]
  const curveFns={illcond:gnCurveIllCond,localmin:gnCurveLocalMin,saddle:gnCurveSaddle,cliff:gnCurveCliff}
  const colors={illcond:'#1d4ed8',localmin:'#15803d',saddle:'#c2610c',cliff:'#b91c1c'}
  const svgId=`gn-mcq-svg-${gnMcqIdx}`
  const qnum=gnMcqIdx+1
  const div=document.createElement('div')
  div.id=`gn-mcq-block-${gnMcqIdx}`
  div.style.cssText='margin-bottom:18px;padding:14px;background:var(--surf2);border:1px solid var(--border);border-radius:9px'
  div.innerHTML=`<p style="font-size:13.5px;font-weight:700;color:var(--muted);margin-bottom:6px">Question ${qnum} of ${GN_SCENARIOS.length}</p>
    <p style="font-size:14.5px;font-weight:600;margin-bottom:10px">${sc.q}</p>
    <svg id="${svgId}" width="340" height="80" style="display:block;margin-bottom:10px;border-radius:5px;border:1px solid var(--border)"></svg>
    <div id="gn-mcq-opts-${gnMcqIdx}">${sc.opts.map((o,i)=>`<div class="cg-mcq-opt" id="gn-qopt-${gnMcqIdx}-${i}" onclick="gnScenarioAnswer(${gnMcqIdx},${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span>${o}</span></div>`).join('')}</div>
    <div id="gn-mcq-hint-${gnMcqIdx}" class="guidance-box cold" style="margin-top:8px"></div>`
  c.appendChild(div)
  setTimeout(()=>gnDrawCurve(svgId,curveFns[sc.key],colors[sc.key],100),50)
}
function gnScenarioAnswer(qIdx,optIdx){
  const sc=GN_SCENARIOS[qIdx]
  const correct=optIdx===sc.correct
  document.querySelectorAll(`.cg-mcq-opt[id^="gn-qopt-${qIdx}-"]`).forEach(e=>e.onclick=null)
  $(`gn-qopt-${qIdx}-${optIdx}`).classList.add(correct?'sel-ok':'sel-bad')
  const hint=$(`gn-mcq-hint-${qIdx}`)
  if(correct){
    gnMcq[sc.key]=true
    const msgs={
      illcond:'<strong>✓ Correct!</strong> Oscillation without convergence is the signature of ill-conditioning — bouncing between steep walls.',
      localmin:'<strong>✓ Correct!</strong> Smooth monotone decay to ~0 means the bowl is closing in. You\'re genuinely converging.',
      saddle:'<strong>✓ Correct!</strong> The plateau near 0 is the telltale sign — nearly flat but not at a minimum. SGD noise eventually pushes you off.',
      cliff:'<strong>✓ Correct!</strong> Sudden explosion in a single step is a cliff — gradient clipping is the standard fix.'
    }
    if(hint){hint.className='guidance-box done';hint.innerHTML=msgs[sc.key].replace('<strong>✓ Correct!</strong>','<strong>'+String.fromCharCode(65+optIdx)+'. ✓ Correct!</strong>')}
    gnMcqIdx++
    setTimeout(gnRenderNextMCQ,300)
  } else {
    const fails={
      illcond:'Think about the shape: oscillation — not smooth decay, not plateau near 0, not a spike.',
      localmin:'Smooth monotone decay all the way to ~0. Which scenario guarantees all curvature is positive?',
      saddle:'The plateau near 0 is the key — the gradient nearly vanishes for a long stretch, then may rise as SGD escapes.',
      cliff:'A sudden 10-100× spike in a single step — no other scenario does this.'
    }
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> '+fails[sc.key]}
    document.querySelectorAll(`.cg-mcq-opt[id^="gn-qopt-${qIdx}-"]`).forEach((e,j)=>{if(j!==optIdx)e.onclick=()=>gnScenarioAnswer(qIdx,j)})
  }
  gnUpdateSubmitSummary()
}
function gnRenderClipMCQ(){
  const c=$('gn-clip-opts'); if(!c||c.children.length) return
  c.innerHTML=GN_CLIP.map((o,i)=>`<div class="cg-mcq-opt" id="gn-clip-${i}" onclick="gnClipAnswer(${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span>${o.t}</span></div>`).join('')
}
function gnClipAnswer(i){
  const opt=GN_CLIP[i]
  document.querySelectorAll('.cg-mcq-opt[id^="gn-clip-"]').forEach(e=>e.onclick=null)
  $(`gn-clip-${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  const hint=$('gn-clip-hint')
  if(opt.c){
    gnMcqClip=true
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> Gradient clipping rescales the gradient vector whenever its norm exceeds a threshold — the standard fix for cliffs in RNNs and deep networks.'}
  } else {
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> A sudden spike means the gradient exploded. The model hasn\'t converged — increasing the lr would make it catastrophically worse.'}
    document.querySelectorAll('.cg-mcq-opt[id^="gn-clip-"]').forEach((e,j)=>{if(j!==i)e.onclick=()=>gnClipAnswer(j)})
  }
  gnUpdateSubmitSummary()
}
function gnUpdateSubmitSummary(){
  const el=$('gn-submit-summary')
  const n=Object.values(gnMcq).filter(v=>v===true).length
  if(el) el.innerHTML=`<p><strong>Scenario MCQs:</strong> ${n}/4 ${n===4?'<span style="color:var(--green)">✓</span>':''}</p>
    <p><strong>Gradient clipping MCQ:</strong> ${gnMcqClip===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>Stage reached:</strong> ${gnStage}/2</p>`
  updateBadge('gn-completed', isComplete('gradnorm'))
}
function initGradNorm(){ gnUpdateSubmitSummary() }

// ══════════════════════════════════════════════════
//  ACTIVITY 8.3 — MOMENTUM STEPPER
// ══════════════════════════════════════════════════
let mmStage=0
let mmMcq={accum:null,carry:null}
const MM_NO=[{W0:0,W1:-0.5},{W0:-0.5,W1:-0.5},{W0:-0.5,W1:-1.0}]
const MM_MOM=[
  {v0:0,v1:-0.5,W0:0,W1:-0.5},
  {v0:-0.5,v1:-0.25,W0:-0.5,W1:-0.75},
  {v0:-0.25,v1:-0.625,W0:-0.75,W1:-1.375}
]
const MM_MCQ1=[
  {t:'g₁=[0,1] and g₃=[0,1] both pushed in −y; momentum accumulated these repeated pushes',c:true},
  {t:'Momentum uses a larger effective learning rate in all directions equally',c:false},
  {t:'g₂=[1,0] had a y-component that added extra y-displacement',c:false},
  {t:'α > ε causes extra amplification in all directions every step',c:false}
]
const MM_MCQ2=[
  {t:'Grow larger in that direction — the steps accelerate',c:true},
  {t:'Cancel out, reducing the effective step size',c:false},
  {t:'The learning rate α decreases automatically',c:false},
  {t:'Only the most recent gradient contributes (old velocity is zeroed)',c:false}
]
function mmUnlock(){
  mmStage=Math.max(mmStage,1)
  $('mm-s2').classList.add('unlocked')
}
function mmMatchVal(v,exp){ return v!==''&&Math.abs(parseFloat(v)-exp)<0.01 }
function mmCheckNoMom(){
  const match=(id,exp)=>{
    const el=$(id); if(!el) return false
    if(el.value!=='') el.className='mm-inp'+(mmMatchVal(el.value,exp)?' ok':' bad')
    return mmMatchVal(el.value,exp)
  }
  const s1ok=match('mm-n-w0-1',MM_NO[0].W0)&&match('mm-n-w1-1',MM_NO[0].W1)
  if(s1ok){
    $('mm-n-prev-w0-2').textContent=MM_NO[0].W0; $('mm-n-prev-w1-2').textContent=MM_NO[0].W1
    $('mm-n-w0-2').disabled=false; $('mm-n-w1-2').disabled=false
  }
  const s2ok=s1ok&&match('mm-n-w0-2',MM_NO[1].W0)&&match('mm-n-w1-2',MM_NO[1].W1)
  if(s2ok){
    $('mm-n-prev-w0-3').textContent=MM_NO[1].W0; $('mm-n-prev-w1-3').textContent=MM_NO[1].W1
    $('mm-n-w0-3').disabled=false; $('mm-n-w1-3').disabled=false
  }
  const s3ok=s2ok&&match('mm-n-w0-3',MM_NO[2].W0)&&match('mm-n-w1-3',MM_NO[2].W1)
  const hint=$('mm-nomom-hint')
  if(s3ok){
    hint.className='guidance-box done'
    hint.innerHTML='<strong>✓ All correct!</strong> Without momentum: final W = [−0.5, −1.0]. Now trace the same computation with momentum ↓'
    $('mm-s3').classList.add('unlocked'); mmStage=Math.max(mmStage,2)
    mmRenderMCQs(); mmDrawTrajectory()
  } else if(s1ok||mmMatchVal(($('mm-n-w0-1')||{value:''}).value,0)||mmMatchVal(($('mm-n-w1-1')||{value:''}).value,-0.5)){
    hint.className='guidance-box warm'
    hint.innerHTML='W_new = W_prev − 0.5 × g. Step 2 and 3 unlock once the previous row is fully correct.'
  }
  mmUpdateSubmitSummary()
}
function mmCheckMom(){
  const steps=[
    [{id:'mm-v0-1',exp:MM_MOM[0].v0},{id:'mm-v1-1',exp:MM_MOM[0].v1},{id:'mm-w0-1',exp:MM_MOM[0].W0},{id:'mm-w1-1',exp:MM_MOM[0].W1}],
    [{id:'mm-v0-2',exp:MM_MOM[1].v0},{id:'mm-v1-2',exp:MM_MOM[1].v1},{id:'mm-w0-2',exp:MM_MOM[1].W0},{id:'mm-w1-2',exp:MM_MOM[1].W1}],
    [{id:'mm-v0-3',exp:MM_MOM[2].v0},{id:'mm-v1-3',exp:MM_MOM[2].v1},{id:'mm-w0-3',exp:MM_MOM[2].W0},{id:'mm-w1-3',exp:MM_MOM[2].W1}]
  ]
  const rowOk=row=>row.every(c=>{const el=$(c.id);return el&&mmMatchVal(el.value,c.exp)})
  steps[0].forEach(c=>{const el=$(c.id);if(el&&el.value!=='')el.className='mm-inp'+(mmMatchVal(el.value,c.exp)?' ok':' bad')})
  const s1ok=rowOk(steps[0])
  if(s1ok){
    steps[1].forEach(c=>{const el=$(c.id);if(el)el.disabled=false})
    steps[1].forEach(c=>{const el=$(c.id);if(el&&el.value!=='')el.className='mm-inp'+(mmMatchVal(el.value,c.exp)?' ok':' bad')})
  }
  const s2ok=s1ok&&rowOk(steps[1])
  if(s2ok){
    steps[2].forEach(c=>{const el=$(c.id);if(el)el.disabled=false})
    steps[2].forEach(c=>{const el=$(c.id);if(el&&el.value!=='')el.className='mm-inp'+(mmMatchVal(el.value,c.exp)?' ok':' bad')})
  }
  const s3ok=s2ok&&rowOk(steps[2])
  const hint=$('mm-mom-hint')
  if(s3ok){
    hint.className='guidance-box done'
    hint.innerHTML='<strong>✓ All correct!</strong> With momentum: final W = [−0.75, −1.375] vs [−0.5, −1.0] without. Momentum carried you further in consistently-pushed directions!'
    $('mm-s4').classList.add('unlocked'); mmStage=Math.max(mmStage,3)
  } else if(steps[0].some(c=>{const el=$(c.id);return el&&el.value!==''})){
    hint.className='guidance-box warm'
    hint.innerHTML='v_new = 0.5×v_prev − 0.5×g, then W_new = W_prev + v_new. Work row by row — next step unlocks after previous row is fully correct.'
  }
  mmDrawTrajectory(); mmUpdateSubmitSummary()
}
function mmCountNoMomOk(){
  return [0,1,2].filter(s=>{
    const w0=$('mm-n-w0-'+(s+1)),w1=$('mm-n-w1-'+(s+1))
    return w0&&w1&&mmMatchVal(w0.value,MM_NO[s].W0)&&mmMatchVal(w1.value,MM_NO[s].W1)
  }).length
}
function mmCountMomOk(){
  return [0,1,2].filter(s=>{
    const v0=$('mm-v0-'+(s+1)),v1=$('mm-v1-'+(s+1)),w0=$('mm-w0-'+(s+1)),w1=$('mm-w1-'+(s+1))
    return v0&&v1&&w0&&w1&&mmMatchVal(v0.value,MM_MOM[s].v0)&&mmMatchVal(v1.value,MM_MOM[s].v1)&&mmMatchVal(w0.value,MM_MOM[s].W0)&&mmMatchVal(w1.value,MM_MOM[s].W1)
  }).length
}
function mmDrawTrajectory(){
  const svg=$('mm-traj-svg'); if(!svg) return
  const W=260,H=220,pL=40,pR=16,pT=16,pB=40
  const w0Min=-1.6,w0Max=0.5,w1Min=-1.7,w1Max=0.4
  const xp=w0=>(w0-w0Min)/(w0Max-w0Min)*(W-pL-pR)+pL
  const yp=w1=>H-pB-(w1-w1Min)/(w1Max-w1Min)*(H-pT-pB)
  const x0=xp(0).toFixed(1),y0=yp(0).toFixed(1)
  let h=`<rect x="${pL}" y="${pT}" width="${W-pL-pR}" height="${H-pT-pB}" fill="var(--surf2)" rx="2"/>
    <line x1="${pL}" y1="${y0}" x2="${W-pR}" y2="${y0}" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="${x0}" y1="${pT}" x2="${x0}" y2="${H-pB}" stroke="#cbd5e1" stroke-width="1"/>
    <text x="${W/2}" y="${H}" text-anchor="middle" font-size="10" font-family="system-ui" fill="var(--muted)">W₀</text>
    <text x="${pL-8}" y="${pT+6}" text-anchor="end" font-size="10" font-family="system-ui" fill="var(--muted)">W₁</text>`
  // Axis ticks
  ;[-1.5,-1.0,-0.5,0].forEach(v=>{
    h+=`<text x="${xp(v).toFixed(1)}" y="${H-pB+12}" text-anchor="middle" font-size="9" font-family="Courier New" fill="var(--muted)">${v}</text>`
    h+=`<text x="${pL-4}" y="${(yp(v)+3).toFixed(1)}" text-anchor="end" font-size="9" font-family="Courier New" fill="var(--muted)">${v}</text>`
  })
  // No-momentum trajectory (orange dashed)
  const nomPts=[[0,0]]
  const mN=(id,exp)=>{const el=$(id);return el&&mmMatchVal(el.value,exp)}
  if(mN('mm-n-w0-1',MM_NO[0].W0)&&mN('mm-n-w1-1',MM_NO[0].W1)) nomPts.push([MM_NO[0].W0,MM_NO[0].W1])
  if(nomPts.length>1&&mN('mm-n-w0-2',MM_NO[1].W0)&&mN('mm-n-w1-2',MM_NO[1].W1)) nomPts.push([MM_NO[1].W0,MM_NO[1].W1])
  if(nomPts.length>2&&mN('mm-n-w0-3',MM_NO[2].W0)&&mN('mm-n-w1-3',MM_NO[2].W1)) nomPts.push([MM_NO[2].W0,MM_NO[2].W1])
  if(nomPts.length>1){
    h+=`<polyline points="${nomPts.map(p=>xp(p[0]).toFixed(1)+','+yp(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="#c2610c" stroke-width="2" stroke-dasharray="5,3"/>`
    nomPts.slice(1).forEach(p=>h+=`<circle cx="${xp(p[0]).toFixed(1)}" cy="${yp(p[1]).toFixed(1)}" r="4" fill="#c2610c" stroke="#fff" stroke-width="1.5"/>`)
    const L=nomPts[nomPts.length-1]
    h+=`<text x="${(xp(L[0])+7).toFixed(1)}" y="${yp(L[1]).toFixed(1)+4}" font-size="9" font-family="Courier New" fill="#c2610c">no mom</text>`
  }
  // Momentum trajectory (blue solid)
  const momPts=[[0,0]]
  const mM=(id,exp)=>{const el=$(id);return el&&mmMatchVal(el.value,exp)}
  if(mM('mm-w0-1',MM_MOM[0].W0)&&mM('mm-w1-1',MM_MOM[0].W1)) momPts.push([MM_MOM[0].W0,MM_MOM[0].W1])
  if(momPts.length>1&&mM('mm-w0-2',MM_MOM[1].W0)&&mM('mm-w1-2',MM_MOM[1].W1)) momPts.push([MM_MOM[1].W0,MM_MOM[1].W1])
  if(momPts.length>2&&mM('mm-w0-3',MM_MOM[2].W0)&&mM('mm-w1-3',MM_MOM[2].W1)) momPts.push([MM_MOM[2].W0,MM_MOM[2].W1])
  if(momPts.length>1){
    h+=`<polyline points="${momPts.map(p=>xp(p[0]).toFixed(1)+','+yp(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="#1d4ed8" stroke-width="2"/>`
    momPts.slice(1).forEach(p=>h+=`<circle cx="${xp(p[0]).toFixed(1)}" cy="${yp(p[1]).toFixed(1)}" r="4" fill="#1d4ed8" stroke="#fff" stroke-width="1.5"/>`)
    const L=momPts[momPts.length-1]
    h+=`<text x="${(xp(L[0])+7).toFixed(1)}" y="${(yp(L[1])-4).toFixed(1)}" font-size="9" font-family="Courier New" fill="#1d4ed8">mom</text>`
  }
  // Origin
  h+=`<circle cx="${x0}" cy="${y0}" r="5" fill="#64748b" stroke="#fff" stroke-width="1.5"/>
    <text x="${(parseFloat(x0)+7).toFixed(1)}" y="${(parseFloat(y0)+4).toFixed(1)}" font-size="9" font-family="Courier New" fill="var(--muted)">[0,0]</text>`
  svg.innerHTML=h
}
function mmRenderMCQs(){
  const r=(cid,data,q)=>{
    const c=$(cid); if(!c||c.children.length) return
    c.innerHTML=data.map((o,i)=>`<div class="cg-mcq-opt" id="mm-q${q}-${i}" onclick="mmAnswer(${q},${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span>${o.t}</span></div>`).join('')
  }
  r('mm-mcq1-opts',MM_MCQ1,1)
  r('mm-mcq2-opts',MM_MCQ2,2)
}
function mmAnswer(q,i){
  const maps={1:MM_MCQ1,2:MM_MCQ2}
  const opt=maps[q][i]
  document.querySelectorAll(`.cg-mcq-opt[id^="mm-q${q}-"]`).forEach(e=>e.onclick=null)
  $(`mm-q${q}-${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  const hint=$(`mm-mcq${q}-hint`)
  if(opt.c){
    const msgs={
      1:'<strong>✓ Correct!</strong> g₁ and g₃ both pointed in −y, so the y-component of velocity accumulated across both steps. That\'s the core of momentum: consistent gradients compound.',
      2:'<strong>✓ Correct!</strong> Velocity builds up in the consistent direction, so each step is effectively larger — like a ball rolling faster when the slope is steady.'
    }
    if(hint){hint.className='guidance-box done';hint.innerHTML=msgs[q].replace('<strong>✓ Correct!</strong>','<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong>')}
    if(q===1) mmMcq.accum=true
    if(q===2) mmMcq.carry=true
  } else {
    const fails={
      1:'Momentum doesn\'t apply a bigger lr globally — it specifically builds up in directions where multiple consecutive gradients agree.',
      2:'Momentum amplifies consistent directions — it only partially cancels when directions alternate (like g₁ and g₂ here).'
    }
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> '+fails[q]}
    document.querySelectorAll(`.cg-mcq-opt[id^="mm-q${q}-"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>mmAnswer(q,j)})
  }
  mmUpdateSubmitSummary()
}
function mmUpdateSubmitSummary(){
  const el=$('mm-submit-summary')
  if(el) el.innerHTML=`<p><strong>No-momentum table:</strong> ${mmCountNoMomOk()}/3 steps correct</p>
    <p><strong>Momentum table:</strong> ${mmCountMomOk()}/3 steps correct</p>
    <p><strong>Accumulation MCQ:</strong> ${mmMcq.accum===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>Step-size MCQ:</strong> ${mmMcq.carry===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>Stage reached:</strong> ${mmStage}/3</p>`
  updateBadge('mm-completed', isComplete('momentum'))
}
function initMomentum(){
  mmRenderMCQs()
  mmDrawTrajectory()
  mmUpdateSubmitSummary()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 8.4 — TRANSFER LEARNING
// ══════════════════════════════════════════════════
let tlStage=0, tlMcq={a:null,b:null,c:null,d:null}, tlPxOk=false
const TL_Q1=[
  {t:'Maps backbone features to task-specific outputs (class scores or pixel labels)',c:true},
  {t:'Stores the model weights before fine-tuning begins',c:false},
  {t:'Acts as a skip connection bypassing the backbone',c:false}
]
const TL_Q2=[
  {t:'Replace the classification head with a segmentation decoder and train only it',c:true},
  {t:'Retrain the entire network from scratch with segmentation labels',c:false},
  {t:'Add extra layers on top of the existing head without removing it',c:false}
]
const TL_Q3=[
  {t:'The backbone — preserve its learned features; only train the new head',c:true},
  {t:'The new head — it was pre-trained and already knows segmentation',c:false},
  {t:'Nothing — fine-tune all layers with a high learning rate',c:false}
]
const TL_Q4=[
  {t:'Low-level features (edges, textures, shapes) transfer across tasks regardless of label type',c:true},
  {t:'ImageNet images closely resemble the target domain so no adaptation is needed',c:false},
  {t:'Segmentation masks can be automatically generated from classification labels',c:false}
]
function tlUnlock(n){
  const p=$(`tl-s${n-1}`); if(p) p.classList.add('unlocked')
  const nx=$(`tl-s${n}`); if(nx) nx.classList.add('unlocked')
  tlStage=Math.max(tlStage,n)
  if(n===2){tlRenderMCQs();setTimeout(tlDrawArch,30)}
  tlUpdateSummary()
}
function tlDrawArch(){
  const svg=$('tl-svg'); if(!svg) return
  const W=Math.max(svg.clientWidth||0,500), H=200
  const s=v=>v*Math.min(1,W/560)
  let h=`<defs><marker id="tla" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="#888" stroke-width="1.5"/></marker></defs>`
  h+=`<rect x="${s(20)}" y="${s(70)}" width="${s(120)}" height="${s(60)}" rx="6" fill="#3b82f622" stroke="#3b82f6" stroke-width="1.5"/>`
  h+=`<text x="${s(80)}" y="${s(97)}" text-anchor="middle" font-weight="700" font-size="${s(12)}" fill="#3b82f6">Backbone</text>`
  h+=`<text x="${s(80)}" y="${s(114)}" text-anchor="middle" font-size="${s(11)}" fill="#3b82f688">frozen</text>`
  h+=`<rect x="${s(200)}" y="${s(28)}" width="${s(120)}" height="${s(55)}" rx="6" fill="#ef444418" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5,3"/>`
  h+=`<text x="${s(260)}" y="${s(53)}" text-anchor="middle" font-weight="700" font-size="${s(12)}" fill="#ef4444">Class Head</text>`
  h+=`<text x="${s(260)}" y="${s(70)}" text-anchor="middle" font-size="${s(11)}" fill="#ef444488">remove</text>`
  h+=`<rect x="${s(200)}" y="${s(117)}" width="${s(120)}" height="${s(55)}" rx="6" fill="#22c55e22" stroke="#22c55e" stroke-width="1.5"/>`
  h+=`<text x="${s(260)}" y="${s(143)}" text-anchor="middle" font-weight="700" font-size="${s(12)}" fill="#22c55e">Seg Head</text>`
  h+=`<text x="${s(260)}" y="${s(159)}" text-anchor="middle" font-size="${s(11)}" fill="#22c55e88">new, trainable</text>`
  h+=`<line x1="${s(140)}" y1="${s(100)}" x2="${s(199)}" y2="${s(58)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#tla)"/>`
  h+=`<line x1="${s(140)}" y1="${s(100)}" x2="${s(199)}" y2="${s(145)}" stroke="#22c55e" stroke-width="2" marker-end="url(#tla)"/>`
  h+=`<text x="${s(332)}" y="${s(60)}" font-size="${s(11)}" fill="#ef4444" opacity="0.8">→ 1000 classes</text>`
  h+=`<text x="${s(332)}" y="${s(150)}" font-size="${s(11)}" fill="#22c55e">→ pixel labels (H×W)</text>`
  h+=`<text x="${s(20)}" y="${s(24)}" font-size="${s(11)}" fill="var(--muted)">Pre-train on ImageNet (14M) → freeze backbone → swap head → fine-tune on 3k segmentation images</text>`
  svg.innerHTML=h
}
function tlRenderMCQs(){
  const r=(id,data,q)=>{
    const c=$(id); if(!c||c.children.length) return
    c.innerHTML=data.map((o,i)=>`<div class="cg-mcq-opt" id="tl-${q}${i}" onclick="tlAns('${q}',${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span style="font-size:0.88em">${o.t}</span></div>`).join('')
  }
  r('tl-q1-opts',TL_Q1,'q1')
  r('tl-q2-opts',TL_Q2,'q2')
  r('tl-q3-opts',TL_Q3,'q3')
  r('tl-q4-opts',TL_Q4,'q4')
}
function tlAns(q,i){
  const maps={q1:TL_Q1,q2:TL_Q2,q3:TL_Q3,q4:TL_Q4}
  const keys={q1:'a',q2:'b',q3:'c',q4:'d'}
  const data=maps[q], opt=data[i]
  document.querySelectorAll(`.cg-mcq-opt[id^="tl-${q}"]`).forEach(e=>e.onclick=null)
  $(`tl-${q}${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  const hint=$(`tl-${q}-hint`)
  const ok_msgs={
    q1:'<strong>✓</strong> The head is the task-specific output module. Swap it and you change the task.',
    q2:'<strong>✓</strong> Replace the old head with a decoder that outputs per-pixel labels. The backbone stays.',
    q3:'<strong>✓</strong> Freezing the backbone protects learned features from being overwritten by gradients from a small dataset.',
    q4:'<strong>✓</strong> Edges, blobs, textures are universal — they apply to segmentation, detection, depth estimation, and more.'
  }
  const fail_msgs={
    q1:'The head doesn\'t store weights in a special way — it\'s the final layer(s) mapping features to predictions.',
    q2:'Retraining from scratch defeats the purpose — you\'d need millions more labels.',
    q3:'The new head starts random! Freezing it would prevent all learning.',
    q4:'Transfer learning works across different-looking domains precisely because low-level structure is shared, not appearance.'
  }
  if(opt.c){
    if(hint){hint.className='guidance-box done';hint.innerHTML=ok_msgs[q].replace('<strong>✓</strong>','<strong>'+String.fromCharCode(65+i)+'. ✓</strong>')}
    tlMcq[keys[q]]=true
  } else {
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> '+fail_msgs[q]}
    document.querySelectorAll(`.cg-mcq-opt[id^="tl-${q}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>tlAns(q,j)})
  }
  const s2ok=tlMcq.a&&tlMcq.b&&tlMcq.c
  const btn2=$('tl-btn2'); if(btn2) btn2.disabled=!s2ok
  tlUpdateSummary()
}
function tlCheckPixel(){
  const v=parseInt(($('tl-px-inp')||{value:''}).value)
  const hint=$('tl-px-hint'), inp=$('tl-px-inp')
  const ok=v===786432000
  if(inp) inp.className='rr-inp'+(isNaN(v)?'':ok?' ok':' bad')
  if(ok){
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>✓</strong> 3000×512×512 = 786,432,000. Each pixel is a separate label decision — way more than 3k image labels.'}
    tlPxOk=true
  } else if(!isNaN(v)){
    if(hint){hint.className='guidance-box warm';hint.innerHTML='Try 3000 × 512 × 512.'}
    tlPxOk=false
  }
  tlUpdateSummary()
}
function tlUpdateSummary(){
  const el=$('tl-summary'); if(!el) return
  const n=Object.values(tlMcq).filter(v=>v===true).length
  el.innerHTML=`<p><strong>MCQs:</strong> ${n}/4</p><p><strong>Pixel count:</strong> ${tlPxOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Stage:</strong> ${tlStage}/3</p>`
  updateBadge('tl-completed', isComplete('transferlearn'))
}
function initTransferLearn(){tlUpdateSummary()}

// ══════════════════════════════════════════════════
//  ACTIVITY 8.5 — OPTIMIZER RACE
// ══════════════════════════════════════════════════
let orStage=0, orMcq={sgd:null,ada:null,rms:null,adam:null}, orFinal=null, orRan=false
const OR_F=(x,y)=>(x-3)**2+8*(y-2)**2
const OR_GX=(x,_)=>2*(x-3)
const OR_GY=(_,y)=>16*(y-2)
const OR_MATCH=[
  {key:'sgd',q:'Zigzags wildly in steep y-direction, barely moves in flat x',
   opts:['AdaGrad — accumulated denom','SGD — uniform lr overshoots steep dim','RMSProp — EMA damps zigzag','Adam — momentum counteracts'],c:1},
  {key:'ada',q:'Adapts well early, then stalls as denominator grows without bound',
   opts:['RMSProp — EMA prevents indefinite growth','SGD — no state, cannot stall','Adam — bias correction prevents blowup','AdaGrad — ∑g² grows forever → lr→0'],c:3},
  {key:'rms',q:'Smooth path without stalling — exponential moving average of g²',
   opts:['Adam — also uses EMA but adds momentum','AdaGrad — stalls too early','RMSProp — EMA keeps denom bounded','SGD — no state at all'],c:2},
  {key:'adam',q:'Most direct path — first moment (momentum) + second moment (adaptive rate)',
   opts:['Adam — bias-corrected m̂ and v̂','RMSProp — 2nd moment only','SGD+momentum — 1st moment only','AdaGrad — cumulative, no momentum'],c:0},
]
const OR_FMCQ=[
  {t:'Adam — combines momentum and adaptive scaling for the most direct path',c:false},
  {t:'RMSProp — smooth path without stalling',c:true},
  {t:'AdaGrad — adapts rates but stalls before reaching minimum',c:false},
  {t:'SGD — simplest and least overhead',c:false},
]
const OR_COL={sgd:'#3b82f6',ada:'#f97316',rms:'#22c55e',adam:'#a855f7'}
function orUnlock(n){
  const p=$(`or-s${n-1}`); if(p) p.classList.add('unlocked')
  const nx=$(`or-s${n}`); if(nx) nx.classList.add('unlocked')
  orStage=Math.max(orStage,n)
  if(n===2) setTimeout(orDrawMinis,50)
  if(n===3) orRenderMatch()
  if(n===4) setTimeout(orDrawContour,50)
  if(n===5) orRenderFinalMCQ()
  orUpdateSummary()
}
function orSim(type,lr,steps){
  let x=1,y=3,sx=0,sy=0,mx=0,my=0,vx=0,vy=0
  const eps=1e-8,b1=0.9,b2=0.999,rho=0.9
  const pts=[{x,y}]
  for(let t=1;t<=steps;t++){
    const gx=OR_GX(x),gy=OR_GY(0,y)
    if(type==='sgd'){x-=lr*gx;y-=lr*gy}
    else if(type==='ada'){sx+=gx*gx;sy+=gy*gy;x-=lr*gx/(Math.sqrt(sx)+eps);y-=lr*gy/(Math.sqrt(sy)+eps)}
    else if(type==='rms'){sx=rho*sx+(1-rho)*gx*gx;sy=rho*sy+(1-rho)*gy*gy;x-=lr*gx/(Math.sqrt(sx)+eps);y-=lr*gy/(Math.sqrt(sy)+eps)}
    else if(type==='adam'){mx=b1*mx+(1-b1)*gx;my=b1*my+(1-b1)*gy;vx=b2*vx+(1-b2)*gx*gx;vy=b2*vy+(1-b2)*gy*gy;const mhx=mx/(1-b1**t),mhy=my/(1-b1**t),vhx=vx/(1-b2**t),vhy=vy/(1-b2**t);x-=lr*mhx/(Math.sqrt(vhx)+eps);y-=lr*mhy/(Math.sqrt(vhy)+eps)}
    pts.push({x,y})
  }
  return pts
}
function orPX(x,W,xMn=0.2,xMx=5.5){return (x-xMn)/(xMx-xMn)*W}
function orPY(y,H,yMn=0.5,yMx=4.5){return (yMx-y)/(yMx-yMn)*H}
function orDrawMinis(){
  ;['sgd','ada','rms','adam'].forEach(k=>{
    const svg=$(`or-m-${k}`); if(!svg) return
    const pts=orSim(k,0.1,25),W=120,H=60
    const poly=pts.map(p=>`${orPX(p.x,W).toFixed(1)},${orPY(p.y,H).toFixed(1)}`).join(' ')
    svg.innerHTML=`<polyline points="${poly}" fill="none" stroke="${OR_COL[k]}" stroke-width="1.5" stroke-linejoin="round"/>`+
      `<circle cx="${orPX(pts[0].x,W).toFixed(1)}" cy="${orPY(pts[0].y,H).toFixed(1)}" r="3" fill="#22c55e"/>`+
      `<circle cx="${orPX(pts[pts.length-1].x,W).toFixed(1)}" cy="${orPY(pts[pts.length-1].y,H).toFixed(1)}" r="3" fill="${OR_COL[k]}"/>`
  })
}
function orRenderMatch(){
  const c=$('or-match-wrap'); if(!c||c.children.length) return
  OR_MATCH.forEach((sc,qi)=>{
    const d=document.createElement('div')
    d.className='card';d.style.padding='12px'
    d.innerHTML=`<p style="margin:0 0 8px;font-weight:600;font-size:0.88em">${sc.q}</p>`+
      sc.opts.map((o,i)=>`<div class="cg-mcq-opt" id="or-m${qi}-${i}" onclick="orMatchAns(${qi},${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span style="font-size:0.85em">${o}</span></div>`).join('')+
      `<div id="or-mh${qi}" class="guidance-box cold" style="margin-top:6px"></div>`
    c.appendChild(d)
  })
}
function orMatchAns(qi,i){
  const sc=OR_MATCH[qi]
  document.querySelectorAll(`.cg-mcq-opt[id^="or-m${qi}-"]`).forEach(e=>e.onclick=null)
  $(`or-m${qi}-${i}`).classList.add(i===sc.c?'sel-ok':'sel-bad')
  const hint=$(`or-mh${qi}`)
  const msgs=['<strong>✓</strong> SGD\'s uniform lr causes large oscillations in steep dimensions.','<strong>✓</strong> AdaGrad\'s ∑g² denominator grows without bound — the effective lr decays to zero.','<strong>✓</strong> RMSProp\'s exponential decay prevents the denominator from blowing up.','<strong>✓</strong> Adam\'s bias-corrected first and second moments navigate ill-conditioned surfaces most efficiently.']
  if(i===sc.c){
    orMcq[sc.key]=true
    if(hint){hint.className='guidance-box done';hint.innerHTML=msgs[qi].replace('<strong>✓</strong>','<strong>'+String.fromCharCode(65+i)+'. ✓</strong>')}
  } else {
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Re-read the update rule above.'}
    document.querySelectorAll(`.cg-mcq-opt[id^="or-m${qi}-"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>orMatchAns(qi,j)})
  }
  const btn3=$('or-btn3'); if(btn3) btn3.disabled=!Object.values(orMcq).every(v=>v===true)
  orUpdateSummary()
}
function orDrawContour(){
  const svg=$('or-svg'); if(!svg) return
  const W=Math.max(svg.clientWidth||0,400),H=300
  const cx=orPX(3,W),cy=orPY(2,H)
  const levels=[0.5,2,5,12,25,45,75,110]
  const fills=['#dbeafe','#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e3a8a']
  let h=`<rect width="${W}" height="${H}" fill="${fills[fills.length-1]}"/>`
  for(let i=levels.length-1;i>=0;i--){
    const lv=levels[i]
    const rx=(Math.sqrt(lv)/5.3)*W, ry=(Math.sqrt(lv/8)/4)*H
    h+=`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fills[i]}"/>`
  }
  h+=`<circle cx="${orPX(1,W).toFixed(1)}" cy="${orPY(3,H).toFixed(1)}" r="6" fill="#22c55e" stroke="white" stroke-width="2"/>`
  h+=`<text x="${(orPX(1,W)+10).toFixed(1)}" y="${(orPY(3,H)+5).toFixed(1)}" font-size="12" fill="white" font-weight="700">Start</text>`
  h+=`<text x="${(cx+6).toFixed(1)}" y="${(cy+5).toFixed(1)}" font-size="14" fill="white">★</text>`
  h+=`<g id="or-trajs"></g>`
  svg.innerHTML=h
}
function orRunSim(){
  orDrawContour()
  const lr=parseFloat($('or-lr').value)||0.1
  const steps=parseInt($('or-st').value)||30
  const svg=$('or-svg'); if(!svg) return
  const W=Math.max(svg.clientWidth||0,400),H=300
  let traj='',leg=''
  ;['sgd','ada','rms','adam'].forEach(k=>{
    const chk=$(`or-c-${k}`); if(!chk||!chk.checked) return
    const pts=orSim(k,lr,steps)
    const poly=pts.map(p=>`${orPX(p.x,W).toFixed(1)},${orPY(p.y,H).toFixed(1)}`).join(' ')
    traj+=`<polyline points="${poly}" fill="none" stroke="${OR_COL[k]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`
    const ep=pts[pts.length-1]
    traj+=`<circle cx="${orPX(ep.x,W).toFixed(1)}" cy="${orPY(ep.y,H).toFixed(1)}" r="5" fill="${OR_COL[k]}" stroke="white" stroke-width="2"/>`
    leg+=`<div style="color:${OR_COL[k]};margin-bottom:2px">${k.toUpperCase()}: f=${OR_F(ep.x,ep.y).toFixed(2)}</div>`
  })
  let g=svg.querySelector('#or-trajs')
  if(!g){const el=document.createElementNS('http://www.w3.org/2000/svg','g');el.id='or-trajs';svg.appendChild(el);g=el}
  g.innerHTML=traj
  const legend=$('or-legend'); if(legend) legend.innerHTML=leg
  orRan=true
  const btn4=$('or-btn4'); if(btn4) btn4.disabled=false
  orUpdateSummary()
}
function orRenderFinalMCQ(){
  const c=$('or-fmcq'); if(!c||c.children.length) return
  c.innerHTML=OR_FMCQ.map((o,i)=>`<div class="cg-mcq-opt" id="or-f${i}" onclick="orFinalAns(${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span>${o.t}</span></div>`).join('')
}
function orFinalAns(i){
  const opt=OR_FMCQ[i]
  document.querySelectorAll('.cg-mcq-opt[id^="or-f"]').forEach(e=>e.onclick=null)
  $(`or-f${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  const hint=$('or-fhint')
  if(opt.c){
    orFinal=true
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> RMSProp\'s exponential moving-average of squared gradients prevents the learning rate from decaying to zero, letting it converge smoothly on ill-conditioned surfaces.'}
  } else {
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Look at which optimizer reached f=0.00 on this surface — it uses an exponential moving average of squared gradients to keep the learning rate alive.'}
    document.querySelectorAll('.cg-mcq-opt[id^="or-f"]').forEach((e,j)=>{if(j!==i)e.onclick=()=>orFinalAns(j)})
  }
  orUpdateSummary()
}
function orUpdateSummary(){
  const el=$('or-summary'); if(!el) return
  const n=Object.values(orMcq).filter(v=>v===true).length
  el.innerHTML=`<p><strong>Matching MCQs:</strong> ${n}/4</p><p><strong>Simulation run:</strong> ${orRan?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Final MCQ:</strong> ${orFinal===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Stage:</strong> ${orStage}/5</p>`
  updateBadge('or-completed', isComplete('optrace'))
}
function initOptRace(){orUpdateSummary()}

// ══════════════════════════════════════════════════
//  ACTIVITY 8.7.1 — BATCH NORMALIZATION
// ══════════════════════════════════════════════════
let bnStage=0, bnMeansOk=false, bnWpOk=false, bnBetaOk=false, bnWhyOk=false
const BN_X=[[1,0],[3,1],[2,1]]
const BN_WHY=[
  {t:'β directly equals μ(H′) always (since μ(H̃)=0 by construction), so no linear system to solve',c:true},
  {t:'BN uses a larger learning rate so it converges faster',c:false},
  {t:'BN can change W automatically without user input',c:false},
  {t:'The constraint equations for W have no solutions at all',c:false},
]
function bnUnlock(n){
  const p=$(`bn-s${n-1}`); if(p) p.classList.add('unlocked')
  const nx=$(`bn-s${n}`); if(nx) nx.classList.add('unlocked')
  bnStage=Math.max(bnStage,n)
  if(n===3) bnLiveH()
  if(n===4) bnRenderWhy()
  bnUpdateSummary()
}
function bnCheckMeans(){
  const v1=parseFloat(($('bn-m1')||{value:''}).value)
  const v2=parseFloat(($('bn-m2')||{value:''}).value)
  const ok1=Math.abs(v1-2)<0.01,ok2=Math.abs(v2-4)<0.01
  const i1=$('bn-m1'),i2=$('bn-m2')
  if(i1) i1.className='rr-inp'+(isNaN(v1)?'':ok1?' ok':' bad')
  if(i2) i2.className='rr-inp'+(isNaN(v2)?'':ok2?' ok':' bad')
  const hint=$('bn-mhint')
  bnMeansOk=ok1&&ok2
  if(bnMeansOk){
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>✓</strong> col 1 mean = 6/3 = 2, col 2 mean = 12/3 = 4. Target is [3,5] — need to shift these.'}
    const btn=$('bn-btn2'); if(btn) btn.disabled=false
  } else if(!isNaN(v1)||!isNaN(v2)){
    if(hint){hint.className='guidance-box warm';hint.innerHTML='col 1: (1+3+2)/3, col 2: (1+6+5)/3'}
  }
  bnUpdateSummary()
}
function bnLiveH(){
  const w11=parseFloat(($('bn-w11')||{value:'1'}).value)||0
  const w12=parseFloat(($('bn-w12')||{value:'1'}).value)||0
  const w21=parseFloat(($('bn-w21')||{value:'0'}).value)||0
  const w22=parseFloat(($('bn-w22')||{value:'3'}).value)||0
  const H=BN_X.map(r=>[r[0]*w11+r[1]*w21,r[0]*w12+r[1]*w22])
  const mu1=H.reduce((s,r)=>s+r[0],0)/3,mu2=H.reduce((s,r)=>s+r[1],0)/3
  const ok1=Math.abs(mu1-3)<0.1,ok2=Math.abs(mu2-5)<0.1
  const f=v=>v.toFixed(2),gc=ok=>`color:${ok?'var(--green)':'var(--red)'}`
  const disp=$('bn-hdisp')
  if(disp) disp.innerHTML=`H′ = XW′ =<br>
    &nbsp;[[${f(H[0][0])}, ${f(H[0][1])}],<br>
    &nbsp;&nbsp;[${f(H[1][0])}, ${f(H[1][1])}],<br>
    &nbsp;&nbsp;[${f(H[2][0])}, ${f(H[2][1])}]]<br><br>
    μ(col 1) = <strong style="${gc(ok1)}">${f(mu1)}</strong> (target 3)<br>
    μ(col 2) = <strong style="${gc(ok2)}">${f(mu2)}</strong> (target 5)`
  bnWpOk=ok1&&ok2
  const hint=$('bn-whint')
  if(bnWpOk){
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>✓ Both column means correct!</strong> Note: you had to solve 6w+2w=9 and 6w+2w=15 — that is the hard way.'}
    const btn=$('bn-btn3'); if(btn) btn.disabled=false
  } else {
    if(hint&&!hint.className.includes('done')){hint.className='guidance-box cold';hint.innerHTML='Adjust W′ until both column means turn green.'}
  }
  bnUpdateSummary()
}
function bnCheckBN(){
  const hnm=($('bn-hnm')||{value:''}).value.trim()
  const bv=($('bn-bv')||{value:''}).value.trim()
  const ok1=hnm==='0'
  const ok2=bv==='[3,5]'||bv==='[3, 5]'||bv==='3,5'||bv==='3, 5'
  const i1=$('bn-hnm'),i2=$('bn-bv')
  if(i1) i1.className='rr-inp'+(hnm?ok1?' ok':' bad':'')
  if(i2) i2.className='rr-inp'+(bv?ok2?' ok':' bad':'')
  const hint=$('bn-bnhint')
  bnBetaOk=ok1&&ok2
  if(bnBetaOk){
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>✓ Correct!</strong> H̃ is normalized to zero mean by construction, so μ(H′) = γ×0 + β = β. Set β = [3, 5].'}
  } else if(hnm||bv){
    const m=[]
    if(hnm&&!ok1) m.push('μ(H̃) is always 0 — that is what normalization does')
    if(bv&&!ok2) m.push('β = [3, 5] matches the two column targets')
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Hint:</strong> '+m.join('; ')}
  }
  bnUpdateSummary()
}
function bnRenderWhy(){
  const c=$('bn-why-opts'); if(!c||c.children.length) return
  c.innerHTML=BN_WHY.map((o,i)=>`<div class="cg-mcq-opt" id="bn-wy${i}" onclick="bnWhyAns(${i})"><span style="font-weight:700;color:var(--muted);flex-shrink:0">${String.fromCharCode(65+i)}.</span><span style="font-size:0.9em">${o.t}</span></div>`).join('')
}
function bnWhyAns(i){
  const opt=BN_WHY[i]
  document.querySelectorAll('.cg-mcq-opt[id^="bn-wy"]').forEach(e=>e.onclick=null)
  $(`bn-wy${i}`).classList.add(opt.c?'sel-ok':'sel-bad')
  const hint=$('bn-whyhint')
  if(opt.c){
    bnWhyOk=true
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> γ scales H̃ but cannot shift its mean (it is always 0). β directly sets it — μ(H′) = β is exact and requires no algebra.'}
  } else {
    const fails={1:'Learning rate is a separate concern from BN.',2:'BN learns γ and β; W is still updated by the optimizer.',3:'The constraint equations do have solutions — just non-integer ones like W′ = [[1.5,2.5],[0,0]].'}
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> '+(fails[i]||'Think about what β controls in H′=γH̃+β.')}
    document.querySelectorAll('.cg-mcq-opt[id^="bn-wy"]').forEach((e,j)=>{if(j!==i)e.onclick=()=>bnWhyAns(j)})
  }
  bnUpdateSummary()
}
function bnUpdateSummary(){
  const el=$('bn-summary'); if(!el) return
  el.innerHTML=`<p><strong>Column means:</strong> ${bnMeansOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>W′ found:</strong> ${bnWpOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>BN fill-in:</strong> ${bnBetaOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Why easier:</strong> ${bnWhyOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Stage:</strong> ${bnStage}/4</p>`
  updateBadge('bn-completed', isComplete('batchnorm'))
}
function initBatchNorm(){bnLiveH();bnUpdateSummary()}

// ══════════════════════════════════════════════════
//  CHAPTER 9 — SHARED HELPERS
// ══════════════════════════════════════════════════
// A question is {q, ok, opts}; each option is {t, c:true} or {t, h:'why this choice is wrong'}.
function c9RenderMCQ(pfx,q,Q){
  const box=$(`${pfx}-q${q}`); if(!box||box.children.length) return
  box.innerHTML=`<div style="font-weight:600;font-size:14.5px;margin-bottom:8px">${Q.q}</div>
    <div id="${pfx}-q${q}-opts" style="display:flex;flex-direction:column;gap:5px">${Q.opts.map((o,i)=>`<div class="cg-mcq-opt" id="${pfx}-q${q}-${i}" onclick="${pfx}MCQ(${q},${i})">${o.t}</div>`).join('')}</div>
    <div id="${pfx}-q${q}-hint" class="guidance-box cold" style="margin-top:6px"></div>`
}
// Marks choice i and returns whether it was right. A wrong choice stays red; the untried ones stay clickable.
function c9Answer(pfx,q,i,Q){
  const sel=`.cg-mcq-opt[id^="${pfx}-q${q}-"]`, o=Q.opts[i], hint=$(`${pfx}-q${q}-hint`)
  document.querySelectorAll(sel).forEach(e=>e.onclick=null)
  $(`${pfx}-q${q}-${i}`).classList.add(o.c?'sel-ok':'sel-bad')
  if(o.c){
    if(hint){hint.className='guidance-box done';hint.innerHTML=`<strong>${String.fromCharCode(65+i)}. ✓ Correct!</strong> ${Q.ok}`}
  } else {
    document.querySelectorAll(sel).forEach((e,j)=>{if(j!==i&&!e.classList.contains('sel-bad'))e.onclick=()=>window[pfx+'MCQ'](q,j)})
    if(hint){hint.className='guidance-box warm';hint.innerHTML=`<strong>Not quite.</strong> ${o.h}`}
  }
  return !!o.c
}
// When a stage unlocks, end the previous stage with a button that scrolls to it.
function c9AddContinue(fromId,toId,label){
  const card=document.querySelector(`#${fromId} .card`); if(!card||card.querySelector('.c9-cont')) return
  const d=document.createElement('div'); d.style.marginTop='16px'
  d.innerHTML=`<button class="btn btn-p c9-cont" onclick="document.getElementById('${toId}').scrollIntoView({behavior:'smooth',block:'start'})">${label}</button>`
  card.appendChild(d)
}
// Unlocks stages 1..s of an activity and adds continue buttons for the newly opened ones.
function c9Unlock(pfx,prev,s,last){
  for(let i=1;i<=s;i++){const e=$(`${pfx}-s${i}`);if(e)e.classList.add('unlocked')}
  for(let i=Math.max(2,prev+1);i<=s;i++) c9AddContinue(`${pfx}-s${i-1}`,`${pfx}-s${i}`,i===last?'See the takeaway ↓':`Continue to Stage ${i} ↓`)
}
// Parses "2", "−1", "2.5" or "5/2"; null for an empty box.
function c9Num(s){
  s=String(s).trim().replace(/−/g,'-'); if(s===''||s==='-') return null
  const m=s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  return m?parseFloat(m[1])/parseFloat(m[2]):Number(s)
}
// Up to 2 decimals, with a typographic minus.
function c9n(v){ const r=Math.round(v*100)/100; return (r<0?'−':'')+String(Math.abs(r)) }
function c9Heat(v,mx){
  const a=(Math.min(1,Math.abs(v)/mx)*0.85).toFixed(2)
  return v>0?`rgba(29,78,216,${a})`:v<0?`rgba(185,28,28,${a})`:'#ffffff'
}
// Matrix as a heat map. o.S = cell size, o.click = name of a function(r,c), o.sel = [r,c] to outline.
function c9DrawMap(svgId,M,o={}){
  const svg=$(svgId); if(!svg) return
  const S=o.S||30, P=4, mx=Math.max(1,...M.flat().map(Math.abs))
  let h=''
  M.forEach((row,r)=>row.forEach((v,c)=>{
    const sel=o.sel&&o.sel[0]===r&&o.sel[1]===c, dark=Math.abs(v)/mx>0.55
    h+=`<rect x="${P+c*S}" y="${P+r*S}" width="${S-2}" height="${S-2}" rx="4" fill="${c9Heat(v,mx)}" stroke="${sel?'#f97316':'#e2d9cc'}" stroke-width="${sel?3:1}"${o.click?` style="cursor:pointer" onclick="${o.click}(${r},${c})"`:''}/>`
    h+=`<text x="${P+c*S+S/2-1}" y="${P+r*S+S/2+4}" text-anchor="middle" font-size="${S>=30?13:11}" font-weight="700" font-family="monospace" fill="${dark?'#fff':'#1a1210'}" style="pointer-events:none">${c9n(v)}</text>`
  }))
  svg.innerHTML=h
}
// 0/1 image: bright cells are 1. patch = [r, c, k] outlines a k×k patch.
function c9DrawImage(svgId,I,S,patch){
  const svg=$(svgId); if(!svg) return
  const P=4
  let h=''
  I.forEach((row,r)=>row.forEach((v,c)=>{
    h+=`<rect x="${P+c*S}" y="${P+r*S}" width="${S-2}" height="${S-2}" rx="3" fill="${v?'#fde68a':'#334155'}"/>`
    h+=`<text x="${P+c*S+S/2-1}" y="${P+r*S+S/2+4}" text-anchor="middle" font-size="11" font-family="monospace" fill="${v?'#78350f':'#94a3b8'}">${v}</text>`
  }))
  if(patch){const [r,c,k]=patch; h+=`<rect x="${P+c*S-2}" y="${P+r*S-2}" width="${k*S+2}" height="${k*S+2}" rx="5" fill="none" stroke="#f97316" stroke-width="3"/>`}
  svg.innerHTML=h
}
// One row of cells ({v, pad}) with positions (from 0) underneath and a coloured bar for every window [start, end).
// o.outs draws one output box per window; o.markUncovered shades cells no window touches.
function c9DrawWindows(svgId,cells,wins,o={}){
  const svg=$(svgId); if(!svg) return
  const C=o.C||34, X=4, Y=4, F=C>=32?14:12, BH=10, BG=14, cols=['#3b82f6','#16a34a','#f59e0b','#a855f7','#ef4444','#0ea5e9']
  const covered=new Set(); wins.forEach(([a,b])=>{for(let i=a;i<b;i++)covered.add(i)})
  let h=''
  cells.forEach((cell,i)=>{
    const x=X+i*C, fill=cell.pad?'#e5e7eb':o.markUncovered&&!covered.has(i)?'#fee2e2':'#fff'
    h+=`<rect x="${x}" y="${Y}" width="${C-2}" height="${C-2}" rx="4" fill="${fill}" stroke="${cell.pad?'#cbd5e1':'#94a3b8'}"${cell.pad?' stroke-dasharray="3 2"':''}/>`
    h+=`<text x="${x+C/2-1}" y="${Y+C/2+5}" text-anchor="middle" font-size="${F}" font-family="monospace" font-weight="700" fill="${cell.pad?'#94a3b8':'#1a1210'}">${cell.v}</text>`
    h+=`<text x="${x+C/2-1}" y="${Y+C+12}" text-anchor="middle" font-size="10" fill="#8a7a6e">${i}</text>`
  })
  const top=Y+C+20
  wins.forEach(([a,b],t)=>{
    h+=`<rect x="${X+a*C+3}" y="${top+t*BG}" width="${Math.max(4,(b-a)*C-8)}" height="${BH}" rx="5" fill="${cols[t%cols.length]}" opacity="0.85"/>`
  })
  let H=top+wins.length*BG, W=X+cells.length*C+4
  if(o.outs){
    const oy=H+8
    h+=`<text x="${X}" y="${oy+C/2+5}" font-size="12" font-weight="700" fill="#5c4a3a">out</text>`
    o.outs.forEach((v,t)=>{
      const x=X+30+t*(C+12)
      h+=`<rect x="${x}" y="${oy}" width="${C+8}" height="${C-2}" rx="4" fill="#fff" stroke="${cols[t%cols.length]}" stroke-width="2.5"/>`
      h+=`<text x="${x+(C+8)/2}" y="${oy+C/2+5}" text-anchor="middle" font-size="${F}" font-weight="700" font-family="monospace" fill="#1a1210">${v}</text>`
    })
    H=oy+C; W=Math.max(W,X+30+o.outs.length*(C+12))
  }
  svg.innerHTML=h
  svg.setAttribute('width',W+4); svg.setAttribute('height',H+4); svg.setAttribute('viewBox',`0 0 ${W+4} ${H+4}`)
  svg.style.height='auto'
}
// 3×3 grid of clickable weight cells (0 → 1 → −1 → 0). click = name of a function(i, j).
function c9WeightGrid(id,K,click,S){
  const g=$(id); if(!g) return
  g.innerHTML=K.flat().map((k,n)=>`<div onclick="${click}(${Math.floor(n/3)},${n%3})" style="cursor:pointer;user-select:none;height:${S}px;display:flex;align-items:center;justify-content:center;border-radius:6px;font-family:monospace;font-weight:800;font-size:16px;background:${k>0?'#dbeafe':k<0?'#fee2e2':'var(--surf2)'};color:${k>0?'#1d4ed8':k<0?'#b91c1c':'var(--muted)'};border:1.5px solid ${k>0?'#93c5fd':k<0?'#fca5a5':'var(--border)'}">${c9n(k)}</div>`).join('')
}
const c9Cycle=v=>v===0?1:v===1?-1:0
// Weighted sum of every 3×3 neighbourhood, centred, with one ring of zero padding (output keeps the input's size).
function c9Same(I,K){
  const n=I.length, m=I[0].length
  return Array.from({length:n},(_,r)=>Array.from({length:m},(_,c)=>{
    let s=0
    for(let a=0;a<3;a++) for(let b=0;b<3;b++){const rr=r+a-1, cc=c+b-1; if(rr>=0&&rr<n&&cc>=0&&cc<m) s+=K[a][b]*I[rr][cc]}
    return s
  }))
}

// ══════════════════════════════════════════════════
//  ACTIVITY 9.1 — CONVOLUTION: SLIDING A PATTERN DETECTOR
// ══════════════════════════════════════════════════
let cvStage=0, cvPos=0, cvSolved=[false,false,false,false], cvTries=[0,0,0,0]
let cvImg='bar', cvKern='box', cvSel=null, cvShifted=false, cvSeen=new Set()
let cvCustom=[[0,0,0],[0,0,0],[0,0,0]], cvDesignOk=false, cvRF={layer:2,r:1,c:1}
let cvQ={1:null,2:null,3:null,4:null}, cvSize={a:null,b:null,c:null}, cvSizeTries={a:0,b:0,c:0}
const cvOff={bar:2,square:2}
const CV_OFF_MAX={bar:5,square:4}
const CV_I=[[2,4,0],[-1,3,-2],[1,-3,0]]
const CV_K=[[1,2],[0,-1]]
const CV_POS=[[0,0],[0,1],[1,0],[1,1]]
const CV_KERNELS={
  vedge:[[1,0,-1],[1,0,-1],[1,0,-1]],
  hedge:[[1,1,1],[0,0,0],[-1,-1,-1]],
  box:[[1,1,1],[1,1,1],[1,1,1]]
}
const CV_SIZE={
  a:{ans:28,hints:['Use ⌊(n + 2p − k) / s⌋ + 1.','⌊(32 + 0 − 5) / 1⌋ + 1 = ?'],ok:'⌊(32 − 5) / 1⌋ + 1 = 28, so 28×28. Without padding, each dimension shrinks by k − 1 = 4.'},
  b:{ans:31,hints:['Use ⌊(n + 2p − k) / s⌋ + 1, and mind the floor ⌊ ⌋.','⌊(64 − 3) / 2⌋ + 1 = ⌊30.5⌋ + 1 = ?'],ok:'⌊61 / 2⌋ + 1 = 30 + 1 = 31, so 31×31. The floor matters: windows start at 0, 2, …, 60, so input column 63 is never covered.'},
  c:{ans:2,hints:['With stride 1 the output size is n + 2p − k + 1. Set it equal to 32.','You need 2p = k − 1 = 4.'],ok:'p = 2: 32 + 4 − 5 + 1 = 32. For an odd kernel size k, padding (k − 1) / 2 keeps the size the same ("same" padding).'}
}
const CV_QS={
  1:{q:'Before you try it: apply the <strong>vertical-edge</strong> kernel to the <strong>square</strong>. Where will the output be non-zero?',
     ok:'The vertical-edge kernel computes (left column) − (right column) of each patch, so it only responds where brightness changes from left to right: the square\'s left and right sides. Click <em>Square</em> to confirm.',
     opts:[
       {t:'Along all four sides of the square',h:'Along the top and bottom sides, the left and right columns of a patch are equally bright, so they cancel. Try it.'},
       {t:'Only along its left and right sides',c:true},
       {t:'Only along its top and bottom sides',h:'That is what the horizontal-edge kernel picks out. This kernel compares left with right.'},
       {t:'Everywhere inside the bright square',h:'Inside the square, the left and right columns of a patch are equal, so the output is 0. Click a cell inside to check.'}
     ]},
  2:{q:'You shift the image by one pixel. Away from the borders, the output map…',
     ok:'The same kernel is applied at every position, so a pattern gets the same response wherever it is: shift the input and the output shifts with it — <strong>translation equivariance</strong>. Near the borders it breaks down: shift the bar all the way right and its right edge falls off the output.',
     opts:[
       {t:'gets a completely different set of numbers',h:'Compare before and after: the same numbers appear, just in different cells.'},
       {t:'stays exactly where it was before the shift',h:'Watch which output columns light up as you press Shift — they move.'},
       {t:'keeps its numbers but moves by one cell',c:true},
       {t:'shrinks by one row and by one column',h:'The output size depends only on the image and kernel sizes, not on where the shape sits.'}
     ]},
  3:{q:'A conv layer has <strong>16 kernels of size 3×3</strong>, and its input is an <strong>RGB image</strong> (3 channels). How many parameters does it have, including biases?',
     ok:'Each kernel is 3×3×3 = 27 weights plus 1 bias, and there are 16 kernels: (27 + 1)·16 = 448 — the same for a 32×32 or a 4000×3000 image. The layer outputs 16 channels.',
     opts:[
       {t:'144',h:'16 × 3 × 3 forgets that each kernel also spans the 3 colour channels, and leaves out the biases.'},
       {t:'160',h:'That is (3·3 + 1)·16. Each kernel covers all 3 input channels, so it has 3·3·3 weights.'},
       {t:'432',h:'That is the right number of weights (16 · 3·3·3). Now add one bias per kernel.'},
       {t:'448',c:true}
     ]},
  4:{q:'Now stack <strong>three</strong> 3×3 conv layers (stride 1). How big is the input patch that one output of the third layer depends on?',
     ok:'Each 3×3 layer adds one pixel on every side: 3 → 5 → 7. That is how deep CNNs see large objects with small kernels — and why networks like VGG stack 3×3 layers instead of using one big kernel.',
     opts:[
       {t:'3 × 3',h:'That is a single layer. Each extra layer combines a 3×3 block of the layer below, which reaches further out.'},
       {t:'5 × 5',h:'That is two layers, as in the picture. A third layer widens it again.'},
       {t:'7 × 7',c:true},
       {t:'9 × 9',h:'Each extra 3×3 layer adds one pixel on every side (2 per dimension), not 3: 3 → 5 → …'}
     ]}
}
const CV_RF_GRIDS=[{label:'Input (7×7)',n:7,x:4},{label:'Layer 1 (5×5)',n:5,x:214},{label:'Layer 2 (3×3)',n:3,x:376}]

function cvUnlock(s){
  const prev=cvStage
  cvStage=Math.max(cvStage,s)
  c9Unlock('cv',prev,s,5)
}
// Cross-correlation without padding ("valid"): the kernel's top-left corner visits every position where it fits.
function cvCorr(I,K){
  const n=I.length-K.length+1, m=I[0].length-K[0].length+1
  return Array.from({length:n},(_,r)=>Array.from({length:m},(_,c)=>K.reduce((s,row,i)=>s+row.reduce((t,k,j)=>t+I[r+i][c+j]*k,0),0)))
}
const cvPar=v=>v<0?`(${c9n(v)})`:c9n(v)
function cvTerms(r,c){const t=[];for(let i=0;i<2;i++)for(let j=0;j<2;j++)t.push([CV_I[r+i][c+j],CV_K[i][j]]);return t}
function cvSumStr(vals){return vals.map((v,i)=>i===0?c9n(v):v<0?` − ${c9n(-v)}`:` + ${c9n(v)}`).join('')}

// ── Stage 1: compute I ★ K by hand ──
function cvDrawSVG(){
  const svg=$('cv-svg'); if(!svg) return
  const CW=72,CH=72,PAD=7, [r,c]=CV_POS[cvPos], showW=cvPos===0||cvSolved[cvPos]
  let h=''
  for(let ri=0;ri<3;ri++) for(let ci=0;ci<3;ci++){
    const isH=ri>=r&&ri<r+2&&ci>=c&&ci<c+2, x=PAD+ci*CW, y=PAD+ri*CH
    h+=`<rect x="${x+1}" y="${y+1}" width="${CW-2}" height="${CH-2}" rx="5" fill="${isH?'#fef9c3':'#fff'}" stroke="${isH?'#f59e0b':'#d1d5db'}" stroke-width="${isH?2.5:1.5}"/>`
    h+=`<text x="${x+CW/2}" y="${y+CH/2+6}" text-anchor="middle" font-size="17" font-weight="700" font-family="monospace" fill="#1a1210">${c9n(CV_I[ri][ci])}</text>`
  }
  h+=`<rect x="${PAD+c*CW+1}" y="${PAD+r*CH+1}" width="${CW*2-2}" height="${CH*2-2}" rx="5" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="7 3"/>`
  if(showW) for(let ki=0;ki<2;ki++) for(let kj=0;kj<2;kj++){
    const x=PAD+(c+kj)*CW, y=PAD+(r+ki)*CH
    h+=`<text x="${x+CW-6}" y="${y+16}" text-anchor="end" font-size="12" fill="#2563eb" font-weight="700">×${c9n(CV_K[ki][kj])}</text>`
  }
  svg.innerHTML=h
}
function cvRenderOut(){
  const kg=$('cv-k-grid')
  if(kg) kg.innerHTML=CV_K.flat().map(k=>`<div style="height:46px;display:flex;align-items:center;justify-content:center;border-radius:6px;font-family:monospace;font-weight:800;font-size:17px;background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe">${c9n(k)}</div>`).join('')
  const g=$('cv-out-grid'); if(!g) return
  const out=cvCorr(CV_I,CV_K)
  g.innerHTML=CV_POS.map(([r,c],p)=>{
    const known=p===0||cvSolved[p], cur=p===cvPos
    const bd=cur?'2.5px solid #f59e0b':known?'1.5px solid var(--green)':'1.5px dashed var(--border)'
    const bg=cur?'#fef9c3':known?'#dcfce7':'var(--surface)'
    return `<div style="height:56px;display:flex;align-items:center;justify-content:center;border:${bd};background:${bg};border-radius:6px;font-family:monospace;font-weight:800;font-size:19px;color:${known?'#14532d':'var(--muted)'}">${known?c9n(out[r][c]):'?'}</div>`
  }).join('')
}
function cvRenderWork(){
  const [r,c]=CV_POS[cvPos], t=cvTerms(r,c), val=cvCorr(CV_I,CV_K)[r][c], known=cvPos===0||cvSolved[cvPos], all=cvSolved.every(Boolean), tries=cvTries[cvPos]
  const lbl=$('cv-pos-lbl'); if(lbl) lbl.textContent=`Position ${cvPos+1} of 4 — output cell (${r}, ${c})`
  const pairs=`<div class="alg-step">${t.map(([x,k])=>`${cvPar(x)}×${cvPar(k)}`).join(' + ')}</div>`
  const prods=`<div class="alg-step">= ${cvSumStr(t.map(([x,k])=>x*k))}</div>`
  const el=$('cv-work')
  if(el) el.innerHTML=known
    ? `${pairs}${prods}<div class="alg-res" style="color:var(--green)">= ${c9n(val)}</div>`
    : `${tries>=2?pairs:''}${tries>=3?prods:''}<div class="alg-step" style="display:flex;align-items:center;gap:8px">output (${r}, ${c}) = <input id="cv-ans" class="rr-inp" placeholder="?" autocomplete="off" onkeydown="if(event.key==='Enter')cvCheckStep()"><button class="btn btn-g" onclick="cvCheckStep()">Check</button></div>`
  const hint=$('cv-step-hint')
  if(hint){
    if(cvPos===0&&!cvSolved[0]){hint.className='guidance-box cold';hint.innerHTML='<strong>Worked example.</strong> Lay K on the dashed box: 2×1, 4×2, (−1)×0 and 3×(−1). The products 2, 8, 0 and −3 add up to 7, so output cell (0, 0) = 7.'}
    else if(!known){
      hint.className=tries?'guidance-box warm':'guidance-box cold'
      hint.innerHTML=!tries?'Lay K on the dashed box (K\'s top-left weight on the box\'s top-left value, and so on), multiply each pair and add the four products.'
        :tries===1?'<strong>Not quite.</strong> Check the pairing: K = [[1, 2], [0, −1]] lies on the box in the same arrangement. Watch the signs.'
        :tries===2?'<strong>Not quite.</strong> Here are the four pairs. Multiply each one, then add.'
        :'<strong>Not quite.</strong> Here are the products. Now add them.'
    }
    else {hint.className='guidance-box done';hint.innerHTML=`<strong>✓ Correct!</strong> Output cell (${r}, ${c}) = ${c9n(val)}.`+(all?' That completes I ★ K = [[7, 6], [8, −1]] — the whole operation is "multiply the overlapping numbers and add". Next: what these numbers mean when the input is an image.':'')}
  }
  const btn=$('cv-next-btn')
  if(btn){btn.style.display=known?'':'none';btn.textContent=cvPos===0&&!cvSolved[0]?'Got it — next position →':cvPos<3?'Next position →':'Continue to Stage 2 ↓'}
  cvRenderOut(); cvDrawSVG()
}
function cvCheckStep(){
  const inp=$('cv-ans'); if(!inp) return
  const v=c9Num(inp.value); if(v===null) return
  const [r,c]=CV_POS[cvPos]
  if(v===cvCorr(CV_I,CV_K)[r][c]){ cvSolved[cvPos]=true; cvRenderWork(); cvCheckDone(); return }
  cvTries[cvPos]++
  cvRenderWork()
  const again=$('cv-ans'); if(again){again.value=inp.value; again.className='rr-inp bad'}
}
function cvAdvance(){
  if(cvPos===0) cvSolved[0]=true
  if(!cvSolved[cvPos]) return
  if(cvPos<3){ cvPos++; cvRenderWork() }
  else { cvUnlock(2); const s=$('cv-s2'); if(s) s.scrollIntoView({behavior:'smooth',block:'start'}) }
  cvCheckDone()
}

// ── Stage 2: what does a kernel respond to? ──
function cvMakeImage(kind,o){
  const I=Array.from({length:8},()=>Array(8).fill(0))
  if(kind==='bar') for(let r=0;r<8;r++) for(let c=o;c<o+3;c++) I[r][c]=1
  else for(let r=2;r<6;r++) for(let c=o;c<o+4;c++) I[r][c]=1
  return I
}
const cvImage=()=>cvMakeImage(cvImg,cvOff[cvImg])
const cvKernel=()=>cvKern==='custom'?cvCustom:CV_KERNELS[cvKern]
function cvRefresh2(){
  const I=cvImage(), K=cvKernel()
  c9DrawImage('cv-img-svg',I,26,cvSel?[cvSel[0],cvSel[1],3]:null)
  c9DrawMap('cv-map-svg',cvCorr(I,K),{S:32,click:'cvSelect',sel:cvSel})
  const g=$('cv-kern-grid')
  if(g) g.innerHTML=K.flat().map(k=>`<div style="height:34px;display:flex;align-items:center;justify-content:center;border-radius:5px;font-family:monospace;font-weight:800;font-size:15px;background:${k>0?'#dbeafe':k<0?'#fee2e2':'var(--surf2)'};color:${k>0?'#1d4ed8':k<0?'#b91c1c':'var(--muted)'}">${c9n(k)}</div>`).join('')
  document.querySelectorAll('.cv-img-btn').forEach(b=>b.classList.toggle('active',b.dataset.v===cvImg))
  document.querySelectorAll('.cv-kern-btn').forEach(b=>b.classList.toggle('active',b.dataset.v===cvKern))
  const el=$('cv-cell-calc')
  if(el){
    if(!cvSel) el.innerHTML='<span style="color:var(--muted)">Click any cell of the output map.</span>'
    else {
      const [r,c]=cvSel
      let total=0
      const rows=K.map((kr,i)=>{const s=kr.reduce((a,k,j)=>a+I[r+i][c+j]*k,0); total+=s; return `<div class="alg-step">${kr.map((k,j)=>`${I[r+i][c+j]}×${cvPar(k)}`).join(' + ')} = ${c9n(s)}</div>`}).join('')
      el.innerHTML=`<div style="font-weight:700;color:var(--text)">Output (${r}, ${c}): patch × kernel, row by row</div>${rows}<div class="alg-res">sum = ${c9n(total)}</div>`
    }
  }
  const items=[
    [cvSeen.has('bar:vedge'),'Apply the <strong>vertical-edge</strong> kernel to the <strong>vertical bar</strong>'],
    [cvSeen.has('bar:hedge'),'Apply the <strong>horizontal-edge</strong> kernel to the vertical bar'],
    [cvShifted,'<strong>Shift</strong> the image and watch the output map']
  ]
  const cl=$('cv-checklist')
  if(cl) cl.innerHTML=items.map(([ok,t])=>`<div><span style="color:${ok?'var(--green)':'var(--muted)'};font-weight:800">${ok?'✓':'○'}</span> ${t}</div>`).join('')
  if(items.every(x=>x[0])){const q=$('cv-s2q');if(q)q.classList.add('unlocked')}
  c9WeightGrid('cv-edit-grid',cvCustom,'cvEditCell',44)
}
function cvSetImage(k){ cvImg=k; cvSeen.add(`${cvImg}:${cvKern}`); cvRefresh2() }
function cvSetKernel(k){ cvKern=k; cvSeen.add(`${cvImg}:${cvKern}`); cvRefresh2() }
function cvShift(d){
  const o=Math.max(0,Math.min(CV_OFF_MAX[cvImg],cvOff[cvImg]+d))
  if(o!==cvOff[cvImg]){cvOff[cvImg]=o;cvShifted=true}
  cvRefresh2()
}
function cvSelect(r,c){ cvSel=[r,c]; cvRefresh2() }
// Design challenge: a kernel that is positive only along the square's top edge.
function cvEditCell(i,j){
  cvCustom[i][j]=c9Cycle(cvCustom[i][j])
  cvImg='square'; cvKern='custom'
  cvRefresh2()
}
function cvCheckDesign(){
  cvImg='square'; cvKern='custom'; cvRefresh2()
  const O=cvCorr(cvMakeImage('square',cvOff.square),cvCustom), pos=[]
  O.forEach((row,r)=>row.forEach((v,c)=>{if(v>0)pos.push(r)}))
  // The square fills rows 2–5, so output rows 0–1 straddle its top edge and rows 4–5 its bottom edge.
  const h=$('cv-design-hint'); if(!h) return
  if(!pos.length){h.className='guidance-box warm';h.innerHTML='<strong>Nothing fires yet.</strong> No output is positive. Above the top edge the patch is dark, below it is bright: which rows of the kernel should be positive?'}
  else if(pos.every(r=>r<=1)&&[cvOff.square,cvOff.square+1].every(c=>O[0][c]>0||O[1][c]>0)){
    cvDesignOk=true
    h.className='guidance-box done';h.innerHTML=`<strong>✓ It fires only on the top edge.</strong> Your kernel ${JSON.stringify(cvCustom).replace(/-/g,'−').replace(/,/g,', ')} rewards bright pixels below and dark pixels above. A trained CNN learns kernels like this on its own, because they help with its task.`
  }
  else if(pos.every(r=>r<=1)){h.className='guidance-box warm';h.innerHTML='<strong>Only part of the top edge fires.</strong> Your kernel responds near a corner but not along the middle of the edge. Give the three weights in each kernel row the same value, so the response does not depend on left or right.'}
  else if(pos.some(r=>r>=4)&&!pos.some(r=>r<=3)){h.className='guidance-box warm';h.innerHTML='<strong>Close — it fires on the bottom edge.</strong> At the top edge, dark is above and bright is below. Flip your signs.'}
  else {
    const rows=[...new Set(pos.filter(r=>r>1))].sort().join(', ')
    h.className='guidance-box warm'
    h.innerHTML=(pos.some(r=>r<=1)?`<strong>Not only the top edge.</strong> It also fires in output rows ${rows} (the sides, the inside or the bottom of the square).`:`<strong>Not the top edge yet.</strong> It fires in output rows ${rows} — the sides, the inside or the bottom of the square.`)+' Making all weights in a kernel row equal cancels left/right differences; then think about dark above, bright below.'
  }
  cvCheckDone()
}

// ── Stage 3: output size ──
function cvSizeUpdate(){
  const g=id=>parseInt(($(id)||{value:0}).value)
  const n=g('cv-n'), k=g('cv-k'), s=g('cv-st'), p=g('cv-p')
  ;[['cv-n-val',n],['cv-k-val',k],['cv-st-val',s],['cv-p-val',p]].forEach(([id,v])=>{const e=$(id);if(e)e.textContent=v})
  const L=n+2*p, cnt=L>=k?Math.floor((L-k)/s)+1:0
  const cells=Array.from({length:L},(_,i)=>i<p||i>=p+n?{v:0,pad:true}:{v:''})
  const wins=Array.from({length:cnt},(_,t)=>[t*s,t*s+k])
  c9DrawWindows('cv-row-svg',cells,wins,{C:40,markUncovered:true})
  const el=$('cv-size-calc'); if(!el) return
  const cov=new Set(); wins.forEach(([a,b])=>{for(let i=a;i<b;i++)cov.add(i)})
  const unc=[]; for(let i=p;i<p+n;i++) if(!cov.has(i)) unc.push(i)
  el.innerHTML=`<div class="alg-step">padded length = n + 2p = ${n} + 2·${p} = ${L}</div>`+(cnt
    ? `<div class="alg-step">kernel starts at ${wins.map(w=>w[0]).join(', ')} &nbsp;(a start must be ≤ ${L} − ${k} = ${L-k})</div><div class="alg-res">output size = ⌊(n + 2p − k) / s⌋ + 1 = ⌊(${L} − ${k}) / ${s}⌋ + 1 = ${cnt}</div>`
    : `<div class="alg-res" style="color:var(--red)">The kernel (k = ${k}) is wider than the padded input (${L}), so it fits nowhere.</div>`)+(cnt&&unc.length?`<div class="alg-step" style="color:var(--red)">position${unc.length>1?'s':''} ${unc.join(', ')} ${unc.length>1?'are':'is'} never covered by a window (shaded red)</div>`:'')
}
function cvCheckSize(key){
  const inp=$(`cv-sz-${key}`), h=$(`cv-sz-${key}-hint`), v=c9Num(inp.value)
  if(v===null) return
  const S=CV_SIZE[key], ok=v===S.ans
  cvSize[key]=ok
  if(!ok) cvSizeTries[key]++
  inp.className='rr-inp '+(ok?'ok':'bad')
  h.className='guidance-box '+(ok?'done':'warm')
  h.innerHTML=ok?`<strong>✓ Correct!</strong> ${S.ok}`:`<strong>Not quite.</strong> ${S.hints[Math.min(cvSizeTries[key],S.hints.length)-1]}`
  cvCheckDone()
}

// ── Stage 4: receptive field of stacked 3×3 layers ──
function cvRFSelect(layer,r,c){ cvRF={layer,r,c}; cvDrawRF() }
function cvDrawRF(){
  const svg=$('cv-rf-svg'); if(!svg) return
  const S=24, Y=24, {layer,r,c}=cvRF
  // highlighted block per grid as [row, col, size]: the selected cell, and what it depends on below it
  const hl=layer===2?[[r,c,5],[r,c,3],[r,c,1]]:[[r,c,3],[r,c,1],null]
  let h=''
  CV_RF_GRIDS.forEach((g,gi)=>{
    h+=`<text x="${g.x}" y="14" font-size="12" font-weight="700" fill="#5c4a3a">${g.label}</text>`
    for(let i=0;i<g.n;i++) for(let j=0;j<g.n;j++){
      const H=hl[gi], on=H&&i>=H[0]&&i<H[0]+H[2]&&j>=H[1]&&j<H[1]+H[2], sel=gi===layer&&i===r&&j===c
      h+=`<rect x="${g.x+j*S}" y="${Y+i*S}" width="${S-2}" height="${S-2}" rx="3" fill="${sel?'#f59e0b':on?'#fed7aa':'#fff'}" stroke="${on||sel?'#ea580c':'#cbd5e1'}"${gi>0?` style="cursor:pointer" onclick="cvRFSelect(${gi},${i},${j})"`:''}/>`
    }
    if(gi<2) h+=`<text x="${g.x+g.n*S+10}" y="${Y+g.n*S/2+5}" font-size="18" fill="#9ca3af">→</text>`
  })
  svg.innerHTML=h
  const info=$('cv-rf-info'); if(!info) return
  info.className='guidance-box hot'
  info.innerHTML=layer===2
    ?`Layer-2 cell (${r}, ${c}) combines a <strong>3×3</strong> block of layer 1. Each of those cells sees its own 3×3 input patch, and together they cover a <strong>5×5</strong> patch of the input.`
    :`Layer-1 cell (${r}, ${c}) sees a <strong>3×3</strong> patch of the input. Now click a cell in layer 2.`
}

function cvMCQ(q,i){ cvQ[q]=c9Answer('cv',q,i,CV_QS[q]); cvCheckDone() }
function cvCheckDone(){
  if(cvQ[1]===true&&cvQ[2]===true){
    const c=$('cv-s2c')
    if(c&&!c.classList.contains('unlocked')){ c.classList.add('unlocked'); const b=$('cv-custom-btn'); if(b) b.style.display='' }
  }
  if(cvDesignOk) cvUnlock(3)
  if(cvStage>=3&&Object.values(cvSize).every(v=>v===true)) cvUnlock(4)
  const done=isComplete('conv91')
  if(done) cvUnlock(5)
  updateBadge('cv-completed',done)
}

function initConv91(){
  const eq=$('cv-prob-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#b45309">$$(I\\star K)[r,c]=\\sum_{i}\\sum_{j} I[r+i,\\;c+j]\\cdot K[i,j]$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500"><strong style="color:var(--text)">Put the kernel's top-left corner on input cell (r, c).</strong><br>Multiply each kernel weight by the input value under it and add up all the products. That sum is output cell (r, c).</div>
      </div>
      <div style="padding:14px 20px;text-align:center;font-size:14.5px;color:var(--muted);line-height:1.8;font-weight:500">
        Strictly, this is <strong style="color:var(--text)">cross-correlation</strong>: textbook convolution flips the kernel first, but deep-learning libraries skip the flip and still call it convolution. In a CNN the kernel weights are <strong style="color:var(--text)">learned</strong>; here we set them by hand to see what they do.
      </div>
    </div>`
    typeset(eq)
  }
  cvRenderWork(); cvRefresh2(); cvSizeUpdate(); cvDrawRF()
  ;[1,2,3,4].forEach(q=>c9RenderMCQ('cv',q,CV_QS[q]))
  cvCheckDone()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 9.3 — ADAPTIVE POOLING
// ══════════════════════════════════════════════════
let plStage=0, plMaxOk=false, plMoves={left:false,right:false}, plFix=null, plFixTries=0, plAdapt=null, plAdaptTries=0
let plQ={1:null,2:null,3:null,4:null,5:null,6:null}
const PL_X0=[1,3,2,9,4,0,5,7]
let plX=[...PL_X0]
const PL_SEQ=[1,3,2,9,4,0,5,7,6,2,8,1,3,5,0,4]
const PL_COLORS=['#dbeafe','#dcfce7','#fef3c7','#ede9fe']
const PL_QS={
  1:{q:'Compare your two experiments. What does max pooling ignore?',
     ok:'Moving the 9 inside its window left the output unchanged; moving it across a window boundary changed it. Pooling is only <em>approximately</em> invariant to small shifts: within a window, the network stops caring exactly where a feature was.',
     opts:[
       {t:'Every shift of the input, large or small',h:'Moving the 9 right, into the next window, did change the output.'},
       {t:'The size of the largest value in a window',h:'The 9 still shows up in the output. Pooling keeps the value and drops its exact position.'},
       {t:'Shifts that keep a value in the same window',c:true},
       {t:'Nothing: any change of input changes it',h:'Moving the 9 one step left left the output unchanged.'}
     ]},
  2:{q:'Keep k and s fixed and make the input longer. The number of outputs…',
     ok:'outputs = ⌊(n − k) / s⌋ + 1 grows with n, in steps (with k = s = 2, n = 8 and n = 9 both give 4). A dense layer needs one fixed number, so a fixed window cannot serve every input size.',
     opts:[
       {t:'grows in steps, roughly n ÷ s',c:true},
       {t:'stays the same for every n',h:'Drag n with k = s = 2: the number of output boxes changes.'},
       {t:'depends only on the stride s',h:'The rule ⌊(n − k) / s⌋ + 1 contains n, so the input length matters.'},
       {t:'always equals the window size k',h:'Try k = 2, s = 2 with n = 16: 8 outputs, not 2.'}
     ]},
  3:{q:'n = 10 and T = 4, but 10 is not a multiple of 4. What does adaptive pooling do?',
     ok:'For n = 10, T = 4 the regions are x0–x2, x2–x4, x5–x7 and x7–x9: four regions of 3 values covering all 10 inputs, with x2 and x7 used twice. The output length is always T.',
     opts:[
       {t:'Drops the last two input values',h:'Set n = 10, T = 4 above: every input is inside some region.'},
       {t:'Outputs five values instead of four',h:'The output length is always T — that is the whole point of adaptive pooling.'},
       {t:'Lets neighbouring regions share an input',c:true},
       {t:'Refuses any input length that does not divide',h:'Adaptive pooling accepts any n; the rounding in its rule handles the remainder.'}
     ]},
  4:{q:'ResNet-50\'s last conv layer outputs 2048 channels: 7×7 for a 224×224 photo, 10×13 for a 320×416 photo. After global average pooling, a dense layer maps them to 1000 classes. How many weights (no biases) does that dense layer need?',
     ok:'Global average pooling turns 2048 maps of any size into 2048 numbers, so the dense layer is always 2048 × 1000 = 2,048,000 weights. That is what lets one trained network accept photos of different sizes.',
     opts:[
       {t:'2,048,000 — for both photo sizes',c:true},
       {t:'2,048,000 for small photos, more for big',h:'After global average pooling each channel is one number whatever the photo size, so the dense layer sees 2048 inputs either way.'},
       {t:'100,352,000 — that is 2048 · 7 · 7 · 1000',h:'That would be a dense layer on the un-pooled 7×7 maps — and it would not fit the 10×13 maps at all.'},
       {t:'1,000 — one weight for each class',h:'Each of the 1000 outputs needs a weight for each of the 2048 inputs.'}
     ]},
  5:{q:'In PyTorch, <code>nn.AdaptiveAvgPool2d(4)</code> receives a 37×53 feature map. What is the output size per channel?',
     ok:'The argument is the target size T (4 for height and width). Height and width are each split into 4 regions, whatever the input size.',
     opts:[
       {t:'37 × 53',h:'Adaptive pooling sets the output size; the input size does not carry over.'},
       {t:'9 × 13',h:'That is what a fixed 4×4 window with stride 4 would give: ⌊(37 − 4) / 4⌋ + 1 = 9 and ⌊(53 − 4) / 4⌋ + 1 = 13.'},
       {t:'4 × 4',c:true},
       {t:'1 × 1',h:'That would be T = 1 (global pooling).'}
     ]},
  6:{q:'A network must predict <em>where</em> a cat\'s nose is (its x, y position). Why can global average pooling before the output layer hurt?',
     ok:'Averaging the whole map keeps "how much of this feature" and throws away "where". That is ideal for classification, but location tasks need the spatial maps (or only light pooling).',
     opts:[
       {t:'It averages away where each feature was',c:true},
       {t:'It adds too many trainable weights',h:'Pooling has no trainable weights at all.'},
       {t:'It only works with classification losses',h:'Pooling is just an average, so any loss can follow it. The problem is what it keeps.'},
       {t:'It makes every feature map larger',h:'It shrinks each map to a single number.'}
     ]}
}
const plMax=a=>Math.max(...a)
const plAvg=a=>a.reduce((s,v)=>s+v,0)/a.length
const plWin=(x,t)=>x.slice(2*t,2*t+2)
const plMaxes=x=>[0,1,2,3].map(t=>plMax(plWin(x,t)))

function plUnlock(s){
  const prev=plStage
  plStage=Math.max(plStage,s)
  c9Unlock('pl',prev,s,5)
  // Stages 2 and 3 are drawn only once reached, so they don't give away Stage 1.
  if(s>=2&&prev<2) plFixedUpdate()
  if(s>=3&&prev<3) plAdaptUpdate()
}

// ── Stage 1: what pooling computes ──
function plRenderPool(){
  const g=$('pl-pool-grid'); if(!g) return
  const keep=[0,1,2,3].map(t=>{const e=$(`pl-m${t}`);return e?{v:e.value,cls:e.className}:null})
  let h=plX.map((v,i)=>`<div style="height:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:6px;font-family:monospace;font-weight:800;font-size:18px;background:${PL_COLORS[Math.floor(i/2)]};border:1px solid var(--border)">${v}<span style="font-size:10px;font-weight:500;color:var(--muted)">x${i}</span></div>`).join('')
  h+=[0,1,2,3].map(t=>`<div style="grid-column:span 2;display:flex;align-items:center;gap:6px;justify-content:center"><span style="font-size:12.5px;color:var(--muted)">max</span><input id="pl-m${t}" class="rr-inp" style="width:56px" placeholder="?" autocomplete="off" onkeydown="if(event.key==='Enter')plCheckMax()"></div>`).join('')
  if(plMaxOk) h+=[0,1,2,3].map(t=>`<div style="grid-column:span 2;text-align:center;font-family:monospace;font-size:14.5px;color:var(--muted)">avg <strong style="color:var(--text)">${c9n(plAvg(plWin(plX,t)))}</strong></div>`).join('')
  g.innerHTML=h
  keep.forEach((k,t)=>{const e=$(`pl-m${t}`);if(e&&k){e.value=k.v;e.className=k.cls}})
}
function plCheckMax(){
  let all=true, wrong=-1
  for(let t=0;t<4;t++){
    const e=$(`pl-m${t}`), v=c9Num(e.value), ok=v===plMax(plWin(PL_X0,t))
    e.className='rr-inp'+(v===null?'':ok?' ok':' bad')
    if(!ok){all=false; if(wrong<0&&v!==null) wrong=t}
  }
  const h=$('pl-max-hint')
  if(all){
    plMaxOk=true
    h.className='guidance-box done'; h.innerHTML='<strong>✓ Correct!</strong> Max pooling keeps [3, 9, 4, 7] — the strongest value in each window. Four windows give four outputs, so the output is half as long as the input.'
    const a=$('pl-after-max'); if(a) a.style.display=''
    plRenderPool()
  } else if(wrong>=0){
    h.className='guidance-box warm'; h.innerHTML=`<strong>Not quite.</strong> Window ${wrong+1} holds [${plWin(PL_X0,wrong).join(', ')}]. Which of the two is larger?`
  } else {
    h.className='guidance-box cold'; h.innerHTML='Fill in all four boxes, then press Check.'
  }
  plCheckDone()
}
// d = −1: the 9 moves into x2 (same window); d = +1: into x4 (next window); d = 0: reset.
function plMove9(d){
  plX=[...PL_X0]
  if(d){ const j=3+d; [plX[3],plX[j]]=[plX[j],plX[3]]; plMoves[d<0?'left':'right']=true }
  plRenderPool()
  const r=$('pl-move-res')
  if(r){
    const m0=plMaxes(PL_X0), m=plMaxes(plX), same=m.every((v,i)=>v===m0[i])
    r.style.display=''
    r.innerHTML=`<div class="alg-step">input: [${plX.join(', ')}]</div><div class="alg-step">max output: [${m.join(', ')}] &nbsp;(original: [${m0.join(', ')}])</div><div class="alg-res" style="color:${same?'var(--green)':'var(--orange)'}">${d===0?'Back to the original input.':same?'The max output did not change.':'The max output changed.'}</div>`
  }
  if(plMoves.left&&plMoves.right){const q=$('pl-s1q');if(q)q.classList.add('unlocked')}
}

// ── Stage 2: fixed window ──
function plFixedUpdate(){
  const g=id=>parseInt($(id).value), n=g('pl-n'), k=g('pl-k'), s=g('pl-s')
  ;[['pl-n-val',n],['pl-k-val',k],['pl-s-val',s]].forEach(([id,v])=>{const e=$(id);if(e)e.textContent=v})
  const x=PL_SEQ.slice(0,n), wins=[]
  for(let a=0;a+k<=n;a+=s) wins.push([a,a+k])
  c9DrawWindows('pl-fixed-svg',x.map(v=>({v})),wins,{C:36,outs:wins.map(([a,b])=>plMax(x.slice(a,b))),markUncovered:true})
  const unused=x.map((_,i)=>i).filter(i=>!wins.some(([a,b])=>i>=a&&i<b))
  const el=$('pl-fixed-calc'); if(!el) return
  el.innerHTML=`<div class="alg-step">outputs = ⌊(n − k) / s⌋ + 1 = ⌊(${n} − ${k}) / ${s}⌋ + 1 = ${wins.length}</div>`
    +(unused.length?`<div class="alg-step" style="color:var(--red)">${unused.map(i=>'x'+i).join(', ')} never fall in a window (shaded red)</div>`:'')
    +`<div class="alg-res" style="color:${wins.length===4?'var(--green)':'var(--red)'}">${wins.length===4?'✓ 4 outputs — fits the dense layer':'✗ '+wins.length+' outputs — the dense layer expects 4'}</div>`
}
function plCheckFixed(){
  const e=$('pl-fix-ans'), v=c9Num(e.value); if(v===null) return
  plFix=v===25
  if(!plFix) plFixTries++
  e.className='rr-inp '+(plFix?'ok':'bad')
  const h=$('pl-fix-hint'); h.className='guidance-box '+(plFix?'done':'warm')
  h.innerHTML=plFix?'<strong>✓ Correct!</strong> ⌊(51 − 2) / 2⌋ + 1 = 24 + 1 = 25, and x50 is never pooled. With a fixed window, a longer input means a longer output — far more than the 4 the dense layer expects.'
    :plFixTries===1?'<strong>Not quite.</strong> Use outputs = ⌊(n − k) / s⌋ + 1, and mind the floor.'
    :'<strong>Not quite.</strong> ⌊(51 − 2) / 2⌋ + 1 = ⌊24.5⌋ + 1 = ?'
  plCheckDone()
}

// ── Stage 3: adaptive pooling ──
// PyTorch's rule: region t covers positions ⌊t·n/T⌋ up to (not including) ⌈(t+1)·n/T⌉.
function plAdaptRegions(n,T){ return Array.from({length:T},(_,t)=>[Math.floor(t*n/T),Math.ceil((t+1)*n/T)]) }
function plAdaptUpdate(){
  const Ts=$('pl-T'), ns=$('pl-n2'); if(!Ts||!ns) return
  const T=parseInt(Ts.value)
  ns.min=Math.max(4,T); if(parseInt(ns.value)<T) ns.value=T
  const n=parseInt(ns.value)
  ;[['pl-T-val',T],['pl-n2-val',n]].forEach(([id,v])=>{const e=$(id);if(e)e.textContent=v})
  const x=PL_SEQ.slice(0,n), regs=plAdaptRegions(n,T), outs=regs.map(([a,b])=>plMax(x.slice(a,b)))
  c9DrawWindows('pl-adapt-svg',x.map(v=>({v})),regs,{C:36,outs})
  const el=$('pl-adapt-calc'); if(!el) return
  el.innerHTML=regs.map(([a,b],t)=>`<div class="alg-step">region ${t}: ⌊${t}·${n}/${T}⌋ = ${a} up to ⌈${t+1}·${n}/${T}⌉ = ${b} → x${a}–x${b-1} → max ${outs[t]}</div>`).join('')
    +`<div class="alg-res" style="color:${T===4?'var(--green)':'var(--text)'}">output length = T = ${T}${T===4?' → ✓ fits the dense layer, for every n':''}</div>`
}
function plCheckAdapt(){
  const a=c9Num($('pl-adapt-a').value), b=c9Num($('pl-adapt-b').value); if(a===null||b===null) return
  plAdapt=a===6&&b===13
  if(!plAdapt) plAdaptTries++
  $('pl-adapt-a').className='rr-inp '+(a===6?'ok':'bad'); $('pl-adapt-b').className='rr-inp '+(b===13?'ok':'bad')
  const h=$('pl-adapt-hint'); h.className='guidance-box '+(plAdapt?'done':'warm')
  h.innerHTML=plAdapt?'<strong>✓ Correct!</strong> Region 1 starts at ⌊20/3⌋ = 6 and stops before ⌈40/3⌉ = 14, so it pools x6 … x13. Regions 0 and 2 are x0–x6 and x13–x19.'
    :a===6&&b===14?'<strong>Almost.</strong> The region stops <em>before</em> position 14, so its last input is one earlier.'
    :plAdaptTries===1?'<strong>Not quite.</strong> Region t starts at ⌊t·n / T⌋ and stops just before ⌈(t+1)·n / T⌉. Here t = 1, n = 20, T = 3.'
    :'<strong>Not quite.</strong> Start: ⌊1·20 / 3⌋ = ⌊6.67⌋. Stop just before ⌈2·20 / 3⌉ = ⌈13.33⌉.'
  plCheckDone()
}

function plMCQ(q,i){ plQ[q]=c9Answer('pl',q,i,PL_QS[q]); plCheckDone() }
function plCheckDone(){
  if(plMaxOk&&plQ[1]===true) plUnlock(2)
  if(plStage>=2&&plFix===true&&plQ[2]===true) plUnlock(3)
  if(plStage>=3&&plAdapt===true&&plQ[3]===true) plUnlock(4)
  const done=isComplete('pool93')
  if(done) plUnlock(5)
  updateBadge('pl-completed',done)
}

function initPool93(){
  const eq=$('pl-prob-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#b45309">$$y_t=\\max_{i\\,\\in\\,\\text{window } t} x_i$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500"><strong style="color:var(--text)">Max pooling:</strong> slide a window over the input; each output is the largest value inside one window. Average pooling uses the mean instead. Pooling has no weights to learn.</div>
      </div>
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#6d28d9">$$\\text{number of outputs}=\\left\\lfloor\\frac{n-k}{s}\\right\\rfloor+1$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">With window size k and stride s, count how many windows fit into n inputs — the same count as convolution in 9.1. <strong style="color:var(--text)">It changes with n.</strong></div>
      </div>
      <div style="padding:14px 20px;text-align:center">
        <div style="color:#15803d">$$\\text{region } t:\\ \\text{from } \\Big\\lfloor\\tfrac{t\\,n}{T}\\Big\\rfloor \\text{ up to (not incl.) } \\Big\\lceil\\tfrac{(t+1)\\,n}{T}\\Big\\rceil$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500"><strong style="color:var(--text)">Adaptive pooling:</strong> split the n inputs into T regions (t = 0, 1, …, T − 1) of about n / T values and pool each one. <strong style="color:var(--text)">The output always has T values.</strong></div>
      </div>
    </div>`
    typeset(eq)
  }
  plRenderPool()
  ;[1,2,3,4,5,6].forEach(q=>c9RenderMCQ('pl',q,PL_QS[q]))
  plCheckDone()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 9.GC.1 — GRAPH CONVOLUTION MECHANICS
// ══════════════════════════════════════════════════
let gmStage=0, gmFillOk=false, gmFillTries={0:0,2:0}, gmLearnOk=false, gmSel=-1, gmClicked=new Set(), gmLayer=-1, gmLayersSeen=new Set()
let gmHL=-1, gmDone=new Set(), gmAnimTimer=null
let gmQ={1:null,2:null,3:null,4:null,5:null,6:null}
const GM_H=[4,1,3,0,2]
const GM_POS=[[60,55],[180,55],[120,125],[185,190],[55,190]]
const GM_EDGES=[[0,1],[0,2],[0,4],[1,2],[2,3],[3,4]]
// A* = A + I: edges plus a self-loop on every node
const GM_A=GM_H.map((_,i)=>GM_H.map((_,j)=>i===j||GM_EDGES.some(([a,b])=>(a===i&&b===j)||(a===j&&b===i))?1:0))
const GM_NBR=GM_A.map(row=>row.map((v,j)=>v?j:-1).filter(j=>j>=0))
// GM_LAYERS[l] = node values after l layers with W = 1, b = 0
const GM_LAYERS=[GM_H]
for(let l=0;l<3;l++) GM_LAYERS.push(GM_NBR.map(js=>js.reduce((s,j)=>s+GM_LAYERS[l][j],0)/js.length))
const GM_NEW=GM_LAYERS[1]
const GM_QS={
  1:{q:'Suppose the edge between nodes 0 and 4 is removed. Which entries of A* change?',
     ok:'Edges go both ways, so A* is symmetric: A*[i][j] = A*[j][i]. Removing 0–4 clears both entries, and nodes 0 and 4 each average one value fewer.',
     opts:[
       {t:'Only A*[0][4] becomes 0',h:'An edge links two nodes both ways: node 4 also stops hearing from node 0.'},
       {t:'A*[0][4] and A*[4][0] become 0',c:true},
       {t:'A*[0][0] and A*[4][4] become 0',h:'Those are self-loops on the diagonal; every node keeps its own.'},
       {t:'All of row 0 becomes 0',h:'Node 0 still has neighbours 1 and 2, and its self-loop.'}
     ]},
  2:{q:'Without self-loops (plain A instead of A*), what would node 3\'s average be?',
     ok:'Plain A gives (h[2] + h[4]) / 2 = (3 + 2) / 2 = 2.5: node 3\'s own value would be ignored. The self-loop in A* = A + I keeps each node\'s own feature in its update.',
     opts:[
       {t:'1.67',h:'That is the average with the self-loop, (3 + 0 + 2) / 3. Without it, node 3\'s own h[3] = 0 is left out.'},
       {t:'2.5',c:true},
       {t:'5',h:'That is the sum h[2] + h[4]. Divide by the number of terms.'},
       {t:'0',h:'0 is node 3\'s own value — exactly the term that drops out without the self-loop.'}
     ]},
  3:{q:'Nodes 1 and 4 are not neighbours. After how many layers can h[4] first affect node 1?',
     ok:'h[4] reaches node 0 in layer 1 (they are neighbours), and node 0 passes it on to node 1 in layer 2. After k layers, a node has heard from every node within k hops.',
     opts:[
       {t:'1',h:'After one layer, node 1 has heard only from its own row of A*: nodes 0, 1 and 2.'},
       {t:'2',c:true},
       {t:'3',h:'Look for a path: 4 → 0 → 1 takes two hops.'},
       {t:'Never',h:'They are not neighbours, but they are connected through node 0.'}
     ]},
  4:{q:'The buttons stop at 3 layers. What would 50 layers do to the five values?',
     ok:'Every layer averages neighbours, so the spread keeps shrinking and all nodes approach one common value — <strong>over-smoothing</strong>. That is why GCNs usually use only 2–3 layers.',
     opts:[
       {t:'Make them almost identical',c:true},
       {t:'Bring back [4, 1, 3, 0, 2]',h:'Averaging cannot undo itself; each layer mixes the values further.'},
       {t:'Spread them further apart',h:'Look at the spread: 4 → 1 → 0.5 → 0.25. Every layer shrinks it.'},
       {t:'Drive all of them to 0',h:'An average of positive numbers stays positive; the values converge to a common positive value.'}
     ]},
  5:{q:'Swap the values of nodes 1 and 4, so h[1] = 2 and h[4] = 1. What is node 0\'s average now?',
     ok:'Node 0 still averages the same four numbers (4, 2, 3, 1), so swapping which neighbour holds which value changes nothing for node 0, which has both as neighbours. The aggregation ignores order — a GCN has no notion of which neighbour is where, which is the heart of 9.GC.2.',
     opts:[
       {t:'2.25 — lower',h:'Node 0 averages h[0], h[1], h[2], h[4]: still 4, 2, 3 and 1.'},
       {t:'2.75 — higher',h:'Add again: 4 + 2 + 3 + 1 = 10, divided by 4.'},
       {t:'2.5 — unchanged',c:true},
       {t:'Depends on order',h:'The average only needs the values, not which neighbour holds which.'}
     ]},
  6:{q:'Nodes 1 and 3 sit in different parts of the graph. Does the layer use a different W for each?',
     ok:'One W and one b serve every node: weight sharing, the GCN version of sliding one kernel over every pixel. That is why a trained GCN runs on graphs of any size.',
     opts:[
       {t:'Yes — each node learns its own W',h:'A W per node would grow with the graph, and the model could not run on new graphs.'},
       {t:'Yes — bigger values get a bigger W',h:'W does not depend on the input; the same W multiplies every average.'},
       {t:'Only if their degrees differ',h:'Degree changes the averaging (÷3 or ÷4), not W.'},
       {t:'No — one W is shared by all nodes',c:true}
     ]}
}
const gmFmt=v=>String(+v.toFixed(2))

function gmUnlock(s){
  const prev=gmStage
  gmStage=Math.max(gmStage,s)
  c9Unlock('gm',prev,s,6)
  // Later stages show the layer-1 averages, so they are drawn only once reached.
  if(s>=3&&prev<3) gmLearnUpdate()
  if(s>=4&&prev<4) gmShowLayer(0)
}
// Nodes within L hops of node (its receptive field after L layers).
function gmReach(node,L){
  let s=new Set([node])
  for(let l=0;l<L;l++){const n=new Set(s); s.forEach(i=>GM_NBR[i].forEach(j=>n.add(j))); s=n}
  return s
}
// gm-svg: clickable (Stage 1) · gm-svg2: one-layer animation (Stage 2) · gm-svg3: layer view (Stage 4)
function gmDrawGraph(id){
  const svg=$(id); if(!svg) return
  const mode=id==='gm-svg'?1:id==='gm-svg2'?2:3
  const focus=mode===1?gmSel:mode===2?gmHL:-1, nbr=focus>=0?GM_NBR[focus]:[]
  const reach=mode===3&&gmLayer>=0?gmReach(3,gmLayer):null
  let h=''
  GM_EDGES.forEach(([a,b])=>{
    const on=a===focus||b===focus
    const [x1,y1]=GM_POS[a],[x2,y2]=GM_POS[b]
    h+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on?'#f59e0b':'#9ca3af'}" stroke-width="${on?3:2}"/>`
  })
  GM_POS.forEach(([x,y],i)=>{
    const on=i===focus, nb=!on&&nbr.includes(i), rc=reach&&reach.has(i)
    const fill=on?'#fef9c3':nb?'#fff7ed':rc?'#fed7aa':'#fff', stroke=on?'#f59e0b':rc?'#ea580c':'#3b82f6'
    h+=`<circle cx="${x}" cy="${y}" r="18" fill="${fill}" stroke="${stroke}" stroke-width="${on||(mode===3&&i===3)?3.5:2}"${mode===1?` style="cursor:pointer" onclick="gmSelectNode(${i})"`:''}/>`
    h+=`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" font-weight="700" fill="#1a1210" style="pointer-events:none">${i}</text>`
    let lbl=`h=${mode===3&&gmLayer>=0?gmFmt(GM_LAYERS[gmLayer][i]):GM_H[i]}`
    if(mode===2){
      if(gmDone.has(i)||(gmFillOk&&(i===0||i===2))) lbl+=` <tspan fill="#15803d" font-weight="700">→ ${gmFmt(GM_NEW[i])}</tspan>`
      else if(gmDone.size===3) lbl+=` <tspan fill="#c2610c" font-weight="700">→ ?</tspan>`
    }
    const ly=i===2?y+36:y<100?y-26:y+34
    h+=`<text x="${x}" y="${ly}" text-anchor="middle" font-size="12" font-family="monospace" fill="#5c4a3a">${lbl}</text>`
  })
  svg.innerHTML=h
}

// ── Stage 1: graph and adjacency matrix ──
function gmRenderAdj(){
  const g=$('gm-adj-grid'); if(!g) return
  const cell=(t,bg,col,extra='')=>`<div style="height:36px;display:flex;align-items:center;justify-content:center;border-radius:5px;font-family:monospace;font-weight:700;font-size:14.5px;background:${bg};color:${col};${extra}">${t}</div>`
  let h=cell('','transparent','var(--muted)')
  for(let j=0;j<5;j++) h+=cell(j,'transparent','var(--muted)','font-size:12.5px')
  GM_A.forEach((row,i)=>{
    const sel=i===gmSel, ring=sel?'box-shadow:inset 0 0 0 2px #f59e0b;':''
    h+=`<div onclick="gmSelectNode(${i})" style="cursor:pointer;height:36px;display:flex;align-items:center;justify-content:center;border-radius:5px;font-family:monospace;font-weight:800;font-size:12.5px;color:${sel?'#fff':'var(--muted)'};background:${sel?'#f59e0b':'transparent'}">${i}</div>`
    row.forEach((v,j)=>{h+=i===j?cell(1,'#ede9fe','#6d28d9',ring):v?cell(1,'#dbeafe','#1d4ed8',ring):cell(0,'var(--surface)','#9ca3af','border:1px solid var(--border);'+ring)})
  })
  g.innerHTML=h
  const d=$('gm-row-disp'); if(!d) return
  const more=gmClicked.size<2?`<br><span style="color:var(--muted)">Click ${2-gmClicked.size} more node${gmClicked.size===1?'':'s'} to unlock the question.</span>`:''
  if(gmSel<0){d.className='guidance-box cold';d.innerHTML=`<span style="color:#6d28d9;font-weight:700">Purple</span> = self-loop (on the diagonal), <span style="color:#1d4ed8;font-weight:700">blue</span> = edge, 0 = not connected.${more}`}
  else {
    const nb=GM_NBR[gmSel].filter(j=>j!==gmSel)
    d.className='guidance-box hot'
    d.innerHTML=`Row ${gmSel} of A* is [${GM_A[gmSel].join(', ')}]: node ${gmSel} will average its own value and its neighbours ${nb.join(', ')} — ${GM_NBR[gmSel].length} values.${more}`
  }
}
function gmSelectNode(i){
  gmSel=i; gmClicked.add(i)
  gmDrawGraph('gm-svg'); gmRenderAdj()
  if(gmClicked.size>=2){const q=$('gm-s1q');if(q)q.classList.add('unlocked')}
}

// ── Stage 2: one layer ──
function gmAnimate(){
  if(gmAnimTimer) return
  const disp=$('gm-step-disp'); if(!disp) return
  const order=[1,3,4]; let k=0
  gmDone=new Set(); disp.innerHTML=''
  const step=()=>{
    if(k===order.length){
      gmAnimTimer=null; gmHL=-1; gmDrawGraph('gm-svg2')
      disp.innerHTML+='<div style="color:var(--blue);font-weight:700">Your turn: nodes 0 and 2, below.</div>'
      return
    }
    const i=order[k++], js=GM_NBR[i], v=GM_NEW[i]
    gmHL=i; gmDone.add(i); gmDrawGraph('gm-svg2')
    disp.innerHTML+=`<div>node ${i}: (${js.map(j=>`h[${j}]`).join('+')}) / ${js.length} = (${js.map(j=>GM_H[j]).join('+')}) / ${js.length} ${Number.isInteger(v*100)?'=':'≈'} <strong>${gmFmt(v)}</strong></div>`
    gmAnimTimer=setTimeout(step,900)
  }
  step()
}
function gmCheckFill(){
  const res=[[0,'gm-f0'],[2,'gm-f2']].map(([i,id])=>{
    const el=$(id), v=c9Num(el.value)
    if(v===null){el.className='rr-inp';return null}
    const ok=Math.abs(v-GM_NEW[i])<0.01
    el.className='rr-inp'+(ok?' ok':' bad')
    if(!ok) gmFillTries[i]++
    return ok?true:i
  })
  gmFillOk=res.every(r=>r===true)
  const hint=$('gm-fill-hint')
  if(gmFillOk){
    hint.className='guidance-box done';hint.innerHTML='<strong>✓ Correct!</strong> Node 0 averages h[0], h[1], h[2], h[4]: (4+1+3+2)/4 = 2.5. Node 2 averages h[0], h[1], h[2], h[3]: (4+1+3+0)/4 = 2. Every node follows the same rule.'
    const q=$('gm-s2q'); if(q) q.classList.add('unlocked')
  } else {
    const bad=res.filter(r=>typeof r==='number')
    if(bad.length){
      const i=bad[0]
      hint.className='guidance-box warm'
      hint.innerHTML=gmFillTries[i]<=1?`<strong>Not quite (node ${i}).</strong> Which columns of row ${i} in A* hold a 1? Average the h values of those nodes.`
        :`<strong>Not quite (node ${i}).</strong> Row ${i} of A* is [${GM_A[i].join(', ')}], so average h[${GM_NBR[i].join('], h[')}] = ${GM_NBR[i].map(j=>GM_H[j]).join(', ')}.`
    }
  }
  gmDrawGraph('gm-svg2')
  gmCheckDone()
}

// ── Stage 3: the learned part ──
function gmLearnUpdate(){
  const W=parseFloat(($('gm-W')||{value:1}).value), b=parseFloat(($('gm-b')||{value:0}).value)
  const wv=$('gm-W-val'); if(wv) wv.textContent=c9n(W)
  const bv=$('gm-b-val'); if(bv) bv.textContent=c9n(b)
  const rows=GM_NEW.map((a,i)=>{const z=W*a+b; return {i,a,z,o:Math.max(0,z)}}), fire=rows.filter(r=>r.o>1e-9).map(r=>r.i)
  const t=$('gm-learn-table')
  if(t) t.innerHTML=`<table class="contrib-table"><thead><tr><th>node</th><th style="text-transform:none">average</th><th style="text-transform:none">W·average + b</th><th style="text-transform:none">h′ = ReLU(…)</th></tr></thead><tbody>${rows.map(r=>`<tr style="${r.o>1e-9?'background:#dcfce7':''}"><td>${r.i}</td><td>${gmFmt(r.a)}</td><td>${c9n(r.z)}</td><td style="font-weight:800;color:${r.o>1e-9?'#15803d':'var(--muted)'}">${c9n(r.o)}${r.o>1e-9?' 🔥':''}</td></tr>`).join('')}</tbody></table>`
  const h=$('gm-learn-hint'); if(!h) return
  if(fire.length===1&&fire[0]===3){
    gmLearnOk=true
    h.className='guidance-box done';h.innerHTML=`<strong>✓ Only node 3 fires.</strong> With W = ${c9n(W)} < 0, a <em>low</em> neighbourhood average gives the highest output, and b = ${c9n(b)} sets the threshold. Training adjusts W and b like this so that the layer responds to useful patterns.`
  } else if(!fire.length){
    h.className='guidance-box cold';h.innerHTML='No node fires: every W·average + b is ≤ 0, so ReLU outputs 0. Raise b, or change W.'
  } else if(!fire.includes(3)){
    h.className='guidance-box warm';h.innerHTML=`Nodes ${fire.join(', ')} fire, but not node 3. Node 3 has the <em>smallest</em> average (1.67). With W > 0, a small average can never come out on top.`
  } else {
    h.className='guidance-box warm';h.innerHTML=`Nodes ${fire.join(', ')} fire. Node 3 has the smallest average, so you need the smallest average to give the largest output, and a threshold b that only node 3 clears.`
  }
  gmCheckDone()
}

// ── Stage 4: stacking layers ──
function gmShowLayer(L){
  gmLayer=L; gmLayersSeen.add(L)
  document.querySelectorAll('.gm-layer-btn').forEach(b=>b.classList.toggle('active',+b.dataset.v===L))
  gmDrawGraph('gm-svg3')
  const vals=GM_LAYERS[L], lo=Math.min(...vals), hi=Math.max(...vals), reach=[...gmReach(3,L)].sort((a,b)=>a-b)
  const info=$('gm-layer-info')
  if(info){info.className='guidance-box hot';info.innerHTML=`<strong>${L===0?'Input values.':`After ${L} layer${L>1?'s':''}`}</strong> ${L===0?'Node 3 knows only its own value.':`node 3's value mixes information from node${reach.length>1?'s':''} ${reach.join(', ')}.`}<br>Spread (largest − smallest value): <strong>${gmFmt(hi-lo)}</strong>`}
  const svg=$('gm-line-svg')
  if(svg){
    // One row per node, so the labels stay readable when the values bunch together.
    const X=v=>48+v/4*290, Y=i=>12+i*14
    let h=`<rect x="${X(lo)-7}" y="4" width="${Math.max(14,X(hi)-X(lo)+14)}" height="64" rx="6" fill="#fed7aa" opacity="0.55"/>`
    h+=`<line x1="${X(0)}" y1="80" x2="${X(4)}" y2="80" stroke="#9ca3af" stroke-width="1.5"/>`
    ;[0,1,2,3,4].forEach(t=>{h+=`<line x1="${X(t)}" y1="76" x2="${X(t)}" y2="84" stroke="#9ca3af"/><text x="${X(t)}" y="98" text-anchor="middle" font-size="11" fill="#5c4a3a">${t}</text>`})
    vals.forEach((v,i)=>{
      h+=`<text x="2" y="${Y(i)+4}" font-size="11" font-weight="700" fill="${i===3?'#c2410c':'#5c4a3a'}">node ${i}</text><line x1="${X(0)}" y1="${Y(i)}" x2="${X(4)}" y2="${Y(i)}" stroke="#eee6da"/><circle cx="${X(v)}" cy="${Y(i)}" r="5" fill="${i===3?'#ea580c':'#3b82f6'}"/>`
    })
    svg.innerHTML=h
  }
  const tb=$('gm-layer-table')
  if(tb) tb.innerHTML=`<table class="contrib-table"><thead><tr><th>node</th>${[0,1,2,3].map(l=>`<th style="text-transform:none;${l===L?'color:#c2410c':''}">h⁽${'⁰¹²³'[l]}⁾</th>`).join('')}</tr></thead><tbody>${GM_H.map((_,i)=>`<tr><td>${i}</td>${[0,1,2,3].map(l=>`<td style="${l===L?'font-weight:800;color:#c2410c':''}">${gmFmt(GM_LAYERS[l][i])}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  if(gmLayersSeen.has(1)&&gmLayersSeen.has(2)){const q=$('gm-s4q');if(q)q.classList.add('unlocked')}
}

function gmMCQ(q,i){ gmQ[q]=c9Answer('gm',q,i,GM_QS[q]); gmCheckDone() }
function gmCheckDone(){
  if(gmQ[1]===true) gmUnlock(2)
  if(gmFillOk&&gmQ[2]===true) gmUnlock(3)
  if(gmLearnOk) gmUnlock(4)
  if(gmQ[3]===true&&gmQ[4]===true) gmUnlock(5)
  const done=isComplete('gcmech')
  if(done) gmUnlock(6)
  updateBadge('gm-completed',done)
}

function initGCMech(){
  const eq=$('gm-prob-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#b45309">$$h_i'=\\text{ReLU}\\Big(W\\cdot\\frac{1}{d_i}\\sum_{j\\,:\\,A^*_{ij}=1}h_j\\;+\\;b\\Big)$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500"><strong style="color:var(--text)">Average node i's neighbourhood (itself included), scale by the learned weight W, add the learned bias b, apply ReLU.</strong></div>
      </div>
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#6d28d9">$$A^*=A+I\\qquad d_i=\\sum_j A^*_{ij}$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">A has a 1 wherever two nodes are connected; adding the identity I gives every node a self-loop; d<sub>i</sub> counts the values being averaged.</div>
      </div>
      <div style="padding:14px 20px;text-align:center;font-size:14px;color:var(--muted);line-height:1.8;font-weight:500">
        <strong style="color:var(--text)">Variants you will meet:</strong> the course formula h = f(W·h·A* + b) <em>sums</em> the neighbourhood instead of averaging (9.GC.2 uses it); Kipf &amp; Welling's GCN uses the symmetric average D<sup>−½</sup>A*D<sup>−½</sup>. All aggregate the neighbourhood and then apply shared weights. Here each node holds one number, so W and b are numbers; with feature vectors, W becomes a matrix.
      </div>
    </div>`
    typeset(eq)
  }
  gmDrawGraph('gm-svg'); gmDrawGraph('gm-svg2'); gmRenderAdj()
  ;[1,2,3,4,5,6].forEach(q=>c9RenderMCQ('gm',q,GM_QS[q]))
  gmCheckDone()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 9.GC.2 — CAN GRAPH CONV REPLACE IMAGE CONV?
// ══════════════════════════════════════════════════
let geStage=0, geRow=[0,0,0,0,0,0,0,0,0], geRowOk=false, geWTried=new Set(), geStencil=[[1,1,1],[1,1,1],[1,1,1]], geStencilOk=false
let geQ={1:null,2:null,3:null,4:null,5:null,6:null,7:null}
// 3×3 image as a graph: pixel r*3+c, edges = 8-neighbourhood (king moves)
const GE_EDGES=[]
for(let a=0;a<9;a++) for(let b=a+1;b<9;b++) if(Math.abs(Math.floor(a/3)-Math.floor(b/3))<=1&&Math.abs(a%3-b%3)<=1) GE_EDGES.push([a,b])
const GE_A=Array.from({length:9},(_,i)=>Array.from({length:9},(_,j)=>i===j||GE_EDGES.some(([a,b])=>(a===i&&b===j)||(a===j&&b===i))?1:0))
const GE_EDGE_K=[[1,0,-1],[1,0,-1],[1,0,-1]]
const GE_IMG=Array.from({length:7},()=>[0,0,1,1,1,0,0])
const GE_QS={
  1:{q:'Pixel 1 sits directly above pixel 4. What does A* record about these two pixels?',
     ok:'A*[1][4] = A*[4][1] = 1 — the same 1 as for a sideways or diagonal neighbour. The 0/1 adjacency stores <em>who</em> is connected, never <em>where</em>. Keep that in mind for the next stage.',
     opts:[
       {t:'That pixel 1 is above pixel 4',h:'A* holds only 0s and 1s. A 1 means "connected" — the same 1 for every direction.'},
       {t:'Only that the two are connected',c:true},
       {t:'The brightness of both pixels',h:'Pixel values live in h, not in A*.'},
       {t:'Nothing: they are not neighbours',h:'Pixels 1 and 4 touch vertically, so A*[1][4] = 1.'}
     ]},
  2:{q:'Which 3×3 kernel <em>can</em> the GCN with the 0/1 A* and one W reproduce?',
     ok:'With 0/1 adjacency, every neighbour and the pixel itself get the same coefficient W, so the GCN computes W × (sum of the 3×3 patch) — the Box kernel from 9.1. It can blur, but never detect an edge.',
     opts:[
       {t:'A box blur: all nine weights equal',c:true},
       {t:'The vertical-edge kernel [[1,0,−1],…]',h:'It needs +1 on the left and −1 on the right, but A* gives left and right neighbours the same 1.'},
       {t:'Any kernel, given a large enough W',h:'W scales every neighbour by the same factor; it never makes them differ.'},
       {t:'K = [[1,2,3],[4,5,6],[7,8,9]]',h:'K has nine different weights; one W gives only one.'}
     ]},
  3:{q:'To match the convolution, what did you have to put into A?',
     ok:'A[j][i] = the kernel weight for j\'s position relative to i, and W = 1: then h·A is exactly the convolution. So the answer to the problem is <strong>yes, for one channel</strong> — but A is now the kernel written in by hand. It is directed (A[j][i] ≠ A[i][j]: the left neighbour gets 1, the right one −1), it only makes sense on a pixel grid, and it no longer just describes who is connected.',
     opts:[
       {t:'A 1 for every neighbour, just as before',h:'That is the 0/1 A* from Stage 2, which only blurs.'},
       {t:'The pixel values of the image',h:'Pixel values are in h; A says how pixels are combined.'},
       {t:'The kernel weight for each position',c:true},
       {t:'The convolution\'s output map',h:'A is fixed before any image arrives; the output comes from h·A.'}
     ]},
  4:{q:'One input channel, two output channels: channel 1 should detect vertical edges, channel 2 should blur. Can one weighted A plus a W with two rows do it?',
     ok:'h′[o] = W[o]·(h·A): every output channel gets the same spatial pattern A, only scaled. A real conv layer has a different 3×3 pattern for every (output, input) channel pair, which one A cannot provide.',
     opts:[
       {t:'Yes — W gives each output its own row',h:'Each row of W only rescales: both outputs get W[o]·(h·A), the same pattern A times a number.'},
       {t:'Yes — if A is made symmetric',h:'A symmetric A gives the left and right neighbours the same weight, so it cannot even make the vertical-edge kernel, and both outputs would still share its pattern.'},
       {t:'No — both outputs share A\'s pattern',c:true},
       {t:'Only with zero padding added',h:'Padding only affects the border, not the pattern each output uses.'}
     ]},
  5:{q:'What change gives every (output channel, input channel, position) its own weight?',
     ok:'With h′ = Σ<sub>k</sub> W<sub>k</sub>·h·A<sub>k</sub>, the 0/1 matrix A<sub>k</sub> picks "my neighbour at position k" and W<sub>k</sub>[o][c] is the weight for that position and channel pair — exactly a conv layer, with A<sub>k</sub> fixed and W<sub>k</sub> learned.',
     opts:[
       {t:'A larger W for the one shared A',h:'One A still means one spatial pattern for every channel pair.'},
       {t:'Normalising A* by node degree',h:'Normalising changes weights by node degree (corner vs. edge pixels), never by left vs. right.'},
       {t:'One A<sub>k</sub> and W<sub>k</sub> per position k',c:true},
       {t:'Removing the self-loops from A*',h:'Without self-loops a pixel ignores itself; its neighbours still share one weight.'}
     ]},
  6:{q:'A molecule\'s atoms are stored as a list. You shuffle the list (and A* with it). What happens to a GCN layer\'s outputs?',
     ok:'Each atom\'s aggregation ignores order, so the outputs simply follow the atoms: shuffle in, shuffle out — <strong>permutation equivariance</strong>, the graph counterpart of translation equivariance in 9.1. Exactly right for graphs, whose nodes have no natural order.',
     opts:[
       {t:'Same outputs, shuffled the same way',c:true},
       {t:'A completely different set of outputs',h:'Each atom still averages the same neighbours with the same W; only its place in the list moved.'},
       {t:'Same outputs, in the original order',h:'Each output belongs to its atom, so it moves with the atom.'},
       {t:'An error, since the order changed',h:'Nothing in the layer depends on list positions.'}
     ]},
  7:{q:'With the problem\'s <em>sum</em> rule h = f(W·h·A* + b), one user has 3 friends and another has 300. What goes wrong?',
     ok:'The same W then sees inputs of wildly different scale, so high-degree nodes dominate. Dividing by the degree (averaging, as in 9.GC.1) or using D<sup>−½</sup>A*D<sup>−½</sup> keeps them comparable — and either way one W serves nodes of any degree.',
     opts:[
       {t:'W needs a separate entry per friend',h:'W multiplies the aggregate, whatever the number of friends.'},
       {t:'The 300-friend sum is ~75× larger',c:true},
       {t:'The layer refuses nodes of high degree',h:'A sum works for any number of terms — it just grows with them.'},
       {t:'Nothing — sums are independent of degree',h:'With self-loops, a sum of 301 terms is roughly 75× a sum of 4.'}
     ]}
}

function geUnlock(s){
  const prev=geStage
  geStage=Math.max(geStage,s)
  c9Unlock('ge',prev,s,6)
}
function geDrawGraph(){
  const svg=$('ge-svg'); if(!svg) return
  const P=i=>[40+(i%3)*70,40+Math.floor(i/3)*70]
  const hl=geRowOk?0:-1
  let h=''
  GE_EDGES.forEach(([a,b])=>{
    const on=a===hl||b===hl, [x1,y1]=P(a), [x2,y2]=P(b)
    h+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on?'#f59e0b':'#9ca3af'}" stroke-width="${on?3:1.5}"/>`
  })
  for(let i=0;i<9;i++){
    const [x,y]=P(i), on=i===hl, nb=hl>=0&&GE_A[hl][i]&&!on
    h+=`<rect x="${x-17}" y="${y-17}" width="34" height="34" rx="5" fill="${on?'#fef9c3':nb?'#fff7ed':'#fff'}" stroke="${on?'#f59e0b':'#3b82f6'}" stroke-width="${on?3:2}"/>`
    h+=`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" font-weight="700" fill="#1a1210">${i}</text>`
  }
  svg.innerHTML=h
}

// ── Stage 1: fill in row 0 of A* ──
function geRenderAdj(){
  const g=$('ge-adj-grid'); if(!g) return
  const cell=(t,style)=>`<div style="height:30px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-family:monospace;font-weight:700;font-size:13px;${style}">${t}</div>`
  let h=cell('','')
  for(let j=0;j<9;j++) h+=cell(j,'color:var(--muted);font-size:11.5px')
  for(let i=0;i<9;i++){
    h+=cell(i,`color:${i===0?'#c2410c':'var(--muted)'};font-size:11.5px;font-weight:800`)
    for(let j=0;j<9;j++){
      if(i===0){const v=geRow[j]; h+=`<div onclick="geToggle(${j})" style="cursor:pointer;user-select:none;height:30px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-family:monospace;font-weight:800;font-size:13px;background:${v?'#dbeafe':'var(--surface)'};color:${v?'#1d4ed8':'#9ca3af'};border:2px solid #f59e0b">${v}</div>`}
      else if(!geRowOk) h+=cell('·','color:var(--border)')
      else { const v=GE_A[i][j]; h+=cell(v,`background:${i===j?'#ede9fe':v?'#dbeafe':'transparent'};color:${i===j?'#6d28d9':v?'#1d4ed8':'#cbd5e1'}`) }
    }
  }
  g.innerHTML=h
}
function geToggle(j){ if(geRowOk) return; geRow[j]=geRow[j]?0:1; geRenderAdj() }
function geCheckRow(){
  const want=GE_A[0], h=$('ge-row-hint'); if(!h) return
  const missing=want.map((v,j)=>v&&!geRow[j]?j:-1).filter(j=>j>=0), extra=geRow.map((v,j)=>v&&!want[j]?j:-1).filter(j=>j>=0)
  if(!missing.length&&!extra.length){
    geRowOk=true
    h.className='guidance-box done'; h.innerHTML='<strong>✓ Correct!</strong> Row 0 = [1, 1, 0, 1, 1, 0, 0, 0, 0]: itself, the pixel to its right (1), below (3) and diagonally (4). The full A* is now shown.'
    geRenderAdj(); geDrawGraph()
    const q=$('ge-s1q'); if(q) q.classList.add('unlocked')
  } else {
    h.className='guidance-box warm'
    h.innerHTML='<strong>Not quite.</strong> '+(missing.includes(0)?'Don\'t forget the self-loop A*[0][0].'
      :missing.includes(4)?'Pixel 4 (the centre) touches pixel 0 diagonally — a 3×3 neighbourhood includes diagonals.'
      :missing.length?`Pixel ${missing[0]} touches pixel 0. Look at the picture.`
      :`Pixel ${extra[0]} is not next to pixel 0 — it lies outside pixel 0's 3×3 neighbourhood.`)
  }
}

// ── Stage 2: 0/1 adjacency with one W ──
function geImageUpdate(){
  const w=parseFloat(($('ge-W2')||{value:1}).value)
  const v=$('ge-W2-val'); if(v) v.textContent=c9n(w)
  geWTried.add(w)
  const conv=c9Same(GE_IMG,GE_EDGE_K), gcn=c9Same(GE_IMG,[[w,w,w],[w,w,w],[w,w,w]])
  c9DrawImage('ge-img-svg',GE_IMG,26)
  c9DrawMap('ge-conv-svg',conv,{S:26})
  c9DrawMap('ge-gcn-svg',gcn,{S:26})
  const same=conv.every((row,r)=>row.every((x,c)=>x===gcn[r][c]))
  const m=$('ge-gcn-match')
  if(m){m.style.color=same?'var(--green)':'var(--red)';m.textContent=same?'✓ matches the convolution':'✗ does not match the convolution'}
  const ok=geWTried.size>=3, el=$('ge-checklist')
  if(el) el.innerHTML=`<div><span style="color:${ok?'var(--green)':'var(--muted)'};font-weight:800">${ok?'✓':'○'}</span> Try at least 3 values of W (${Math.min(geWTried.size,3)}/3)</div>`
  if(ok){const q=$('ge-s2q');if(q)q.classList.add('unlocked')}
}

// ── Stage 3: a weighted A (one weight per neighbour position) ──
function geStencilCell(i,j){ geStencil[i][j]=c9Cycle(geStencil[i][j]); geStencilUpdate() }
function geStencilUpdate(){
  c9WeightGrid('ge-stencil',geStencil,'geStencilCell',48)
  const conv=c9Same(GE_IMG,GE_EDGE_K), wa=c9Same(GE_IMG,geStencil)
  c9DrawMap('ge-conv2-svg',conv,{S:26})
  c9DrawMap('ge-wa-svg',wa,{S:26})
  const same=conv.every((row,r)=>row.every((x,c)=>x===wa[r][c]))
  if(same) geStencilOk=true
  const m=$('ge-wa-match')
  if(m){m.style.color=same?'var(--green)':'var(--red)';m.innerHTML=same?'✓ identical to the convolution':'✗ not the same yet'}
  if(geStencilOk){const q=$('ge-s3q');if(q)q.classList.add('unlocked')}
}

function geMCQ(q,i){ geQ[q]=c9Answer('ge',q,i,GE_QS[q]); geCheckDone() }
function geCheckDone(){
  if(geQ[1]===true) geUnlock(2)
  if(geQ[2]===true) geUnlock(3)
  if(geQ[3]===true) geUnlock(4)
  if(geQ[4]===true&&geQ[5]===true) geUnlock(5)
  const done=isComplete('gceq')
  if(done) geUnlock(6)
  updateBadge('ge-completed',done)
}

function initGCEq(){
  const eq=$('ge-prob-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#b45309">$$y_{r,c}=\\sum_{a=-1}^{1}\\sum_{b=-1}^{1}K[a,b]\\;x_{r+a,\\,c+b}$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500"><strong style="color:var(--text)">Convolution, centred on pixel (r, c):</strong> each of the 9 positions (a, b) around it has its own weight K[a, b]. (9.1 anchored the kernel's corner instead; it is the same operation, shifted.)</div>
      </div>
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#6d28d9">$$h_i'=f\\Big(W\\sum_{j} A^*_{ji}\\,h_j\\;+\\;b\\Big)$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500"><strong style="color:var(--text)">The problem's GCN, h = f(W·h·A* + b), for one node i.</strong> h has one column per node, so h·A* <em>sums</em> node i's neighbourhood (j ∈ neighbours(i) ∪ {i}); 9.GC.1 averaged instead and wrote the rule for one node at a time — the same computation.</div>
      </div>
      <div style="padding:14px 20px;text-align:center">
        <div style="color:#15803d;font-size:14.5px;font-weight:500">Can some choice of A* and W make the second line equal the first?</div>
      </div>
    </div>`
    typeset(eq)
  }
  geDrawGraph(); geRenderAdj(); geImageUpdate(); geStencilUpdate()
  ;[1,2,3,4,5,6,7].forEach(q=>c9RenderMCQ('ge',q,GE_QS[q]))
  geCheckDone()
}

// ══════════════════════════════════════════════════
//  10.1.1  TEXT CNN SENTIMENT WINDOW
// ══════════════════════════════════════════════════
// Questions and stages use the shared Chapter 9 helpers (c9RenderMCQ, c9Answer, c9Unlock, c9Num, …).
let tcStage=0, tcSel=0, tcFill={ab:null,c:null,d:null}, tcFillTries={ab:0,c:0,d:0}, tcRnn={sent:'C',t:0}, tcRnnDone=false
let tcQ={1:null,2:null,3:null}
const TC_SENTS=[
  {name:'A',words:['The','usually','good','dog','was','being','bad'],label:'negative'},
  {name:'B',words:['The','usually','bad','dog','was','being','good'],label:'positive'},
  {name:'C',words:['It',"wasn't",'the','case','that','he','was','unhappy'],label:'positive'}
]
const TC_LONG=['It',"wasn't",'the','case','that','after','all','of','these','years','he','was','unhappy']
// Each filter scores a window by adding the weights of the patterns it finds there.
// adj: the two words must be neighbours; otherwise both just have to be in the window, in this order.
const TC_FILTERS={
  P:[{w:['good'],s:1},{w:['happy'],s:2},{w:['being','good'],s:3,adj:true},{w:["wasn't",'unhappy'],s:5}],
  N:[{w:['bad'],s:1},{w:['unhappy'],s:2},{w:['being','bad'],s:3,adj:true}]
}
const TC_POLARITY={good:1,happy:2,bad:-1,unhappy:-2}
const TC_FILL={
  ab:{ans:2,hints:['Slide k up from 1 and watch the predictions for A and B.','At k = 1, A and B contain exactly the same words. Which pattern needs two words side by side?'],ok:'At k = 2 the windows "being bad" and "being good" appear, so the filters can tell A from B. At k = 1 both are the same bag of words — one "good", one "bad" — a tie.'},
  c:{ans:7,hints:['Pick C and slide k until its prediction turns positive.','The positive pattern needs "wasn\'t" and "unhappy" in one window: count the words from the first to the second, both included.'],ok:'The window must stretch from "wasn\'t" (word 2) to "unhappy" (word 8): 8 − 2 + 1 = 7. Below that, the negative filter sees "unhappy" alone and wins.'},
  d:{ans:12,hints:['A window that starts at "wasn\'t" must reach "unhappy". Count the words from one to the other, both included.','"wasn\'t" is word 2 and "unhappy" is word 13, so k = 13 − 2 + 1.'],ok:'k = 13 − 2 + 1 = 12. And one more word between them would need k = 13: the window is a hard limit.'}
}
const TC_QS={
  1:{q:'One conv layer would need k = 12 to read this review correctly. What is the main cost of such a wide window?',
     ok:'A filter has one weight vector per position in its window: k × d weights for d-dimensional word vectors, so k = 12 costs 6× as much as k = 2 — and a gap of 13 words would still be missed.',
     opts:[
       {t:'The review must be padded to twelve times its length',h:'Padding adds at most k − 1 positions; it does not multiply the length.'},
       {t:'Max pooling stops working once k is larger than 7',h:'Max pooling works for any k; it just keeps the largest window score.'},
       {t:'Each filter needs 6× the weights it had at k = 2',c:true},
       {t:'The filter can no longer tell which word came first',h:'A conv filter has a separate weight for each position in its window, so it still sees order inside the window.'}
     ]},
  2:{q:'Now put 49 words between "wasn\'t" and "unhappy". What must change in the recurrent rule?',
     ok:'The same rule is applied at every step and the flag simply rides along in the state, so the length of the gap does not matter. This is parameter sharing across time: one small rule for sequences of any length.',
     opts:[
       {t:'The window must grow to 51 words',h:'That is the CNN. The recurrent rule has no window — it reads one word at a time.'},
       {t:'Nothing — the same rule carries the flag',c:true},
       {t:'The state needs one number per word read',h:'The state stays two numbers however long the review is; that is what lets one rule handle any length.'},
       {t:'Each extra word needs its own new weight',h:'The same rule (the same weights) is applied at every step.'}
     ]},
  3:{q:'A CNN can also see far by stacking layers. With k = 2 in every layer, how many layers does one output need to see 51 consecutive words?',
     ok:'L stacked k = 2 layers see L + 1 words, so 50 layers. Dilated convolutions (the gap doubles each layer) need only about 6, since 2⁶ = 64 ≥ 51. A CNN pays in width or depth to reach further; an RNN reuses one rule along the whole sequence.',
     opts:[
       {t:'25',h:'Each k = 2 layer widens the view by one word, not two: one layer sees 2 words, two layers see 3.'},
       {t:'50',c:true},
       {t:'51',h:'One layer already sees 2 words, so L layers see L + 1 words.'},
       {t:'6',h:'That is what dilated convolutions achieve, doubling the gap each layer (2⁶ = 64 ≥ 51). Plain k = 2 layers grow by one word per layer.'}
     ]}
}

function tcUnlock(s){ const prev=tcStage; tcStage=Math.max(tcStage,s); c9Unlock('tc',prev,s,4) }
function tcWinScore(win,pats){
  return pats.reduce((s,p)=>{
    if(p.w.length===1) return s+win.filter(x=>x===p.w[0]).length*p.s
    if(p.adj){ let c=0; for(let i=0;i+1<win.length;i++) if(win[i]===p.w[0]&&win[i+1]===p.w[1]) c++; return s+c*p.s }
    const a=win.indexOf(p.w[0]), b=win.lastIndexOf(p.w[1]); return s+(a>=0&&b>a?p.s:0)
  },0)
}
// Score every window, max-pool each filter, and compare the pooled scores.
function tcClassify(words,k){
  const wins=[]
  for(let i=0;i+k<=words.length;i++){const w=words.slice(i,i+k); wins.push({i,w,P:tcWinScore(w,TC_FILTERS.P),N:tcWinScore(w,TC_FILTERS.N)})}
  const P=Math.max(0,...wins.map(x=>x.P)), N=Math.max(0,...wins.map(x=>x.N))
  return {wins,P,N,pred:!wins.length?'—':P>N?'positive':N>P?'negative':'undecided'}
}
function tcSentence(i){ tcSel=i; tcUpdate() }
function tcUpdate(){
  const s=TC_SENTS[tcSel], sl=$('tc-k'); if(!sl) return
  sl.max=s.words.length; if(+sl.value>s.words.length) sl.value=s.words.length
  const k=+sl.value, r=tcClassify(s.words,k)
  $('tc-k-val').textContent=k
  document.querySelectorAll('.tc-sent-btn').forEach(b=>b.classList.toggle('active',+b.dataset.v===tcSel))
  $('tc-sentence').innerHTML=`${s.name}: ${s.words.join(' ')} <span style="font-weight:500;color:var(--muted);font-size:13px">(true label: ${s.label})</span>`
  $('tc-windows').innerHTML=r.wins.map(x=>{
    const bestP=x.P>0&&x.P===r.P, bestN=x.N>0&&x.N===r.N
    return `<span style="padding:4px 9px;border-radius:7px;font-family:'Courier New',monospace;font-size:13px;background:var(--surface);border:2px solid ${bestP&&bestN?'#7c3aed':bestP?'#1d4ed8':bestN?'#b91c1c':'var(--border)'}">${x.w.join(' ')} <span style="color:#1d4ed8;font-weight:700">P${x.P}</span> <span style="color:#b91c1c;font-weight:700">N${x.N}</span></span>`
  }).join('')
  $('tc-pool').innerHTML=`<div class="alg-step">pooled P = max over windows = <strong style="color:#1d4ed8">${r.P}</strong></div><div class="alg-step">pooled N = max over windows = <strong style="color:#b91c1c">${r.N}</strong></div><div class="alg-res">prediction: ${r.pred} ${r.pred===s.label?'<span style="color:var(--green)">✓</span>':'<span style="color:var(--red)">✗</span>'}</div>`
  $('tc-preds').innerHTML=`<table class="contrib-table"><thead><tr><th>sentence</th><th>true label</th><th style="text-transform:none">prediction at k = ${k}</th></tr></thead><tbody>${TC_SENTS.map(t=>{const p=k>t.words.length?'— (k > length)':tcClassify(t.words,k).pred;return `<tr><td>${t.name}</td><td>${t.label}</td><td style="font-weight:700;color:${p===t.label?'var(--green)':'var(--red)'}">${p}</td></tr>`}).join('')}</tbody></table>`
}
function tcCheckFill(key){
  const inp=$(`tc-f-${key}`), h=$(`tc-f-${key}-hint`), v=c9Num(inp.value); if(v===null) return
  const F=TC_FILL[key], ok=v===F.ans
  tcFill[key]=ok; if(!ok) tcFillTries[key]++
  inp.className='rr-inp '+(ok?'ok':'bad')
  h.className='guidance-box '+(ok?'done':'warm')
  h.innerHTML=ok?`<strong>✓ Correct!</strong> ${F.ok}`:`<strong>Not quite.</strong> ${F.hints[Math.min(tcFillTries[key],F.hints.length)-1]}`
  tcCheckDone()
}
// ── Stage 3: a hand-set recurrent reader ──
function tcRnnWords(){ return tcRnn.sent==='C'?TC_SENTS[2].words:TC_LONG }
function tcRnnSentence(s){ tcRnn={sent:s,t:0}; tcRnnRender() }
function tcRnnReset(){ tcRnn.t=0; tcRnnRender() }
function tcRnnStep(){ if(tcRnn.t<tcRnnWords().length) tcRnn.t++; tcRnnRender() }
function tcRnnRender(){
  document.querySelectorAll('.tc-rnn-btn').forEach(b=>b.classList.toggle('active',b.dataset.v===tcRnn.sent))
  const words=tcRnnWords(), rows=[]
  let n=0, s=0
  for(let t=0;t<tcRnn.t;t++){
    const w=words[t]
    if(w==="wasn't") n=1
    s+=(1-2*n)*(TC_POLARITY[w]||0)
    rows.push(`<tr><td>${t+1}</td><td>${w}</td><td>${n}</td><td>${s}</td></tr>`)
  }
  const el=$('tc-rnn-trace')
  if(el) el.innerHTML=`<table class="contrib-table"><thead><tr><th>t</th><th>word</th><th>n</th><th>s</th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="4" style="color:var(--muted)">Press "Next word" to start reading.</td></tr>'}</tbody></table>`
  const m=$('tc-rnn-msg'); if(!m) return
  if(tcRnn.t===words.length){
    if(tcRnn.sent==='D') tcRnnDone=true
    m.className='guidance-box done'
    m.innerHTML=`Final s = ${s} &gt; 0 → <strong>positive ✓</strong>. The flag set by "wasn't" rode along for ${words.indexOf('unhappy')-words.indexOf("wasn't")-1} words, using the same rule at every step.`
  } else {
    m.className='guidance-box cold'
    m.innerHTML=tcRnnDone?'Read either review again if you like.':'Read <strong>the longer review</strong> to the end.'
  }
  if(tcRnnDone){const q=$('tc-s3q');if(q)q.classList.add('unlocked')}
  tcCheckDone()
}
function tcMCQ(q,i){ tcQ[q]=c9Answer('tc',q,i,TC_QS[q]); tcCheckDone() }
function tcCheckDone(){
  if(tcFill.ab===true&&tcFill.c===true) tcUnlock(2)
  if(tcStage>=2&&tcFill.d===true&&tcQ[1]===true) tcUnlock(3)
  if(tcQ[2]===true&&tcQ[3]===true) tcUnlock(4)
  updateBadge('tcnn-completed',isComplete('textcnn'))
}
function initTextCNN(){
  const eq=$('tc-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:14px 20px;text-align:center">
      <div style="color:#b45309">$$s_i=\\text{score}(w_i,\\,w_{i+1},\\dots,w_{i+k-1}),\\qquad \\text{pooled}=\\max_i\\,s_i$$</div>
      <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">Each filter scores every window of k consecutive words; max pooling keeps its best score anywhere in the review. The label is positive when the positive filter's pooled score beats the negative filter's.</div>
    </div>`
    typeset(eq)
  }
  tcSentence(0); tcRnnRender()
  ;[1,2,3].forEach(q=>c9RenderMCQ('tc',q,TC_QS[q]))
  tcCheckDone()
}

// ══════════════════════════════════════════════════
//  10.1.2  RNN FORWARD PASS
// ══════════════════════════════════════════════════
let rfStage=0, rfOk={1:false,2:false}, rfTries={1:0,2:0}, rfRun={2:false,3:false}, rfRunTries={2:0,3:0}
let rfQ={1:null,2:null,3:null}
const RF_W=[[1,2],[0,-1]], RF_U=[[0,1],[2,-5]]
const rfMv=(M,v)=>M.map(r=>r[0]*v[0]+r[1]*v[1])
// One step of h⁽ᵗ⁾ = ReLU(W·h⁽ᵗ⁻¹⁾ + U·x⁽ᵗ⁾)
function rfStep(h,x){ const a=rfMv(RF_W,h).map((v,i)=>v+rfMv(RF_U,x)[i]); return {a,h:a.map(v=>Math.max(0,v))} }
function rfRun2(x1,x2){ const s1=rfStep([0,0],x1), s2=rfStep(s1.h,x2); return {a1:s1.a,h1:s1.h,a2:s2.a,h2:s2.h} }
const RF_MAIN=rfRun2([1,0],[0,1]), RF_SWAP=rfRun2([0,1],[1,0]), RF_EMPTY=rfRun2([0,0],[0,1])
const RF_QS={
  1:{q:'Runs 1 and 3 have the same x⁽²⁾ = [0, 1], yet h⁽²⁾ is [5, 0] in one and [1, 0] in the other. Why?',
     ok:'The only way x⁽¹⁾ reaches step 2 is through h⁽¹⁾ and W — that is the memory. Run 2 shows the same from another angle: the same two inputs in the other order give [1, 2]. Unlike the k = 1 bag of words in 10.1.1, an RNN sees order across the whole sequence.',
     opts:[
       {t:'Their h⁽¹⁾ differs, and W carries it into step 2',c:true},
       {t:'U changes between runs to fit the new input',h:'W and U are fixed numbers; they are the same in every run and at every step.'},
       {t:'ReLU behaves randomly when inputs are zero',h:'ReLU is deterministic: max(0, a).'},
       {t:'Step 2 also sees x⁽¹⁾ directly through U',h:'U only multiplies the current input x⁽²⁾. The only route from x⁽¹⁾ to step 2 is through h⁽¹⁾ and W.'}
     ]},
  2:{q:'Unroll this RNN for 100 steps. How many numbers does it learn (W and U, no biases)?',
     ok:'W and U (2×2 each) are reused at every step: 8 numbers whether the sequence has 2 steps or 100. This is parameter sharing across time — the RNN counterpart of a conv kernel shared across space.',
     opts:[
       {t:'8',c:true},
       {t:'16',h:'That counts W and U twice. They are the same two matrices at every step.'},
       {t:'400',h:'That is 4 numbers × 100 steps, as if W were new at every step.'},
       {t:'800',h:'That is (4 + 4) × 100, but the matrices are shared across steps.'}
     ]},
  3:{q:'h⁽²⁾\'s second component is 0 after ReLU. What happens to it at step 3?',
     ok:'At step 3 that component contributes 0 to W·h⁽²⁾, so for now it carries nothing forward. But it gets a fresh pre-activation from W·h⁽²⁾ + U·x⁽³⁾, so a later input can switch it back on.',
     opts:[
       {t:'It is gone for good and can never turn on',h:'At step 3 it gets a fresh pre-activation W·h⁽²⁾ + U·x⁽³⁾; if that is positive, it turns on again.'},
       {t:'It resets the whole hidden state to zero',h:'Only that one component is 0; the first component (5) still carries information.'},
       {t:'It signals that the arithmetic overflowed',h:'A 0 from ReLU is normal: the pre-activation was negative (−7).'},
       {t:'It adds nothing now, but may turn on later',c:true}
     ]}
}
const RF_HINTS={
  1:['W·h⁽⁰⁾ = [0, 0], so a⁽¹⁾ = U·x⁽¹⁾: row i of U times x⁽¹⁾. Then ReLU replaces negative entries by 0.','x⁽¹⁾ = [1, 0] picks out the first column of U.'],
  2:['a⁽²⁾ has two parts: the memory term W·h⁽¹⁾ and the input term U·x⁽²⁾. Compute each, then add.','W·h⁽¹⁾ = [1·0 + 2·2, 0·0 + (−1)·2] and U·x⁽²⁾ = [0·0 + 1·1, 2·0 + (−5)·1].']
}
const RF_RUNS={
  2:{want:RF_SWAP.h2,hints:['Start from h⁽⁰⁾ = 0: h⁽¹⁾ = ReLU(U·[0, 1]), then h⁽²⁾ = ReLU(W·h⁽¹⁾ + U·[1, 0]).','h⁽¹⁾ = ReLU([1, −5]) = [1, 0]; then W·h⁽¹⁾ = [1, 0] and U·x⁽²⁾ = [0, 2].']},
  3:{want:RF_EMPTY.h2,hints:['With x⁽¹⁾ = [0, 0], h⁽¹⁾ = [0, 0], so step 2 only sees its input.','h⁽²⁾ = ReLU(U·[0, 1]) = ReLU([1, −5]).']}
}

function rfUnlock(s){ const prev=rfStage; rfStage=Math.max(rfStage,s); c9Unlock('rf',prev,s,5) }
const rfVal=id=>c9Num(($(id)||{value:''}).value)
function rfMark(id,ok){ const e=$(id); if(e) e.className='rr-inp '+(ok?'ok':'bad') }
function rfCheck(step){
  const want=step===1?{a:RF_MAIN.a1,h:RF_MAIN.h1}:{a:RF_MAIN.a2,h:RF_MAIN.h2}
  const a=[0,1].map(i=>rfVal(`rf-a${step}-${i}`)), h=[0,1].map(i=>rfVal(`rf-h${step}-${i}`))
  if([...a,...h].some(v=>v===null)) return
  const aOk=a.every((v,i)=>v===want.a[i]), hOk=h.every((v,i)=>v===want.h[i])
  a.forEach((v,i)=>rfMark(`rf-a${step}-${i}`,v===want.a[i])); h.forEach((v,i)=>rfMark(`rf-h${step}-${i}`,v===want.h[i]))
  const hint=$(`rf-s${step}-hint`)
  if(aOk&&hOk){
    rfOk[step]=true; hint.className='guidance-box done'
    hint.innerHTML=step===1?'<strong>✓ Correct!</strong> a⁽¹⁾ = [0, 2] and h⁽¹⁾ = [0, 2]. With h⁽⁰⁾ = 0, the first state is just the input seen through U.'
      :'<strong>✓ Correct!</strong> a⁽²⁾ = [4, −2] + [1, −5] = [5, −7], so h⁽²⁾ = [5, 0]. Its first entry mixes memory (4) with the new input (1).'
  } else {
    hint.className='guidance-box warm'
    if(aOk) hint.innerHTML='<strong>a is right.</strong> ReLU keeps positive entries and replaces negative ones with 0.'
    else { rfTries[step]++; hint.innerHTML=`<strong>Not quite.</strong> ${RF_HINTS[step][Math.min(rfTries[step],2)-1]}` }
  }
  rfCheckDone()
}
function rfCheckRun(n){
  const v=[0,1].map(i=>rfVal(`rf-r${n}-${i}`)); if(v.some(x=>x===null)) return
  const R=RF_RUNS[n], ok=v.every((x,i)=>x===R.want[i])
  v.forEach((x,i)=>rfMark(`rf-r${n}-${i}`,x===R.want[i]))
  const hint=$(`rf-r${n}-hint`)
  if(ok){ rfRun[n]=true; hint.className='guidance-box done'; hint.innerHTML=`<strong>✓ Correct!</strong> h⁽²⁾ = [${R.want.join(', ')}].` }
  else { rfRunTries[n]++; hint.className='guidance-box warm'; hint.innerHTML=`<strong>Not quite.</strong> ${R.hints[Math.min(rfRunTries[n],2)-1]}` }
  if(rfRun[2]&&rfRun[3]){
    const runs=[['Run 1','[1, 0]','[0, 1]',RF_MAIN.h2],['Run 2','[0, 1]','[1, 0]',RF_SWAP.h2],['Run 3','[0, 0]','[0, 1]',RF_EMPTY.h2]]
    $('rf-runs').innerHTML=`<table class="contrib-table"><thead><tr><th></th><th style="text-transform:none">x⁽¹⁾</th><th style="text-transform:none">x⁽²⁾</th><th style="text-transform:none">h⁽²⁾</th></tr></thead><tbody>${runs.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td style="font-weight:800">[${r[3].join(', ')}]</td></tr>`).join('')}</tbody></table>`
    const q=$('rf-s3q'); if(q) q.classList.add('unlocked')
  }
  rfCheckDone()
}
function rfMCQ(q,i){ rfQ[q]=c9Answer('rf',q,i,RF_QS[q]); rfCheckDone() }
function rfCheckDone(){
  if(rfOk[1]) rfUnlock(2)
  if(rfOk[2]) rfUnlock(3)
  if(rfQ[1]===true) rfUnlock(4)
  if(rfQ[2]===true&&rfQ[3]===true) rfUnlock(5)
  updateBadge('rfwd-completed',isComplete('rnnfwd'))
}
function initRNNFwd(){
  const eq=$('rf-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:14px 20px;text-align:center">
      <div style="color:#b45309">$$h^{(t)}=\\mathrm{ReLU}\\big(W\\,h^{(t-1)}+U\\,x^{(t)}\\big)$$</div>
      <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500"><strong style="color:var(--text)">W carries the previous state forward and U brings in the new input; the two are added and passed through ReLU.</strong> Goodfellow's RNN (eqs. 10.8–10.9) uses tanh and adds a bias b; ReLU and b = 0 keep the arithmetic simple. (The original problem calls W and U W₁ and W₂.)</div>
    </div>`
    typeset(eq)
  }
  ;[1,2,3].forEach(q=>c9RenderMCQ('rf',q,RF_QS[q]))
  rfCheckDone()
}

// ══════════════════════════════════════════════════
//  10.2.1  RNN DESIGNER
// ══════════════════════════════════════════════════
let rdStage=0, rdQ={1:null,2:null,3:null,4:null,5:null,6:null}
let rdFeedback=true, rdSeq=[], rdTasks={greedy:false,nofb:false}
// A small "trained" decoder for the input word "rain": next-word probabilities given the previous word.
const RD_TABLE={
  '<START>':{water:.62,drops:.2,weather:.12,'<END>':.06},
  water:{falling:.55,drops:.2,from:.15,'<END>':.1},
  falling:{from:.7,water:.1,drops:.1,'<END>':.1},
  from:{clouds:.75,water:.1,the:.1,'<END>':.05},
  clouds:{'<END>':.8,falling:.1,water:.1},
  drops:{of:.5,falling:.3,'<END>':.2},
  of:{water:.6,clouds:.3,'<END>':.1},
  weather:{'<END>':.5,falling:.3,water:.2},
  the:{clouds:.7,sky:.2,'<END>':.1},
  sky:{'<END>':.8,water:.2}
}
// Without feeding back y⁽ᵗ⁻¹⁾, the decoder's distribution can only depend on the step number.
const RD_BY_STEP=[RD_TABLE['<START>'],{falling:.55,drops:.2,from:.15,'<END>':.1},{from:.7,water:.1,drops:.1,'<END>':.1},{clouds:.75,water:.1,the:.1,'<END>':.05},{'<END>':.8,falling:.1,water:.1}]
const RD_GREEDY=['water','falling','from','clouds','<END>']
const RD_QS={
  1:{q:'The vocabulary has 50,000 words. How should the input word "rain" enter the network?',
     ok:'R·x (R is a learned matrix) with a one-hot x just picks one column of R — that column is "rain"\'s learned embedding. (Writing e = E·x and then multiplying by another matrix adds nothing: two linear maps in a row are one linear map.)',
     opts:[
       {t:'As its ASCII character codes, one per letter',h:'Character codes say nothing about meaning: "rain" and "ruin" look almost the same.'},
       {t:'As a one-hot vector, times a learned matrix',c:true},
       {t:'As one number: its index in the vocabulary',h:'An index (say 31,127) suggests word 31,128 is "close" to it — an order that means nothing.'},
       {t:'As a fresh random vector on every use',h:'The network must see the same vector for the same word every time to learn anything about it.'}
     ]},
  2:{q:'Definitions can be 15 words long. Where should the input enter the decoder so that late steps still know which word is being defined?',
     ok:'Feeding R·x at every step keeps the input fresh however long the output gets. Goodfellow §10.2.4 lists three options — as h⁽⁰⁾, as an input at every step, or both. h⁽⁰⁾ alone works too, but its influence must survive many updates.',
     opts:[
       {t:'Only through the initial state h⁽⁰⁾',h:'A valid design, but the input then has to survive 15 recurrent updates — exactly where information fades (10.2.2, 10.7).'},
       {t:'Only at the final step, before &lt;END&gt;',h:'Every earlier word would be written without knowing what is being defined.'},
       {t:'As an extra input R·x at every step',c:true},
       {t:'Nowhere — the definition comes from W',h:'Then every input word would get the same definition.'}
     ]},
  3:{q:'At step 2 the decoder emitted "falling". How does step 3 find out which word was chosen?',
     ok:'The decoder feeds its previous output back in: h⁽ᵗ⁾ = tanh(b + W·h⁽ᵗ⁻¹⁾ + U·y⁽ᵗ⁻¹⁾ + R·x). Without it, h⁽ᵗ⁾ depends only on x and the step, so the emitted words cannot stay consistent with each other (Goodfellow fig. 10.9).',
     opts:[
       {t:'h⁽ᵗ⁾ already holds it, with no extra input',h:'Without feedback, h⁽ᵗ⁾ depends only on x and the step — the same whatever word was emitted. You will see this in Stage 6.'},
       {t:'The previous word y⁽ᵗ⁻¹⁾ is fed back in',c:true},
       {t:'Step 3 re-reads the input word "rain"',h:'"rain" carries no information about which word the decoder chose at step 2.'},
       {t:'The output matrix V stores every choice',h:'V is a fixed weight matrix; it does not change during generation.'}
     ]},
  4:{q:'At each step the decoder must give a probability to every one of the 50,000 words. Which output layer?',
     ok:'softmax turns the 50,000 scores into positive numbers that sum to 1 — a distribution to pick or sample from. Training maximises the probability of the correct next word (cross-entropy).',
     opts:[
       {t:'ŷ⁽ᵗ⁾ = sigmoid(V·h⁽ᵗ⁾ + c)',h:'Sigmoid gives 50,000 independent yes/no probabilities that do not sum to 1, so they cannot say "which one word comes next".'},
       {t:'ŷ⁽ᵗ⁾ = V·h⁽ᵗ⁾ + c',h:'Raw scores can be negative and do not sum to 1 — they become probabilities only after softmax.'},
       {t:'ŷ⁽ᵗ⁾ = argmax(V·h⁽ᵗ⁾ + c)',h:'argmax returns one word, not probabilities, and has no useful gradient for training.'},
       {t:'ŷ⁽ᵗ⁾ = softmax(V·h⁽ᵗ⁾ + c)',c:true}
     ]},
  5:{q:'Definitions have different lengths. How does generation stop at the right point?',
     ok:'Add an &lt;END&gt; token to the vocabulary and train the model to emit it after the last word. Goodfellow §10.2.3 lists two alternatives: an extra Bernoulli "stop now?" output at each step, or predicting the length τ first.',
     opts:[
       {t:'Always generate exactly ten words, no more',h:'Most definitions are not ten words long; they would be cut off or padded with filler.'},
       {t:'Stop when it emits a special &lt;END&gt; word',c:true},
       {t:'Stop when h⁽ᵗ⁾ no longer changes',h:'h⁽ᵗ⁾ may never settle, or settle mid-sentence; nothing ties it to the end of a definition.'},
       {t:'Stop when the softmax becomes uniform',h:'A uniform distribution means "no idea", not "finished".'}
     ]},
  6:{q:'During training on the definition "water falling from clouds", what is fed back as y⁽ᵗ⁻¹⁾ at step 3?',
     ok:'This is <strong>teacher forcing</strong> (Goodfellow §10.2.1): in training, the true previous word is fed back, so every step learns from the right context. At generation time there is no true word, so the model\'s own choices are fed back — a mismatch that can let early mistakes snowball.',
     opts:[
       {t:'Whatever word the model itself picked at step 2',h:'That is what happens when generating. In training, the true previous word is available and is fed back instead.'},
       {t:'The true word "falling" from the training text',c:true},
       {t:'Nothing — feedback is only used after training',h:'The model must learn to use y⁽ᵗ⁻¹⁾, so it is fed during training too.'},
       {t:'The input word "rain" one more time',h:'"rain" enters through R·x; y⁽ᵗ⁻¹⁾ is the previous word of the definition.'}
     ]}
}

function rdUnlock(s){ const prev=rdStage; rdStage=Math.max(rdStage,s); c9Unlock('rd',prev,s,7); if(s>=6&&prev<6) rdRender() }
function rdMCQ(q,i){ rdQ[q]=c9Answer('rd',q,i,RD_QS[q]); rdCheckDone() }
const rdEsc=w=>w.replace('<','&lt;').replace('>','&gt;')
function rdDist(){ return rdFeedback?RD_TABLE[rdSeq.length?rdSeq[rdSeq.length-1]:'<START>']:RD_BY_STEP[Math.min(rdSeq.length,RD_BY_STEP.length-1)] }
function rdSetFeedback(on){ rdFeedback=on; rdSeq=[]; rdRender() }
function rdRestart(){ rdSeq=[]; rdRender() }
function rdPick(w){
  if(rdSeq[rdSeq.length-1]==='<END>'||rdSeq.length>=8) return
  rdSeq.push(w)
  const done=w==='<END>'||rdSeq.length>=8, m=$('rd-gen-msg')
  if(done&&m){
    if(rdFeedback&&rdSeq.join(' ')===RD_GREEDY.join(' ')){
      rdTasks.greedy=true; m.className='guidance-box done'
      m.innerHTML='<strong>✓ Greedy decoding:</strong> "water falling from clouds". At each step you took the most probable word, and each choice changed the next distribution.'
    } else if(!rdFeedback&&rdSeq.join(' ')===['weather',...RD_GREEDY.slice(1)].join(' ')){
      rdTasks.nofb=true; m.className='guidance-box done'
      m.innerHTML=`<strong>See the problem?</strong> Without feedback the decoder continued "${rdSeq.slice(1).map(rdEsc).join(' ')}" as if it had said "water". With feedback on, after "weather" its top choice is &lt;END&gt; (0.5) — it adapts to what it actually wrote.`
    } else {
      const k=rdSeq.findIndex((x,j)=>x!==RD_GREEDY[j])
      m.className='guidance-box warm'
      m.innerHTML=rdFeedback&&k>=0?`A valid sample, but not the greedy one: at step ${k+1} you chose "${rdEsc(rdSeq[k])}" over a more probable word. Restart to follow the top word each time.`:!rdFeedback?'With feedback off, start with "weather", then click the most probable word at each step and watch what the decoder writes next.':'Finished. Check the tasks below.'
    }
  }
  rdRender()
}
function rdRender(){
  document.querySelectorAll('.rd-fb-btn').forEach(b=>b.classList.toggle('active',(b.dataset.v==='on')===rdFeedback))
  const arch=$('rd-arch')
  if(arch) arch.innerHTML='input: x = one-hot("rain"), so R·x is its embedding<br>state: h⁽ᵗ⁾ = tanh(b + W·h⁽ᵗ⁻¹⁾ + U·y⁽ᵗ⁻¹⁾ + R·x), &nbsp;h⁽⁰⁾ = 0, &nbsp;y⁽⁰⁾ = &lt;START&gt;<br>output: ŷ⁽ᵗ⁾ = softmax(V·h⁽ᵗ⁾ + c)<br>stop: when the emitted word is &lt;END&gt;'
  const out=$('rd-gen-out'); if(out) out.innerHTML=rdSeq.length?rdSeq.map(w=>`<span style="padding:3px 9px;margin-right:4px;border-radius:6px;background:${w==='<END>'?'#ede9fe':'#eff6ff'};border:1px solid var(--border)">${rdEsc(w)}</span>`).join(''):'<span style="color:var(--muted);font-weight:500">nothing emitted yet</span>'
  const opts=$('rd-gen-opts'), finished=rdSeq[rdSeq.length-1]==='<END>'||rdSeq.length>=8
  if(opts) opts.innerHTML=finished?'':Object.entries(rdDist()).sort((a,b)=>b[1]-a[1]).map(([w,p])=>`<div onclick="rdPick('${w}')" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:6px 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface)"><span style="width:70px;font-family:'Courier New',monospace;font-weight:700">${rdEsc(w)}</span><span style="flex:1;height:10px;background:var(--surf2);border-radius:5px;overflow:hidden"><span style="display:block;height:100%;width:${p*100}%;background:#3b82f6"></span></span><span style="width:40px;text-align:right;font-family:monospace">${p.toFixed(2)}</span></div>`).join('')
  if(!rdSeq.length){const m=$('rd-gen-msg'); if(m){m.className='guidance-box cold'; m.innerHTML=`Step 1: the softmax over the first word${rdFeedback?'':' (feedback is off)'}. Click a word.`}}
  else if(!finished){const m=$('rd-gen-msg'); if(m){m.className='guidance-box cold'; m.innerHTML=`Step ${rdSeq.length+1}: ${rdFeedback?`the distribution now depends on the previous word "${rdEsc(rdSeq[rdSeq.length-1])}"`:'without feedback, this depends only on the step number'}.`}}
  const items=[[rdTasks.greedy,'With feedback <strong>on</strong>, generate the greedy definition (always click the most probable word)'],[rdTasks.nofb,'Turn feedback <strong>off</strong>, start with "weather" (not the top word), then keep clicking the most probable word']]
  const cl=$('rd-checklist'); if(cl) cl.innerHTML=items.map(([ok,t])=>`<div><span style="color:${ok?'var(--green)':'var(--muted)'};font-weight:800">${ok?'✓':'○'}</span> ${t}</div>`).join('')
  if(rdTasks.greedy&&rdTasks.nofb){const q=$('rd-s6q');if(q)q.classList.add('unlocked')}
  rdCheckDone()
}
function rdCheckDone(){
  for(let q=1;q<=5;q++) if(rdQ[q]===true) rdUnlock(q+1)
  if(rdQ[6]===true) rdUnlock(7)
  updateBadge('rdes-completed',isComplete('rnndesign'))
}
function initRNNDesign(){
  ;[1,2,3,4,5,6].forEach(q=>c9RenderMCQ('rd',q,RD_QS[q]))
  rdCheckDone()
}

// ══════════════════════════════════════════════════
//  10.2.2  RNN TANH SATURATION
// ══════════════════════════════════════════════════
let rnStage=0, rnZOk=false, rnZTries=0, rnSeen={tuned:false,big:false}
let rnQ={1:null,2:null,3:null,4:null,5:null}
const RN_X=[1,-0.5,0.8,0.3,-1,0.6,-0.2,0.9,-0.7,0.4]
const RN_QS={
  1:{q:'Units sit at |h| = 0.95 and w = 1.5, so each step back multiplies the gradient by w·(1 − h²). What is left after 5 steps?',
     ok:'Each step multiplies by 1.5 × (1 − 0.95²) = 1.5 × 0.0975 ≈ 0.146, and 0.146⁵ ≈ 6.7 × 10⁻⁵. Even with w &gt; 1, saturated units make the gradient vanish.',
     opts:[
       {t:'about 7 × 10⁻⁵',c:true},
       {t:'about 0.73',h:'That adds the five factors (5 × 0.146). Each step multiplies.'},
       {t:'about 7.6',h:'That is 1.5⁵ — it forgets the tanh′ factor 1 − 0.95² = 0.0975.'},
       {t:'about 0.77',h:'That is 0.95⁵. The factor per step is w·(1 − h²) = 1.5 × 0.0975 ≈ 0.146.'}
     ]},
  2:{q:'With the inputs off, the gradient over 9 steps is exactly w⁹, so w = 1 keeps it steady. Why not just pick w = 1.5 to make sure it never vanishes?',
     ok:'With no input, w = 1.5 gives 1.5⁹ ≈ 38: an exploding gradient. With real inputs, a large w pushes h toward ±1, where tanh′ ≈ 0 drags the factor back down (u = 0.1 with w = 1.5 gives about 0.3). No single weight keeps the factor at 1 for every input, which is why gated units (10.10) add a path whose factor can stay near 1.',
     opts:[
       {t:'w &gt; 1 makes every hidden state exactly zero',h:'Larger w makes h larger, not zero. Try u = 0.1 with w = 1.5.'},
       {t:'Nothing — a large w removes vanishing for good',h:'Try u = 2 with w = 1.5: h saturates and the bars collapse anyway.'},
       {t:'h saturates, so tanh′ shrinks the factor anyway',c:true},
       {t:'The forward pass would then skip some steps',h:'The forward pass always visits every step; only the size of the gradient changes.'}
     ]},
  3:{q:'Training suddenly produces NaN: on one long sequence the gradient norm spiked to 10⁶. Which fix targets this directly?',
     ok:'Exploding gradients are tamed by <strong>gradient clipping</strong> (Goodfellow §10.11.1): rescale the gradient whenever its norm exceeds a threshold. Clipping cannot help vanishing gradients — it never makes a small gradient bigger.',
     opts:[
       {t:'Switch every tanh unit to a sigmoid unit',h:'Sigmoid saturates even more (its derivative is at most 0.25); it does not bound a spike.'},
       {t:'Use a much larger learning rate instead',h:'A larger step multiplies the spike — it makes the blow-up worse.'},
       {t:'Clip the gradient norm before updating',c:true},
       {t:'Initialise every weight to exactly zero',h:'Zero weights make all units identical and stall learning; they do not prevent later spikes.'}
     ]},
  4:{q:'Your RNN cannot learn that a word 50 steps back matters: those gradients vanish. Which change addresses this most directly?',
     ok:'Gated units add a self-loop whose factor is a learned gate that can stay near 1, so gradients pass many steps without shrinking (10.10). Skip connections and leaky units (§10.9) are related ideas.',
     opts:[
       {t:'Clip the gradient norm at each update',h:'Clipping only shrinks large gradients; it cannot revive vanished ones.'},
       {t:'Use gated units such as LSTM or GRU',c:true},
       {t:'Raise the learning rate a hundredfold',h:'That scales every term, including the large recent-step terms and the noise; the 50-step signal stays tiny in comparison.'},
       {t:'Train only on short 5-step snippets',h:'That avoids long sequences — but then the 50-step dependency can never be learned.'}
     ]},
  5:{q:'A teammate says: "Use ReLU instead of tanh — its derivative is 1, so gradients can\'t vanish." What is wrong with that?',
     ok:'ReLU′ is 1 only for positive pre-activations; for negative ones it is 0 and blocks the gradient. And the recurrent factor w is still applied every step: |w| &lt; 1 vanishes, |w| &gt; 1 explodes (now with an unbounded h). ReLU changes the problem; it does not remove it.',
     opts:[
       {t:'Nothing — ReLU makes vanishing impossible here',h:'For negative pre-activations ReLU′ = 0 (as in 10.1.2), and each step still multiplies by w.'},
       {t:'ReLU outputs are always negative, so h shrinks',h:'ReLU outputs are never negative: max(0, a).'},
       {t:'ReLU cannot be used inside a recurrent layer',h:'ReLU RNNs exist; the claim about gradients is what is wrong.'},
       {t:'ReLU′ can be 0, and w still scales every step',c:true}
     ]}
}

function rnUnlock(s){ const prev=rnStage; rnStage=Math.max(rnStage,s); c9Unlock('rn',prev,s,4); if(s>=2&&prev<2) rnSim() }
function rnSlider(){
  const z=parseFloat($('rn-z').value), t=Math.tanh(z), d=1-t*t
  $('rn-z-val').textContent=c9n(z); $('rn-tanh-v').textContent=t.toFixed(3); $('rn-dt-v').textContent=d.toFixed(3)
  const svg=$('rn-svg'); if(!svg) return
  const W=300,H=170,L=30,B=20,PW=W-L-10,PH=H-B-14, X=v=>L+(v+4)/8*PW, Y=v=>B+PH/2-v*PH/2.2
  let pt='',pd=''
  for(let i=0;i<=100;i++){const zz=-4+8*i/100,tt=Math.tanh(zz); pt+=(i?'L':'M')+X(zz).toFixed(1)+','+Y(tt).toFixed(1); pd+=(i?'L':'M')+X(zz).toFixed(1)+','+Y(1-tt*tt).toFixed(1)}
  let h=`<line x1="${L}" y1="${Y(0)}" x2="${W-10}" y2="${Y(0)}" stroke="#cbd5e1"/><line x1="${X(0)}" y1="${B}" x2="${X(0)}" y2="${B+PH}" stroke="#cbd5e1"/>`
  h+=`<line x1="${L}" y1="${Y(0.1)}" x2="${W-10}" y2="${Y(0.1)}" stroke="#f59e0b" stroke-dasharray="4 3"/><text x="${W-12}" y="${Y(0.1)-4}" text-anchor="end" font-size="10" fill="#c2610c">0.1</text>`
  h+=`<path d="${pt}" fill="none" stroke="#1d4ed8" stroke-width="2"/><path d="${pd}" fill="none" stroke="#b91c1c" stroke-width="2"/>`
  h+=`<line x1="${X(z)}" y1="${B}" x2="${X(z)}" y2="${B+PH}" stroke="#94a3b8" stroke-dasharray="3 3"/><circle cx="${X(z)}" cy="${Y(t)}" r="4" fill="#1d4ed8"/><circle cx="${X(z)}" cy="${Y(d)}" r="4" fill="#b91c1c"/>`
  h+=`<text x="${L+4}" y="${B+10}" font-size="11" fill="#1d4ed8">tanh(z)</text><text x="${L+4}" y="${B+24}" font-size="11" fill="#b91c1c">tanh′(z)</text>`
  ;[-4,-2,0,2,4].forEach(v=>{h+=`<text x="${X(v)}" y="${H-4}" text-anchor="middle" font-size="10" fill="#5c4a3a">${c9n(v)}</text>`})
  svg.innerHTML=h
}
function rnCheckZ(){
  const e=$('rn-f-z'), v=c9Num(e.value); if(v===null) return
  rnZOk=Math.abs(v)>=1.75&&Math.abs(v)<=1.9
  if(!rnZOk) rnZTries++
  e.className='rr-inp '+(rnZOk?'ok':'bad')
  const h=$('rn-f-z-hint'); h.className='guidance-box '+(rnZOk?'done':'warm')
  h.innerHTML=rnZOk?'<strong>✓ Correct!</strong> |z| ≈ 1.82: tanh(1.82) ≈ 0.949, so tanh′ ≈ 0.10. Beyond that, less than a tenth of the gradient gets through each step; at z = 3 only about 1%.'
    :rnZTries===1?'<strong>Not quite.</strong> Drag z until tanh′(z) drops below the orange 0.1 line, and read off z.'
    :'<strong>Not quite.</strong> tanh′ = 1 − tanh²(z) &lt; 0.1 means tanh(z) &gt; √0.9 ≈ 0.949.'
  rnCheckDone()
}
// One-unit RNN over RN_X; F[t] is the factor ∂h⁽ᵗ⁺¹⁾/∂h⁽ᵗ⁾ = w·(1 − h⁽ᵗ⁺¹⁾²).
function rnRun(w,u){ let h=0; const H=[],F=[]; RN_X.forEach(x=>{h=Math.tanh(w*h+u*x); H.push(h); F.push(w*(1-h*h))}); return {H,F} }
function rnSim(){
  const w=parseFloat(($('rn-w')||{value:0.6}).value), u=parseFloat(($('rn-u')||{value:1}).value)
  const wv=$('rn-w-val'); if(wv) wv.textContent=c9n(w)
  const uv=$('rn-u-val'); if(uv) uv.textContent=c9n(u)
  const {H,F}=rnRun(w,u), T=RN_X.length
  // g[k-1] = ∂h⁽¹⁰⁾/∂h⁽ᵏ⁾ = product of the factors of steps k+1 … 10
  const g=Array.from({length:T},(_,k)=>F.slice(k+1).reduce((p,f)=>p*f,1))
  if(u===0&&g[0]>=0.5&&g[0]<=2) rnSeen.tuned=true
  if(u>=2&&w>=1.5) rnSeen.big=true
  const svg=$('rn-flow-svg')
  if(svg){
    const W=340,Hh=180,L=36,B=24,PW=W-L-10,PH=Hh-B-16, lo=-8, hi=2, Y=v=>B+PH-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*PH
    let s=''
    ;[-8,-6,-4,-2,0,2].forEach(p=>{s+=`<line x1="${L}" y1="${Y(p)}" x2="${W-10}" y2="${Y(p)}" stroke="${p===0?'#94a3b8':'#e2d9cc'}"/><text x="${L-4}" y="${Y(p)+4}" text-anchor="end" font-size="10" fill="#5c4a3a">10${p<0?'⁻':''}${['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸'][Math.abs(p)]}</text>`})
    g.forEach((v,k)=>{const lg=Math.log10(Math.max(Math.abs(v),1e-12)), x=L+k*PW/T+3, bw=PW/T-6, y0=Y(0), y1=Y(lg); s+=`<rect x="${x}" y="${Math.min(y0,y1)}" width="${bw}" height="${Math.max(2,Math.abs(y1-y0))}" fill="${lg<-1?'#b91c1c':lg>1?'#c2610c':'#15803d'}" opacity="0.85"/><text x="${x+bw/2}" y="${Hh-4}" text-anchor="middle" font-size="10" fill="#5c4a3a">${k+1}</text>`})
    svg.innerHTML=s
  }
  const c=$('rn-sim-calc')
  if(c) c.innerHTML=`<div class="alg-step">h⁽ᵗ⁾: ${H.map(v=>v.toFixed(2)).join(', ')}</div><div class="alg-step">factor w·(1 − h²) per step: ${F.slice(1).map(v=>v.toFixed(2)).join(', ')}</div><div class="alg-res">∂h⁽¹⁰⁾/∂h⁽¹⁾ = ${g[0].toExponential(1).replace('e','×10^').replace('+','')}</div>`
  const items=[[rnSeen.tuned,'Switch the inputs off (u = 0) and find a w that keeps ∂h⁽¹⁰⁾/∂h⁽¹⁾ between 0.5 and 2'],[rnSeen.big,'Make the inputs big (u ≥ 2) with a large w (≥ 1.5) and watch what saturation does']]
  const cl=$('rn-checklist'); if(cl) cl.innerHTML=items.map(([ok,t])=>`<div><span style="color:${ok?'var(--green)':'var(--muted)'};font-weight:800">${ok?'✓':'○'}</span> ${t}</div>`).join('')
  if(rnSeen.tuned&&rnSeen.big){const q=$('rn-s2q');if(q)q.classList.add('unlocked')}
}
function rnMCQ(q,i){ rnQ[q]=c9Answer('rn',q,i,RN_QS[q]); rnCheckDone() }
function rnCheckDone(){
  if(rnZOk) rnUnlock(2)
  if(rnQ[1]===true&&rnQ[2]===true) rnUnlock(3)
  if(rnQ[3]===true&&rnQ[4]===true&&rnQ[5]===true) rnUnlock(4)
  updateBadge('rtnh-completed',isComplete('rnntanh'))
}
function initRNNTanh(){
  const eq=$('rn-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#b45309">$$h^{(t)}=\\tanh\\big(w\\,h^{(t-1)}+u\\,x^{(t)}\\big)$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">One hidden unit: w is the recurrent weight and u the input weight — Goodfellow's W and U, shrunk to single numbers.</div>
      </div>
      <div style="padding:14px 20px;text-align:center">
        <div style="color:#6d28d9">$$\\frac{\\partial h^{(T)}}{\\partial h^{(k)}}=\\prod_{t=k+1}^{T} w\\,\\big(1-(h^{(t)})^{2}\\big)$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500"><strong style="color:var(--text)">Chain rule: each step back multiplies by w (the recurrence) times tanh′ = 1 − h² (the activation).</strong> With vector states each factor is the matrix diag(1 − (h⁽ᵗ⁾)²)·W, and the gradient uses its transpose (Goodfellow eq. 10.21).</div>
      </div>
    </div>`
    typeset(eq)
  }
  rnSlider()
  ;[1,2,3,4,5].forEach(q=>c9RenderMCQ('rn',q,RN_QS[q]))
  rnCheckDone()
}

// ══════════════════════════════════════════════════
//  10.3  BI-DIRECTIONAL RNN
// ══════════════════════════════════════════════════
let brStage=0, brTask=0, brSel=new Set(), brDepsOk=[false,false], brCalcOk=false, brCalcTries=0, brEqOk=false
let brQ={1:null,2:null,3:null}
const BR_TASKS=[
  {mode:'uni',want:[1,2],text:'A <strong>one-direction</strong> RNN (forward states h only). Click every input x⁽ᵗ⁾ that the output o⁽²⁾ depends on, then check.'},
  {mode:'bi',want:[1,2,3,4],text:'Now the <strong>bidirectional</strong> RNN (forward h and backward g). Click every input that o⁽²⁾ depends on, then check.'}
]
const BR_CALC={h1:2,h2:1,g3:4,g2:2,o2:3}
const BR_EQ={C:'W_g',I:'t + 1',D:'U_g',E:'V_h',F:'V_g'}
const BR_WEIGHTS=['V_g','U_h','W_g','V_h','U_g','W_h']
const BR_QS={
  1:{q:'In a live stream, only x⁽¹⁾ and x⁽²⁾ have arrived so far; x⁽³⁾ is still coming. Which outputs can this BiRNN produce now?',
     ok:'Every backward state chains to the end of the sequence (g⁽¹⁾ ← g⁽²⁾ ← g⁽³⁾ ← x⁽³⁾), so no output is final until the whole sequence is in. That is the price of seeing the future.',
     opts:[
       {t:'o⁽¹⁾ only, since it is furthest back',h:'o⁽¹⁾ needs g⁽¹⁾, which needs g⁽²⁾, which needs g⁽³⁾ and so x⁽³⁾.'},
       {t:'o⁽¹⁾ and o⁽²⁾, the steps already read',h:'Their forward parts are ready, but their backward parts g⁽¹⁾ and g⁽²⁾ depend on x⁽³⁾.'},
       {t:'None of them until x⁽³⁾ arrives',c:true},
       {t:'All three, treating x⁽³⁾ as 0',h:'That would compute a different, wrong g: the real g⁽²⁾ includes x⁽³⁾ = 4.'}
     ]},
  2:{q:'Compared with a one-direction RNN with the same state size, what does a BiRNN cost?',
     ok:'Two sets of recurrent weights (h and g) and two output matrices, and every output waits for the last input. Often the two states are concatenated, [h⁽ᵗ⁾; g⁽ᵗ⁾], and fed to one matrix V — the same as V<sub>h</sub>·h⁽ᵗ⁾ + V<sub>g</sub>·g⁽ᵗ⁾.',
     opts:[
       {t:'Twice the recurrent weights, and waiting for the end',c:true},
       {t:'Nothing extra: both directions share W and U',h:'The backward RNN has its own W_g, U_g and V_g — about twice the parameters.'},
       {t:'Half the weights, since each reads half the input',h:'Each direction reads the whole sequence.'},
       {t:'Twice the weights, but it still streams word by word',h:'Stage 2 showed it cannot: every output waits for the last input.'}
     ]},
  3:{q:'For which task is a BiRNN a poor choice?',
     ok:'To predict the next word, a model may use only the words before it. A BiRNN\'s backward state has already read the word it should predict, so in training it would just copy the answer, and when predicting there is nothing to its right to read. Tagging, typo-spotting and sentiment work on text that is already complete, where reading both ways helps.',
     opts:[
       {t:'Tagging the names in a news article',h:'The whole article is available, so both directions can run: a BiRNN is ideal.'},
       {t:'Spotting typos in an essay',h:'The essay is complete, so the backward pass can run.'},
       {t:'Classifying the sentiment of a review',h:'The review is available in full, so a BiRNN works.'},
       {t:'Predicting the next word of a sentence',c:true}
     ]}
}

function brUnlock(s){ const prev=brStage; brStage=Math.max(brStage,s); c9Unlock('br',prev,s,4) }
// Unrolled diagram: x at the bottom, forward h (left of each column), backward g (right), output o on top.
function brDraw(){
  const svg=$('br-svg'); if(!svg) return
  const task=BR_TASKS[brTask], bi=task.mode==='bi'||brDepsOk[1], R=19
  const cx=t=>75+(t-1)*125, P={x:t=>[cx(t),235],h:t=>[cx(t)-28,165],g:t=>[cx(t)+28,100],o:t=>[cx(t),35]}
  // edges on o⁽²⁾'s dependency paths, highlighted once the task is solved
  const solved=brDepsOk[brTask]||brDepsOk[1], hot=new Set(solved?['x1h1','x2h2','h1h2','h2o2'].concat(bi?['x2g2','x3g3','x4g4','g4g3','g3g2','g2o2']:[]):[])
  const col={f:'#1d4ed8',b:'#b91c1c',o:'#15803d'}
  let s=`<defs>${['f','b','o','n'].map(k=>`<marker id="br-arr-${k}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="${col[k]||'#9ca3af'}"/></marker>`).join('')}</defs>`
  const edge=(a,b,key,c)=>{
    const [x1,y1]=a,[x2,y2]=b, d=Math.hypot(x2-x1,y2-y1), ux=(x2-x1)/d, uy=(y2-y1)/d, on=hot.has(key)
    s+=`<line x1="${x1+ux*R}" y1="${y1+uy*R}" x2="${x2-ux*(R+3)}" y2="${y2-uy*(R+3)}" stroke="${on?col[c]:'#9ca3af'}" stroke-width="${on?3:1.4}" marker-end="url(#br-arr-${on?c:'n'})"/>`
  }
  for(let t=1;t<=4;t++){
    edge(P.x(t),P.h(t),`x${t}h${t}`,'f'); edge(P.h(t),P.o(t),`h${t}o${t}`,'f')
    if(t<4) edge(P.h(t),P.h(t+1),`h${t}h${t+1}`,'f')
    if(bi){ edge(P.x(t),P.g(t),`x${t}g${t}`,'b'); edge(P.g(t),P.o(t),`g${t}o${t}`,'b'); if(t>1) edge(P.g(t),P.g(t-1),`g${t}g${t-1}`,'b') }
  }
  const node=(p,label,fill,stroke,click)=>{s+=`<circle cx="${p[0]}" cy="${p[1]}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="2"${click?` style="cursor:pointer" onclick="${click}"`:''}/><text x="${p[0]}" y="${p[1]+5}" text-anchor="middle" font-size="13" font-weight="700" fill="#1a1210" style="pointer-events:none">${label}</text>`}
  for(let t=1;t<=4;t++){
    const sel=brSel.has(t)
    node(P.x(t),`x${['','¹','²','³','⁴'][t]}`,sel?'#fed7aa':'#fff',sel?'#ea580c':'#94a3b8',`brToggle(${t})`)
    node(P.h(t),`h${['','¹','²','³','⁴'][t]}`,'#eff6ff',col.f)
    if(bi) node(P.g(t),`g${['','¹','²','³','⁴'][t]}`,'#fef2f2',col.b)
    node(P.o(t),`o${['','¹','²','³','⁴'][t]}`,t===2?'#fef9c3':'#f0fdf4',t===2?'#f59e0b':col.o)
  }
  svg.innerHTML=s
  const tt=$('br-task-text'); if(tt) tt.innerHTML=brDepsOk[1]?'Both tasks done. The highlighted paths show how every input reaches o⁽²⁾.':task.text
}
function brToggle(t){ if(brDepsOk[1]) return; brSel.has(t)?brSel.delete(t):brSel.add(t); brDraw() }
function brCheckDeps(){
  if(brDepsOk[1]) return
  const want=BR_TASKS[brTask].want, sel=[...brSel].sort(), h=$('br-deps-hint')
  const missing=want.filter(t=>!brSel.has(t)), extra=sel.filter(t=>!want.includes(t))
  if(!missing.length&&!extra.length){
    brDepsOk[brTask]=true
    if(brTask===0){
      h.className='guidance-box done'; h.innerHTML='<strong>✓ Correct!</strong> o⁽²⁾ = f(h⁽²⁾), and h⁽²⁾ has seen only x⁽¹⁾ and x⁽²⁾. Whatever comes later cannot change it. Now the bidirectional version.'
      brTask=1; brSel=new Set()
    } else {
      h.className='guidance-box done'; h.innerHTML='<strong>✓ Correct!</strong> o⁽²⁾ combines h⁽²⁾ (from x⁽¹⁾, x⁽²⁾) with g⁽²⁾, which is built from x⁽²⁾ and g⁽³⁾ — and g⁽³⁾ from x⁽³⁾ and g⁽⁴⁾. Every output depends on the whole sequence.'
    }
  } else {
    h.className='guidance-box warm'
    h.innerHTML='<strong>Not quite.</strong> '+(brTask===0
      ?(extra.length?`A one-direction RNN at step 2 has not read x⁽${extra[0]}⁾ yet.`:'h⁽²⁾ is built from h⁽¹⁾ and x⁽²⁾ — and h⁽¹⁾ from x⁽¹⁾.')
      :(missing.some(t=>t>2)?'Follow the backward arrows: g⁽²⁾ needs g⁽³⁾, which needs x⁽³⁾ and g⁽⁴⁾…':'The forward half still needs x⁽¹⁾ and x⁽²⁾.'))
  }
  brDraw(); brCheckDone()
}
function brCheckCalc(){
  const ids=['h1','h2','g3','g2','o2'], vals=ids.map(k=>c9Num(($(`br-c-${k}`)||{value:''}).value))
  if(vals.some(v=>v===null)) return
  let first=null
  ids.forEach((k,i)=>{const ok=vals[i]===BR_CALC[k]; $(`br-c-${k}`).className='rr-inp '+(ok?'ok':'bad'); if(!ok&&!first) first=k})
  const h=$('br-calc-hint')
  if(!first){
    brCalcOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> h⁽¹⁾ = 2, h⁽²⁾ = 1, g⁽³⁾ = 4, g⁽²⁾ = 0.5·4 + 0 = 2, so o⁽²⁾ = 1 + 2 = 3. The backward pass had to start at x⁽³⁾ and run right to left — and x⁽³⁾ = 4 reached o⁽²⁾ through g.'
    const q=$('br-s2q'); if(q) q.classList.add('unlocked')
  } else {
    brCalcTries++; h.className='guidance-box warm'
    h.innerHTML='<strong>Not quite.</strong> '+({h1:'h⁽¹⁾ = 0.5·h⁽⁰⁾ + x⁽¹⁾ with h⁽⁰⁾ = 0.',h2:'h⁽²⁾ = 0.5·h⁽¹⁾ + x⁽²⁾.',g3:'The backward RNN starts at the end: g⁽³⁾ = 0.5·g⁽⁴⁾ + x⁽³⁾ with g⁽⁴⁾ = 0.',g2:'g⁽²⁾ = 0.5·g⁽³⁾ + x⁽²⁾ — it needs g⁽³⁾ first.',o2:'o⁽²⁾ = h⁽²⁾ + g⁽²⁾.'})[first]
  }
  brCheckDone()
}
function brFillSelects(){
  const opt=v=>`<option value="${v}">${v}</option>`
  ;['C','D','E','F'].forEach(k=>{const e=$(`br-sel-${k}`); if(e&&!e.options.length) e.innerHTML=opt('—')+BR_WEIGHTS.map(opt).join('')})
  const i=$('br-sel-I'); if(i&&!i.options.length) i.innerHTML=['—','t − 1','t','t + 1'].map(opt).join('')
}
function brCheckEq(){
  const keys=['C','I','D','E','F'], h=$('br-eq-hint')
  let first=null
  keys.forEach(k=>{const e=$(`br-sel-${k}`), ok=e.value===BR_EQ[k]; e.className='sl-match-sel '+(ok?'ok':'bad'); if(!ok&&!first) first=k})
  if(!first){
    brEqOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> g⁽ᵗ⁾ = tanh(b<sub>g</sub> + W<sub>g</sub>·g⁽ᵗ⁺¹⁾ + U<sub>g</sub>·x⁽ᵗ⁾) and o⁽ᵗ⁾ = c + V<sub>h</sub>·h⁽ᵗ⁾ + V<sub>g</sub>·g⁽ᵗ⁾. The two directions have separate weights and never feed each other; they meet only in o⁽ᵗ⁾.'
    const q=$('br-s3q'); if(q) q.classList.add('unlocked')
  } else {
    const v=$(`br-sel-${first}`).value
    h.className='guidance-box warm'
    h.innerHTML='<strong>Not quite.</strong> '+({
      C:v.endsWith('_h')?'That belongs to the forward RNN. The backward RNN has its own recurrent matrix.':'This slot multiplies the backward state g — it needs the backward recurrent matrix.',
      I:'The backward RNN reads right to left, so g⁽ᵗ⁾ is built from the state to its right — the one it computed just before.',
      D:'This slot brings the input into the backward RNN — its own input matrix, not the forward one.',
      E:'Each direction has its own output matrix; this one multiplies the forward state h.',
      F:'Each direction has its own output matrix; this one multiplies the backward state g.'
    })[first]
  }
  brCheckDone()
}
function brMCQ(q,i){ brQ[q]=c9Answer('br',q,i,BR_QS[q]); brCheckDone() }
function brCheckDone(){
  if(brDepsOk[1]) brUnlock(2)
  if(brCalcOk&&brQ[1]===true) brUnlock(3)
  if(brEqOk&&brQ[2]===true&&brQ[3]===true) brUnlock(4)
  updateBadge('birnn-completed',isComplete('birnn'))
}
function initBiRNN(){
  brDraw(); brFillSelects()
  ;[1,2,3].forEach(q=>c9RenderMCQ('br',q,BR_QS[q]))
  brCheckDone()
}

// ══════════════════════════════════════════════════
//  CHAPTER 10 — FILL-IN HELPERS
// ══════════════════════════════════════════════════
// Checks box `${pfx}-f-${key}` against F = {ans, tol, hints, ok}; each wrong try shows the next hint.
// Returns true or false, or null for an empty box. Commas and spaces are ignored, so "60,400" works;
// with F.pct, a fraction such as 0.908 counts as 90.8%.
function c10Fill(pfx,key,F,tries){
  const inp=$(`${pfx}-f-${key}`), h=$(`${pfx}-f-${key}-hint`)
  const v0=c9Num(String(inp.value).replace(/[,\s]/g,'')); if(v0===null||isNaN(v0)) return null
  const v=F.pct&&Math.abs(v0)<=1?v0*100:v0
  const ok=Math.abs(v-F.ans)<=(F.tol||1e-9)
  if(!ok) tries[key]=(tries[key]||0)+1
  inp.className='rr-inp '+(ok?'ok':'bad')
  if(h){h.className='guidance-box '+(ok?'done':'warm'); h.innerHTML=ok?`<strong>✓ Correct!</strong> ${F.ok}`:`<strong>Not quite.</strong> ${F.hints[Math.min(tries[key],F.hints.length)-1]}`}
  return ok
}
// Superscript digits, for labels such as 10⁻⁴ and h⁽¹²⁾.
const c10Sup=s=>String(s).split('').map(ch=>ch==='-'?'⁻':'⁰¹²³⁴⁵⁶⁷⁸⁹'[+ch]).join('')
// Escapes markup tokens such as <PER> for display.
const c10Esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

// ══════════════════════════════════════════════════
//  10.4  NER AS SEQ2SEQ
// ══════════════════════════════════════════════════
let nsStage=0, nsTag1Ok=false, nsNestOk=false, nsFill={inl:false,lst:false,steps:false}, nsFillTries={}
let nsQ={1:null,2:null,3:null,4:null,5:null}
const NS_LABELS=['O','B-PER','I-PER','B-ORG','I-ORG','B-LOC','I-LOC']
const NS_S1={words:['Óscar','Romero','was','born','in','El','Salvador'],gold:['B-PER','I-PER','O','O','O','B-LOC','I-LOC']}
const NS_S2={words:['She','studied','at','the','University','of','Arizona'],want:[{type:'ORG',a:4,b:6},{type:'LOC',a:6,b:6}]}
let nsTags={1:NS_S1.words.map(()=>'O'),2:NS_S2.words.map(()=>'O')}
const NS_FORMATS=[
  {name:'Tagger: BIO labels',note:'one label per word',toks:['B-PER','I-PER','O','O','O','B-LOC','I-LOC']},
  {name:'Seq2seq: inline markup',note:'copy the sentence and wrap each entity in tags',toks:['<PER>','Óscar','Romero','</PER>','was','born','in','<LOC>','El','Salvador','</LOC>']},
  {name:'Seq2seq: entity list',note:'a type marker, then the entity\'s words',toks:['[PER]','Óscar','Romero','[LOC]','El','Salvador']}
]
const NS_FILL={
  inl:{ans:36,hints:['The inline answer copies every word and adds an opening and a closing tag around each entity.','30 words + 2 tags for each of the 3 entities.'],ok:'30 + 2·3 = 36, or n + 2e in general: the answer is always longer than the sentence.'},
  lst:{ans:8,hints:['The list writes one type marker per entity, then that entity\'s words, and nothing else.','3 markers + 5 entity words.'],ok:'3 + 5 = 8, or e + m in general, whatever the sentence length. Much shorter, but the words outside entities are gone, and with them the positions (see Stage 3).'},
  steps:{ans:12,hints:['The decoder writes one token per step. Count the tokens of the inline answer, and remember that &lt;END&gt; is a token too.','11 tokens + &lt;END&gt;.'],ok:'12 steps, each waiting for the one before. Once the sentence is read, the tagger labels all 7 words in one parallel pass, and it can never invent a word.'}
}
const NS_QS={
  1:{q:'A per-token classifier picks each label on its own and outputs <em>was/O born/O in/O El/I-LOC Salvador/I-LOC</em>. What is wrong?',
     ok:'An I- label continues an entity that a B- label started, so I-LOC right after O is an invalid sequence. Because each label is chosen independently, nothing prevents this. Practical taggers add a CRF layer or constrained decoding that allows only valid transitions.',
     opts:[
       {t:'Nothing: I-LOC on both words marks the place',h:'In BIO, I- means "continues the entity before me". Here nothing came before.'},
       {t:'"Salvador" should be B-LOC, since it is a new word',h:'B- marks only the first word of an entity, and "Salvador" continues "El".'},
       {t:'I-LOC follows O, so no entity was ever begun',c:true},
       {t:'A LOC entity cannot come after a PER entity',h:'Entity types can appear in any order.'}
     ]},
  2:{q:'The tagger always outputs exactly 7 labels for 7 words. What lets the seq2seq model write 11 tokens, or 6?',
     ok:'In an encoder–decoder (Goodfellow §10.4), the encoder reads x⁽¹⁾ … x⁽ⁿˣ⁾ into a context C. The decoder writes y⁽¹⁾, y⁽²⁾, … from C and its own earlier tokens until it writes &lt;END&gt;, as in 10.2.1. The output length n<sub>y</sub> is not tied to n<sub>x</sub>.',
     opts:[
       {t:'The decoder keeps writing until it emits &lt;END&gt;',c:true},
       {t:'The encoder outputs one vector per output token',h:'The encoder reads the input, so its length follows the input. The decoder decides how long the output is.'},
       {t:'The input is padded to the output length first',h:'No padding is needed: the decoder writes step by step and stops when it chooses to.'},
       {t:'The decoder writes one token per input word',h:'Then it would always write 7 tokens for 7 words, like the tagger. The decoder is not tied to the input length.'}
     ]},
  3:{q:'Sentence: <em>"Jordan flew home to Jordan."</em> The list answer is <em>[PER] Jordan [LOC] Jordan</em>. What does it fail to say?',
     ok:'A list names the entities but not where they are, so matching them back to the text is ambiguous when the same word appears twice. Inline markup avoids this because its tags sit right beside the words, at the price of copying the whole sentence (n + 2e tokens).',
     opts:[
       {t:'Whether each entity is one word or several',h:'Each marker is followed by exactly its words: one word each here.'},
       {t:'Which "Jordan" is the person and which the place',c:true},
       {t:'What type each of the two entities has',h:'[PER] and [LOC] give the types.'},
       {t:'How many entities the sentence contains',h:'There are two markers, so there are two entities.'}
     ]},
  4:{q:'Input: <em>"Óscar Romero was born in El Salvador"</em>. The seq2seq model writes <em>[PER] Oscar Romero [LOC] San Salvador</em>. What went wrong?',
     ok:'A decoder can write any token in its vocabulary, so it can produce text that is not in the input (hallucination). A tagger cannot, because it only labels words that are there. Common fixes are a copy (pointer) mechanism or decoding restricted to words from the input.',
     opts:[
       {t:'The encoder dropped the accent while reading',h:'The encoder reads the input as given. "Oscar" and "San" were written by the decoder.'},
       {t:'The BIO labels were shifted by one word',h:'This model outputs no BIO labels at all. It writes text.'},
       {t:'The two entity types were swapped',h:'PER and LOC are the right types. The words are what is wrong.'},
       {t:'The decoder wrote words not in the input',c:true}
     ]},
  5:{q:'Which job most clearly favours seq2seq over a per-token tagger?',
     ok:'Nested entities are exactly what one label per word cannot hold. Flat labels at high speed, one label per word (part of speech) and labelling word by word as text arrives all suit a tagger.',
     opts:[
       {t:'Tagging millions of tweets quickly with flat PER/ORG',h:'Flat entities and speed favour the tagger: one parallel pass and no hallucination.'},
       {t:'Gene names nested inside protein names in papers',c:true},
       {t:'Giving every word its part of speech (noun, verb…)',h:'Exactly one label per word is what a tagger is built for.'},
       {t:'Tagging a live chat word by word as it arrives',h:'A left-to-right tagger can label each word as it comes. A decoder has to wait for the input and then write.'}
     ]}
}

function nsUnlock(s){ const prev=nsStage; nsStage=Math.max(nsStage,s); c9Unlock('ns',prev,s,5) }
// Word tiles, each with a menu of BIO labels.
function nsRenderTagger(n){
  const S=n===1?NS_S1:NS_S2, box=$(`ns-tag${n}`); if(!box) return
  box.innerHTML=S.words.map((w,i)=>`<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 10px;background:var(--surf2);border:1px solid var(--border);border-radius:8px"><span style="font-weight:700;font-size:15px">${w}</span><select id="ns-t${n}-${i}" class="sl-match-sel" style="min-width:92px" onchange="nsSetTag(${n},${i},this.value)">${NS_LABELS.map(l=>`<option${l===nsTags[n][i]?' selected':''}>${l}</option>`).join('')}</select></div>`).join('')
}
function nsSetTag(n,i,v){ nsTags[n][i]=v; const e=$(`ns-t${n}-${i}`); if(e) e.className='sl-match-sel'; if(n===2) nsShowDecoded() }
// Reads BIO labels back as entity spans {type, a, b}; an I- that continues nothing starts a new span.
function nsDecode(tags){
  const spans=[]; let cur=null
  tags.forEach((t,i)=>{
    if(t==='O'){cur=null;return}
    const [bi,type]=t.split('-')
    if(bi==='I'&&cur&&cur.type===type){cur.b=i;return}
    cur={type,a:i,b:i}; spans.push(cur)
  })
  return spans
}
const nsSpanText=(s,W)=>`<strong>${s.type}</strong> "${W.slice(s.a,s.b+1).join(' ')}"`
function nsCheckTag1(){
  const tags=nsTags[1], gold=NS_S1.gold, h=$('ns-tag1-hint')
  tags.forEach((t,i)=>{const e=$(`ns-t1-${i}`); if(e) e.className='sl-match-sel '+(t===gold[i]?'ok':'bad')})
  const i=tags.findIndex((t,k)=>t!==gold[k])
  if(i<0){
    nsTag1Ok=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> B-PER I-PER O O O B-LOC I-LOC: seven words in, seven labels out. A tagger computes one distribution over the labels for every word, so its output always has exactly the length of the input.'
    const q=$('ns-s1q'); if(q) q.classList.add('unlocked')
  } else {
    const t=tags[i]
    h.className='guidance-box warm'
    h.innerHTML='<strong>Not quite.</strong> '+(
      i===0?(t==='I-PER'?'"Óscar" is the first word of the name, so it gets B-, even at the start of the sentence.':'"Óscar" begins a person\'s name.'):
      i===1?(t==='B-PER'?'"Romero" continues the name that "Óscar" began. Same entity, so I-.':'"Óscar Romero" is one person, and "Romero" is the second word of that name.'):
      i===5?(t==='I-LOC'?'"El" is the first word of the place, so B-.':'"El Salvador" is a country. Which word begins it?'):
      i===6?(t==='B-LOC'?'"Salvador" continues "El". Same entity, so I-.':'"Salvador" is the second word of the country\'s name.'):
      `"${NS_S1.words[i]}" is not part of any name, so it gets O.`)
  }
  nsCheckDone()
}
function nsRenderFormats(){
  const el=$('ns-formats'); if(!el) return
  const chip=t=>{const tag=/^[<\[]|^[BI]-|^O$/.test(t); return `<span style="padding:4px 8px;border-radius:6px;font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:${tag?'#fff7ed':'var(--surface)'};border:1px solid ${tag?'#fdba74':'var(--border)'};color:${tag?'#b45309':'var(--text)'}">${c10Esc(t)}</span>`}
  el.innerHTML=NS_FORMATS.map(f=>`<div><div style="font-size:13.5px;font-weight:700;margin-bottom:6px">${f.name} <span style="font-weight:500;color:var(--muted)">(${f.note}): ${f.toks.length} tokens</span></div><div style="display:flex;flex-wrap:wrap;gap:5px">${f.toks.map(chip).join('')}</div></div>`).join('')
}
function nsCheckFill(key){ const r=c10Fill('ns',key,NS_FILL[key],nsFillTries); if(r===null) return; nsFill[key]=nsFill[key]||r; nsCheckDone() }
function nsShowDecoded(){
  const el=$('ns-decoded'); if(!el) return
  const sp=nsDecode(nsTags[2]), W=NS_S2.words
  el.innerHTML=`<div class="alg-step">Your labels encode: ${sp.length?sp.map(s=>nsSpanText(s,W)).join(', '):'no entities yet'}</div><div class="alg-step">Wanted: <strong>ORG</strong> "University of Arizona" and <strong>LOC</strong> "Arizona"</div>`
}
function nsCheckNest(){
  const sp=nsDecode(nsTags[2]), W=NS_S2.words, h=$('ns-nest-hint')
  const same=(s,t)=>s.type===t.type&&s.a===t.a&&s.b===t.b
  const good=sp.filter(s=>NS_S2.want.some(t=>same(s,t))), wrong=sp.filter(s=>!NS_S2.want.some(t=>same(s,t)))
  // "University of" as ORG plus "Arizona" as LOC: the student has hit the conflict head-on.
  const orgCut=wrong.length===1&&wrong[0].type==='ORG'&&wrong[0].a===4&&wrong[0].b===5&&good.length===1
  if(!sp.length){ h.className='guidance-box warm'; h.innerHTML='<strong>Not quite.</strong> Your labels encode no entity yet. Tag at least one of the two.' }
  else if(wrong.length&&!orgCut){
    const s=wrong[0]
    h.className='guidance-box warm'
    h.innerHTML=`<strong>Not quite.</strong> Your labels encode ${nsSpanText(s,W)}, which is not one of the two entities. `+(s.type==='ORG'?(s.a<4?'The organisation is exactly "University of Arizona": "the" is not part of the name.':'The organisation is exactly "University of Arizona".'):s.type==='LOC'?'The location is the single word "Arizona".':'There is no person in this sentence.')
  } else {
    nsNestOk=true; h.className='guidance-box done'
    h.innerHTML=orgCut
      ?'<strong>✓ You have found the conflict.</strong> To make "Arizona" a location (B-LOC), the university\'s name had to stop at "of". Keeping "Arizona" inside the name needs I-ORG, but then it cannot also be B-LOC: one label per word can hold only one. A tagger cannot represent nested entities.'
      :`<strong>✓ That one is right:</strong> ${good.map(s=>nsSpanText(s,W)).join(' and ')}. Now try to add the other. "Arizona" would need <strong>I-ORG</strong> (inside the university's name) and <strong>B-LOC</strong> (the start of the place) at the same time, but one label per word can hold only one. A tagger cannot represent nested entities.`
    const r=$('ns-s3r'); if(r) r.classList.add('unlocked')
  }
  nsCheckDone()
}
function nsMCQ(q,i){ nsQ[q]=c9Answer('ns',q,i,NS_QS[q]); nsCheckDone() }
function nsCheckDone(){
  if(nsTag1Ok&&nsQ[1]===true) nsUnlock(2)
  if(nsFill.inl&&nsFill.lst){const q=$('ns-s2q');if(q)q.classList.add('unlocked')}
  if(nsStage>=2&&nsQ[2]===true) nsUnlock(3)
  if(nsNestOk&&nsQ[3]===true) nsUnlock(4)
  if(nsFill.steps){const q=$('ns-s4q');if(q)q.classList.add('unlocked')}
  if(nsQ[4]===true&&nsQ[5]===true) nsUnlock(5)
  updateBadge('nerseq-completed',isComplete('nerseq'))
}
function initNERSeq(){
  const eq=$('ns-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#1d4ed8">$$\\text{tagger:}\\quad p\\big(y^{(t)}\\mid x^{(1)},\\dots,x^{(n)}\\big),\\quad t=1,\\dots,n$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">One label for every input word, so the output has exactly n labels.</div>
      </div>
      <div style="padding:14px 20px;text-align:center">
        <div style="color:#15803d">$$\\text{seq2seq:}\\quad C=\\text{encoder}\\big(x^{(1)},\\dots,x^{(n_x)}\\big)$$</div>
        <div style="color:#15803d">$$p\\big(y^{(t)}\\mid y^{(1)},\\dots,y^{(t-1)},C\\big)$$</div>
        <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">The encoder reads the sentence into a context C. The decoder writes the answer one token at a time, each step seeing C and its own earlier tokens, until it writes &lt;END&gt;. n<sub>y</sub> need not equal n<sub>x</sub> (Goodfellow §10.4).</div>
      </div>
    </div>`
    typeset(eq)
  }
  nsRenderTagger(1); nsRenderTagger(2); nsRenderFormats(); nsShowDecoded()
  ;[1,2,3,4,5].forEach(q=>c9RenderMCQ('ns',q,NS_QS[q]))
  nsCheckDone()
}

// ══════════════════════════════════════════════════
//  10.6  RECURSIVE NNs BEYOND NLP
// ══════════════════════════════════════════════════
let rcStage=0, rcCalcOk=false, rcInflOk=false, rcInflTries=0, rcMode='chain', rcFill={chain:false,bal:false}, rcFillTries={}, rcMatchOk=false
let rcQ={1:null,2:null,3:null,4:null}
const RC_X=[4,0,2,6]
const RC_CALC={p12:2,p34:4,rb:3,rc:4}
const RC_INFL={ib:2,ic:1}
const RC_FILL={
  chain:{ans:63,hints:['In chain mode, read off the merges for n = 4, 8 and 16. What is the pattern?','The chain merges one new leaf at a time, and x⁽¹⁾ goes through every merge: n − 1.'],ok:'63. x⁽¹⁾ goes through every merge, just like the first word in an RNN. With p = ½(L + R), its weight at the root would be (½)⁶³ ≈ 10⁻¹⁹.'},
  bal:{ans:6,hints:['In balanced mode, read off the merges for n = 2, 4, 8 and 16.','Each level halves the number of nodes: 64 → 32 → … → 1. How many halvings is that?'],ok:'6 = log₂ 64. A balanced tree cuts the depth from n − 1 to ⌈log₂ n⌉, Goodfellow\'s τ → O(log τ). The weight of x⁽¹⁾ at the root would be (½)⁶ = 1/64.'}
}
const RC_SOURCES=['The compiler gives an exact syntax tree','A trained parser predicts a parse tree','Merge neighbouring image segments','Impose a fixed tree: days → weeks → months']
const RC_MATCH=[
  {task:'Find bugs in Python functions',ans:0,hint:'Code has a formal grammar, so the compiler builds its syntax tree exactly, with no guessing.'},
  {task:'Sentiment of movie-review sentences',ans:1,hint:'Natural language has no compiler. A trained parser has to predict the tree.'},
  {task:'Label the regions of a street photo',ans:2,hint:'Socher et al. (2011) split the image into segments and merged neighbouring ones step by step.'},
  {task:'Predict a stock from a year of daily prices',ans:3,hint:'Prices have no grammar and no regions, so any tree has to be imposed, for example a fixed calendar hierarchy.'}
]
const RC_QS={
  1:{q:'A tree over 64 words has 63 merge nodes. How many composition matrices W does a recursive network learn?',
     ok:'An RNN reuses one W at every time step, and a recursive network reuses one W (and b) at every node in the same way. So it can handle trees of any size and shape, and every merge trains the same weights.',
     opts:[
       {t:'63, one for each merge node',h:'Then a 10-word sentence would need different weights from a 64-word one. The same W is reused at every node.'},
       {t:'One, shared by every merge',c:true},
       {t:'64, one for each word at the leaves',h:'The leaves are the word vectors themselves. W is used only where two children merge.'},
       {t:'6, one for each level of the tree',h:'Levels do not get their own weights either. One W serves every node at every level.'}
     ]},
  2:{q:'Goodfellow notes that a balanced tree cuts the depth from τ to O(log τ). Why can that help learning?',
     ok:'Every merge multiplies the gradient by a factor (as in 10.2.2), so long paths make it vanish or explode. With depth ⌈log₂ τ⌉ instead of τ − 1, even the first input is only a few merges from the output.',
     opts:[
       {t:'The tree needs fewer weights to learn',h:'W is shared in both trees, so the number of weights is the same.'},
       {t:'Merges no longer need a nonlinearity',h:'Each merge still applies tanh. The tree just has fewer merges on any path.'},
       {t:'Gradients pass through fewer merges',c:true},
       {t:'Each word now gets its own matrix W',h:'W is still shared by every node.'}
     ]},
  3:{q:'So, could a recursive network predict a stock from its daily prices?',
     ok:'A fixed tree over the days, such as a balanced binary tree or a days → weeks → months calendar, gives every day a short path to the root: about 9 merges for 365 days in a balanced tree, instead of 364 in a chain. But unlike a parse tree it says nothing about the data, so to be worth it the network has to beat ordinary RNNs, CNNs or transformers on results.',
     opts:[
       {t:'No: only language comes with parse trees',h:'Goodfellow notes that the tree can be fixed and independent of the data, such as a balanced binary tree.'},
       {t:'Yes: it discovers the market\'s own tree',h:'Prices have no parts whose merges could be scored, the way neighbouring image segments or words can be, so the tree has to be imposed.'},
       {t:'No: prices are numbers, not word vectors',h:'A leaf can be any vector. A day\'s price features work just like a word embedding.'},
       {t:'Yes, on a fixed tree, which shortens paths',c:true}
     ]},
  4:{q:'Socher et al. (2011) parsed street scenes with a recursive network. What were the leaves, and what was the tree?',
     ok:'The image is cut into small segments, which play the role of words. The same rule repeatedly merges two neighbouring segments and scores each merge, building a tree of regions: a parse tree for a scene. As with sentences, the tree comes from the data.',
     opts:[
       {t:'Leaves: segments; tree: merging neighbours',c:true},
       {t:'Leaves: pixels; tree: the rows of the image',h:'Pixels are too small and rows are not meaningful parts. They used segments (superpixels).'},
       {t:'Leaves: CNN filters; tree: the layers',h:'Filters are weights, not parts of the input. The tree is built over the image itself.'},
       {t:'Leaves: whole images; tree: the classes',h:'The tree is built inside one image, over its parts.'}
     ]}
}

function rcUnlock(s){ const prev=rcStage; rcStage=Math.max(rcStage,s); c9Unlock('rc',prev,s,4) }
// A tree is a leaf index or a pair [left, right]; leaf 0 is x⁽¹⁾.
function rcChain(n){ let t=0; for(let i=1;i<n;i++) t=[t,i]; return t }
function rcBalanced(a,b){ if(a===b) return a; const m=Math.floor((a+b)/2); return [rcBalanced(a,m),rcBalanced(m+1,b)] }
const rcHeight=t=>Array.isArray(t)?1+Math.max(rcHeight(t[0]),rcHeight(t[1])):0
const rcHasFirst=t=>Array.isArray(t)?rcHasFirst(t[0]):t===0
// SVG for tree t: leaf i sits at (xs[i], y0) and a node of height k at y0 − k·dy.
// o.leaf(i) labels the leaves, o.label(k) the k-th merge (bottom-up); the path from x⁽¹⁾ to the root is orange.
function rcTreeSVG(t,xs,y0,dy,o){
  const R=o.r||14
  let edges='', nodes='', k=0
  const walk=t=>{
    if(!Array.isArray(t)) return {x:xs[t],y:y0,hot:t===0}
    const l=walk(t[0]), r=walk(t[1]), p={x:(l.x+r.x)/2,y:y0-rcHeight(t)*dy,hot:rcHasFirst(t)}
    ;[l,r].forEach(c=>{const hot=p.hot&&c.hot; edges+=`<line x1="${p.x}" y1="${p.y}" x2="${c.x}" y2="${c.y}" stroke="${hot?'#ea580c':'#9ca3af'}" stroke-width="${hot?3:1.4}"/>`})
    const lab=o.label?o.label(k++):''
    nodes+=`<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${p.hot?'#fff7ed':'#f0fdf4'}" stroke="${p.hot?'#ea580c':'#15803d'}" stroke-width="2"/>`+(lab!==''?`<text x="${p.x}" y="${p.y+4}" text-anchor="middle" font-size="11" font-weight="700" fill="#1a1210">${lab}</text>`:'')
    return p
  }
  walk(t)
  xs.forEach((x,i)=>{nodes+=`<rect x="${x-R}" y="${y0-R}" width="${2*R}" height="${2*R}" rx="5" fill="${i===0?'#fed7aa':'#eff6ff'}" stroke="${i===0?'#ea580c':'#93c5fd'}" stroke-width="1.5"/><text x="${x}" y="${y0+4}" text-anchor="middle" font-size="${R>12?12:10}" font-weight="700" fill="#1a1210">${o.leaf?o.leaf(i):''}</text>`})
  return edges+nodes
}
function rcDrawHand(){
  const svg=$('rc-hand-svg'); if(!svg) return
  const lb=rcCalcOk?['2','4','3']:['p₁₂','p₃₄','root'], lc=rcCalcOk?['2','2','4']:['c₁₂','c₁₂₃','root']
  const xb=[40,110,180,250], xc=[320,385,450,515], sup=['¹','²','³','⁴']
  let s=`<text x="14" y="18" font-size="12" font-weight="700" fill="#5c4a3a">Balanced</text><text x="300" y="18" font-size="12" font-weight="700" fill="#5c4a3a">Chain</text>`
  s+=rcTreeSVG(rcBalanced(0,3),xb,168,48,{r:16,leaf:i=>RC_X[i],label:k=>lb[k]})
  s+=rcTreeSVG(rcChain(4),xc,168,48,{r:16,leaf:i=>RC_X[i],label:k=>lc[k]})
  xb.concat(xc).forEach((x,i)=>{s+=`<text x="${x}" y="202" text-anchor="middle" font-size="11" fill="#5c4a3a">x⁽${sup[i%4]}⁾</text>`})
  svg.innerHTML=s
}
function rcCheckCalc(){
  const ids=['p12','p34','rb','rc'], vals=ids.map(k=>c9Num(($(`rc-c-${k}`)||{value:''}).value))
  if(vals.some(v=>v===null)) return
  let first=null
  ids.forEach((k,i)=>{const ok=vals[i]===RC_CALC[k]; $(`rc-c-${k}`).className='rr-inp '+(ok?'ok':'bad'); if(!ok&&!first) first=k})
  const h=$('rc-calc-hint')
  if(!first){
    rcCalcOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> Balanced: p₁₂ = ½(4 + 0) = 2, p₃₄ = ½(2 + 6) = 4, root = ½(2 + 4) = 3. Chain: ½(4 + 0) = 2, ½(2 + 2) = 2, root = ½(2 + 6) = 4. The same leaves and the same rule give different roots, so the shape of the tree is part of the model.'
    const b=$('rc-s1b'); if(b) b.classList.add('unlocked')
  } else {
    h.className='guidance-box warm'
    h.innerHTML='<strong>Not quite.</strong> '+({p12:'p₁₂ merges x⁽¹⁾ = 4 and x⁽²⁾ = 0: ½·(4 + 0).',p34:'p₃₄ merges x⁽³⁾ = 2 and x⁽⁴⁾ = 6.',rb:'The balanced root merges p₁₂ and p₃₄.',rc:'The chain merges x⁽¹⁾ and x⁽²⁾ first (c₁₂), then adds x⁽³⁾ (c₁₂₃), then x⁽⁴⁾: ½(4 + 0), then ½(c₁₂ + 2), then ½(c₁₂₃ + 6).'})[first]
  }
  rcDrawHand(); rcCheckDone()
}
function rcCheckInfl(){
  const vb=c9Num($('rc-c-ib').value), vc=c9Num($('rc-c-ic').value); if(vb===null||vc===null) return
  const okb=vb===RC_INFL.ib, okc=vc===RC_INFL.ic, h=$('rc-infl-hint')
  $('rc-c-ib').className='rr-inp '+(okb?'ok':'bad'); $('rc-c-ic').className='rr-inp '+(okc?'ok':'bad')
  if(okb&&okc){
    rcInflOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> In the balanced tree x⁽¹⁾ passes through 2 merges, so +8 arrives as 8·¼ = +2. In the chain it passes through 3, so 8·⅛ = +1. These factors are also the gradients ∂root/∂x⁽¹⁾: the deeper a leaf sits, the less it can move the root, and the less gradient flows back to it.'
    const q=$('rc-s1q'); if(q) q.classList.add('unlocked')
  } else {
    rcInflTries++; h.className='guidance-box warm'
    h.innerHTML='<strong>Not quite.</strong> '+(rcInflTries===1?'Follow the orange path from x⁽¹⁾ to each root. Each merge on it multiplies the change by ½.':!okb?'Balanced: x⁽¹⁾ → p₁₂ → root is 2 merges, so the change is 8·½·½.':'Chain: x⁽¹⁾ → c₁₂ → c₁₂₃ → root is 3 merges, so the change is 8·½·½·½.')
  }
  rcCheckDone()
}
function rcSetMode(m){ rcMode=m; rcDrawDepth() }
function rcDrawDepth(){
  const svg=$('rc-depth-svg'), sl=$('rc-n'); if(!svg||!sl) return
  const n=+sl.value, t=rcMode==='chain'?rcChain(n):rcBalanced(0,n-1), H=rcHeight(t)
  $('rc-n-val').textContent=n
  document.querySelectorAll('.rc-mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.v===rcMode))
  const xs=Array.from({length:n},(_,i)=>30+i*500/(n-1))
  svg.innerHTML=rcTreeSVG(t,xs,222,Math.min(45,185/H),{r:n>10?10:13,leaf:i=>i+1})
  const info=$('rc-depth-info')
  if(info) info.innerHTML=`<div class="alg-step">${rcMode==='chain'?'Chain':'Balanced tree'}, n = ${n}: ${n-1} merges in total (any tree over n leaves has n − 1)</div><div class="alg-res">merges between x⁽¹⁾ and the root: ${H}</div>`
}
function rcCheckFill(key){ const r=c10Fill('rc',key,RC_FILL[key],rcFillTries); if(r===null) return; rcFill[key]=rcFill[key]||r; rcCheckDone() }
function rcRenderMatch(){
  const el=$('rc-match'); if(!el||el.children.length) return
  el.innerHTML=RC_MATCH.map((m,i)=>`<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="min-width:min(280px,100%);font-size:14.5px;font-weight:600">${m.task}</span><select id="rc-m-${i}" class="sl-match-sel" style="min-width:min(300px,100%)" onchange="this.className='sl-match-sel'">${['—',...RC_SOURCES].map(o=>`<option>${o}</option>`).join('')}</select></div>`).join('')
}
function rcCheckMatch(){
  const h=$('rc-match-hint'); let first=-1
  RC_MATCH.forEach((m,i)=>{const e=$(`rc-m-${i}`), ok=e.value===RC_SOURCES[m.ans]; e.className='sl-match-sel '+(ok?'ok':'bad'); if(!ok&&first<0) first=i})
  if(first<0){
    rcMatchOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> Code arrives with an exact tree, sentences and images need a model to predict one, and time series have none, so a tree has to be imposed. Going down this list, the tree tells the network less and less about the data.'
    const q=$('rc-s3q'); if(q) q.classList.add('unlocked')
  } else { h.className='guidance-box warm'; h.innerHTML=`<strong>Not quite: ${RC_MATCH[first].task}.</strong> ${RC_MATCH[first].hint}` }
  rcCheckDone()
}
function rcMCQ(q,i){ rcQ[q]=c9Answer('rc',q,i,RC_QS[q]); rcCheckDone() }
function rcCheckDone(){
  if(rcInflOk&&rcQ[1]===true) rcUnlock(2)
  if(rcFill.chain&&rcFill.bal){const q=$('rc-s2q');if(q)q.classList.add('unlocked')}
  if(rcStage>=2&&rcQ[2]===true) rcUnlock(3)
  if(rcMatchOk&&rcQ[3]===true&&rcQ[4]===true) rcUnlock(4)
  updateBadge('recnets-completed',isComplete('recnets'))
}
function initRecNets(){
  const eq=$('rc-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:14px 20px;text-align:center">
      <div style="color:#b45309">$$h_{\\text{parent}}=\\tanh\\!\\big(W\\,[\\,h_{\\text{left}}\\,;\\,h_{\\text{right}}\\,]+b\\big)$$</div>
      <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">[h<sub>left</sub>; h<sub>right</sub>] stacks the two child vectors into one. The same W and b are used at every node, just as an RNN reuses its weights at every time step. The leaves are the input vectors (word embeddings in NLP), and the root's vector represents the whole input.</div>
    </div>`
    typeset(eq)
  }
  rcDrawHand(); rcDrawDepth(); rcRenderMatch()
  ;[1,2,3,4].forEach(q=>c9RenderMCQ('rc',q,RC_QS[q]))
  rcCheckDone()
}

// ══════════════════════════════════════════════════
//  10.7  LINEAR RNN STABILITY
// ══════════════════════════════════════════════════
let lmStage=0, lmUnrollOk=false, lmUnrollTries=0, lmFill={lag:false,design:false,fixed:false,eig:false}, lmFillTries={}
let lmQ={1:null,2:null,3:null,4:null,5:null}
const LM_UNROLL={a:0.5,b:1,c:2}
const LM_FILL={
  lag:{ans:22,hints:['Set w = 0.9 and u = 1, and find the first bar below the dashed 0.1 line.','Solve 0.9<sup>ℓ</sup> &lt; 0.1: ℓ &gt; log 0.1 / log 0.9 ≈ 21.9.'],ok:'0.9²¹ ≈ 0.109 and 0.9²² ≈ 0.098, so ℓ = 22. Even with a weight as large as 0.9, an input fades below a tenth after about 20 steps.'},
  design:{ans:0.926,tol:0.0055,hints:['The weight 9 steps back divided by the newest one is u·w⁹ / u. What happens to u?','u cancels, so you need w⁹ ≥ 0.5, which means w ≥ 0.5<sup>1/9</sup>.'],ok:'w⁹ ≥ 0.5 gives w ≥ 0.5<sup>1/9</sup> ≈ 0.926, so 0.93 on the slider.'},
  fixed:{ans:5,tol:0.01,hints:['Set w = 0.8 and u = 1 and watch where h⁽ᵗ⁾ levels off. Then explain the number: every input is 1, so h⁽ᵀ⁾ is the sum of the weights.','h settles at u·(1 + w + w² + …) = u / (1 − w), which holds when |w| &lt; 1.'],ok:'1 / (1 − 0.8) = 5. For |w| &lt; 1 the state settles at u / (1 − w) and stays bounded. u sets how high it settles; w decides whether it settles at all.'},
  eig:{ans:3.364,tol:0.0055,hints:['Split h⁽⁰⁾ = ½·[1, 1] + ½·[1, −1]. Every step, W multiplies the first part by 1.1 and the second by 0.5.','h⁽²⁰⁾ = ½·1.1²⁰·[1, 1] + ½·0.5²⁰·[1, −1], and 1.1²⁰ ≈ 6.727.'],ok:'½·1.1²⁰ ≈ 3.36, while ½·0.5²⁰ ≈ 5×10⁻⁷ has vanished. With W = QΛQᵀ, h⁽ᵗ⁾ = QΛᵗQᵀh⁽⁰⁾: each eigen-direction is scaled by λᵗ, so the 1.1 part explodes, the 0.5 part vanishes, and the state lines up with [1, 1].'}
}
const LM_QS={
  1:{q:'In general, what weight does the input x⁽ᵏ⁾ carry in h⁽ᵀ⁾?',
     ok:'h⁽ᵀ⁾ = Σ<sub>k</sub> u·w<sup>T−k</sup>·x⁽ᵏ⁾. u is applied once, when the input enters, and w is applied at every step after that. So an input ℓ = T − k steps old carries the weight u·w<sup>ℓ</sup>.',
     opts:[
       {t:'w · u<sup>T−k</sup>',h:'Check it against your numbers: x⁽¹⁾ in h⁽³⁾ got 0.5 = 2·0.5². Which weight is squared?'},
       {t:'(u · w)<sup>T−k</sup>',h:'u is applied only once, when the input enters. Test it: (2·0.5)² = 1, not 0.5.'},
       {t:'u · w<sup>T−k</sup>',c:true},
       {t:'w<sup>T−k</sup>, with no u at all',h:'Check x⁽³⁾: it got weight 2, which is u, not w⁰ = 1.'}
     ]},
  2:{q:'You triple u from 1 to 3. What happens to the memory span, meaning an old input\'s weight relative to the newest one?',
     ok:'The weight ℓ steps back divided by the newest is u·w<sup>ℓ</sup> / u = w<sup>ℓ</sup>, so u cancels. u sets the scale of what comes in; w alone sets how fast it fades. On the log plot, u moves the whole profile up or down and w sets its slope.',
     opts:[
       {t:'It triples: old inputs count three times more',h:'Every bar triples, the newest one too, so the ratio is unchanged. On the log plot the whole profile moves up without tilting.'},
       {t:'It stays the same, since every weight triples',c:true},
       {t:'It shrinks: the newest input dominates more',h:'The newest weight triples, but so does every older one.'},
       {t:'It depends on whether w is positive or not',h:'For any sign of w, the ratio of lag ℓ to lag 0 is w<sup>ℓ</sup>, and u is not in it.'}
     ]},
  3:{q:'Set w = −0.9. What happens to the weights on past inputs?',
     ok:'u·(−0.9)<sup>ℓ</sup> has size u·0.9<sup>ℓ</sup>, so it fades exactly as fast as for w = 0.9, and its sign flips every step. Whether the past fades or explodes depends only on |w|.',
     opts:[
       {t:'They grow, because w is negative',h:'|−0.9| &lt; 1, so the sizes shrink exactly as for w = 0.9.'},
       {t:'They all turn negative and keep their size',h:'Look at the bar colours: they alternate, because (−0.9)<sup>ℓ</sup> is positive for even ℓ and negative for odd ℓ.'},
       {t:'They keep their size and alternate in sign',h:'Their sizes are 0.9<sup>ℓ</sup>, so they still fade. Only |w| = 1 keeps the size.'},
       {t:'They shrink as for 0.9, alternating in sign',c:true}
     ]},
  4:{q:'Now u = 0.01 and w = 1.1, still with the constant input x = 1. What happens to h⁽ᵗ⁾ as t grows?',
     ok:'h⁽ᵗ⁾ = u·(1.1ᵗ − 1)/0.1, which grows like 1.1ᵗ: after 100 steps it is about 0.01·(1.1¹⁰⁰ − 1)/0.1 ≈ 1,400. Stability depends on |w| alone; u only sets the scale.',
     opts:[
       {t:'It grows without bound; a tiny u only delays it',c:true},
       {t:'It settles at its fixed point u / (1 − w) = −0.1',h:'That formula comes from 1 + w + w² + …, which only converges when |w| &lt; 1. Besides, positive inputs and weights cannot make h negative.'},
       {t:'It stays near 0.01, because u is so tiny',h:'Try it. w = 1.1 multiplies the accumulated state by 1.1 every step, so a tiny u only delays the blow-up.'},
       {t:'It decays to 0, because u is below 1',h:'u only scales what comes in. It is w that is applied again and again.'}
     ]},
  5:{q:'Every entry of this W is below 1 (0.8 and 0.3), yet h grows. What decides whether a matrix recurrence vanishes or explodes?',
     ok:'With W = QΛQᵀ, h⁽ᵗ⁾ = QΛᵗQᵀh⁽⁰⁾, so each eigen-direction is scaled by λᵗ. Parts with |λ| &lt; 1 vanish, parts with |λ| &gt; 1 explode, and the state ends up along the largest one. Remembering for a long time needs eigenvalues near 1, which the gated units of 10.10 arrange step by step.',
     opts:[
       {t:'Its largest entry, which must stay below 1',h:'Every entry here is below 1, yet h explodes, because [1, 1] is stretched by 0.8 + 0.3 = 1.1.'},
       {t:'How far it stretches each eigen-direction',c:true},
       {t:'The input weights U, if they are small enough',h:'There is no input here at all. The recurrence grows on its own.'},
       {t:'Its smallest entry, which must stay above 0',h:'The sizes and signs of the entries do not decide it. The stretch factors along the eigen-directions do.'}
     ]}
}

function lmUnlock(s){ const prev=lmStage; lmStage=Math.max(lmStage,s); c9Unlock('lm',prev,s,5) }
// Up to 3 decimals for ordinary sizes, a×10ⁿ for tiny or huge ones.
function lmFmt(v){
  const a=Math.abs(v), sg=v<0?'−':''; if(a===0) return '0'
  if(a>=0.001&&a<1e4) return sg+String(+a.toFixed(a<1?3:2))
  const e=Math.floor(Math.log10(a)); return sg+(a/10**e).toFixed(1)+'×10'+c10Sup(e)
}
function lmCheckUnroll(){
  const ids=['a','b','c'], vals=ids.map(k=>c9Num(($(`lm-c-${k}`)||{value:''}).value))
  if(vals.some(v=>v===null)) return
  let first=null
  ids.forEach((k,i)=>{const ok=vals[i]===LM_UNROLL[k]; $(`lm-c-${k}`).className='rr-inp '+(ok?'ok':'bad'); if(!ok&&!first) first=k})
  const h=$('lm-unroll-hint')
  if(!first){
    lmUnrollOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> h⁽¹⁾ = 2x⁽¹⁾, h⁽²⁾ = x⁽¹⁾ + 2x⁽²⁾, h⁽³⁾ = 0.5·x⁽¹⁾ + 1·x⁽²⁾ + 2·x⁽³⁾. Each input enters once, scaled by u = 2, and is then halved by w at every later step.'
    const q=$('lm-s1q'); if(q) q.classList.add('unlocked')
  } else {
    lmUnrollTries++; h.className='guidance-box warm'
    h.innerHTML='<strong>Not quite.</strong> '+(lmUnrollTries===1?'Substitute step by step: h⁽¹⁾ = 0.5·0 + 2x⁽¹⁾ = 2x⁽¹⁾, then h⁽²⁾ = 0.5·h⁽¹⁾ + 2x⁽²⁾ = x⁽¹⁾ + 2x⁽²⁾. One more step.'
      :({a:'x⁽¹⁾ enters as 2x⁽¹⁾ at step 1 and is then multiplied by w = 0.5 at steps 2 and 3.',b:'x⁽²⁾ enters as 2x⁽²⁾ at step 2 and is multiplied by w = 0.5 once.',c:'x⁽³⁾ has just entered: u·x⁽³⁾.'})[first])
  }
  lmCheckDone()
}
function lmCheckFill(key){ const r=c10Fill('lm',key,LM_FILL[key],lmFillTries); if(r===null) return; lmFill[key]=lmFill[key]||r; lmCheckDone() }
// Bar ℓ: the weight u·w^ℓ of the input ℓ steps back, on a log axis from 10⁻³ to 10¹.
function lmDrawProfile(){
  const w=parseFloat(($('lm-w')||{value:0.5}).value), u=parseFloat(($('lm-u')||{value:1}).value)
  $('lm-w-val').textContent=c9n(w); $('lm-u-val').textContent=c9n(u)
  const N=30, cf=Array.from({length:N},(_,l)=>u*Math.pow(w,l))
  const svg=$('lm-prof-svg')
  if(svg){
    const W=380,H=200,L=40,B=26,T=10,PW=W-L-10,PH=H-B-T, lo=-3, hi=1, Y=v=>T+(hi-Math.max(lo,Math.min(hi,v)))/(hi-lo)*PH, bw=PW/N
    let s=''
    for(let p=lo;p<=hi;p++) s+=`<line x1="${L}" y1="${Y(p)}" x2="${W-10}" y2="${Y(p)}" stroke="#e2d9cc"/><text x="${L-4}" y="${Y(p)+4}" text-anchor="end" font-size="10" fill="#5c4a3a">${p===0?'1':'10'+c10Sup(p)}</text>`
    s+=`<line x1="${L}" y1="${Y(-1)}" x2="${W-10}" y2="${Y(-1)}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 3"/>`
    cf.forEach((v,l)=>{
      const y=Y(v===0?lo:Math.log10(Math.abs(v))), x=L+l*bw+1
      s+=`<rect x="${x}" y="${y}" width="${bw-2}" height="${Math.max(1,Y(lo)-y)}" fill="${v<0?'#b91c1c':'#1d4ed8'}" opacity="0.85"/>`
      if(l%5===0) s+=`<text x="${x+bw/2}" y="${H-12}" text-anchor="middle" font-size="10" fill="#5c4a3a">${l}</text>`
    })
    s+=`<text x="${L+PW/2}" y="${H-1}" text-anchor="middle" font-size="10" fill="#5c4a3a">lag ℓ (steps back)</text>`
    svg.innerHTML=s
  }
  const c=$('lm-prof-calc')
  if(c) c.innerHTML=`<div class="alg-step">newest (ℓ = 0): u = ${lmFmt(cf[0])}</div><div class="alg-step">ℓ = 9: u·w⁹ = ${lmFmt(cf[9])}</div><div class="alg-step">ℓ = 29: u·w²⁹ = ${lmFmt(cf[29])}</div><div class="alg-res">ℓ = 9 vs newest: w⁹ = ${lmFmt(Math.pow(w,9))}</div>`
}
// h⁽ᵗ⁾ for 40 steps of the constant input x = 1, on a linear axis clipped to ±10.
function lmDrawTraj(){
  const w=parseFloat(($('lm-w2')||{value:0.5}).value), u=parseFloat(($('lm-u2')||{value:1}).value)
  $('lm-w2-val').textContent=c9n(w); $('lm-u2-val').textContent=c9n(u)
  const N=40, hs=[]; let h=0
  for(let t=0;t<N;t++){h=w*h+u; hs.push(h)}
  const svg=$('lm-traj-svg')
  if(svg){
    const W=380,H=200,L=40,B=26,T=10,PW=W-L-10,PH=H-B-T, lim=10, Y=v=>T+(lim-Math.max(-lim,Math.min(lim,v)))/(2*lim)*PH, X=t=>L+t*PW/(N-1)
    let s=''
    ;[-10,-5,0,5,10].forEach(v=>{s+=`<line x1="${L}" y1="${Y(v)}" x2="${W-10}" y2="${Y(v)}" stroke="${v===0?'#94a3b8':'#e2d9cc'}"/><text x="${L-4}" y="${Y(v)+4}" text-anchor="end" font-size="10" fill="#5c4a3a">${c9n(v)}</text>`})
    s+=`<polyline points="${hs.map((v,t)=>`${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="#1d4ed8" stroke-width="2"/>`
    hs.forEach((v,t)=>{ if(Math.abs(v)>lim) s+=`<circle cx="${X(t)}" cy="${Y(v)}" r="2.5" fill="#b91c1c"/>` })
    ;[1,10,20,30,40].forEach(t=>{s+=`<text x="${X(t-1)}" y="${H-12}" text-anchor="middle" font-size="10" fill="#5c4a3a">${t}</text>`})
    s+=`<text x="${L+PW/2}" y="${H-1}" text-anchor="middle" font-size="10" fill="#5c4a3a">step t (red dots: off the chart)</text>`
    svg.innerHTML=s
  }
  const c=$('lm-traj-calc')
  if(c) c.innerHTML=`<div class="alg-step">h⁽¹⁰⁾ = ${lmFmt(hs[9])}</div><div class="alg-step">h⁽²⁰⁾ = ${lmFmt(hs[19])}</div><div class="alg-res">h⁽⁴⁰⁾ = ${lmFmt(hs[39])}</div>`
}
// h⁽ᵗ⁾ = Wᵗh⁽⁰⁾ for W = [[0.8, 0.3], [0.3, 0.8]], h⁽⁰⁾ = [1, 0] = ½[1, 1] + ½[1, −1].
function lmEigPoint(k){ const a=0.5*Math.pow(1.1,k), b=0.5*Math.pow(0.5,k); return [a+b,a-b] }
function lmDrawEig(){
  const t=+(($('lm-t')||{value:0}).value); $('lm-t-val').textContent=t
  const svg=$('lm-eig-svg')
  if(svg){
    const S=280, lo=-0.6, hi=1.8, P=v=>20+(v-lo)/(hi-lo)*(S-40), Q=v=>S-20-(v-lo)/(hi-lo)*(S-40)
    let s=`<line x1="${P(lo)}" y1="${Q(0)}" x2="${P(hi)}" y2="${Q(0)}" stroke="#94a3b8"/><line x1="${P(0)}" y1="${Q(lo)}" x2="${P(0)}" y2="${Q(hi)}" stroke="#94a3b8"/>`
    s+=`<text x="${P(1)}" y="${Q(0)+14}" text-anchor="middle" font-size="10" fill="#5c4a3a">1</text><text x="${P(0)-6}" y="${Q(1)+4}" text-anchor="end" font-size="10" fill="#5c4a3a">1</text>`
    s+=`<line x1="${P(lo)}" y1="${Q(lo)}" x2="${P(hi)}" y2="${Q(hi)}" stroke="#1d4ed8" stroke-dasharray="5 4"/><text x="${P(-0.5)}" y="${Q(1.62)}" font-size="11" font-weight="700" fill="#1d4ed8">[1, 1]: λ = 1.1</text>`
    s+=`<line x1="${P(-0.6)}" y1="${Q(0.6)}" x2="${P(0.6)}" y2="${Q(-0.6)}" stroke="#b91c1c" stroke-dasharray="5 4"/><text x="${P(0.65)}" y="${Q(-0.45)}" font-size="11" font-weight="700" fill="#b91c1c">[1, −1]: λ = 0.5</text>`
    const pts=Array.from({length:t+1},(_,k)=>lmEigPoint(k))
    s+=`<polyline points="${pts.map(([x,y])=>`${P(x).toFixed(1)},${Q(y).toFixed(1)}`).join(' ')}" fill="none" stroke="#ea580c" stroke-width="1.5"/>`
    pts.forEach(([x,y],k)=>{s+=`<circle cx="${P(x)}" cy="${Q(y)}" r="${k===t?6:3}" fill="${k===t?'#ea580c':'#fdba74'}"/>`})
    svg.innerHTML=s
  }
  const [x,y]=lmEigPoint(t), c=$('lm-eig-calc')
  if(c) c.innerHTML=`<div class="alg-step">h⁽⁰⁾ = [1, 0] = ½·[1, 1] + ½·[1, −1]</div><div class="alg-step">h⁽${c10Sup(t)}⁾ = ${lmFmt(0.5*Math.pow(1.1,t))}·[1, 1] + ${lmFmt(0.5*Math.pow(0.5,t))}·[1, −1]</div><div class="alg-res">h⁽${c10Sup(t)}⁾ = [${lmFmt(x)}, ${lmFmt(y)}]</div>`
}
function lmMCQ(q,i){ lmQ[q]=c9Answer('lm',q,i,LM_QS[q]); lmCheckDone() }
function lmCheckDone(){
  if(lmUnrollOk&&lmQ[1]===true) lmUnlock(2)
  if(lmFill.lag&&lmFill.design){const q=$('lm-s2q');if(q)q.classList.add('unlocked')}
  if(lmStage>=2&&lmQ[2]===true&&lmQ[3]===true) lmUnlock(3)
  if(lmFill.fixed){const q=$('lm-s3q');if(q)q.classList.add('unlocked')}
  if(lmStage>=3&&lmQ[4]===true) lmUnlock(4)
  if(lmFill.eig){const q=$('lm-s4q');if(q)q.classList.add('unlocked')}
  if(lmStage>=4&&lmQ[5]===true) lmUnlock(5)
  updateBadge('linrnn-completed',isComplete('linrnn'))
}
function initLinRNN(){
  const eq=$('lm-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:14px 20px;text-align:center">
      <div style="color:#b45309">$$h^{(t)}=w\\,h^{(t-1)}+u\\,x^{(t)},\\qquad h^{(0)}=0$$</div>
      <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">w is the recurrent weight (Goodfellow's W) and u the input weight (U), both shrunk to single numbers. Goodfellow §10.7 also removes the tanh this way, to see exactly where long-term memory fails.</div>
    </div>`
    typeset(eq)
  }
  lmDrawProfile(); lmDrawTraj(); lmDrawEig()
  ;[1,2,3,4,5].forEach(q=>c9RenderMCQ('lm',q,LM_QS[q]))
  lmCheckDone()
}

// ══════════════════════════════════════════════════
//  10.10 GRU vs LSTM ARCHITECTURE
// ══════════════════════════════════════════════════
let ggStage=0, ggGates={f:Array(6).fill(0.5),g:Array(6).fill(0.5),u:Array(6).fill(0.5)}
let ggTasks={hold:false,over:false,count:false,ghold:false,gover:false}, ggMapOk=false, ggFill={block:false,lstm:false,gru:false}, ggFillTries={}
let ggQ={1:null,2:null,3:null,4:null,5:null}
const GG_C=[0.8,0.6,0.3,-0.5,0.9,0.7]
const GG_TASKS={
  lstm:[
    ['hold','<strong>Hold:</strong> write 0.8 at step 1 and keep it to step 6 (s⁽¹⁾ = … = s⁽⁶⁾ = 0.8)','g⁽¹⁾ = 1 writes it; f = 1 and g = 0 afterwards keep it untouched.'],
    ['over','<strong>Overwrite:</strong> finish with s⁽⁶⁾ = −0.5, the step-4 candidate','f⁽⁴⁾ = 0 clears the cell and g⁽⁴⁾ = 1 writes; then hold.'],
    ['count','<strong>Count:</strong> finish with s⁽⁶⁾ = 2.8, the sum of all six candidates','f = g = 1 everywhere: the cell adds up every candidate, and it is not limited to (−1, 1).']
  ],
  gru:[
    ['ghold','<strong>Hold:</strong> write 0.8 at step 1 and keep it to step 6','u⁽¹⁾ = 0 writes the candidate in full; u = 1 afterwards keeps it.'],
    ['gover','<strong>Overwrite:</strong> finish with h⁽⁶⁾ = −0.5','u⁽⁴⁾ = 0 replaces the state with the candidate; then hold.']
  ]
}
const GG_MAP_OPTS=['update gate u','1 − u','reset gate r','h itself','nothing: h is output as it is']
const GG_MAP=[
  {part:'Forget gate f: how much of the old memory to keep',ans:'update gate u',hint:'In h⁽ᵗ⁾ = u·h⁽ᵗ⁻¹⁾ + (1 − u)·h̃⁽ᵗ⁾, which factor multiplies the old state?'},
  {part:'Input gate g: how much of the candidate to write',ans:'1 − u',hint:'Which factor multiplies the candidate h̃⁽ᵗ⁾?'},
  {part:'Output gate q: how much of the memory to show as h',ans:'nothing: h is output as it is',hint:'Does the GRU scale its state before showing it? Its h⁽ᵗ⁾ is both its memory and its output.'},
  {part:'Cell state s: the memory itself',ans:'h itself',hint:'The GRU has only one state vector. Which one?'}
]
const GG_FILL={
  block:{ans:15100,hints:['A block has b (n numbers), U (n × m) and W (n × n). Add them up.','100 + 100·50 + 100·100.'],ok:'100 + 5,000 + 10,000 = 15,100, the same as a whole plain RNN layer (b + U x + W h).'},
  lstm:{ans:60400,hints:['How many σ or tanh blocks are in the LSTM equations? Count f, g, q and the candidate.','4 blocks × 15,100.'],ok:'4 × 15,100 = 60,400, four times a plain RNN layer. (PyTorch keeps two bias vectors per block, so nn.LSTM(50, 100) reports 60,800.)'},
  gru:{ans:45300,hints:['Count the GRU blocks: u, r and the candidate.','3 blocks × 15,100.'],ok:'3 × 15,100 = 45,300: a quarter fewer than the LSTM, with one state vector instead of two.'}
}
const GG_QS={
  1:{q:'Along the cell, ∂s⁽ᵗ⁾/∂s⁽ᵗ⁻¹⁾ = f⁽ᵗ⁾ (the direct path). Why does that help, compared with a plain RNN\'s factor w·tanh′ (10.2.2)?',
     ok:'The cell path has no tanh′ to squash the gradient, and f⁽ᵗ⁾ acts as a w chosen at every step. While something must be remembered it stays near 1 and the gradient passes almost intact (the "constant error carousel"); when it is time to forget, it drops to 0.',
     opts:[
       {t:'f is always exactly 1, so nothing ever fades',h:'f is a sigmoid output between 0 and 1. At f = 0 the cell forgets on purpose, which is how you overwrote it.'},
       {t:'The network picks f each step and can keep it ≈ 1',c:true},
       {t:'The cell has no weights of its own, so needs no gradient',h:'The gates have weights (U, W, b), and they are trained through this very path.'},
       {t:'f is fixed after training, like the plain RNN\'s w',h:'The opposite is true: f⁽ᵗ⁾ is recomputed from x⁽ᵗ⁾ and h⁽ᵗ⁻¹⁾ at every step.'}
     ]},
  2:{q:'Try the LSTM\'s counting task on the GRU. Can h⁽⁶⁾ reach 2.8?',
     ok:'h⁽ᵗ⁾ = u·h⁽ᵗ⁻¹⁾ + (1 − u)·h̃⁽ᵗ⁾ is a weighted average of the old state and a tanh candidate, so h always stays inside (−1, 1). The LSTM\'s separate f and g let its cell add things up to 2.8, while its output h = q ⊙ tanh(s) stays bounded.',
     opts:[
       {t:'Yes: set u = 1 at every step to keep it all',h:'u = 1 keeps h⁽⁰⁾ = 0 forever, so nothing is ever written.'},
       {t:'Yes: set u = 0 at every step to write it all',h:'u = 0 replaces the state at every step, so h⁽⁶⁾ is just the last candidate, 0.7.'},
       {t:'Only if the reset gate r is also set to 1',h:'r only changes how the candidate is computed. The update is still a weighted average.'},
       {t:'No: keep + write = 1, so h is an average',c:true}
     ]},
  3:{q:'The GRU\'s reset gate r has no LSTM counterpart. What does it do?',
     ok:'h̃⁽ᵗ⁾ = tanh(b + U x⁽ᵗ⁾ + W (r⁽ᵗ⁾ ⊙ h⁽ᵗ⁻¹⁾)). Where r ≈ 0, the candidate is computed as if the past were blank, so the GRU can start something new, while u still decides whether that candidate replaces the memory.',
     opts:[
       {t:'It clears the whole state h back to zero',h:'r never touches h directly; it acts inside the candidate. Keeping or replacing h is the job of u.'},
       {t:'It chooses how much of h to show as output',h:'That is the LSTM\'s output gate q. The GRU outputs h as it is.'},
       {t:'It lets the candidate ignore parts of h⁽ᵗ⁻¹⁾',c:true},
       {t:'It restarts the sequence when the loss rises',h:'It is an ordinary learned gate, computed from x⁽ᵗ⁾ and h⁽ᵗ⁻¹⁾ at every step.'}
     ]},
  4:{q:'Greff et al. (2015) tested LSTM variants, each changing one component. Which proved most critical?',
     ok:'Removing the forget gate or the activation on the output hurt badly on every task, and no variant significantly beat the standard LSTM. Coupling the input and forget gates (as the GRU does) or dropping peepholes cost little. The forget gate is exactly the learned w from 10.7.',
     opts:[
       {t:'The forget gate and the output tanh',c:true},
       {t:'The peephole links from the cell to the gates',h:'Removing the peepholes made little difference.'},
       {t:'Having separate input and forget gates',h:'Coupling them into one gate, GRU-style, barely hurt. That is part of why the GRU works so well.'},
       {t:'All parts mattered about equally',h:'Two components stood out; peepholes and gate coupling mattered little.'}
     ]},
  5:{q:'Jozefowicz et al. (2015) found one simple change that put the LSTM level with the best variants. At the start of training the weights are near 0, so f ≈ σ(b<sub>f</sub>). What was the change?',
     ok:'σ(1) ≈ 0.73, so 0.73¹⁰ ≈ 0.04 of the cell survives 10 steps instead of 0.5¹⁰ ≈ 0.001. Gradients reach much further back from the very first updates, and the network can then learn when to forget. Keras uses this initialisation by default.',
     opts:[
       {t:'b<sub>f</sub> = 0, so f starts at a neutral 0.5',h:'That was the usual default. 0.5¹⁰ ≈ 0.001, so the cell forgets nearly everything within 10 steps before training has even begun.'},
       {t:'Drop the forget gate so that f is always 1',h:'Greff et al. found the forget gate critical: without it the cell can never clear.'},
       {t:'b<sub>f</sub> = −1, so the cell starts fresh at each step',h:'f ≈ 0.27 forgets even faster: 0.27¹⁰ ≈ 2×10⁻⁶.'},
       {t:'b<sub>f</sub> = 1, so f starts near 0.73',c:true}
     ]}
}

function ggUnlock(s){ const prev=ggStage; ggStage=Math.max(ggStage,s); c9Unlock('gg',prev,s,6) }
function ggRunLSTM(){ let s=0; return GG_C.map((c,t)=>s=ggGates.f[t]*s+ggGates.g[t]*c) }
function ggRunGRU(){ let h=0; return GG_C.map((c,t)=>h=ggGates.u[t]*h+(1-ggGates.u[t])*c) }
const ggEq=(a,b)=>Math.abs(a-b)<1e-9
// One row per gate, one column per step; clicking a gate value cycles it 0 → 0.5 → 1.
function ggTape(kind){
  const el=$(`gg-tape-${kind}`); if(!el) return
  const L=kind==='lstm', S=L?ggRunLSTM():ggRunGRU(), td='style="text-align:center"'
  const gate=(g,t)=>`<td ${td}><button class="sl-preset-btn${ggGates[g][t]===1?' active':''}" style="min-width:46px" onclick="ggSet('${g}',${t})">${c9n(ggGates[g][t])}</button></td>`
  const val=v=>`<td ${td}><strong style="color:${v>1e-9?'#1d4ed8':v<-1e-9?'#b91c1c':'var(--muted)'}">${c9n(v)}</strong></td>`
  let r=`<tr><th>step t</th>${GG_C.map((_,t)=>`<th ${td}>${t+1}</th>`).join('')}</tr>`
  r+=`<tr><td>candidate ${L?'s̃':'h̃'}⁽ᵗ⁾</td>${GG_C.map(c=>`<td ${td}>${c9n(c)}</td>`).join('')}</tr>`
  if(L){
    r+=`<tr><td>forget f⁽ᵗ⁾ (keep)</td>${GG_C.map((_,t)=>gate('f',t)).join('')}</tr>`
    r+=`<tr><td>input g⁽ᵗ⁾ (write)</td>${GG_C.map((_,t)=>gate('g',t)).join('')}</tr>`
    r+=`<tr><td><strong>cell s⁽ᵗ⁾</strong></td>${S.map(val).join('')}</tr>`
  } else {
    r+=`<tr><td>update u⁽ᵗ⁾ (keep)</td>${GG_C.map((_,t)=>gate('u',t)).join('')}</tr>`
    r+=`<tr><td>1 − u⁽ᵗ⁾ (write)</td>${ggGates.u.map(v=>`<td style="text-align:center;color:var(--muted)">${c9n(1-v)}</td>`).join('')}</tr>`
    r+=`<tr><td><strong>state h⁽ᵗ⁾</strong></td>${S.map(val).join('')}</tr>`
  }
  el.innerHTML=`<table class="contrib-table" style="min-width:520px">${r}</table>`
}
function ggChecklist(){
  ;['lstm','gru'].forEach(kind=>{
    const el=$(`gg-tasks-${kind}`); if(!el) return
    el.innerHTML=GG_TASKS[kind].map(([k,t,why])=>`<div><span style="color:${ggTasks[k]?'var(--green)':'var(--muted)'};font-weight:800">${ggTasks[k]?'✓':'○'}</span> ${t}${ggTasks[k]?` <span style="color:var(--muted)">(${why})</span>`:''}</div>`).join('')
      +(kind==='gru'?'<div style="color:var(--muted)">Then try the LSTM\'s <strong>count</strong> task here: can h⁽⁶⁾ reach 2.8?</div>':'')
  })
}
function ggSet(g,t){ ggGates[g][t]=ggGates[g][t]===0?0.5:ggGates[g][t]===0.5?1:0; ggUpdate(g==='u'?'gru':'lstm') }
function ggReset(kind){ (kind==='lstm'?['f','g']:['u']).forEach(g=>ggGates[g]=Array(6).fill(0.5)); ggUpdate(kind) }
function ggUpdate(kind){
  if(kind==='lstm'){ const s=ggRunLSTM(); if(s.every(v=>ggEq(v,0.8))) ggTasks.hold=true; if(ggEq(s[5],-0.5)) ggTasks.over=true; if(ggEq(s[5],2.8)) ggTasks.count=true }
  else { const h=ggRunGRU(); if(h.every(v=>ggEq(v,0.8))) ggTasks.ghold=true; if(ggEq(h[5],-0.5)) ggTasks.gover=true }
  ggTape(kind); ggChecklist(); ggCheckDone()
}
function ggRenderMap(){
  const el=$('gg-map'); if(!el||el.children.length) return
  el.innerHTML=GG_MAP.map((m,i)=>`<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="width:min(400px,100%);font-size:14.5px;font-weight:600">${m.part}</span><span style="color:var(--muted)">→ GRU:</span><select id="gg-m-${i}" class="sl-match-sel" onchange="this.className='sl-match-sel'">${['—',...GG_MAP_OPTS].map(o=>`<option>${o}</option>`).join('')}</select></div>`).join('')
}
function ggCheckMap(){
  const h=$('gg-map-hint'); let first=-1
  GG_MAP.forEach((m,i)=>{const e=$(`gg-m-${i}`), ok=e.value===m.ans; e.className='sl-match-sel '+(ok?'ok':'bad'); if(!ok&&first<0) first=i})
  if(first<0){
    ggMapOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> f ↔ u and g ↔ 1 − u: the GRU ties keeping and writing together. It has no output gate and no separate cell, because h is both the memory and the output. In exchange it adds the reset gate r, which has no LSTM counterpart.'
    const q=$('gg-s3q'); if(q) q.classList.add('unlocked')
  } else { h.className='guidance-box warm'; h.innerHTML=`<strong>Not quite: ${GG_MAP[first].part.split(':')[0]}.</strong> ${GG_MAP[first].hint}` }
  ggCheckDone()
}
function ggCheckFill(key){ const r=c10Fill('gg',key,GG_FILL[key],ggFillTries); if(r===null) return; ggFill[key]=ggFill[key]||r; ggCheckDone() }
function ggMCQ(q,i){ ggQ[q]=c9Answer('gg',q,i,GG_QS[q]); ggCheckDone() }
function ggCheckDone(){
  if(ggTasks.hold&&ggTasks.over&&ggTasks.count){const q=$('gg-s1q');if(q)q.classList.add('unlocked')}
  if(ggQ[1]===true) ggUnlock(2)
  if(ggTasks.ghold&&ggTasks.gover){const q=$('gg-s2q');if(q)q.classList.add('unlocked')}
  if(ggStage>=2&&ggQ[2]===true) ggUnlock(3)
  if(ggStage>=3&&ggQ[3]===true) ggUnlock(4)
  if(ggStage>=4&&ggFill.block&&ggFill.lstm&&ggFill.gru) ggUnlock(5)
  if(ggQ[4]===true&&ggQ[5]===true) ggUnlock(6)
  updateBadge('grucomp-completed',isComplete('grucomp'))
}
function initGRUComp(){
  ggTape('lstm'); ggTape('gru'); ggChecklist(); ggRenderMap()
  ;[1,2,3,4,5].forEach(q=>c9RenderMCQ('gg',q,GG_QS[q]))
  ggCheckDone()
}

// ══════════════════════════════════════════════════
//  10.TF TRANSFORMER POSITIONAL ENCODING
// ══════════════════════════════════════════════════
let poStage=0, poOrder=0, poPE=false, poSeen={order2:false,pe:false}, poCell=null
let poFill={pred:false,div:false,cos:false,dot:false,alibi:false}, poFillTries={}, poMatchOk=false
let poQ={1:null,2:null,3:null,4:null,5:null}
const PO_EMB={dog:[1,0],bites:[0,1],man:[1.5,0.5]}
const PO_ORDERS=[['dog','bites','man'],['man','bites','dog']]
// Self-attention with W_Q = W_K = W_V = I: A = softmax(XXᵀ/√2) and outputs Z = A·X.
// With positions on, the word at position p (0, 1, 2) gets [sin p, cos p] added first.
function poAttend(words,pe){
  const X=words.map((w,p)=>PO_EMB[w].map((v,k)=>v+(pe?(k?Math.cos(p):Math.sin(p)):0)))
  const A=X.map(a=>{const e=X.map(b=>Math.exp((a[0]*b[0]+a[1]*b[1])/Math.SQRT2)), s=e.reduce((x,y)=>x+y,0); return e.map(v=>v/s)})
  return {A,Z:A.map(r=>[0,1].map(k=>r.reduce((s,a,j)=>s+a*X[j][k],0)))}
}
const PO_FILL={
  pred:{ans:poAttend(PO_ORDERS[0],false).A[2][0],tol:0.006,hints:['Attention only compares the word vectors with each other, so their order plays no part in the numbers. Which cell of the map you can see compares man with dog?','In "dog bites man", read the row "man" at the column "dog".'],ok:'0.28, the same number as in "dog bites man". Reordering the words only moves rows and columns around. Now look at the other order.'},
  div:{ans:100,hints:['The divisor is 10000<sup>2i/d</sup>. Put in i = 1 and d = 4.','10000<sup>2/4</sup> = 10000<sup>0.5</sup> = √10000.'],ok:'10000<sup>1/2</sup> = 100, so the second pair is [sin(p/100), cos(p/100)]. It turns 100 times more slowly than the first pair, [sin p, cos p]. Fast pairs tell neighbours apart and slow pairs tell distant positions apart, like the hands of a clock.'},
  cos:{ans:Math.cos(2),tol:0.006,hints:['PE(2, 1) is the cos of the first pair (i = 0, divisor 1), so it is cos(2/1). Use radians, not degrees.','cos(2) in radians ≈ −0.42.'],ok:'PE(2) = [sin 2, cos 2, sin 0.02, cos 0.02] ≈ [0.909, −0.416, 0.020, 1.000]. Each pair is a point on a circle, so every PE(p) has the same length: √2 for d = 4.'},
  dot:{ans:Math.cos(2)+Math.cos(0.02),tol:0.006,hints:['Click cells two steps off the diagonal, such as PE(3)·PE(5) and PE(7)·PE(9). What do you notice?','PE(p)·PE(q) = cos(p − q) + cos((p − q)/100). Only the offset matters, and here it is 2.'],ok:'cos 2 + cos 0.02 ≈ −0.416 + 1.000 = 0.584, the same for <em>every</em> pair two apart, because sin a·sin b + cos a·cos b = cos(a − b) in each pair. Put another way, PE(p + k) is PE(p) rotated pair by pair by angles that depend only on k.'},
  alibi:{ans:Math.exp(-1)/(1+Math.exp(-0.5)+Math.exp(-1)),tol:0.006,hints:['With equal content scores, the score at distance d is just −0.5·d. Softmax makes the weight proportional to e<sup>−0.5·d</sup>.','e⁰ = 1, e<sup>−0.5</sup> ≈ 0.607 and e<sup>−1</sup> ≈ 0.368. Divide the last one by the sum.'],ok:'0.368 / (1 + 0.607 + 0.368) ≈ 0.19, with 0.51 and 0.31 for distances 0 and 1. Every extra step of distance multiplies the weight by e<sup>−m</sup>: a fixed, smooth preference for nearby words.'}
}
const PO_METHODS=['Sinusoidal (original transformer)','Learned absolute (BERT, GPT-2)','Relative bias (T5)','ALiBi','Rotary (RoPE)']
const PO_MATCH=[
  {f:'x<sub>p</sub> + E[p], where E is a trained table with 512 rows',ans:1,hint:'A trained row for each position, added to the input: a learned lookup table.'},
  {f:'score = q<sub>i</sub>·k<sub>j</sub> − m·|i − j|, with m fixed for each head',ans:3,hint:'A fixed penalty that grows linearly with distance, from Stage 3.'},
  {f:'score = (R<sub>i</sub>q<sub>i</sub>)·(R<sub>j</sub>k<sub>j</sub>) = q<sub>i</sub>ᵀR<sub>j−i</sub>k<sub>j</sub>, where R<sub>p</sub> rotates by angles ∝ p',ans:4,hint:'Rotating q and k by their positions makes the score depend on j − i: a rotary encoding.'},
  {f:'x<sub>p</sub> + PE(p), with PE(p) built from sin and cos',ans:0,hint:'sin and cos added to the input: the encoding from Stage 2.'},
  {f:'score = q<sub>i</sub>·k<sub>j</sub> + b[bucket(i − j)], with b trained',ans:2,hint:'A trained number for each distance bucket, added to the score.'}
]
const PO_QS={
  1:{q:'Without position information, what does swapping "dog" and "man" do to the attention outputs?',
     ok:'Self-attention is permutation-equivariant: shuffling the input shuffles the outputs in the same way (A′ = PAPᵀ for a permutation matrix P). After pooling, "dog bites man" and "man bites dog" look identical. Adding position vectors breaks the tie, and with positions on, "dog" gets a different output in each order.',
     opts:[
       {t:'It leaves the heat map the same, cell for cell',h:'The cells move: row "man" is now on top. The numbers travel with their words, so rows and columns are permuted, not unchanged.'},
       {t:'It swaps their outputs; each word\'s output is the same',c:true},
       {t:'It changes every word\'s output, since the order changed',h:'Compare "dog" in both orders with positions off: the output vector is identical.'},
       {t:'It makes the model read the words right to left',h:'Attention has no reading direction at all. Every word looks at every word at once.'}
     ]},
  2:{q:'PE(p)·PE(p + k) depends only on the offset k. Why is that useful?',
     ok:'Because PE(p + k) is PE(p) rotated pair by pair by angles that depend only on k, attention can learn one offset pattern and apply it at every position. Vaswani et al. (2017) chose sinusoids partly for this reason.',
     opts:[
       {t:'"Look 2 words back" works the same at every position',c:true},
       {t:'Far-apart positions always get larger dot products',h:'The dot product oscillates with k. Check the heat map: it does not grow with distance.'},
       {t:'It lets the model ignore the words\' content',h:'PE is added to the word vector, so the content is still there.'},
       {t:'Each vector\'s length grows with p, marking later words',h:'Every PE(p) has the same length (√2 for d = 4), since sin² + cos² = 1 in each pair.'}
     ]},
  3:{q:'A model with ALiBi is trained on 1,024-token texts and then given 4,000 tokens. Why does it cope better than a learned position table?',
     ok:'A learned table has no row for position 3,000. ALiBi\'s bias is a formula in the distance, so longer inputs need nothing new. Press et al. (2022) showed that it extrapolates far better than sinusoids, which exist for any position but degrade on lengths not seen in training.',
     opts:[
       {t:'It retrains its slopes m on the longer texts',h:'m is fixed for each head (a geometric sequence such as 1/2, 1/4, …), not learned or retrained.'},
       {t:'It quietly drops every token beyond position 1,024',h:'It attends to all of them; far ones just get smaller weights.'},
       {t:'It stores a vector for each position up to 4,000',h:'ALiBi stores no position vectors at all.'},
       {t:'The penalty m·|i − j| is defined for any distance',c:true}
     ]},
  4:{q:'T5 adds a trained bias b[bucket(i − j)] to each score. Its buckets get wider with distance, and the last one covers every distance from 128 tokens on. What does this design give up?',
     ok:'Grouping distances keeps the table small and lets T5 run on inputs of any length, but every distance beyond the cutoff shares one bias. So its position signal cannot tell a word 200 tokens away from one 2,000 tokens away; only the content can.',
     opts:[
       {t:'Reading inputs longer than 128 tokens at all',h:'Every distance maps to some bucket, so inputs of any length work.'},
       {t:'Any sense of word order between nearby words',h:'Short distances get their own narrow buckets, so nearby order is captured precisely.'},
       {t:'Telling apart distances like 200 and 2,000 tokens',c:true},
       {t:'Learning the position biases from data',h:'The biases b are trained.'}
     ]},
  5:{q:'In which methods does the position part of the score depend only on the offset i − j?',
     ok:'Relative methods put position into the score as a function of i − j: T5 with a trained bias for each distance bucket, ALiBi with a fixed linear penalty, and RoPE by rotating q and k so their dot product sees only j − i. Absolute methods add a vector for each position to the input.',
     opts:[
       {t:'Only ALiBi, through its linear penalty',h:'T5\'s bias b[bucket(i − j)] and RoPE\'s q<sub>i</sub>ᵀR<sub>j−i</sub>k<sub>j</sub> also use only the offset.'},
       {t:'Sinusoidal and learned absolute',h:'These add a vector for the absolute position p to the input, so the scores mix content with absolute positions.'},
       {t:'All five, since all encode positions',h:'Learned absolute vectors are arbitrary trained rows, and nothing ties E[p]·E[p + k] to k. Sinusoids come closer, since PE(i)·PE(j) depends only on i − j, but W<sub>Q</sub>, W<sub>K</sub> and the cross terms between word and position vectors bring absolute positions back into the score.'},
       {t:'Relative bias, ALiBi and RoPE',c:true}
     ]}
}

function poUnlock(s){ const prev=poStage; poStage=Math.max(poStage,s); c9Unlock('po',prev,s,5) }
const poVec=z=>`[${z.map(v=>v.toFixed(2)).join(', ')}]`
function poDrawAtt(){
  const svg=$('po-att-svg'); if(!svg) return
  const words=PO_ORDERS[poOrder], {A,Z}=poAttend(words,poPE), S=56, L=62, T=46
  document.querySelectorAll('.po-ord-btn').forEach(b=>b.classList.toggle('active',+b.dataset.v===poOrder))
  let s=`<text x="${L+1.5*S}" y="16" text-anchor="middle" font-size="11" fill="#5c4a3a">attends to →</text>`
  words.forEach((w,j)=>{s+=`<text x="${L+j*S+S/2}" y="${T-8}" text-anchor="middle" font-size="12" font-weight="700" fill="#1a1210">${w}</text>`})
  A.forEach((row,i)=>{
    s+=`<text x="${L-8}" y="${T+i*S+S/2+4}" text-anchor="end" font-size="12" font-weight="700" fill="#1a1210">${words[i]}</text>`
    row.forEach((v,j)=>{s+=`<rect x="${L+j*S}" y="${T+i*S}" width="${S-3}" height="${S-3}" rx="5" fill="rgba(29,78,216,${Math.min(0.9,v*1.2).toFixed(2)})"/><text x="${L+j*S+S/2-1}" y="${T+i*S+S/2+4}" text-anchor="middle" font-size="13" font-weight="700" font-family="monospace" fill="${v>0.4?'#fff':'#1a1210'}">${v.toFixed(2)}</text>`})
  })
  svg.innerHTML=s
  const out=$('po-out'); if(!out) return
  const d0=poAttend(PO_ORDERS[0],poPE).Z[0], d1=poAttend(PO_ORDERS[1],poPE).Z[2], same=d0.every((v,k)=>Math.abs(v-d1[k])<1e-9)
  out.innerHTML=`<div class="alg-step">outputs, one row of A·V per word (positions ${poPE?'<strong>on</strong>':'off'}):</div>${words.map((w,i)=>`<div class="alg-step">${w}: ${poVec(Z[i])}</div>`).join('')}`
    +(poSeen.order2?`<div class="alg-res">dog in "dog bites man": ${poVec(d0)}<br>dog in "man bites dog": ${poVec(d1)} ${same?'(the same)':'(different)'}</div>`:'')
}
function poSetOrder(i){ if(i===1&&!poFill.pred) return; poOrder=i; if(i===1) poSeen.order2=true; poRefresh() }
function poTogglePE(){ if(!poSeen.order2) return; poPE=!poPE; if(poPE) poSeen.pe=true; poRefresh() }
function poRefresh(){
  const b1=$('po-ord1'); if(b1&&poFill.pred){b1.disabled=false;b1.style.opacity='';b1.textContent='man bites dog'}
  const pb=$('po-pe-btn'); if(pb){ if(poSeen.order2){pb.disabled=false;pb.style.opacity=''} pb.textContent='Positions: '+(poPE?'on':'off'); pb.classList.toggle('active',poPE) }
  poDrawAtt()
  const el=$('po-tasks')
  if(el) el.innerHTML=[[poFill.pred,'Predict man → dog in "man bites dog"'],[poSeen.order2,'Show "man bites dog": compare the two maps and the outputs for dog'],[poSeen.pe,'Turn positions on and compare dog in both orders again']].map(([ok,t])=>`<div><span style="color:${ok?'var(--green)':'var(--muted)'};font-weight:800">${ok?'✓':'○'}</span> ${t}</div>`).join('')
  poCheckDone()
}
function poDrawPE(){
  const svg=$('po-pe-svg'); if(!svg) return
  const N=16, S=16, L=26, T=26, dot=(p,q)=>Math.cos(p-q)+Math.cos((p-q)/100)
  let s=''
  for(let p=0;p<N;p++) for(let q=0;q<N;q++){ const sel=poCell&&poCell[0]===p&&poCell[1]===q; s+=`<rect x="${L+q*S}" y="${T+p*S}" width="${S-1}" height="${S-1}" fill="${c9Heat(dot(p,q),2)}" stroke="${sel?'#f97316':'none'}" stroke-width="2" style="cursor:pointer" onclick="poPECell(${p},${q})"/>` }
  for(let i=0;i<N;i+=5) s+=`<text x="${L+i*S+S/2}" y="${T-6}" text-anchor="middle" font-size="10" fill="#5c4a3a">${i}</text><text x="${L-5}" y="${T+i*S+S/2+3}" text-anchor="end" font-size="10" fill="#5c4a3a">${i}</text>`
  s+=`<text x="${L+N*S/2}" y="10" text-anchor="middle" font-size="10" fill="#5c4a3a">q →</text><text x="6" y="${T+N*S/2}" font-size="10" fill="#5c4a3a">p</text>`
  svg.innerHTML=s
  const info=$('po-pe-info')
  if(info&&poCell){ const [p,q]=poCell; info.innerHTML=`<div class="alg-step">positions p = ${p}, q = ${q} (offset q − p = ${c9n(q-p)})</div><div class="alg-res">PE(${p})·PE(${q}) = ${dot(p,q).toFixed(3)}</div>` }
}
function poPECell(p,q){ poCell=[p,q]; poDrawPE() }
function poDrawAlibi(){
  const m=parseFloat(($('po-m')||{value:0.25}).value); $('po-m-val').textContent=c9n(m)
  const D=[5,4,3,2,1,0], e=D.map(d=>Math.exp(-m*d)), Zs=e.reduce((a,b)=>a+b,0), wts=e.map(v=>v/Zs)
  const svg=$('po-alibi-svg')
  if(svg){
    const W=360,H=190,L=34,B=40,T=14,PW=W-L-10,PH=H-B-T,bw=PW/6
    let s=''
    ;[0,0.5,1].forEach(v=>{const y=T+PH-v*PH; s+=`<line x1="${L}" y1="${y}" x2="${W-10}" y2="${y}" stroke="#e2d9cc"/><text x="${L-4}" y="${y+4}" text-anchor="end" font-size="10" fill="#5c4a3a">${v}</text>`})
    wts.forEach((v,k)=>{
      const x=L+k*bw+6, y=T+PH-v*PH, cx=x+(bw-12)/2
      s+=`<rect x="${x}" y="${y}" width="${bw-12}" height="${v*PH}" fill="${D[k]===0?'#ea580c':'#1d4ed8'}" opacity="0.85"/><text x="${cx}" y="${y-4}" text-anchor="middle" font-size="10" font-weight="700" fill="#1a1210">${v.toFixed(2)}</text>`
      s+=`<text x="${cx}" y="${H-24}" text-anchor="middle" font-size="10" fill="#5c4a3a">${D[k]===0?'itself':D[k]+' back'}</text><text x="${cx}" y="${H-10}" text-anchor="middle" font-size="10" fill="#b91c1c">${D[k]?'−'+c9n(m*D[k]):'0'}</text>`
    })
    svg.innerHTML=s
  }
  const c=$('po-alibi-calc')
  if(c) c.innerHTML=`<div class="alg-step">score = content score − m·distance (red numbers)</div><div class="alg-step">weight ∝ e<sup>−m·d</sup>: each step back × ${Math.exp(-m).toFixed(2)}</div><div class="alg-res">weight on the word itself: ${wts[5].toFixed(2)}</div>`
}
function poCheckFill(key){ const r=c10Fill('po',key,PO_FILL[key],poFillTries); if(r===null) return; poFill[key]=poFill[key]||r; poRefresh() }
function poRenderMatch(){
  const el=$('po-match'); if(!el||el.children.length) return
  const opts=['—','ALiBi','Learned absolute (BERT, GPT-2)','Relative bias (T5)','Rotary (RoPE)','Sinusoidal (original transformer)']
  el.innerHTML=PO_MATCH.map((m,i)=>`<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="min-width:min(330px,100%);flex:1;font-family:'Courier New',monospace;font-size:13.5px;font-weight:700">${m.f}</span><select id="po-m-${i}" class="sl-match-sel" style="min-width:min(260px,100%)" onchange="this.className='sl-match-sel'">${opts.map(o=>`<option>${o}</option>`).join('')}</select></div>`).join('')
}
function poCheckMatch(){
  const h=$('po-match-hint'); let first=-1
  PO_MATCH.forEach((m,i)=>{const e=$(`po-m-${i}`), ok=e.value===PO_METHODS[m.ans]; e.className='sl-match-sel '+(ok?'ok':'bad'); if(!ok&&first<0) first=i})
  if(first<0){
    poMatchOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> Every formula is matched to its method. Notice where position enters in each one: the input, or the score.'
    const q=$('po-s4q'); if(q) q.classList.add('unlocked')
  } else { h.className='guidance-box warm'; h.innerHTML=`<strong>Not quite (row ${first+1}).</strong> ${PO_MATCH[first].hint}` }
  poCheckDone()
}
function poMCQ(q,i){ poQ[q]=c9Answer('po',q,i,PO_QS[q]); poCheckDone() }
function poCheckDone(){
  if(poSeen.order2&&poSeen.pe){const q=$('po-s1q');if(q)q.classList.add('unlocked')}
  if(poQ[1]===true) poUnlock(2)
  if(poFill.div&&poFill.cos&&poFill.dot){const q=$('po-s2q');if(q)q.classList.add('unlocked')}
  if(poStage>=2&&poQ[2]===true) poUnlock(3)
  if(poFill.alibi){const q=$('po-s3q');if(q)q.classList.add('unlocked')}
  if(poStage>=3&&poQ[3]===true) poUnlock(4)
  if(poQ[4]===true&&poQ[5]===true) poUnlock(5)
  updateBadge('trfpos-completed',isComplete('trfpos'))
}
function initTrfPos(){
  const eq=$('po-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:14px 20px;text-align:center">
      <div style="color:#6d28d9">$$A=\\operatorname{softmax}\\!\\Big(\\frac{QK^{\\top}}{\\sqrt{d}}\\Big),\\qquad \\text{outputs}=AV$$</div>
      <div style="color:#6d28d9">$$Q=XW_Q,\\quad K=XW_K,\\quad V=XW_V$$</div>
      <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">X has one row per word. Row i of A says how much word i attends to each word j. Nothing in these formulas mentions a word's position.</div>
    </div>`
    typeset(eq)
  }
  const pe=$('po-pe-eq')
  if(pe){
    pe.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 20px;text-align:center;color:#b45309">$$PE(p,2i)=\\sin\\!\\Big(\\frac{p}{10000^{2i/d}}\\Big),\\qquad PE(p,2i+1)=\\cos\\!\\Big(\\frac{p}{10000^{2i/d}}\\Big)$$</div>`
    typeset(pe)
  }
  poRefresh(); poDrawPE(); poDrawAlibi(); poRenderMatch()
  ;[1,2,3,4,5].forEach(q=>c9RenderMCQ('po',q,PO_QS[q]))
  poCheckDone()
}

// ══════════════════════════════════════════════════
//  11.1 CANCER NLP
// ══════════════════════════════════════════════════
// Questions, stages and fill-ins use the shared helpers (c9RenderMCQ, c9Answer, c9Unlock, c10Fill, …).
let cnStage=0, cnFill={acc:false,rec:false,prec:false,read:false,cov:false}, cnFillTries={}, cnTasks={accmax:false,rec98:false}
let cnQ={1:null,2:null,3:null,4:null,5:null}
// Model scores in 20 bins of width 0.05 (bin i holds scores from 0.05·i up to 0.05·(i + 1)).
const CN_POS=[0,1,2,3,4,5,6,7,8,10,12,15,20,25,32,40,50,65,85,110]
const CN_NEG=[4000,2200,1200,700,450,300,200,140,100,70,50,28,22,14,10,7,4,3,1,1]
const CN_FILL={
  acc:{ans:95,tol:0.01,pct:true,hints:['Which notes does "never flag" get right? Count them.','It is right about all 9,500 non-cancer notes, out of 10,000.'],ok:'9,500 / 10,000 = 95%, while finding none of the 500 cancer cases (recall 0%). When one class is rare, accuracy mostly measures how well the common class is handled.'},
  rec:{ans:90.8,tol:0.3,pct:true,hints:['Read TP and FN from the table. Recall = TP / (TP + FN).','454 / (454 + 46) = 454 / 500.'],ok:'454 / 500 = 90.8%: 46 cancer cases (9.2%) would never reach a registrar.'},
  prec:{ans:454/594*100,tol:0.5,pct:true,hints:['Precision = TP / (TP + FP): of the flagged notes, how many are cancer notes?','454 / (454 + 140) = 454 / 594.'],ok:'454 / 594 ≈ 76.4%: about three in four flagged notes are real cases.'},
  read:{ans:1440,hints:['Registrars read every flagged note: TP + FP at threshold 0.25.','490 + 950.'],ok:'490 + 950 = 1,440 notes instead of 10,000.'},
  cov:{ans:85.6,tol:0.1,pct:true,hints:['The model decides alone for every note it does not flag. What share of the 10,000 notes is that?','(10,000 − 1,440) / 10,000.'],ok:'8,560 / 10,000 = 85.6%: the model settles 85.6% of the notes on its own, and people read the other 14.4%. Goodfellow\'s example is Street View address transcription, which had to reach 98% accuracy at 95% coverage. Here the requirement is 98% recall, met at 85.6% coverage.'}
}
const CN_QS={
  1:{q:'What does the 95% show?',
     ok:'Goodfellow §11.1: accuracy is often the wrong metric when one class is rare, or when one kind of mistake costs much more than the other. A missed cancer case (FN) costs far more than an extra note to read (FP), so the two errors need to be tracked separately.',
     opts:[
       {t:'The task is easy, since 95% is close to perfect',h:'This 95% comes from a model that finds no cancer at all.'},
       {t:'With 5% positives, accuracy hides missed cases',c:true},
       {t:'Accuracy works once the test set is large enough',h:'More notes give the same 95%. The problem is the rare class, not the sample size.'},
       {t:'The model needs a lower learning rate to improve',h:'Nothing was learned here: any model that always says "no" scores 95%.'}
     ]},
  2:{q:'Which rule best matches the registrars\' goal?',
     ok:'Fix the requirement that matters most (find at least 98% of cases), then minimize the cost (notes to read). Here that is threshold 0.25. Moving the threshold slides along the precision–recall curve: recall can only be bought with precision.',
     opts:[
       {t:'Use the threshold with the highest overall accuracy',h:'You just saw it: the accuracy-best threshold (0.65) misses 93 cancer cases.'},
       {t:'Maximize F1, which weighs both kinds of error equally',h:'F1 treats a missed case and an extra note to read as equally bad. Here a miss is much worse.'},
       {t:'Keep the default threshold of 0.5',h:'0.5 is arbitrary, and here it misses 46 cases.'},
       {t:'Keep recall ≥ 98%, then flag as few notes as possible',c:true}
     ]},
  3:{q:'At threshold 0.25, precision is 34%. What does that mean for the registrars?',
     ok:'490 / 1,440 = 34%: 950 of the flagged notes are false alarms. That is the price of high recall, and it is still far less reading than all 10,000 notes.',
     opts:[
       {t:'Two in three notes they read are not cancer',c:true},
       {t:'34% of the cancer cases are never read at all',h:'That would be about recall, which is 98% here: only 10 cases are missed.'},
       {t:'They save 34% of the time they spend reading',h:'They read 1,440 of 10,000 notes, so they save 85.6%.'},
       {t:'The model is right about 34% of all the notes',h:'It is right about 9,040 of the 10,000 notes (90.4% accuracy).'}
     ]},
  4:{q:'When, and how, should the team set its target?',
     ok:'Goodfellow §11.1: choose the metric and its target value first, from what the application needs (and from human performance where it is known). For example: find at least 98% of cases while cutting the reading by at least 80%.',
     opts:[
       {t:'After training, at whatever the first model reaches',h:'Then the target tells you nothing about whether the model is good enough to use.'},
       {t:'Aim for 100% recall and 100% precision',h:'The scores overlap, so no threshold gets both. An impossible target gives no guidance.'},
       {t:'Before training, from the registry\'s needs',c:true},
       {t:'Before training, at the best published F1',h:'A published F1, measured on other data, says nothing about this registry\'s costs.'}
     ]},
  5:{q:'What should the model hand the registrars?',
     ok:'A score lets you choose the threshold that meets the recall target, and sorting the queue by score puts the likely cases first. The model speeds the registrars up without deciding for them.',
     opts:[
       {t:'A yes/no label from the default 0.5 threshold',h:'At 0.5 it misses 46 cases. The threshold should come from the recall target.'},
       {t:'Every note\'s cancer type, as one of 20 classes',h:'That is a harder task than the one needed. Registrars record the details themselves.'},
       {t:'Only the few notes the model is very sure about',h:'That is a high threshold: few false alarms, but many missed cases.'},
       {t:'Notes above the tuned threshold, best first',c:true}
     ]}
}

function cnUnlock(s){ const prev=cnStage; cnStage=Math.max(cnStage,s); c9Unlock('cn',prev,s,4) }
const cnSum=a=>a.reduce((x,y)=>x+y,0)
// Notes scoring at or above bin k are flagged.
function cnCounts(k){ const TP=cnSum(CN_POS.slice(k)), FP=cnSum(CN_NEG.slice(k)); return {TP,FN:500-TP,FP,TN:9500-FP} }
const cnInt=v=>v.toLocaleString('en-US')
function cnSetT(){ cnDraw(); cnCheckDone() }
function cnDraw(){
  const t=parseFloat(($('cn-t')||{value:0.5}).value), k=Math.round(t/0.05), c=cnCounts(k), live=cnFill.rec&&cnFill.prec
  const tv=$('cn-t-val'); if(tv) tv.textContent=c9n(t)
  if(live){ if(k===13) cnTasks.accmax=true; if(k===5) cnTasks.rec98=true }
  const svg=$('cn-hist-svg')
  if(svg){
    const W=520, L=14, bw=(W-2*L)/20, X=i=>L+i*bw, H=86
    let s=`<text x="${W-L}" y="10" text-anchor="end" font-size="10" fill="#5c4a3a">bar height ∝ √count</text>`
    ;[[CN_POS,'cancer notes (500)',14,'#ea580c'],[CN_NEG,'other notes (9,500)',124,'#1d4ed8']].forEach(([arr,label,y0,col])=>{
      const mx=Math.sqrt(Math.max(...arr))
      s+=`<text x="${L}" y="${y0+10}" font-size="11" font-weight="700" fill="${col}">${label}</text>`
      arr.forEach((v,i)=>{const h=v?Math.max(1.5,Math.sqrt(v)/mx*(H-16)):0; s+=`<rect x="${X(i)+1}" y="${y0+H-h}" width="${bw-2}" height="${h}" fill="${col}" opacity="${i>=k?0.9:0.22}"/>`})
      s+=`<line x1="${L}" y1="${y0+H}" x2="${W-L}" y2="${y0+H}" stroke="#94a3b8"/>`
    })
    s+=`<line x1="${X(k)}" y1="6" x2="${X(k)}" y2="214" stroke="#1a1210" stroke-width="2" stroke-dasharray="5 3"/><text x="${k>16?X(k)-5:X(k)+5}" y="226" text-anchor="${k>16?'end':'start'}" font-size="11" font-weight="700" fill="#1a1210">${k>16?'← ':''}flagged${k>16?'':' →'}</text>`
    ;[0,0.25,0.5,0.75,1].forEach(v=>{s+=`<text x="${L+v/0.05*bw}" y="240" text-anchor="middle" font-size="10" fill="#5c4a3a">${v}</text>`})
    svg.innerHTML=s
  }
  const mat=$('cn-matrix')
  if(mat){
    const cell=(v,bg,col,lab)=>`<td style="text-align:center;background:${bg};color:${col};font-weight:700">${lab}<br><span style="font-size:16px">${cnInt(v)}</span></td>`
    mat.innerHTML=`<table class="contrib-table" style="width:auto"><tr><th></th><th style="text-align:center">flagged</th><th style="text-align:center">not flagged</th></tr><tr><td><strong>cancer note</strong></td>${cell(c.TP,'#dcfce7','#14532d','TP')}${cell(c.FN,'#fee2e2','#7f1d1d','FN (missed)')}</tr><tr><td><strong>other note</strong></td>${cell(c.FP,'#fff7ed','#7c2d12','FP (extra reading)')}${cell(c.TN,'var(--surf2)','var(--text)','TN')}</tr></table>`
  }
  const m=$('cn-metrics')
  if(m&&live) m.innerHTML=`<div class="alg-step">recall ${(c.TP/500*100).toFixed(1)}% · precision ${(c.TP/(c.TP+c.FP)*100).toFixed(1)}%</div><div class="alg-step">accuracy ${((c.TP+c.TN)/100).toFixed(2)}%</div><div class="alg-res">notes to read: ${cnInt(c.TP+c.FP)} · cases missed: ${c.FN}</div>`
  const el=$('cn-tasks')
  if(el) el.innerHTML=live?[[cnTasks.accmax,'Find the threshold with the <strong>highest accuracy</strong>. How many cases does it miss?',' (0.65: accuracy 98.67%, but 93 cases missed)'],[cnTasks.rec98,'Find the <strong>highest threshold</strong> that still flags at least <strong>98%</strong> of the cancer notes',' (0.25: recall 98.0%)']].map(([ok,t,why])=>`<div><span style="color:${ok?'var(--green)':'var(--muted)'};font-weight:800">${ok?'✓':'○'}</span> ${t}${ok?`<span style="color:var(--muted)">${why}</span>`:''}</div>`).join(''):''
}
function cnCheckFill(key){ const r=c10Fill('cn',key,CN_FILL[key],cnFillTries); if(r===null) return; cnFill[key]=cnFill[key]||r; cnDraw(); cnCheckDone() }
function cnMCQ(q,i){ cnQ[q]=c9Answer('cn',q,i,CN_QS[q]); cnCheckDone() }
function cnCheckDone(){
  if(cnFill.acc){const q=$('cn-s1q');if(q)q.classList.add('unlocked')}
  if(cnQ[1]===true) cnUnlock(2)
  if(cnTasks.accmax&&cnTasks.rec98){const q=$('cn-s2q');if(q)q.classList.add('unlocked')}
  if(cnStage>=2&&cnQ[2]===true) cnUnlock(3)
  if(cnFill.read&&cnFill.cov){const q=$('cn-s3q');if(q)q.classList.add('unlocked')}
  if(cnQ[3]===true&&cnQ[4]===true&&cnQ[5]===true) cnUnlock(4)
  updateBadge('cancernlp-completed',isComplete('cancernlp'))
}
function initCancerNLP(){
  const eq=$('cn-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:14px 20px;text-align:center">
      <div style="color:#b45309">$$\\text{recall}=\\frac{TP}{TP+FN}\\qquad\\qquad \\text{precision}=\\frac{TP}{TP+FP}$$</div>
      <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">TP: cancer notes flagged. FN: cancer notes missed. FP: other notes flagged. Recall is the share of cancer cases found; precision is the share of flagged notes that are real cases (Goodfellow §11.1).</div>
    </div>`
    typeset(eq)
  }
  cnDraw()
  ;[1,2,3,4,5].forEach(q=>c9RenderMCQ('cn',q,CN_QS[q]))
  cnCheckDone()
}

// ══════════════════════════════════════════════════
//  11.3 LEARNING CURVE DIAGNOSIS
// ══════════════════════════════════════════════════
let lcStage=0, lcGapsOk=false, lcGapsTries=0, lcDiagOk=false, lcFill={dbl:false}, lcFillTries={}, lcSeen256=false, lcMatchOk=false
let lcQ={1:null,2:null,3:null,4:null}
const LC_GAPS={ab:35,av:15,bv:40}
const LC_DIAG_OPTS=['Mainly bias (underfitting)','Mainly variance (overfitting)','Both, about equally','Neither: it is fine']
const LC_DIAG={A:LC_DIAG_OPTS[0],B:LC_DIAG_OPTS[1]}
// Accuracy (%) against x = log₂(training examples / 1k). You have 16k examples, so x = 4.
const LC_TASK={
  A:{name:'Task A',tr:x=>54+22*Math.pow(2,-0.45*x),dv:x=>54-30*Math.pow(2,-0.45*x)},
  B:{name:'Task B',tr:x=>100-0.25*Math.max(0,x-4),dv:x=>44+4*x}
}
const LC_FILL={
  dbl:{ans:4,hints:['From 60% to 76% is 16 points. How many 4-point steps is that?','16 / 4 = 4: 16k → 32k → 64k → 128k → 256k.'],ok:'4 doublings, which is 16× the data (256k examples) for +16 points. Each further 4 points costs another doubling, so the data needed grows exponentially with the target. That is why Goodfellow §11.3 suggests trying training-set sizes on a logarithmic scale.'}
}
const LC_ACTIONS=[
  {a:'Train a bigger network (more layers or units)',ans:'Task A',hint:'More capacity helps a model that cannot fit its training set.'},
  {a:'Add dropout or weight decay',ans:'Task B',hint:'Regularization narrows a train–dev gap. It would lower Task A\'s training accuracy even further.'},
  {a:'Collect a bigger dev set',ans:'Neither',hint:'A bigger dev set measures more precisely. It does not change the model.'},
  {a:'Collect much more training data',ans:'Task B',hint:'Stage 2: more data lifts Task B\'s dev accuracy but barely moves Task A\'s.'},
  {a:'Tune the learning rate and train longer',ans:'Task A',hint:'Better optimization raises training accuracy, which is Task A\'s problem.'},
  {a:'Augment the training data (paraphrases, word swaps)',ans:'Task B',hint:'Augmentation acts like extra data and like regularization.'}
]
const LC_QS={
  1:{q:'Why compare training accuracy with the 95% human level rather than with 100%?',
     ok:'Some examples are ambiguous or mislabelled, so no model may reach 100%. The human level stands in for that best achievable accuracy: a gap to it can be fixed, while a gap to 100% might not be.',
     opts:[
       {t:'Models can never beat human performance',h:'They often do. Human level is an estimate of the achievable accuracy, not a ceiling.'},
       {t:'Training accuracy is always below human accuracy',h:'Task B\'s training accuracy is 100%, above 95%.'},
       {t:'It estimates the best achievable accuracy',c:true},
       {t:'It makes the variance gap look smaller',h:'The variance gap is train − dev; the target does not enter it.'}
     ]},
  2:{q:'In Task A, training accuracy falls from 60% to about 56% as the data grows. Why?',
     ok:'A small training set is easy to fit and a large one is not, so training accuracy falls and dev accuracy rises until they meet. Task A\'s curves converge toward about 54%, far below the 95% target, so more data cannot fix Task A: the model is too weak.',
     opts:[
       {t:'More data is harder to fit, so train meets dev',c:true},
       {t:'The model is forgetting what it learned earlier',h:'It is retrained on the larger set, and that set is simply harder to fit.'},
       {t:'The new examples are mislabelled or noisy',h:'The same drop happens with clean data: a small set is easy to partly memorize.'},
       {t:'The learning rate is too high for big data',h:'The drop comes from the data size and happens at any good learning rate.'}
     ]},
  3:{q:'Goodfellow §11.3: when is collecting more data the right move?',
     ok:'First make the model fit its training set (a bigger model, better optimization). Only when it does and dev accuracy lags behind is more data one of the most reliable fixes. Regularization or a smaller model are cheaper alternatives.',
     opts:[
       {t:'Whenever dev accuracy is below the target',h:'Task A\'s dev accuracy is below target too, but its model cannot even fit the training set. More data will not help it.'},
       {t:'Always, before trying anything else',h:'Data is costly. First check that the model can fit the data it already has.'},
       {t:'When train and dev accuracy are already equal',h:'Then there is no variance gap for more data to close.'},
       {t:'When train accuracy is good but dev lags',c:true}
     ]},
  4:{q:'A much bigger, well-tuned Task A model still reaches only 62% on its training set. (The annotators read each whole document; the model sees only its first 128 words.) What should you suspect?',
     ok:'Goodfellow §11.3: if large, carefully tuned models still cannot fit the training set, the problem may be the data itself. The labels may be too noisy, or the inputs may lack the information needed. The fix is cleaner data or richer inputs, not more of the same.',
     opts:[
       {t:'The dev set is too small to measure progress',h:'The problem shows on the training set itself.'},
       {t:'The data: noisy labels or missing information',c:true},
       {t:'Too much data: train on fewer examples instead',h:'Fewer examples are easier to fit but generalize worse. That hides the problem.'},
       {t:'Overfitting, so it needs more dropout',h:'62% on the training set is underfitting, not overfitting.'}
     ]}
}

function lcUnlock(s){ const prev=lcStage; lcStage=Math.max(lcStage,s); c9Unlock('lc',prev,s,4) }
function lcCheckGaps(){
  const ids=['ab','av','bv'], vals=ids.map(k=>c9Num(($(`lc-c-${k}`)||{value:''}).value))
  if(vals.some(v=>v===null)) return
  let first=null
  ids.forEach((k,i)=>{const ok=vals[i]===LC_GAPS[k]; $(`lc-c-${k}`).className='rr-inp '+(ok?'ok':'bad'); if(!ok&&!first) first=k})
  const h=$('lc-gaps-hint')
  if(!first){
    lcGapsOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> Task A: bias 35, variance 15. Task B: variance 40, and no bias gap at all, since its 100% training accuracy beats the human 95%. It memorizes its training set.'
    const b=$('lc-s1b'); if(b) b.classList.add('unlocked')
  } else {
    lcGapsTries++; h.className='guidance-box warm'
    h.innerHTML='<strong>Not quite.</strong> '+(lcGapsTries===1?'Bias gap = human − train; variance gap = train − dev, both in percentage points.':({ab:'Task A: human 95 − train 60.',av:'Task A: train 60 − dev 45.',bv:'Task B: train 100 − dev 60.'})[first])
  }
  lcCheckDone()
}
function lcFillSelects(){
  const opt=v=>`<option>${v}</option>`
  ;['A','B'].forEach(k=>{const e=$(`lc-d-${k}`); if(e&&!e.options.length) e.innerHTML=opt('—')+LC_DIAG_OPTS.map(opt).join('')})
  const el=$('lc-match'); if(!el||el.children.length) return
  el.innerHTML=LC_ACTIONS.map((m,i)=>`<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="width:min(380px,100%);font-size:14.5px;font-weight:600">${m.a}</span><select id="lc-m-${i}" class="sl-match-sel" style="min-width:140px" onchange="this.className='sl-match-sel'">${['—','Task A','Task B','Neither'].map(opt).join('')}</select></div>`).join('')
}
function lcCheckDiag(){
  const h=$('lc-diag-hint'); let first=null
  ;['A','B'].forEach(k=>{const e=$(`lc-d-${k}`), ok=e.value===LC_DIAG[k]; e.className='sl-match-sel '+(ok?'ok':'bad'); if(!ok&&!first) first=k})
  if(!first){
    lcDiagOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> Task A mostly cannot fit its own training data. Task B fits it perfectly but does not generalize. They are different problems with different fixes.'
  } else { h.className='guidance-box warm'; h.innerHTML='<strong>Not quite.</strong> '+(first==='A'?'Task A\'s bias gap (35) is more than twice its variance gap (15).':'Task B fits its training set perfectly but loses 40 points on dev.') }
  lcCheckDone()
}
function lcDrawCurves(){
  const xs=+(($('lc-n')||{value:4}).value); if(xs>=8) lcSeen256=true
  const nv=$('lc-n-val'); if(nv) nv.textContent=(2**xs)+'k'
  ;['A','B'].forEach(k=>{
    const svg=$(`lc-${k}-svg`); if(!svg) return
    const T=LC_TASK[k], W=300,H=200,L=34,R=18,Tp=22,B=32,PW=W-L-R,PH=H-Tp-B, X=x=>L+x/8*PW, Y=v=>Tp+(100-v)/80*PH
    let s=`<text x="${L}" y="14" font-size="12" font-weight="700" fill="#1a1210">${T.name}</text><text x="${W-R}" y="14" text-anchor="end" font-size="10" font-weight="700"><tspan fill="#1d4ed8">train</tspan><tspan fill="#5c4a3a"> · </tspan><tspan fill="#dc2626">dev</tspan></text>`
    ;[20,40,60,80,100].forEach(v=>{s+=`<line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" stroke="#e2d9cc"/><text x="${L-4}" y="${Y(v)+4}" text-anchor="end" font-size="10" fill="#5c4a3a">${v}</text>`})
    s+=`<line x1="${L}" y1="${Y(95)}" x2="${W-R}" y2="${Y(95)}" stroke="#15803d" stroke-dasharray="5 3"/><text x="${L+4}" y="${Y(95)+11}" font-size="10" fill="#15803d">human 95%</text>`
    ;[0,2,4,6,8].forEach(x=>{s+=`<text x="${X(x)}" y="${H-16}" text-anchor="middle" font-size="10" fill="#5c4a3a">${2**x}k</text>`})
    s+=`<text x="${L+PW/2}" y="${H-3}" text-anchor="middle" font-size="10" fill="#5c4a3a">training examples (log scale)</text>`
    const line=(f,a,b,col,dash)=>{const pts=[]; for(let x=a;x<=b+1e-9;x+=0.1) pts.push(`${X(x).toFixed(1)},${Y(f(x)).toFixed(1)}`); return `<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="2.2"${dash?' stroke-dasharray="5 4"':''}/>`}
    s+=`<line x1="${X(4)}" y1="${Tp}" x2="${X(4)}" y2="${Tp+PH}" stroke="#94a3b8" stroke-dasharray="2 3"/>`
    s+=line(T.tr,0,4,'#1d4ed8')+line(T.dv,0,4,'#dc2626')
    if(xs>4) s+=line(T.tr,4,xs,'#1d4ed8',true)+line(T.dv,4,xs,'#dc2626',true)
    s+=`<circle cx="${X(xs)}" cy="${Y(T.tr(xs))}" r="4" fill="#1d4ed8"/><circle cx="${X(xs)}" cy="${Y(T.dv(xs))}" r="4" fill="#dc2626"/>`
    svg.innerHTML=s
  })
  const info=$('lc-curve-info')
  if(info) info.innerHTML=['A','B'].map(k=>`<div class="alg-step">${LC_TASK[k].name} at ${2**xs}k examples: train ${LC_TASK[k].tr(xs).toFixed(1)}%, dev ${LC_TASK[k].dv(xs).toFixed(1)}%</div>`).join('')+(xs>4?'<div class="alg-res">dashed: what the extra data would give</div>':'')
  const el=$('lc-tasks')
  if(el) el.innerHTML=`<div><span style="color:${lcSeen256?'var(--green)':'var(--muted)'};font-weight:800">${lcSeen256?'✓':'○'}</span> Drag to 256k and compare what 16× more data does for each task</div>`
  lcCheckDone()
}
function lcCheckFill(key){ const r=c10Fill('lc',key,LC_FILL[key],lcFillTries); if(r===null) return; lcFill[key]=lcFill[key]||r; lcCheckDone() }
function lcCheckMatch(){
  const h=$('lc-match-hint'); let first=-1
  LC_ACTIONS.forEach((m,i)=>{const e=$(`lc-m-${i}`), ok=e.value===m.ans; e.className='sl-match-sel '+(ok?'ok':'bad'); if(!ok&&first<0) first=i})
  if(first<0){
    lcMatchOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> Task A needs a model that can fit its data: more capacity and better optimization. Task B needs to generalize: more data, regularization or augmentation. A bigger dev set only measures more precisely.'
    const q=$('lc-s3q'); if(q) q.classList.add('unlocked')
  } else { h.className='guidance-box warm'; h.innerHTML=`<strong>Not quite: ${LC_ACTIONS[first].a}.</strong> ${LC_ACTIONS[first].hint}` }
  lcCheckDone()
}
function lcMCQ(q,i){ lcQ[q]=c9Answer('lc',q,i,LC_QS[q]); lcCheckDone() }
function lcCheckDone(){
  if(lcDiagOk){const q=$('lc-s1q');if(q)q.classList.add('unlocked')}
  if(lcQ[1]===true) lcUnlock(2)
  if(lcFill.dbl&&lcSeen256){const q=$('lc-s2q');if(q)q.classList.add('unlocked')}
  if(lcStage>=2&&lcQ[2]===true) lcUnlock(3)
  if(lcQ[3]===true&&lcQ[4]===true) lcUnlock(4)
  updateBadge('learncurve-completed',isComplete('learncurve'))
}
function initLearnCurve(){
  const eq=$('lc-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:14px 20px;text-align:center">
      <div style="color:#b45309">$$\\underbrace{\\text{human}-\\text{train}}_{\\text{bias gap}}\\qquad\\qquad\\underbrace{\\text{train}-\\text{dev}}_{\\text{variance gap}}$$</div>
      <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">A large bias gap means the model cannot even fit its training data. A large variance gap means it fits the training data but does not generalize to new data.</div>
    </div>`
    typeset(eq)
  }
  lcFillSelects(); lcDrawCurves()
  ;[1,2,3,4].forEach(q=>c9RenderMCQ('lc',q,LC_QS[q]))
  lcCheckDone()
}

// ══════════════════════════════════════════════════
//  11.4 HYPERBAND
// ══════════════════════════════════════════════════
let hbStage=0, hbRace={rung:0,alive:['A','B','C','D','E','F','G','H','I'],sel:new Set(),done:false,reveal:false}, hbDropped={}
let hbFill={race:false,smax:false,total:false,budget:false,pysmax:false,pytotal:false}, hbFillTries={}, hbNOk=false, hbNTries=0
let hbQ={1:null,2:null,3:null,4:null}
// Validation loss of each configuration after 1, 3 and 9 epochs. C starts slowly but finishes best.
const HB_RACE={A:[0.80,0.60,0.45],B:[0.65,0.50,0.42],C:[0.95,0.70,0.30],D:[0.60,0.48,0.40],E:[0.90,0.85,0.80],F:[0.70,0.55,0.44],G:[0.62,0.52,0.46],H:[1.10,1.00,0.95],I:[0.85,0.65,0.50]}
const HB_EPOCHS=[1,3,9]
const HB_N={3:1000,2:100,1:20,0:4}
const HB_FILL={
  race:{ans:27,hints:['Rung 1: 9 configurations × 1 epoch. Rung 2: 3 × 3. Rung 3: 1 × 9.','9 + 9 + 9.'],ok:'27 epochs, against 9 × 9 = 81 for training all nine fully: a third of the cost, and it still found the second-best configuration. Every rung costs about the same, 9 epochs.'},
  smax:{ans:3,hints:['s_max counts how many times you can divide max_iter by eta before reaching 1.','log 1000 / log 10 = 3 / 1.'],ok:'s_max = 3, so there are four brackets (s = 3, 2, 1, 0) and B = (3 + 1) × 1000 = 4000.'},
  total:{ans:1124,hints:['random_hyperparameters() is called once for every configuration a bracket starts. Add up the n values.','1000 + 100 + 20 + 4.'],ok:'1000 + 100 + 20 + 4 = 1124. Only the starting configurations are sampled; the later rungs keep training the survivors.'},
  budget:{ans:4000,hints:['From the table, bracket s = 3 runs 1000 × 1, 100 × 10, 10 × 100 and 1 × 1000 iterations.','1000 + 1000 + 1000 + 1000.'],ok:'4,000 = B. Bracket s = 2 spends 3,000 (its int() rounded down) and brackets s = 1 and s = 0 spend 4,000 each. The brackets cost about the same; they just split the budget differently.'},
  pysmax:{ans:2,hints:['int() simply drops everything after the decimal point.','int(2.9999999999999996) = 2.'],ok:'int() truncates toward zero, so 3 − 4×10⁻¹⁶ becomes 2, and the code runs only three brackets: s = 2, 1 and 0.'},
  pytotal:{ans:113,hints:['Now s_max = 2, so B = 3 × 1000 and int(B / max_iter / (s + 1)) = int(3 / (s + 1)).','s = 2: 1 × 100; s = 1: int(1.5) × 10 = 10; s = 0: int(3) × 1 = 3.'],ok:'100 + 10 + 3 = 113 calls instead of 1,124. A rounding error of 4×10⁻¹⁶ removed the most exploratory bracket and halved bracket s = 1 from 20 configurations to 10.'}
}
const HB_QS={
  1:{q:'Configuration C would have finished best (0.30), but successive halving dropped it after one epoch. Which assumption failed?',
     ok:'Successive halving bets that a configuration that looks bad early stays bad. Slow starters, such as runs with a small learning rate, break that bet. Hyperband\'s answer is to also run brackets that start fewer configurations and give each one more epochs before the first cut.',
     opts:[
       {t:'That nine configurations are enough to sample',h:'C was among the nine: it was sampled, and then dropped.'},
       {t:'That early losses rank configurations like final ones',c:true},
       {t:'That the budget of 9 epochs was large enough',h:'C was dropped for its rank after one epoch, not for lack of budget.'},
       {t:'That the validation set represents the real test data',h:'The losses are fine. C simply starts slowly and improves late.'}
     ]},
  2:{q:'Every bracket spends about B iterations. Why run several brackets instead of only s = 3, which tries the most configurations?',
     ok:'Bracket s = 3 bets that one iteration already ranks configurations well; s = 0 bets that nothing short of full training does. Hyperband places every bet at about the same cost, so it is never far worse than the best one.',
     opts:[
       {t:'Later brackets reuse the models trained by earlier ones',h:'Each bracket samples fresh configurations; nothing is reused.'},
       {t:'Bracket s = 3 alone would exceed the budget',h:'It spends 4,000 iterations, the same as the others.'},
       {t:'Nobody knows in advance how much early losses predict',c:true},
       {t:'The smaller brackets train their winner for longer',h:'In every bracket the final survivor gets max_iter = 1,000 iterations.'}
     ]},
  3:{q:'Look at bracket s = 0 in the table. What is it?',
     ok:'With s = 0 there is one rung: 4 random configurations, all trained to max_iter. So Hyperband contains random search as its safest bracket. Goodfellow §11.4.4 explains why random search usually beats grid search (Bergstra and Bengio, 2012).',
     opts:[
       {t:'Successive halving with the most halvings',h:'s = 0 has a single rung, so there is no halving at all.'},
       {t:'A grid search over 4 values',h:'The configurations are random samples, not a grid.'},
       {t:'A warm start from the previous bracket\'s winner',h:'It samples 4 new random configurations.'},
       {t:'Plain random search, with full training',c:true}
     ]},
  4:{q:'Which change computes s_max correctly for every max_iter and eta?',
     ok:'Counting with integers (or rounding the log to a few decimals before int()) gives exactly 3. The lesson: when you trace code by hand, trace what the machine computes. int() truncates, and 3 − 4×10⁻¹⁶ truncates to 2.',
     opts:[
       {t:'Use integers: largest s with eta**s ≤ max_iter',c:true},
       {t:'Use math.log(max_iter, eta) instead of the ratio',h:'math.log(1000, 10) also returns 2.9999999999999996.'},
       {t:'Replace int() with ceil(), which rounds up instead',h:'That fixes this case but breaks others: for max_iter = 2000, ceil(3.30) = 4, one rung too many.'},
       {t:'Compute the logarithms in 32-bit floats instead',h:'Here it happens to give exactly 3.0, but lower precision makes near-integer errors like this more likely in general.'}
     ]}
}

function hbUnlock(s){ const prev=hbStage; hbStage=Math.max(hbStage,s); c9Unlock('hb',prev,s,4) }
const hbEp=r=>`${HB_EPOCHS[r]} epoch${HB_EPOCHS[r]===1?'':'s'}`
function hbRaceRender(){
  const el=$('hb-race'); if(!el) return
  const r=hbRace.rung, n=hbRace.alive.length, k=Math.floor(n/3)
  el.innerHTML=Object.keys(HB_RACE).map(id=>{
    const alive=hbRace.alive.includes(id), sel=hbRace.sel.has(id), seen=alive?r:hbDropped[id]
    const loss=hbRace.reveal?HB_RACE[id][2]:HB_RACE[id][seen]
    const sub=hbRace.reveal?(alive?'trained fully':`dropped after ${hbEp(hbDropped[id])}`):alive?`after ${hbEp(r)}`:`dropped after ${hbEp(seen)}`
    const win=hbRace.reveal&&id==='C'
    return `<div onclick="hbRacePick('${id}')" style="cursor:${alive&&!hbRace.done?'pointer':'default'};min-width:96px;padding:8px 10px;border-radius:8px;text-align:center;background:${sel?'#fff7ed':alive?'var(--surface)':'var(--surf2)'};border:2px solid ${win?'#15803d':sel?'#ea580c':alive?'var(--border)':'transparent'};opacity:${alive||hbRace.reveal?1:0.5}"><div style="font-weight:800;font-size:15px">${id}</div><div style="font-family:'Courier New',monospace;font-weight:700;font-size:14px">${loss.toFixed(2)}</div><div style="font-size:11.5px;color:var(--muted)">${sub}</div></div>`
  }).join('')
  const st=$('hb-race-status')
  if(st) st.innerHTML=hbRace.reveal?'All nine configurations after the full 9 epochs:':hbRace.done?`Rung 3: ${hbRace.alive[0]} trains for the full 9 epochs. The bracket is finished.`:`Rung ${r+1}: ${n} configurations × ${hbEp(r)}. Select the best ${k}.`
  const kb=$('hb-keep-btn'); if(kb){kb.disabled=hbRace.done; kb.style.opacity=hbRace.done?'.5':''}
  const rb=$('hb-reveal-btn'); if(rb){rb.disabled=!hbRace.done||hbRace.reveal; rb.style.opacity=hbRace.done&&!hbRace.reveal?'':'.5'}
}
function hbRacePick(id){ if(hbRace.done||!hbRace.alive.includes(id)) return; hbRace.sel.has(id)?hbRace.sel.delete(id):hbRace.sel.add(id); hbRaceRender() }
function hbRaceKeep(){
  if(hbRace.done) return
  const h=$('hb-race-hint'), r=hbRace.rung, k=Math.floor(hbRace.alive.length/3)
  const best=[...hbRace.alive].sort((a,b)=>HB_RACE[a][r]-HB_RACE[b][r]).slice(0,k)
  if(hbRace.sel.size!==k){ h.className='guidance-box warm'; h.innerHTML=`<strong>Not quite.</strong> Select exactly ${k}: the best third of ${hbRace.alive.length}.`; return }
  if(!best.every(id=>hbRace.sel.has(id))){ h.className='guidance-box warm'; h.innerHTML=`<strong>Not quite.</strong> Successive halving keeps the ${k} with the <em>lowest</em> validation loss at this rung, whatever happens later.`; return }
  hbRace.alive.filter(id=>!best.includes(id)).forEach(id=>hbDropped[id]=r)
  hbRace.alive=best; hbRace.rung++; hbRace.sel=new Set()
  if(hbRace.rung===2){
    hbRace.done=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Bracket finished.</strong> D gets the full 9 epochs and ends at 0.40, the winner of this bracket. Now look at what the bracket never saw.'
  } else { h.className='guidance-box cold'; h.innerHTML=`Kept ${best.join(', ')}. They now train for ${hbEp(hbRace.rung)} each.` }
  hbRaceRender(); hbCheckDone()
}
function hbRaceReveal(){
  if(!hbRace.done) return
  hbRace.reveal=true; hbRaceRender()
  const h=$('hb-race-hint'); h.className='guidance-box done'
  h.innerHTML='Trained fully, <strong>C</strong> would have won with 0.30. It was 8th of 9 after one epoch, so it was among the first dropped. D, the bracket\'s pick, is second best.'
  hbCheckDone()
}
function hbCheckN(){
  const ss=[3,2,1,0], vals=ss.map(s=>c9Num(($(`hb-c-${s}`)||{value:''}).value))
  if(vals.some(v=>v===null)) return
  let first=null
  ss.forEach((s,i)=>{const ok=vals[i]===HB_N[s]; $(`hb-c-${s}`).className='rr-inp '+(ok?'ok':'bad'); if(!ok&&first===null) first=s})
  const h=$('hb-n-hint')
  if(first===null){
    hbNOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> The int() inside throws away fractions: for s = 2, 4/3 becomes 1, which is why that bracket starts only 100 configurations. The table shows every rung.'
  } else {
    hbNTries++; h.className='guidance-box warm'
    h.innerHTML='<strong>Not quite.</strong> '+(hbNTries===1?'B / max_iter = s_max + 1 = 4. Compute int(4 / (s + 1)), then multiply by 10<sup>s</sup>.':({3:'int(4 / 4) = 1, so n = 1 × 10³.',2:'int(4 / 3) = int(1.33…) = 1, so n = 1 × 10².',1:'int(4 / 2) = 2, so n = 2 × 10¹.',0:'int(4 / 1) = 4, so n = 4 × 10⁰.'})[first])
  }
  hbTable(); hbCheckDone()
}
// Rung i of bracket s runs int(n / eta^i) configurations for r·eta^i iterations each.
function hbTable(){
  const el=$('hb-table'); if(!el) return
  if(!hbNOk){ el.innerHTML='<div style="font-size:13.5px;color:var(--muted)">Fill in n to see every rung.</div>'; return }
  const ss=[3,2,1,0]
  let rows=`<tr><th>rung</th>${ss.map(s=>`<th style="text-align:center">bracket s = ${s}</th>`).join('')}</tr>`
  for(let i=0;i<4;i++){
    rows+=`<tr><td>${i+1}</td>${ss.map(s=>{
      if(i>s) return '<td></td>'
      const cnt=Math.floor(HB_N[s]/10**i), it=1000/10**s*10**i, w=Math.round((Math.log10(cnt)+1)/4*100)
      return `<td style="text-align:center;background:linear-gradient(90deg,#dbeafe ${w}%,transparent ${w}%)">${cnt} × ${it}</td>`
    }).join('')}</tr>`
  }
  el.innerHTML=`<table class="contrib-table" style="width:auto;min-width:480px">${rows}</table><div style="font-size:12.5px;color:var(--muted);margin-top:4px">Each cell: configurations × iterations each.</div>`
}
function hbCheckFill(key){ const r=c10Fill('hb',key,HB_FILL[key],hbFillTries); if(r===null) return; hbFill[key]=hbFill[key]||r; hbCheckDone() }
function hbMCQ(q,i){ hbQ[q]=c9Answer('hb',q,i,HB_QS[q]); hbCheckDone() }
function hbCheckDone(){
  if(hbRace.reveal){const b=$('hb-s1b');if(b)b.classList.add('unlocked')}
  if(hbFill.race){const q=$('hb-s1q');if(q)q.classList.add('unlocked')}
  if(hbQ[1]===true) hbUnlock(2)
  if(hbFill.smax){const b=$('hb-s2b');if(b)b.classList.add('unlocked')}
  if(hbNOk){const c=$('hb-s2c');if(c)c.classList.add('unlocked')}
  if(hbFill.total&&hbFill.budget){const q=$('hb-s2q');if(q)q.classList.add('unlocked')}
  if(hbStage>=2&&hbQ[2]===true&&hbQ[3]===true) hbUnlock(3)
  if(hbFill.pysmax&&hbFill.pytotal){const q=$('hb-s3q');if(q)q.classList.add('unlocked')}
  if(hbStage>=3&&hbQ[4]===true) hbUnlock(4)
  updateBadge('hypband-completed',isComplete('hypband'))
}
function initHyperband(){
  hbRaceRender(); hbTable()
  ;[1,2,3,4].forEach(q=>c9RenderMCQ('hb',q,HB_QS[q]))
  hbCheckDone()
}

// ══════════════════════════════════════════════════
//  11.LS LIME FOR EEG
// ══════════════════════════════════════════════════
let leStage=0, leMask=new Set(), leOneDrop=false, leFill={comp:false}, leFillTries={}, leFits={n100:false,n20:0,zero:false}, leMode3='bg', leDraws=0
let leQ={1:null,2:null,3:null,4:null,5:null}
const LE_CH=['Frontal','L-temporal','R-temporal'], LE_NS=4, LE_D=12
const LE_SEGS=['0–2.5 s','2.5–5 s','5–7.5 s','7.5–10 s']
// The black box. Component i = channel·4 + segment; each seizure pattern still present raises the logit.
// The network has also learned that a flat-lined channel means a loose electrode, not a seizure.
const LE_SPIKE={5:3,6:3,10:0.5}
function leModel(keep,mode){ let lg=-2; for(const k in LE_SPIKE) if(keep[k]) lg+=LE_SPIKE[k]; if(mode==='zero') lg-=2*keep.filter(v=>!v).length; return 1/(1+Math.exp(-lg)) }
const leName=i=>`${LE_CH[Math.floor(i/LE_NS)]} ${LE_SEGS[i%LE_NS]}`
const LE_FILL={
  comp:{ans:12,hints:['3 channels, each split into 4 segments.','3 × 4.'],ok:'3 × 4 = 12 components. LIME\'s interpretable representation is a vector of 12 on/off switches: 1 means the piece is kept, 0 means it is removed.'}
}
const LE_QS={
  1:{q:'Why use channel × time segments as components, rather than single voltage samples?',
     ok:'LIME\'s components should mean something to the person reading the explanation. "Left temporal, 2.5–5 s" does; one sample out of 2,500 does not. Words play this role for text, and superpixels for images.',
     opts:[
       {t:'Single samples are too many to remove one by one',h:'Speed matters a little, but the main problem is meaning: nobody can interpret "sample 1,834 of channel 2".'},
       {t:'The model only accepts whole segments as input',h:'The model sees the raw window. The components are chosen for the explanation, not for the model.'},
       {t:'A neurologist can read them: where and when',c:true},
       {t:'Segments make the LIME explanation exact',h:'LIME is an approximation for any choice of components.'}
     ]},
  2:{q:'Why does LIME weight each neighbour by π = exp(−d²/σ²)?',
     ok:'A linear model cannot match a neural network everywhere, only nearby. Neighbours with few pieces removed get weights near 1 and heavily masked ones near 0, so the coefficients describe the model locally around this window. That is the "L" in LIME.',
     opts:[
       {t:'So the fit describes the model near this window',c:true},
       {t:'So neighbours with seizures count for more',h:'π depends only on how much was removed, not on the model\'s output.'},
       {t:'To make the fitted linear model sparse and short',h:'Sparsity comes from Ω(g), or from keeping only the top K components.'},
       {t:'Because heavily masked windows crash the model',h:'The model runs fine on them. They are just far from x, where the model may behave differently.'}
     ]},
  3:{q:'With only 20 neighbours, the coefficients change noticeably from draw to draw. What should you conclude?',
     ok:'A LIME explanation is estimated from random samples, so it carries sampling noise. Twelve coefficients plus an intercept need many more than 20 weighted neighbours. Check stability across draws before you trust a ranking.',
     opts:[
       {t:'Keep the draw that best matches the neurologist',h:'That is cherry-picking: it shows what you expected, not what the model does.'},
       {t:'LIME is simply unable to explain EEG models',h:'With 100 neighbours the two left-temporal components lead in every draw.'},
       {t:'The neural network itself is random',h:'The model is deterministic. The randomness is in which neighbours LIME draws.'},
       {t:'Draw more neighbours and check stability',c:true}
     ]},
  4:{q:'With flat zeros, every component looks important. Why?',
     ok:'A perturbation should look like plausible input with the information in that piece removed. A flat-lined channel looks like a detached electrode, and this network learned "flat means no seizure", so every removal lowers its output and the credit spreads everywhere. Background EEG from the same recording keeps the neighbours realistic.',
     opts:[
       {t:'Zeros remove more information than background EEG',h:'Both remove the seizure pattern. Zeros also create something the model never saw in training.'},
       {t:'Flat lines look like faults, and the model reacts',c:true},
       {t:'The linear model cannot fit zeros',h:'The fit works. It faithfully reports that every flat segment lowers the output.'},
       {t:'Zero is the EEG\'s mean, so it is a neutral choice',h:'The mean voltage may be near zero, but a flat line has none of EEG\'s normal activity, so it is out of distribution.'}
     ]},
  5:{q:'LIME (with background EEG) highlights the left temporal channel, 2.5–7.5 s. A neurologist says this matches a typical temporal-lobe onset. What can you conclude?',
     ok:'Agreement with clinical knowledge on this window is encouraging. To trust the model, look at many windows (including its errors), check that the explanations are stable, and evaluate its performance properly.',
     opts:[
       {t:'The model is validated and safe to deploy',h:'One explanation of one window says nothing about other patients, or about how the model fails.'},
       {t:'The explanation is suspect, since it just confirms expectations',h:'Agreement is not suspicious in itself. It is weak evidence that the model uses the right signal.'},
       {t:'Here the model uses plausible evidence: support, not proof',c:true},
       {t:'LIME proves that the model understands seizures',h:'LIME describes which inputs moved this output. It does not show understanding, and it is an approximation itself.'}
     ]}
}

function leUnlock(s){ const prev=leStage; leStage=Math.max(leStage,s); c9Unlock('le',prev,s,4) }
// A seeded random generator (mulberry32), so every draw can be reproduced.
function leRng(seed){ return ()=>{ seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296 } }
function leSolve(A,b){
  const n=b.length, M=A.map((r,i)=>[...r,b[i]])
  for(let i=0;i<n;i++){
    let p=i; for(let r=i+1;r<n;r++) if(Math.abs(M[r][i])>Math.abs(M[p][i])) p=r
    ;[M[i],M[p]]=[M[p],M[i]]
    for(let r=0;r<n;r++) if(r!==i){ const f=M[r][i]/M[i][i]; for(let k=i;k<=n;k++) M[r][k]-=f*M[i][k] }
  }
  return M.map((r,i)=>r[n]/r[i])
}
// LIME: N neighbours with a random number of components kept, weights π = exp(−d²/0.25²), then weighted ridge regression.
function leLime(N,mode,seed){
  const rng=leRng(seed), X=[], y=[], w=[], nbrs=[]
  for(let n=0;n<N;n++){
    const idx=[...Array(LE_D).keys()]
    for(let i=LE_D-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]] }
    const k=1+Math.floor(rng()*LE_D), keep=Array(LE_D).fill(0); idx.slice(0,k).forEach(i=>keep[i]=1)
    const d=(LE_D-k)/LE_D, p=leModel(keep,mode)
    X.push([1,...keep]); y.push(p); w.push(Math.exp(-d*d/0.0625)); nbrs.push({keep,p})
  }
  const D=LE_D+1
  const A=Array.from({length:D},(_,i)=>Array.from({length:D},(_,j)=>X.reduce((s,x,n)=>s+w[n]*x[i]*x[j],0)+(i===j&&i>0?0.01:0)))
  const b=Array.from({length:D},(_,i)=>X.reduce((s,x,n)=>s+w[n]*x[i]*y[n],0))
  return {beta:leSolve(A,b).slice(1),nbrs}
}
// Background EEG for channel c at time t, plus the seizure pattern where one is present.
function leSignal(c,t,withSpike){
  let v=0.32*Math.sin(2*Math.PI*9.5*t+1.3*c)+0.2*Math.sin(2*Math.PI*5.3*t+2.1*c)+0.12*Math.sin(2*Math.PI*17.2*t+0.7*c)
  const A=withSpike?(LE_SPIKE[c*LE_NS+Math.min(3,Math.floor(t/2.5))]||0)/3:0
  if(A) v+=A*(1.6*Math.pow(Math.abs(Math.sin(Math.PI*3*t)),8)-0.6*Math.sin(2*Math.PI*3*t))
  return v
}
function leKeep(){ return Array.from({length:LE_D},(_,i)=>leMask.has(i)?0:1) }
function leDrawEEG(){
  const svg=$('le-eeg-svg'); if(!svg) return
  const L=96, W=560, SW=(W-L-10)/LE_NS, RH=64, T=18
  let s=''
  LE_SEGS.forEach((lab,j)=>{s+=`<text x="${L+j*SW+SW/2}" y="12" text-anchor="middle" font-size="10" fill="#5c4a3a">${lab}</text>`})
  LE_CH.forEach((ch,c)=>{
    const yc=T+c*RH+RH/2
    s+=`<text x="${L-8}" y="${yc+4}" text-anchor="end" font-size="12" font-weight="700" fill="#1a1210">${ch}</text>`
    for(let j=0;j<LE_NS;j++){
      const i=c*LE_NS+j, off=leMask.has(i), x0=L+j*SW, pts=[]
      for(let k=0;k<=125;k++){ const t=j*2.5+k*0.02; pts.push(`${(x0+k/125*SW).toFixed(1)},${(yc-leSignal(c,t,!off)*14).toFixed(1)}`) }
      s+=`<rect x="${x0+1}" y="${T+c*RH+2}" width="${SW-2}" height="${RH-4}" rx="4" fill="${off?'#e5e7eb':'#fff'}" stroke="${off?'#9ca3af':'#e2d9cc'}"${off?' stroke-dasharray="4 3"':''}/>`
      s+=`<polyline points="${pts.join(' ')}" fill="none" stroke="${off?'#9ca3af':'#1d4ed8'}" stroke-width="1.2"/>`
      s+=`<rect x="${x0}" y="${T+c*RH}" width="${SW}" height="${RH}" fill="transparent" style="cursor:pointer" onclick="leToggle(${i})"/>`
    }
  })
  svg.innerHTML=s
  const p=leModel(leKeep(),'bg'), pr=$('le-prob')
  if(pr) pr.innerHTML=`seizure probability: <strong style="color:${p>=0.5?'#b91c1c':'#15803d'}">${p.toFixed(2)}</strong>${leMask.size?` (${leMask.size} removed)`:''}`
}
function leToggle(i){
  leMask.has(i)?leMask.delete(i):leMask.add(i)
  if(leMask.size===1&&leModel(leKeep(),'bg')<0.9) leOneDrop=true
  leDrawEEG(); leTasks(); leCheckDone()
}
function leResetMask(){ leMask=new Set(); leDrawEEG() }
function leDrawCoef(id,beta){
  const svg=$(id); if(!svg) return
  const L=88, S=56, T=24, H=34, mx=Math.max(0.2,...(beta||[0]).map(Math.abs))
  let s=''
  LE_SEGS.forEach((lab,j)=>{s+=`<text x="${L+j*S+S/2}" y="14" text-anchor="middle" font-size="10" fill="#5c4a3a">${lab}</text>`})
  LE_CH.forEach((ch,c)=>{
    s+=`<text x="${L-6}" y="${T+c*H+H/2+3}" text-anchor="end" font-size="11" font-weight="700" fill="#1a1210">${ch}</text>`
    for(let j=0;j<LE_NS;j++){
      const v=beta?beta[c*LE_NS+j]:0
      s+=`<rect x="${L+j*S}" y="${T+c*H}" width="${S-3}" height="${H-3}" rx="4" fill="${beta?c9Heat(v,mx):'#fff'}" stroke="#e2d9cc"/>`
      if(beta) s+=`<text x="${L+j*S+S/2-1}" y="${T+c*H+H/2+3}" text-anchor="middle" font-size="11" font-weight="700" font-family="monospace" fill="${Math.abs(v)/mx>0.55?'#fff':'#1a1210'}">${v>=0?'+':'−'}${Math.abs(v).toFixed(2)}</text>`
    }
  })
  svg.innerHTML=s
}
function leShowNbrs(nbrs){
  const el=$('le-nbrs'); if(!el) return
  el.innerHTML=nbrs.slice(0,6).map(({keep,p})=>{
    let s=''; keep.forEach((v,i)=>{s+=`<rect x="${(i%LE_NS)*12+1}" y="${Math.floor(i/LE_NS)*12+1}" width="10" height="10" rx="2" fill="${v?'#93c5fd':'#d1d5db'}"/>`})
    return `<div style="text-align:center;font-size:11px;font-family:'Courier New',monospace;font-weight:700"><svg width="49" height="37">${s}</svg><br>f = ${p.toFixed(2)}</div>`
  }).join('')
}
function leFit(N,mode,target){
  leDraws++
  const {beta,nbrs}=leLime(N,mode,leDraws*7919+N)
  leDrawCoef(target,beta)
  const top=beta.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).slice(0,2)
  const info=$(target==='le-coef-svg'?'le-fit-info':'le-fit3-info')
  if(info) info.innerHTML=`<div class="alg-step">${N} neighbours (draw #${leDraws}); removed = ${mode==='bg'?'background EEG':'flat zeros'}</div><div class="alg-res">largest two: ${top.map(([v,i])=>`${leName(i)} (${v>=0?'+':'−'}${Math.abs(v).toFixed(2)})`).join(', ')}</div>`
  if(target==='le-coef-svg'){ leShowNbrs(nbrs); if(N===100) leFits.n100=true; else leFits.n20++ }
  else if(mode==='zero') leFits.zero=true
  leTasks(); leCheckDone()
}
function leSetMode(m){ leMode3=m; document.querySelectorAll('.le-mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.v===m)) }
function leTasks(){
  const row=(ok,t)=>`<div><span style="color:${ok?'var(--green)':'var(--muted)'};font-weight:800">${ok?'✓':'○'}</span> ${t}</div>`
  const t1=$('le-tasks1'); if(t1) t1.innerHTML=row(leOneDrop,'Remove a <strong>single</strong> component so that the seizure probability falls below 0.90')
  const t2=$('le-tasks2'); if(t2) t2.innerHTML=row(leFits.n100,'Fit with 100 neighbours')+row(leFits.n20>=2,`Fit with 20 neighbours at least twice and compare the coefficients (${Math.min(2,leFits.n20)}/2)`)
  const t3=$('le-tasks3'); if(t3) t3.innerHTML=row(leFits.zero,'Fit with flat zeros and compare with the background-EEG fit from Stage 2')
}
function leCheckFill(key){ const r=c10Fill('le',key,LE_FILL[key],leFillTries); if(r===null) return; leFill[key]=leFill[key]||r; leCheckDone() }
function leMCQ(q,i){ leQ[q]=c9Answer('le',q,i,LE_QS[q]); leCheckDone() }
function leCheckDone(){
  if(leOneDrop&&leFill.comp){const q=$('le-s1q');if(q)q.classList.add('unlocked')}
  if(leQ[1]===true) leUnlock(2)
  if(leFits.n100&&leFits.n20>=2){const q=$('le-s2q');if(q)q.classList.add('unlocked')}
  if(leStage>=2&&leQ[2]===true&&leQ[3]===true) leUnlock(3)
  if(leFits.zero){const q=$('le-s3q');if(q)q.classList.add('unlocked')}
  if(leQ[4]===true&&leQ[5]===true) leUnlock(4)
  updateBadge('limeeeg-completed',isComplete('limeeeg'))
}
function initLIMEEEG(){
  const eq=$('le-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:14px 20px;text-align:center">
      <div style="color:#b45309">$$\\xi(x)=\\operatorname*{arg\\,min}_{g\\in G}\\;\\mathcal{L}(f,g,\\pi_x)+\\Omega(g)$$</div>
      <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">Find the simple model g (here linear in the 12 on/off components) that best matches the black box f on perturbed copies of x, weighting each copy by its closeness π<sub>x</sub>, while keeping g simple (Ω). (Ribeiro et al., 2016)</div>
    </div>`
    typeset(eq)
  }
  leDrawEEG(); leDrawCoef('le-coef-svg',null); leDrawCoef('le-coef3-svg',null); leSetMode('bg'); leTasks()
  ;[1,2,3,4,5].forEach(q=>c9RenderMCQ('le',q,LE_QS[q]))
  leCheckDone()
}

// ══════════════════════════════════════════════════
//  11.GA GRADIENT ATTRIBUTION
// ══════════════════════════════════════════════════
let gaStage=0, gaFill={sal:false,occ:false,ig:false,phinot:false,phibad:false}, gaFillTries={}, gaMatchOk=false
let gaQ={1:null,2:null,3:null,4:null,5:null}
const GA_FILL={
  sal:{ans:0,hints:['At the sentence the sum is 0.8 + 0.8 = 1.6. If x<sub>great</sub> changes a tiny bit, what does min(1, ·) return?','It still returns 1, so the slope is 0.'],ok:'The clip makes f flat around the sentence, so ∂f/∂x<sub>great</sub> = 0, and the same holds for "wonderful". Saliency says neither word matters, yet deleting both drops the score from 1 to 0.'},
  occ:{ans:0.2,tol:0.001,hints:['Delete "great": f = min(1, 0.8·0 + 0.8·1).','1 − 0.8.'],ok:'Deleting "great" leaves "wonderful", which alone gives 0.8: a drop of only 0.2. Each word looks unimportant on its own, because the other one covers for it.'},
  ig:{ans:0.5,tol:0.001,hints:['Drag α to 1. The slope is 0.8 until 1.6α reaches 1, and 0 after that. The area is width × height.','The slope is 0.8 for α from 0 to 0.625: 0.8 × 0.625.'],ok:'0.8 × 0.625 = 0.5, and "wonderful" also gets 0.5. Together that is exactly f(sentence) − f(blank) = 1 − 0, a property called completeness. Integrated gradients collect the slope before the function saturates (Sundararajan et al., 2017).'},
  phinot:{ans:0.3,tol:0.001,hints:['First order ("not" first): it adds f(not) − f(neither). Second order ("bad" first): it adds f(not bad) − f(bad). Average the two.','½·[(0.4 − 0.5) + (0.8 − 0.1)] = ½·(−0.1 + 0.7).'],ok:'½·(−0.1 + 0.7) = 0.3.'},
  phibad:{ans:0,tol:0.001,hints:['First order: "bad" comes second and adds f(not bad) − f(not). Second order: it comes first and adds f(bad) − f(neither).','½·[(0.8 − 0.4) + (0.1 − 0.5)].'],ok:'½·(0.4 − 0.4) = 0. And φ<sub>not</sub> + φ<sub>bad</sub> = 0.3 = f(not bad) − f(neither): Shapley values always add up to the total change (efficiency).'}
}
const GA_METHODS=['Saliency (gradient)','Occlusion','LIME','Shapley value (SHAP)','Integrated gradients']
const GA_MATCH=[
  {q:'What does this word add on average, over every order of adding the words?',ans:3,hint:'Averaging over orders is the Shapley definition from Stage 2.'},
  {q:'How much would a tiny nudge to this word\'s input move the output?',ans:0,hint:'A tiny nudge is a derivative taken at the input itself.'},
  {q:'How much slope does this word collect on a path from a blank input to this one?',ans:4,hint:'The path and the shaded area from Stage 1.'},
  {q:'How much does the output drop if I delete only this word?',ans:1,hint:'A single deletion from the full input, with nothing averaged.'},
  {q:'Which words carry the weight in a linear model fitted to random deletions nearby?',ans:2,hint:'A local linear surrogate fitted to perturbations, as in 11.LS.'}
]
const GA_QS={
  1:{q:'Saliency gives "great" a score of 0, yet the prediction depends on it. Why?',
     ok:'At the sentence, the sum 1.6 is past the clip at 1, so f is flat there and ∂f/∂x<sub>great</sub> = 0. Saliency answers "what would a tiny nudge do?", and the answer is nothing. Sigmoid and softmax outputs saturate in the same way when a model is confident.',
     opts:[
       {t:'The gradient was taken for the negative class instead',h:'There is only one output here, the positive score.'},
       {t:'"great" has a weight of 0 in the model',h:'Its weight is 0.8: deleting both words drops the score from 1 to 0.'},
       {t:'The output is saturated, so a nudge changes nothing',c:true},
       {t:'Saliency only works for image models, not text',h:'Gradients work for any differentiable model. The problem is the flat region.'}
     ]},
  2:{q:'Deleting "bad" lowers the positive score by 0.4, yet its Shapley value is 0. Which is right?',
     ok:'Occlusion asks one question: delete "bad" from the full sentence. Since "not bad" is positive, that costs 0.4. Shapley averages this with the order in which "bad" comes first, where it costs the score 0.4 instead. With interactions, one number of credit per word is ambiguous, and each method resolves it differently.',
     opts:[
       {t:'Occlusion: Shapley values ignore interactions',h:'Shapley values average over every order, so they include interactions, and split them.'},
       {t:'Shapley: "bad" has no effect on this model',h:'It clearly has effects (−0.4 or +0.4). They cancel on average.'},
       {t:'Neither: two-word inputs cannot be explained',h:'They can: the table gives f for every set of words.'},
       {t:'Both: "bad" hurts alone but helps after "not"',c:true}
     ]},
  3:{q:'How many model evaluations does it take to compute exact Shapley values for a 20-word review?',
     ok:'Every subset: 2²⁰ = 1,048,576 evaluations. KernelSHAP (Lundberg and Lee, 2017) estimates Shapley values from a sample of subsets by fitting a weighted linear model, much like LIME but with weights chosen so that the answer approximates Shapley values.',
     opts:[
       {t:'20, one per word',h:'That is occlusion: one deletion per word.'},
       {t:'2²⁰ ≈ 1 million',c:true},
       {t:'400, one per pair of words',h:'Shapley values need every subset, not just pairs.'},
       {t:'20! ≈ 2.4 × 10¹⁸',h:'The definition averages over 20! orders, but only 2²⁰ different subsets ever get evaluated.'}
     ]},
  4:{q:'Adebayo et al. (2018) proposed sanity checks for saliency maps. Which test best shows that a method depends on what the model learned?',
     ok:'If an explanation looks the same for the trained model and for one with random weights, it describes the input (edges, textures), not the model. Adebayo et al. found that several popular saliency methods fail this test.',
     opts:[
       {t:'Ask an expert whether the highlights look sensible',h:'Looking plausible to people does not show that the map depends on the model. Edge detectors look sensible too.'},
       {t:'Check that saliency, LIME and SHAP agree',h:'Methods can agree because they all track the input\'s structure.'},
       {t:'Randomize the weights: the map must change',c:true},
       {t:'Average the maps over many inputs',h:'Averaging reduces noise. It does not test whether the map depends on the model.'}
     ]},
  5:{q:'Ribeiro et al. (2016) trained a classifier to tell wolves from huskies, then asked LIME why it said "wolf". The explanation highlighted the snowy background. What did that reveal?',
     ok:'In that deliberately biased dataset, the wolf photos had snow and the husky photos did not, so the model learned a shortcut. Its accuracy looked fine, and only the explanation exposed the problem. Catching such shortcuts in the model and the data is the main practical use of explanations.',
     opts:[
       {t:'"Snow means wolf": right answer, wrong reason',c:true},
       {t:'LIME is unreliable on photos with backgrounds',h:'LIME did its job: it exposed what the model relies on.'},
       {t:'Recognizing wolves by their habitat is fine',h:'The model would fail on a husky in snow or a wolf on grass. The cue is an artefact of the dataset.'},
       {t:'The superpixels were too large to show the animal',h:'The animal\'s superpixels were there. The model did not rely on them.'}
     ]}
}

function gaUnlock(s){ const prev=gaStage; gaStage=Math.max(gaStage,s); c9Unlock('ga',prev,s,5) }
// Path x(α) = α·(1, 1): f = min(1, 1.6α), and its slope in x_great is 0.8 until 1.6α reaches 1.
function gaDrawPath(){
  const a=parseFloat(($('ga-alpha')||{value:0}).value), f=t=>Math.min(1,1.6*t), g=t=>t<0.625?0.8:0
  const av=$('ga-alpha-val'); if(av) av.textContent=c9n(a)
  const svg=$('ga-path-svg')
  if(svg){
    const W=360,H=190,L=34,R=12,T=14,B=32,PW=W-L-R,PH=H-T-B, X=v=>L+v*PW, Y=v=>T+(1-v/1.1)*PH, b=Math.min(a,0.625)
    let s=''
    ;[0,0.5,1].forEach(v=>{s+=`<line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" stroke="#e2d9cc"/><text x="${L-4}" y="${Y(v)+4}" text-anchor="end" font-size="10" fill="#5c4a3a">${v}</text>`})
    ;[0,0.25,0.5,0.75,1].forEach(v=>{s+=`<text x="${X(v)}" y="${H-17}" text-anchor="middle" font-size="10" fill="#5c4a3a">${v}</text>`})
    s+=`<text x="${L+PW/2}" y="${H-4}" text-anchor="middle" font-size="10" fill="#5c4a3a">α (0 = blank input, 1 = the sentence)</text>`
    if(b>0) s+=`<rect x="${X(0)}" y="${Y(0.8)}" width="${X(b)-X(0)}" height="${Y(0)-Y(0.8)}" fill="#fdba74" opacity="0.6"/>`
    s+=`<polyline points="${X(0)},${Y(0.8)} ${X(0.625)},${Y(0.8)} ${X(0.625)},${Y(0)} ${X(1)},${Y(0)}" fill="none" stroke="#ea580c" stroke-width="2"/>`
    s+=`<polyline points="${X(0)},${Y(0)} ${X(0.625)},${Y(1)} ${X(1)},${Y(1)}" fill="none" stroke="#1d4ed8" stroke-width="2.2"/>`
    s+=`<line x1="${X(a)}" y1="${T}" x2="${X(a)}" y2="${Y(0)}" stroke="#1a1210" stroke-dasharray="3 3"/><circle cx="${X(a)}" cy="${Y(f(a))}" r="4" fill="#1d4ed8"/>`
    s+=`<text x="${X(0.68)}" y="${Y(1)-6}" font-size="10" font-weight="700" fill="#1d4ed8">f along the path</text><text x="${X(0.03)}" y="${Y(0.8)-6}" font-size="10" font-weight="700" fill="#ea580c">slope in x_great</text>`
    svg.innerHTML=s
  }
  const c=$('ga-path-calc')
  if(c) c.innerHTML=`<div class="alg-step">f(x(α)) = min(1, 1.6α) = ${f(a).toFixed(2)}</div><div class="alg-res">slope ∂f/∂x<sub>great</sub> here: ${g(a)}</div>`
}
function gaCheckFill(key){ const r=c10Fill('ga',key,GA_FILL[key],gaFillTries); if(r===null) return; gaFill[key]=gaFill[key]||r; gaCheckDone() }
function gaRenderMatch(){
  const el=$('ga-match'); if(!el||el.children.length) return
  const opts=['—','Integrated gradients','LIME','Occlusion','Saliency (gradient)','Shapley value (SHAP)']
  el.innerHTML=GA_MATCH.map((m,i)=>`<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="min-width:min(330px,100%);flex:1;font-size:14.5px;font-weight:600">${m.q}</span><select id="ga-m-${i}" class="sl-match-sel" style="min-width:min(220px,100%)" onchange="this.className='sl-match-sel'">${opts.map(o=>`<option>${o}</option>`).join('')}</select></div>`).join('')
}
function gaCheckMatch(){
  const h=$('ga-match-hint'); let first=-1
  GA_MATCH.forEach((m,i)=>{const e=$(`ga-m-${i}`), ok=e.value===GA_METHODS[m.ans]; e.className='sl-match-sel '+(ok?'ok':'bad'); if(!ok&&first<0) first=i})
  if(first<0){
    gaMatchOk=true; h.className='guidance-box done'
    h.innerHTML='<strong>✓ Correct!</strong> Saliency and integrated gradients use gradients; occlusion, LIME and Shapley values use deletions. Only Shapley values (and integrated gradients) are guaranteed to add up to the total change.'
    const q=$('ga-s3q'); if(q) q.classList.add('unlocked')
  } else { h.className='guidance-box warm'; h.innerHTML=`<strong>Not quite (row ${first+1}).</strong> ${GA_MATCH[first].hint}` }
  gaCheckDone()
}
function gaMCQ(q,i){ gaQ[q]=c9Answer('ga',q,i,GA_QS[q]); gaCheckDone() }
function gaCheckDone(){
  if(gaFill.sal&&gaFill.occ&&gaFill.ig){const q=$('ga-s1q');if(q)q.classList.add('unlocked')}
  if(gaQ[1]===true) gaUnlock(2)
  if(gaFill.phinot&&gaFill.phibad){const q=$('ga-s2q');if(q)q.classList.add('unlocked')}
  if(gaStage>=2&&gaQ[2]===true) gaUnlock(3)
  if(gaStage>=3&&gaQ[3]===true) gaUnlock(4)
  if(gaQ[4]===true&&gaQ[5]===true) gaUnlock(5)
  updateBadge('gradattr-completed',isComplete('gradattr'))
}
function initGradAttr(){
  const eq=$('ga-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:14px 20px;text-align:center">
      <div style="color:#6d28d9">$$\\text{saliency}_i=\\frac{\\partial f}{\\partial x_i}\\bigg|_{x}\\qquad\\qquad \\phi_i=\\frac{1}{n!}\\sum_{\\text{orders}}\\Big[f\\big(B_i\\cup\\{i\\}\\big)-f\\big(B_i\\big)\\Big]$$</div>
      <div style="font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">Saliency is the slope of the output at the input. The Shapley value φ<sub>i</sub> is what word i adds when it joins the words before it (B<sub>i</sub>), averaged over all n! orders of adding the words.</div>
    </div>`
    typeset(eq)
  }
  gaDrawPath(); gaRenderMatch()
  ;[1,2,3,4,5].forEach(q=>c9RenderMCQ('ga',q,GA_QS[q]))
  gaCheckDone()
}

