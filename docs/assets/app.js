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
        <div style="font-size:13px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">
          <strong style="color:var(--text)">aⱼ is the sum of xᵢ · wᵢ from i = 1 to N.</strong><br>
          Multiply each input by its matching weight, then add all N products together.
        </div>
      </div>

      <!-- ReLU activation formula -->
      <div style="padding:16px 20px;text-align:center">
        <div style="color:#16a34a">$$o_j = \\text{ReLU}(a_j) = \\max(0,\\; a_j)$$</div>
        <div style="font-size:13px;color:var(--muted);margin-top:6px;line-height:1.8;font-weight:500">
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
    <div class="alg-res" style="color:${oC}">oⱼ = ${o_j.toFixed(4)}${a_j<0?' <span style="color:var(--muted);font-size:12px;font-weight:500">(negative → ReLU clamps to 0)</span>':''}</div>
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
    <div style="margin-top:10px;font-size:13px;font-weight:600;color:var(--muted);font-family:'Courier New',monospace">
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
    el.innerHTML = '<p style="font-size:13px;color:var(--muted);font-weight:500;padding:8px 0">No interactions yet — adjust a weight slider to start.</p>'
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
    d.style.cssText=`font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:center;padding:3px 4px;color:${i===2?'#15803d':'var(--muted)'}`
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
  hdr.forEach(h=>{const d=document.createElement('div');d.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:center;padding:3px 4px;color:var(--muted)';d.textContent=h;grid.appendChild(d)})
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
    </div>`:'<div style="font-size:13px;color:var(--muted);font-weight:500;padding:8px 0">Fill both matrices above to see X_new W_new here.</div>'}`
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
    pB.innerHTML='<div style="color:var(--muted);font-size:13px;font-weight:500">Fill both matrices to see result…</div>'
  }
  badge.textContent=Yn?`${matches}/${total} cells match`:'—'
  badge.className=`badge ${matches===total?'gg':matches>0?'og':'rg'}`
  if(matches===total){
    res.innerHTML=`<div style="background:#dcfce7;border:2px solid #16a34a;border-radius:8px;padding:12px 16px;font-size:13px;color:#166534;font-weight:600">✅ ${total}/${total} cells match — max(0, XW + c) = max(0, X_new W_new)</div>`
    $('ba-s1-badge').textContent='Activity Complete ✓'; $('ba-s1-badge').className='badge gg'
  }else if(Yn){
    res.innerHTML=`<div style="background:#fee2e2;border:1px solid var(--red);border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;color:#7f1d1d">${matches}/${total} cells match — check your matrix values above.</div>`
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
  colHdrs.forEach(h=>{const d=document.createElement('div');d.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:center;padding:3px 6px;color:var(--muted)';d.textContent=h;grid.appendChild(d)})
  CE_P.forEach((prow,ri)=>{
    const lbl=document.createElement('div');lbl.style.cssText='font-size:12px;font-weight:600;color:var(--muted);font-family:Courier New,monospace;padding-right:8px;display:flex;align-items:center';lbl.textContent=`row ${ri+1}`;grid.appendChild(lbl)
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
  colHdrs.forEach(h=>{const d=document.createElement('div');d.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:center;padding:3px 6px;color:var(--muted)';d.textContent=h;grid.appendChild(d)})
  CE_Y.forEach((_,ri)=>{
    const lbl=document.createElement('div');lbl.style.cssText='font-size:12px;font-weight:600;color:var(--muted);font-family:Courier New,monospace;padding-right:8px;display:flex;align-items:center';lbl.textContent=`row ${ri+1}`;grid.appendChild(lbl)
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
    <span style="font-family:'Courier New',monospace;font-size:13px;font-weight:600;color:var(--muted)">J(W) = (</span>
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:11px;font-weight:700;color:var(--muted)">class 0</span><input type="number" id="ce-jw-0" class="ba-cell-input" placeholder="?" step="0.01" style="width:80px"></div>
    <span style="font-family:'Courier New',monospace;font-size:13px;font-weight:600;color:var(--muted)">,</span>
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:11px;font-weight:700;color:var(--muted)">class 1</span><input type="number" id="ce-jw-1" class="ba-cell-input" placeholder="?" step="0.01" style="width:80px"></div>
    <span style="font-family:'Courier New',monospace;font-size:13px;font-weight:600;color:var(--muted)">)</span>`
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
      <div style="font-family:'Courier New',monospace;font-size:13px;font-weight:500;color:var(--muted)">
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
    if (module === 'conv91') return cvOutputOk && cvQ1 === true && cvQ2 === true
    if (module === 'pool93') return plFillOk && [plQ1,plQ2,plQ3,plQ4].every(v=>v===true)
    if (module === 'textcnn') return tcQ1===true && tcQ2===true && tcQ3===true && ($('tc-ref')||{value:''}).value.trim().length > 10
    if (module === 'rnnfwd') return rfFillOk && rfMCQ===true && ($('rf-ref')||{value:''}).value.trim().length > 10
    if (module === 'rnndesign') return rdQ1===true && rdQ2===true && rdQ3===true && rdQ4===true && rdQ5===true && ($('rd-ref')||{value:''}).value.trim().length > 10
    if (module === 'rnntanh') return rnMoves>=3 && rnQ1===true && rnQ2===true && rnQ3===true && rnQ4===true && ($('rn-ref')||{value:''}).value.trim().length > 10
    if (module === 'birnn') return brEq1ok && brEq2ok && brEq3ok && brQ1===true && brQ2===true && brQ3===true && ($('br-ref')||{value:''}).value.trim().length > 10
    if (module === 'nerseq') return nsQ1===true && nsQ2===true && nsQ3===true && nsQ4===true && ($('ns-ref')||{value:''}).value.trim().length > 10
    if (module === 'recnets') return rcQ1===true && rcQ2===true && rcQ3===true && rcQ4===true && ($('rc-ref')||{value:''}).value.trim().length > 10
    if (module === 'linrnn') return lrQ1===true && lrQ2===true && lrQ3===true && lrQ4===true && lrQ5===true && lrQ6===true && lrSliderMoves>=3 && ($('lr-ref')||{value:''}).value.trim().length > 10
    if (module === 'grucomp') return ggQ1===true && ggQ2===true && ggQ3===true && ggQ4===true && ggToggleSeen.size>=4 && ($('gg-ref')||{value:''}).value.trim().length > 10
    if (module === 'trfpos') return tpQ1===true && tpQ2===true && tpQ3===true && tpQ4===true && tpOrdersSeen.size>=2 && ($('tp-ref')||{value:''}).value.trim().length > 10
    if (module === 'cancernlp') return cnQ1===true && cnQ2===true && cnQ3===true && cnQ4===true && cnSliderMoves>=3 && ($('cn-ref')||{value:''}).value.trim().length > 10
    if (module === 'learncurve') return lcQ1===true && lcQ2===true && lcQ3===true && lcQ4===true && lcPatternsSeen.size>=4 && ($('lc-ref')||{value:''}).value.trim().length > 10
    if (module === 'hypband') return hbQ1===true && hbQ2===true && hbQ3===true && hbQ4===true && hbBracketsSeen.size>=4 && ($('hb-ref')||{value:''}).value.trim().length > 10
    if (module === 'limeeeg') return leQ1===true && leQ2===true && leQ3===true && leQ4===true && leDomainsSeen.size>=3 && ($('le-ref')||{value:''}).value.trim().length > 10
    if (module === 'gradattr') return gaQ1===true && gaQ2===true && gaQ3===true && gaQ4===true && gaMethodsSeen.size>=3 && ($('ga-ref')||{value:''}).value.trim().length > 10
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
  ins.style.cssText='font-size:12px;color:#14532d;margin-top:5px;font-weight:500;line-height:1.6'
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
        <span style="font-size:15px;font-weight:700;font-family:'Courier New',monospace;color:${a4Colors[i]}">${a4Labels[i]}</span>
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
      <div class="a4-bar-label" style="color:${color};font-size:17px;width:38px">${label}</div>
      <div class="a4-bar-track">
        <div class="a4-bar-fill" style="width:${pct}%;background:${color}25;border-right:3px solid ${color}"></div>
      </div>
      <span class="a4-bar-val" style="color:${color}">${val.toFixed(4)}</span>
    </div>
    <div style="font-family:'Courier New',monospace;font-size:13px;color:var(--muted);padding-left:40px;margin-top:2px">${formula}</div>
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
      <div style="font-size:12px;font-weight:800;color:#1d4ed8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Sigmoid — Independent</div>
      <div style="font-size:14px;color:var(--muted);font-weight:500;line-height:2">
        Changing <strong style="color:${a4Colors[0]}">a<sub>1</sub></strong> only changes <strong style="color:${a4Colors[0]}">p<sub>1</sub></strong>.<br>
        p<sub>2</sub> = σ(a<sub>2</sub>) = <strong style="color:${a4Colors[1]}">${sigs[1].toFixed(4)}</strong> — unaffected by a<sub>1</sub>.<br>
        p<sub>3</sub> = σ(a<sub>3</sub>) = <strong style="color:${a4Colors[2]}">${sigs[2].toFixed(4)}</strong> — unaffected by a<sub>1</sub>.<br>
        <span style="color:#c2610c;font-weight:600">Σ p<sub>k</sub> = ${sigSum.toFixed(4)} — no constraint on sum.</span>
      </div>
    </div>
    <div>
      <div style="font-size:12px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Softmax — Competitive</div>
      <div style="font-size:14px;color:var(--muted);font-weight:500;line-height:2">
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
      <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:10px">${i+1}. ${item.q}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-g" id="a4-qb-${i}-sigmoid" onclick="a4Answer(${i},'sigmoid')">Sigmoid</button>
        <button class="btn btn-g" id="a4-qb-${i}-softmax" onclick="a4Answer(${i},'softmax')">Softmax</button>
      </div>
      <div id="a4-qr-${i}" style="font-size:13px;margin-top:8px;min-height:18px;font-weight:500"></div>
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
    title.style.cssText=`font-family:"Courier New",monospace;font-size:13px;font-weight:700;margin-bottom:8px;color:${MX_COLORS[i]}`
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
    <div style="margin-top:8px;font-size:13px;font-weight:600;color:${match?'#15803d':'#b91c1c'}">target(x) = ${t.toFixed(3)} ${match?'✓ match':'✗ no match'}</div>`
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
  if(!mxLog.length){ el.innerHTML='<p style="font-size:13px;color:var(--muted);font-weight:500;padding:8px 0">No interactions yet — adjust a piece slider to start.</p>'; return }
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
    ${actualRaw>bound ? `<br><span style="color:var(--muted);font-weight:500;font-size:12px">(capped at the theoretical bound — dense sampling can slightly overcount near-flat kinks)</span>` : ''}`
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
      <span style="font-family:'Courier New',monospace;font-size:13px;color:var(--text)">${r.label}</span>
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
  if(!lrHistory.length){ el.innerHTML='<p style="font-size:13px;color:var(--muted);font-weight:500">No completed runs yet.</p>'; return }
  const maxO=Math.max(...lrHistory.map(h=>h.O),1)
  const rows=lrHistory.map(h=>{
    const pct=Math.max(6, Math.log2(h.O+1)/Math.log2(maxO+1)*100)
    return `<div class="a4-bar-row" style="margin-bottom:8px">
      <span class="a4-bar-label" style="width:auto;font-size:12px">l=${h.l},n=${h.n}</span>
      <div class="a4-bar-track"><div class="a4-bar-fill" style="width:${pct.toFixed(0)}%;background:#1d4ed8"></div></div>
      <span class="a4-bar-val">${h.O}</span>
    </div>`
  }).join('')
  let compare=''
  if(lrHistory.length>=2){
    const prev=lrHistory[lrHistory.length-2], cur=lrHistory[lrHistory.length-1]
    const factor=cur.O/prev.O
    compare=`<p style="font-size:13px;margin-top:10px;color:var(--text);font-weight:500">O went from <strong>${prev.O}</strong> (l=${prev.l}) to <strong>${cur.O}</strong> (l=${cur.l}) — a <strong>${factor.toFixed(1)}×</strong> increase${cur.l===prev.l*2?' from only doubling the depth':''}.</p>`
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
  if(!lrLog.length){ el.innerHTML='<p style="font-size:13px;color:var(--muted);font-weight:500;padding:8px 0">No interactions yet — adjust l, n, or fill a step to start.</p>'; return }
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
    chip.innerHTML=`<span style="font-size:15px">${name.replace('_z','<sub>z</sub>').replace('_r','<sub>r</sub>').replace('_n','<sub>n</sub>')}</span><span id="cg-lbl-${key}" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">click</span>`
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
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px">
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
      <div id="cg-wfb-${q.node}" style="font-size:13px;margin-top:8px;min-height:14px;font-weight:500"></div>`
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
    tr.appendChild(td(`<span style="font-size:11px">${row.op}</span>`))

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
    nt.style.cssText='font-size:11px;color:var(--muted);text-align:left;padding-left:8px'
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
          <div style="font-size:13px;color:var(--muted);margin-top:6px;line-height:1.8"><strong style="color:var(--text)">Data loss</strong> — mean squared error over all samples. Lower means better fit to training data.</div>
        </div>
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);text-align:center">
          <div style="color:#6d28d9">$\\Omega_1=\\sum_i|w_i| \\qquad \\Omega_2=\\sum_i w_i^2$</div>
          <div style="font-size:13px;color:var(--muted);margin-top:6px;line-height:1.8"><strong style="color:var(--text)">L1</strong> penalises absolute size — drives small weights to exactly 0 (sparse). &nbsp;<strong style="color:var(--text)">L2</strong> penalises squared size — shrinks all weights but rarely zeros them.</div>
        </div>
        <div style="padding:16px 20px;text-align:center">
          <div style="color:#15803d">$\\tilde{J}(\\mathbf{w})=J(\\mathbf{w})+\\alpha\\,\\Omega(\\mathbf{w})$</div>
          <div style="font-size:13px;color:var(--muted);margin-top:6px;line-height:1.8">α trades off fit vs. simplicity. A large α can flip the winner — <strong style="color:var(--text)">for which weight does the choice of L1 vs L2 matter most?</strong></div>
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
    <div style="flex:${t};background:#60a5fa;height:32px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;overflow:hidden;min-width:0">${t>12?t+'%':''}</div>
    <div style="flex:${v};background:#fb923c;height:32px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;overflow:hidden;min-width:0">${v>6?v+'%':''}</div>
    <div style="flex:${te};background:#86efac;height:32px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#14532d;overflow:hidden;min-width:0">${te>6?te+'%':''}</div>`
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
  html+='</div><p style="font-size:12px;color:var(--muted);margin-top:8px">'+Math.round(dpRate*100)+'% of pixels are zeroed (blacked out) each forward pass.</p>'
  c.innerHTML=html
}
const DP_WORDS=['the','cat','sat','on','mat','chases','runs','fast','never','stops']
function dpRenderWords(){
  const c=$('dp-vis'); if(!c) return
  const seed=Math.round(dpRate*100)
  let html='<div style="padding:6px 0">'
  DP_WORDS.forEach((w,i)=>{html+=`<span class="dp-word-chip${dpRng(seed,i)<dpRate?' masked':''}">${w}</span>`})
  html+='</div><p style="font-size:12px;color:var(--muted);margin-top:8px">Dropped words (<span style="text-decoration:line-through;color:#94a3b8">dummy-word</span>) are treated as absent from this example.</p>'
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
  html+='</div><p style="font-size:12px;color:var(--muted);margin-top:8px">Dropped character types are replaced with "_" wherever they appear.</p>'
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
        h+=`<span style="position:absolute;left:${o.gt.x}px;top:${o.gt.y+o.gt.h+2}px;font-size:11px;font-weight:800;color:#b91c1c">missed!</span>`
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
    card.innerHTML=`<div class="sl-flash-kicker">${f.kicker} · Card ${SL.flashIdx+1}/${SL_FLASH.length}</div><div class="sl-flash-a">${f.a}</div><div style="font-size:11px;color:var(--muted);margin-top:14px;text-align:center">Click to see the question again</div>`
  } else {
    card.innerHTML=`<div class="sl-flash-kicker">${f.kicker} · Card ${SL.flashIdx+1}/${SL_FLASH.length}</div><div class="sl-flash-q">${f.q}</div><div style="font-size:11px;color:var(--muted);margin-top:14px">Click to reveal the answer</div>`
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
  const iouTxt=k => objIouLookup[k]!==undefined ? ` <span style="color:var(--muted);font-size:11px">IoU ${objIouLookup[k].toFixed(2)}</span>` : ''
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
let gnReflection=''
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
  div.innerHTML=`<p style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px">Question ${qnum} of ${GN_SCENARIOS.length}</p>
    <p style="font-size:13px;font-weight:600;margin-bottom:10px">${sc.q}</p>
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
  gnReflection=($('gn-reflection')||{value:''}).value
  const el=$('gn-submit-summary')
  const n=Object.values(gnMcq).filter(v=>v===true).length
  if(el) el.innerHTML=`<p><strong>Scenario MCQs:</strong> ${n}/4 ${n===4?'<span style="color:var(--green)">✓</span>':''}</p>
    <p><strong>Gradient clipping MCQ:</strong> ${gnMcqClip===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>Stage reached:</strong> ${gnStage}/2</p>
    <p><strong>Reflection:</strong> ${gnReflection.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('gn-completed', isComplete('gradnorm'))
}
function initGradNorm(){ gnUpdateSubmitSummary() }

// ══════════════════════════════════════════════════
//  ACTIVITY 8.3 — MOMENTUM STEPPER
// ══════════════════════════════════════════════════
let mmStage=0
let mmMcq={accum:null,carry:null}
let mmReflection=''
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
  mmReflection=($('mm-reflection')||{value:''}).value
  const el=$('mm-submit-summary')
  if(el) el.innerHTML=`<p><strong>No-momentum table:</strong> ${mmCountNoMomOk()}/3 steps correct</p>
    <p><strong>Momentum table:</strong> ${mmCountMomOk()}/3 steps correct</p>
    <p><strong>Accumulation MCQ:</strong> ${mmMcq.accum===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>Step-size MCQ:</strong> ${mmMcq.carry===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p>
    <p><strong>Stage reached:</strong> ${mmStage}/3</p>
    <p><strong>Reflection:</strong> ${mmReflection.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
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
let tlStage=0, tlMcq={a:null,b:null,c:null,d:null}, tlPxOk=false, tlRef=''
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
  const s3ok=tlMcq.d&&tlPxOk
  const btn3=$('tl-btn3'); if(btn3) btn3.disabled=!s3ok
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
  const s3ok=tlMcq.d&&tlPxOk
  const btn3=$('tl-btn3'); if(btn3) btn3.disabled=!s3ok
  tlUpdateSummary()
}
function tlUpdateSummary(){
  tlRef=($('tl-ref')||{value:''}).value
  const el=$('tl-summary'); if(!el) return
  const n=Object.values(tlMcq).filter(v=>v===true).length
  el.innerHTML=`<p><strong>MCQs:</strong> ${n}/4</p><p><strong>Pixel count:</strong> ${tlPxOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Stage:</strong> ${tlStage}/4</p><p><strong>Reflection:</strong> ${tlRef.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('tl-completed', isComplete('transferlearn'))
}
function initTransferLearn(){tlUpdateSummary()}

// ══════════════════════════════════════════════════
//  ACTIVITY 8.5 — OPTIMIZER RACE
// ══════════════════════════════════════════════════
let orStage=0, orMcq={sgd:null,ada:null,rms:null,adam:null}, orFinal=null, orRan=false, orRef=''
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
  orRef=($('or-ref')||{value:''}).value
  const el=$('or-summary'); if(!el) return
  const n=Object.values(orMcq).filter(v=>v===true).length
  el.innerHTML=`<p><strong>Matching MCQs:</strong> ${n}/4</p><p><strong>Simulation run:</strong> ${orRan?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Final MCQ:</strong> ${orFinal===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Stage:</strong> ${orStage}/5</p><p><strong>Reflection:</strong> ${orRef.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('or-completed', isComplete('optrace'))
}
function initOptRace(){orUpdateSummary()}

// ══════════════════════════════════════════════════
//  ACTIVITY 8.7.1 — BATCH NORMALIZATION
// ══════════════════════════════════════════════════
let bnStage=0, bnMeansOk=false, bnWpOk=false, bnBetaOk=false, bnWhyOk=false, bnRef=''
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
  const btn4=$('bn-btn4'); if(btn4) btn4.disabled=!(bnBetaOk&&bnWhyOk)
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
  const btn4=$('bn-btn4'); if(btn4) btn4.disabled=!(bnBetaOk&&bnWhyOk)
  bnUpdateSummary()
}
function bnUpdateSummary(){
  bnRef=($('bn-ref')||{value:''}).value
  const el=$('bn-summary'); if(!el) return
  el.innerHTML=`<p><strong>Column means:</strong> ${bnMeansOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>W′ found:</strong> ${bnWpOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>BN fill-in:</strong> ${bnBetaOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Why easier:</strong> ${bnWhyOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Stage:</strong> ${bnStage}/5</p><p><strong>Reflection:</strong> ${bnRef.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('bn-completed', isComplete('batchnorm'))
}
function initBatchNorm(){bnLiveH();bnUpdateSummary()}

// ══════════════════════════════════════════════════
//  ACTIVITY 9.1 — CROSS-CORRELATION
// ══════════════════════════════════════════════════
let cvStage=0, cvOutputOk=false, cvQ1=null, cvQ2=null, cvKPos=0, cvSeenAll=false
const CV_I=[[2,4,0],[-1,3,-2],[1,-3,0]]
const CV_K=[[1,2],[0,-1]]
const CV_OUT=[[7,6],[8,-1]]
const CV_ALG=[
  ['(0,0)','2·1 + 4·2 + (−1)·0 + 3·(−1)','2+8+0−3',7],
  ['(0,1)','4·1 + 0·2 + 3·0 + (−2)·(−1)','4+0+0+2',6],
  ['(1,0)','(−1)·1 + 3·2 + 1·0 + (−3)·(−1)','−1+6+0+3',8],
  ['(1,1)','3·1 + (−2)·2 + (−3)·0 + 0·(−1)','3−4+0+0',-1]
]
const CV_Q1=[{t:'1×1',c:true},{t:'2×2',c:false},{t:'3×3',c:false},{t:'Depends on padding',c:false}]
const CV_Q2=[
  {t:'Translation equivariance — the same detector fires wherever the pattern appears',c:true},
  {t:'Rotation invariance — features work at any orientation',c:false},
  {t:'Scale invariance — features work at any zoom level',c:false},
  {t:'Global context — each output sees the whole image',c:false}
]

function cvRenderMat(id,mat,hl=[]){
  const t=$(id); if(!t) return
  t.innerHTML=mat.map((row,ri)=>`<tr>${row.map((v,ci)=>{
    const h=hl.some(([r,c])=>r===ri&&c===ci)
    return `<td style="width:46px;height:46px;border:${h?'2px solid #f59e0b':'1.5px solid var(--border)'};text-align:center;font-weight:700;background:${h?'#fef9c3':'var(--surface)'};border-radius:5px">${v}</td>`
  }).join('')}</tr>`).join('')
}

function cvDrawSVG(){
  const svg=$('cv-svg'); if(!svg) return
  const CW=72,CH=72,PAD=7
  const r=Math.floor(cvKPos/2),c=cvKPos%2
  const hl=[[r,c],[r,c+1],[r+1,c],[r+1,c+1]]
  let h=''
  for(let ri=0;ri<3;ri++) for(let ci=0;ci<3;ci++){
    const isH=hl.some(([hr,hc])=>hr===ri&&hc===ci)
    const x=PAD+ci*CW,y=PAD+ri*CH
    h+=`<rect x="${x+1}" y="${y+1}" width="${CW-2}" height="${CH-2}" rx="5" fill="${isH?'#fef9c3':'#fff'}" stroke="${isH?'#f59e0b':'#d1d5db'}" stroke-width="${isH?2.5:1.5}"/>`
    h+=`<text x="${x+CW/2}" y="${y+CH/2+6}" text-anchor="middle" font-size="16" font-weight="700" font-family="monospace" fill="#1a1210">${CV_I[ri][ci]}</text>`
  }
  // kernel overlay
  const kx=PAD+c*CW+1,ky=PAD+r*CH+1
  h+=`<rect x="${kx}" y="${ky}" width="${CW*2-2}" height="${CH*2-2}" rx="5" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="7 3"/>`
  // kernel values in top-right corner of each covered cell
  for(let ki=0;ki<2;ki++) for(let kj=0;kj<2;kj++){
    const x=PAD+(c+kj)*CW,y=PAD+(r+ki)*CH
    h+=`<text x="${x+CW-5}" y="${y+15}" text-anchor="end" font-size="10" fill="#3b82f6" font-weight="700">×${CV_K[ki][kj]}</text>`
  }
  svg.innerHTML=h
}

function cvUpdateAlg(){
  const el=$('cv-alg'); if(!el) return
  const [pos,prod,sum,res]=CV_ALG[cvKPos]
  el.innerHTML=`<span class="alg-step">Position ${pos}:</span><br>${prod}<br>= ${sum}<div class="alg-res" style="color:var(--green)">= ${res}</div>`
  $('cv-pos-lbl').textContent=`Position ${cvKPos+1} / 4`
  $('cv-prev-btn').disabled=cvKPos===0
  $('cv-next-btn').disabled=cvKPos===3
}

function cvStep(d){
  cvKPos=Math.max(0,Math.min(3,cvKPos+d))
  if(cvKPos===3) cvSeenAll=true
  cvDrawSVG(); cvUpdateAlg()
  const hint=$('cv-slide-hint'),btn=$('cv-s1-btn')
  if(cvSeenAll){
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>✓ All 4 positions seen!</strong> Each output cell = one dot product. Now fill in the grid.'}
    if(btn) btn.disabled=false
  } else if(hint) hint.innerHTML=`Click <strong>Next →</strong> (${cvKPos+1}/4 seen). The blue box shows where K overlaps I at this position.`
}

function cvUnlock(s){
  cvStage=Math.max(cvStage,s)
  for(let i=1;i<=s;i++){const e=$(`cv-s${i}`);if(e)e.classList.add('unlocked')}
}

function cvCheckOut(){
  const cells=[['cv-o00',0,0],['cv-o01',0,1],['cv-o10',1,0],['cv-o11',1,1]]
  let all=true
  cells.forEach(([id,r,c])=>{
    const el=$(id); if(!el) return
    if(el.value===''){el.className='rr-inp';all=false;return}
    const ok=parseInt(el.value)===CV_OUT[r][c]
    el.className='rr-inp'+(ok?' ok':' bad')
    if(!ok) all=false
  })
  cvOutputOk=all
  const hint=$('cv-out-hint')
  if(all){
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>✓ Correct!</strong> I★K = [[7, 6], [8, −1]]. Unlocking the next stage…'}
    cvUnlock(2); cvUnlock(3); cvRenderMCQs(); cvUpdateStride()
  } else if(hint&&!hint.className.includes('done')){
    const wrong=cells.filter(([id,r,c])=>{const e=$(id);return e&&e.value!==''&&parseInt(e.value)!==CV_OUT[r][c]})
    if(wrong.length){hint.className='guidance-box warm';hint.innerHTML='<strong>Hint:</strong> Use the kernel slide — each output position equals the dot product of K with the highlighted patch of I.'}
  }
  cvUpdateSummary()
}

function cvUpdateStride(){
  const s=parseInt(($('cv-stride-sl')||{value:1}).value)
  const v=$('cv-stride-val'); if(v) v.textContent=s
  const out=Math.floor((3-2)/s)+1
  const el=$('cv-stride-res'); if(el) el.innerHTML=`3×3 input, 2×2 kernel, stride ${s}<br>⌊(3−2)/${s}+1⌋ × ⌊(3−2)/${s}+1⌋ = <strong>${out}×${out}</strong>`
}

function cvRenderMCQs(){
  const q1=$('cv-q1-opts'),q2=$('cv-q2-opts')
  if(q1&&!q1.children.length) q1.innerHTML=CV_Q1.map((o,i)=>`<div class="cg-mcq-opt" id="cv-q1-${i}" onclick="cvMCQ(1,${i})">${o.t}</div>`).join('')
  if(q2&&!q2.children.length) q2.innerHTML=CV_Q2.map((o,i)=>`<div class="cg-mcq-opt" id="cv-q2-${i}" onclick="cvMCQ(2,${i})">${o.t}</div>`).join('')
}

function cvMCQ(q,i){
  const data=q===1?CV_Q1:CV_Q2,pfx=`cv-q${q}-`,hid=`cv-q${q}-hint`
  document.querySelectorAll(`[id^="${pfx}"]`).forEach(e=>e.onclick=null)
  $(`${pfx}${i}`).classList.add(data[i].c?'sel-ok':'sel-bad')
  const hint=$(hid)
  if(data[i].c){
    if(q===1) cvQ1=true; else cvQ2=true
    const msgs={1:'<strong>✓ Correct!</strong> ⌊(5−3)/2+1⌋ = ⌊1+1⌋ = 2 → output is 2×2.',2:'<strong>✓ Correct!</strong> Because the same kernel is slid across every position, a feature detector fires wherever the pattern appears — regardless of location.'}
    if(hint){hint.className='guidance-box done';hint.innerHTML=msgs[q].replace('<strong>✓ Correct!</strong>','<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong>')}
  } else {
    document.querySelectorAll(`[id^="${pfx}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>cvMCQ(q,j)})
    const wrong1={0:'Check the formula: ⌊(5−3)/2+1⌋ = ?',2:'Larger kernel → smaller output.',3:'No padding was specified; use the formula directly.'}
    const wrong2={1:'Rotation invariance comes from data augmentation or special architectures, not the sliding kernel.',2:'Scale invariance is a separate property; pooling gives partial invariance.',3:'Each output pixel only sees its k×k patch — not the whole image.'}
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> '+(q===1?(wrong1[i]||'Apply ⌊(H−k)/s+1⌋.'):(wrong2[i]||'Think about what "sliding" achieves.'))}
  }
  cvUpdateSummary()
}

function cvUpdateSummary(){
  const ref=($('cv-ref')||{value:''}).value
  const el=$('cv-summary'); if(!el) return
  el.innerHTML=`<p><strong>Output grid:</strong> ${cvOutputOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Size Q:</strong> ${cvQ1===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Property Q:</strong> ${cvQ2===true?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('cv-completed', isComplete('conv91'))
}

function initConv91(){
  cvRenderMat('cv-I-tbl',CV_I)
  cvRenderMat('cv-K-tbl',CV_K)
  const ot=$('cv-out-tbl')
  if(ot) ot.innerHTML='<tr><td style="width:46px;height:46px;border:1.5px dashed var(--border);text-align:center;color:var(--muted);border-radius:5px">?</td><td style="width:46px;height:46px;border:1.5px dashed var(--border);text-align:center;color:var(--muted);border-radius:5px">?</td></tr><tr><td style="width:46px;height:46px;border:1.5px dashed var(--border);text-align:center;color:var(--muted);border-radius:5px">?</td><td style="width:46px;height:46px;border:1.5px dashed var(--border);text-align:center;color:var(--muted);border-radius:5px">?</td></tr>'
  const eq=$('cv-prob-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#b45309">$(I\\star K)[r,c]=\\sum_{i=0}^{k_h-1}\\sum_{j=0}^{k_w-1}I[r+i,\\;c+j]\\cdot K[i,j]$</div>
        <div style="font-size:13px;color:var(--muted);margin-top:6px">Slide the kernel across the input — element-wise multiply and sum at every position.</div>
      </div>
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#6d28d9">$\\text{output size}=\\left\\lfloor\\frac{H-k}{s}+1\\right\\rfloor\\times\\left\\lfloor\\frac{W-k}{s}+1\\right\\rfloor$</div>
        <div style="font-size:13px;color:var(--muted);margin-top:6px">3×3 input, 2×2 kernel, stride 1 → <strong style="color:var(--text)">2×2 output</strong> (4 dot products)</div>
      </div>
      <div style="padding:14px 20px;text-align:center">
        <div style="color:#15803d">Cross-correlation ★ uses the kernel <em>as-is</em>; true convolution would flip it first. Deep learning frameworks (PyTorch, TensorFlow) compute cross-correlation but call it convolution.</div>
      </div>
    </div>`
    typeset(eq)
  }
  cvDrawSVG(); cvUpdateAlg(); cvUpdateSummary()
}

// ══════════════════════════════════════════════════
//  ACTIVITY 9.3 — ADAPTIVE POOLING
// ══════════════════════════════════════════════════
let plStage=0, plFillOk=false, plQ1=null, plQ2=null, plQ3=null, plQ4=null

const PL_Q1=[{t:'Output size changes each time H changes',c:true},{t:'Output size stays the same',c:false},{t:'It depends on the stride only',c:false}]
const PL_Q2=[{t:'1×1',c:true},{t:'H×H',c:false},{t:'p×p',c:false},{t:'Varies with H',c:false}]
const PL_Q3=[{t:'4×4',c:true},{t:'Varies with input size',c:false},{t:'1×1',c:false},{t:'Depends on p and s',c:false}]
const PL_Q4=[
  {t:'It removes all spatial dimensions — the classifier sees only "what", not "where"',c:true},
  {t:'It preserves spatial layout better than local pooling',c:false},
  {t:'It is faster than local pooling in all cases',c:false},
  {t:'It increases feature map resolution',c:false}
]

function plDrawBar(H,p,s,wrapId){
  const el=$(wrapId); if(!el) return
  const W=320,bH=36
  const out=p>0&&s>0?Math.max(0,Math.floor((H-p)/s)+1):0
  let segs=''
  for(let i=0;i<Math.min(out,80);i++){
    const l=(i*s/H)*100, w=(p/H)*100
    if(l+w>100) break
    segs+=`<div style="position:absolute;top:0;left:${l.toFixed(2)}%;width:${Math.min(w,100-l).toFixed(2)}%;height:100%;background:${i%2===0?'#3b82f6':'#93c5fd'};border-right:1px solid white;opacity:.7"></div>`
  }
  el.innerHTML=`<div style="position:relative;height:${bH}px;background:#e5e7eb;border-radius:5px;overflow:hidden;width:${W}px">${segs}</div><div style="font-size:12px;color:var(--muted);margin-top:4px;width:${W}px">H=${H} &nbsp;|&nbsp; p=${p} &nbsp;|&nbsp; s=${s} &nbsp;→&nbsp; output: <strong style="color:${out>0?'var(--green)':'var(--red)'};font-size:15px">${out}</strong></div>`
}

function plDrawAdaptBar(H,T,wrapId){
  const el=$(wrapId); if(!el) return
  const W=320,bH=36
  let segs=''
  for(let i=0;i<T;i++){
    const l=(i/T)*100, w=(1/T)*100
    segs+=`<div style="position:absolute;top:0;left:${l.toFixed(2)}%;width:${w.toFixed(2)}%;height:100%;background:${i%2===0?'#22c55e':'#86efac'};border-right:1px solid white;opacity:.8"></div>`
  }
  const p=Math.ceil(H/T),s=Math.floor(H/T)
  el.innerHTML=`<div style="position:relative;height:${bH}px;background:#e5e7eb;border-radius:5px;overflow:hidden;width:${W}px">${segs}</div><div style="font-size:12px;color:var(--muted);margin-top:4px;width:${W}px">H=${H} divided into ${T} equal segments → always <strong style="color:var(--green)">${T}</strong> output cells</div>`
  const ad=$('pl-adapt-disp')
  if(ad) ad.innerHTML=`p = ⌈${H}/${T}⌉ = ${p}<br>s = ⌊${H}/${T}⌋ = ${s}<br>⌊(${H}−${p})/${s}+1⌋ = ${Math.floor((H-p)/s)+1} ✓`
}

function plUpdate(){
  const p=parseInt($('pl-p').value),s=parseInt($('pl-s').value),H=parseInt($('pl-H').value)
  $('pl-p-val').textContent='+'+p; $('pl-s-val').textContent='+'+s; $('pl-H-val').textContent='+'+H
  plDrawBar(H,p,s,'pl-bar-wrap')
  const out=Math.max(0,Math.floor((H-p)/s)+1)
  const od=$('pl-out-disp')
  if(od) od.innerHTML=`Output = <span style="font-size:26px;font-weight:800;color:${out>1?'var(--orange)':'var(--green)'}">${out}</span>`
}

function plAdaptUpdate(){
  const T=parseInt($('pl-T').value),H=parseInt($('pl-H2').value)
  $('pl-T-val').textContent='+'+T; $('pl-H2-val').textContent='+'+H
  plDrawAdaptBar(H,T,'pl-adapt-bar-wrap')
}

function plCheckFill(){
  const vp=($('pl-fill-p')||{value:''}).value.trim()
  const vs=($('pl-fill-s')||{value:''}).value.trim()
  const okP=vp==='T'||vp==='t'
  const okS=vs==='T'||vs==='t'
  const ip=$('pl-fill-p'),is_=$('pl-fill-s')
  if(ip) ip.className='rr-inp'+(vp?(okP?' ok':' bad'):'')
  if(is_) is_.className='rr-inp'+(vs?(okS?' ok':' bad'):'')
  plFillOk=okP&&okS
  const hint=$('pl-fill-hint')
  if(plFillOk){
    if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>✓ Correct!</strong> p=⌈H/T⌉ and s=⌊H/T⌋. This guarantees the output is always exactly T cells, regardless of H.'}
    const btn=$('pl-s2-btn'); if(btn) btn.disabled=false
  } else if(vp||vs){
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Hint:</strong> Both denominators should be the target size T — the output adapts to produce exactly T windows.'}
  }
  plUpdateSummary()
}

function plUnlock(s){
  plStage=Math.max(plStage,s)
  for(let i=1;i<=s;i++){const e=$(`pl-s${i}`);if(e)e.classList.add('unlocked')}
  if(s>=3) plRenderS3MCQs()
}

function plRenderQ1(){
  const c=$('pl-q1-opts'); if(!c||c.children.length) return
  c.innerHTML=PL_Q1.map((o,i)=>`<div class="cg-mcq-opt" id="pl-q1-${i}" onclick="plMCQ(1,${i})">${o.t}</div>`).join('')
}

function plRenderS3MCQs(){
  const q2=$('pl-q2-opts'),q3=$('pl-q3-opts'),q4=$('pl-q4-opts')
  if(q2&&!q2.children.length) q2.innerHTML=PL_Q2.map((o,i)=>`<div class="cg-mcq-opt" id="pl-q2-${i}" onclick="plMCQ(2,${i})">${o.t}</div>`).join('')
  if(q3&&!q3.children.length) q3.innerHTML=PL_Q3.map((o,i)=>`<div class="cg-mcq-opt" id="pl-q3-${i}" onclick="plMCQ(3,${i})">${o.t}</div>`).join('')
  if(q4&&!q4.children.length) q4.innerHTML=PL_Q4.map((o,i)=>`<div class="cg-mcq-opt" id="pl-q4-${i}" onclick="plMCQ(4,${i})">${o.t}</div>`).join('')
}

function plMCQ(q,i){
  const data=[null,PL_Q1,PL_Q2,PL_Q3,PL_Q4][q]
  const pfx=`pl-q${q}-`,hid=`pl-q${q}-hint`
  document.querySelectorAll(`[id^="${pfx}"]`).forEach(e=>e.onclick=null)
  $(`${pfx}${i}`).classList.add(data[i].c?'sel-ok':'sel-bad')
  const hint=$(hid)
  if(data[i].c){
    if(q===1){plQ1=true; plUnlock(2); plAdaptUpdate(); if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> The output depends on H — fixed p and s cannot guarantee a constant output size.'}}
    else if(q===2){plQ2=true; if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> p=H, s=H → ⌊(H−H)/H+1⌋ = 1. Always one output cell.'}}
    else if(q===3){plQ3=true; if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> AdaptiveAvgPool2d(4) sets T=4 and computes p,s per image.'}}
    else if(q===4){plQ4=true; if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> GAP collapses spatial dimensions entirely, making the FC head size-independent.'}}
  } else {
    document.querySelectorAll(`[id^="${pfx}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>plMCQ(q,j)})
    if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Try again.'}
    if(q===1) plQ1=false; else if(q===2) plQ2=false; else if(q===3) plQ3=false; else plQ4=false
  }
  plUpdateSummary()
}

function plUpdateSummary(){
  const ref=($('pl-ref')||{value:''}).value
  const el=$('pl-summary'); if(!el) return
  el.innerHTML=`<p><strong>Formula fill-in:</strong> ${plFillOk?'<span style="color:var(--green)">✓</span>':'not yet'}</p><p><strong>MCQs correct:</strong> ${[plQ1,plQ2,plQ3,plQ4].filter(v=>v===true).length}/4</p><p><strong>Stage:</strong> ${plStage}/3</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('pl-completed', isComplete('pool93'))
}

function gmUpdateSummary(){
  const ref=($('gm-ref')||{value:''}).value
  const el=$('gm-summary'); if(!el) return
  el.innerHTML=`<p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('gm-completed', ref.length>10)
}
function initGCMech(){ gmUpdateSummary() }

function geUpdateSummary(){
  const ref=($('ge-ref')||{value:''}).value
  const el=$('ge-summary'); if(!el) return
  el.innerHTML=`<p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('ge-completed', ref.length>10)
}
function initGCEq(){ geUpdateSummary() }

function initPool93(){
  const eq=$('pl-prob-eq')
  if(eq){
    eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#b45309">$\\text{output size}=\\left\\lfloor\\frac{H-p}{s}\\right\\rfloor+1$</div>
        <div style="font-size:13px;color:var(--muted);margin-top:6px">For fixed p and s this <em>changes</em> with H — different image sizes produce different output sizes.</div>
      </div>
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center">
        <div style="color:#6d28d9">$p=\\left\\lceil H/T\\right\\rceil,\\quad s=\\left\\lfloor H/T\\right\\rfloor$</div>
        <div style="font-size:13px;color:var(--muted);margin-top:6px"><strong style="color:var(--text)">Adaptive pooling:</strong> fix the target output T and compute p,s per image → output is always T.</div>
      </div>
      <div style="padding:14px 20px;text-align:center">
        <div style="color:#15803d">Special case T = 1: p = H, s = H → <strong style="color:var(--text)">Global Average Pooling</strong> → always 1×1.</div>
      </div>
    </div>`
    typeset(eq)
  }
  plUnlock(1); plRenderQ1(); plUpdate(); plAdaptUpdate(); plUpdateSummary()
}

// ══════════════════════════════════════════════════
//  10.1.1  TEXT CNN SENTIMENT WINDOW
// ══════════════════════════════════════════════════
let tcStage=0, tcSel=0, tcQ1=null, tcQ2=null, tcQ3=null
const TC_SENTS=[
  {words:['The','usually','good','dog','was','being','bad'], label:'negative'},
  {words:['The','usually','bad','dog','was','being','good'], label:'positive'},
  {words:['It',"wasn't",'the','case','that','he','was','unhappy'], label:'positive'}
]
const TC_Q1=[
  {t:'k = 1 — single words', c:false},
  {t:'k = 2 — captures "being bad" / "being good" in one bigram', c:true},
  {t:'k = 3 — three-word windows', c:false},
  {t:'k = 5 — need more context', c:false},
]
const TC_Q2=[
  {t:'k = 3', c:false},
  {t:'k = 5', c:false},
  {t:'k = 7 — spans positions 2 through 8 (8−2+1=7)', c:true},
  {t:'k = 9 — needs extra padding', c:false},
]
const TC_Q3=[
  {t:"Positive — \"wasn't\" negates the sentiment", c:false},
  {t:'Negative — "was unhappy" dominates the max-pool', c:true},
  {t:'Neutral — the model cannot decide', c:false},
]
function tcUnlock(s){ tcStage=Math.max(tcStage,s); for(let i=1;i<=s;i++){const e=$('tc-s'+i);if(e)e.classList.add('unlocked')} if(s>=2) tcRenderMCQs() }
function tcSentence(i){ tcSel=i; ['tc-btn0','tc-btn1','tc-btn2'].forEach((id,j)=>{const b=$(id);if(b)b.className='btn '+(j===i?'btn-p':'btn-g')}); tcUpdate() }
function tcUpdate(){ const k=parseInt($('tc-k').value); $('tc-k-val').textContent=k; $('tc-k-echo').textContent=k; const {words}=TC_SENTS[tcSel]; const wd=$('tc-words'); if(!wd) return; wd.innerHTML=words.map(w=>`<span style="padding:5px 10px;background:var(--surf2);border:1px solid var(--border);border-radius:5px;font-family:'Courier New',monospace;font-size:13px;font-weight:600">${w}</span>`).join(''); const ng=$('tc-ngrams'); if(!ng) return; const grams=[]; for(let i=0;i<=words.length-k;i++) grams.push(words.slice(i,i+k).join(' ')); ng.innerHTML=grams.map(g=>`<span style="padding:3px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;font-size:12px;font-family:'Courier New',monospace;color:var(--blue)">${g}</span>`).join('') }
function tcRenderMCQs(){ const q1=$('tc-q1-opts'),q2=$('tc-q2-opts'),q3=$('tc-q3-opts'); if(q1&&!q1.children.length) q1.innerHTML=TC_Q1.map((o,i)=>`<div class="cg-mcq-opt" id="tc-q1-${i}" onclick="tcMCQ(1,${i})">${o.t}</div>`).join(''); if(q2&&!q2.children.length) q2.innerHTML=TC_Q2.map((o,i)=>`<div class="cg-mcq-opt" id="tc-q2-${i}" onclick="tcMCQ(2,${i})">${o.t}</div>`).join(''); if(q3&&!q3.children.length) q3.innerHTML=TC_Q3.map((o,i)=>`<div class="cg-mcq-opt" id="tc-q3-${i}" onclick="tcMCQ(3,${i})">${o.t}</div>`).join('') }
function tcMCQ(q,i){ const data=[null,TC_Q1,TC_Q2,TC_Q3][q]; const pfx=`tc-q${q}-`,hid=`tc-q${q}-hint`; document.querySelectorAll(`[id^="${pfx}"]`).forEach(e=>e.onclick=null); $(`${pfx}${i}`).classList.add(data[i].c?'sel-ok':'sel-bad'); const hint=$(hid); if(data[i].c){ if(q===1){tcQ1=true;tcUnlock(3);if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> k=2 captures "being bad" and "being good" as single bigrams. k=1 sees both words in both sentences and cannot tell them apart.'}} else if(q===2){tcQ2=true;tcUnlock(4);if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> Span = 8−2+1 = 7. Any k&lt;7 cannot contain both "wasn\'t" and "unhappy" in one window.'}} else if(q===3){tcQ3=true;if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. ✓ Correct!</strong> Max-pooling selects "was unhappy" as the top bigram — a strong negative signal. The negation "wasn\'t" seven words earlier is invisible to a k=2 filter.'}} } else { document.querySelectorAll(`[id^="${pfx}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>tcMCQ(q,j)}); if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Try again.'} if(q===1)tcQ1=false;else if(q===2)tcQ2=false;else tcQ3=false } tcUpdateSummary() }
function tcUpdateSummary(){ const ref=($('tc-ref')||{value:''}).value; const el=$('tc-summary');if(!el)return; el.innerHTML=`<p><strong>MCQs correct:</strong> ${[tcQ1,tcQ2,tcQ3].filter(v=>v===true).length}/3</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">&#10003;</span>':'not yet'}</p>`; updateBadge('tcnn-completed',isComplete('textcnn')) }
function initTextCNN(){ const eq=$('tc-eq'); if(eq){ eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center"><div style="color:#b45309">$\\text{n-gram}_i = (w_i,\\,w_{i+1},\\,\\ldots,\\,w_{i+k-1})$</div><div style="font-size:13px;color:var(--muted);margin-top:6px">Filter scores each n-gram; max-pooling picks the best: $y = \\max_i\\; \\text{score}(\\text{n-gram}_i)$</div></div><div style="padding:14px 20px;text-align:center"><div style="color:#15803d;font-size:13px">Long-range negation requires large k — or a recurrent architecture.</div></div></div>`; typeset(eq) } tcSentence(0); tcUpdateSummary() }

// ══════════════════════════════════════════════════
//  10.1.2  RNN FORWARD PASS
// ══════════════════════════════════════════════════
let rfStage=0, rfFillOk=false, rfMCQ=null
const RF_Q1=[
  {t:'That dimension permanently stops learning — it will never activate again', c:false},
  {t:'That dimension carries no positive signal at this step; downstream computation ignores it', c:true},
  {t:'A numerical error occurred — the true value cannot be negative', c:false},
  {t:'The entire hidden state resets to zero', c:false},
]
function rfUnlock(s){ rfStage=Math.max(rfStage,s); for(let i=1;i<=s;i++){const e=$(`rf-s${i}`);if(e)e.classList.add('unlocked')} if(s>=3) rfRenderMCQ() }
function rfCheck(){
  const v=id=>{const e=$(id);return e&&e.value!==''?parseFloat(e.value):null}
  const mark=(id,ok)=>{const e=$(id);if(e)e.className='rr-inp'+(ok===true?' ok':ok===false?' bad':'')}
  const a0=v('rf-a0'),a1=v('rf-a1'); const okA=a0===0&&a1===2
  mark('rf-a0',a0!==null?a0===0:null); mark('rf-a1',a1!==null?a1===2:null)
  const hA=$('rf-a-hint'); if(hA){ if(okA){hA.className='guidance-box done';hA.innerHTML='<strong>&#10003;</strong> 0&middot;1+1&middot;0=0 &nbsp; 2&middot;1+(&#8722;5)&middot;0=2'} else if(a0!==null||a1!==null){hA.className='guidance-box warm';hA.innerHTML='x&#8317;&#185;&#8318;=[1,0] — only first column of W&#8322; matters.'} else{hA.className='guidance-box cold';hA.innerHTML=''} }
  const h1b=$('rf-h1-block'); if(h1b){h1b.style.opacity=okA?'1':'0.35';h1b.style.pointerEvents=okA?'':'none'}
  const b0=v('rf-b0'),b1=v('rf-b1'); const okB=okA&&b0===0&&b1===2
  mark('rf-b0',b0!==null?b0===0:null); mark('rf-b1',b1!==null?b1===2:null)
  const hB=$('rf-b-hint'); if(hB&&okA){ if(okB){hB.className='guidance-box done';hB.innerHTML='<strong>&#10003;</strong> ReLU([0,2])=[0,2] — both &#8805; 0, nothing clipped.'} else if(b0!==null||b1!==null){hB.className='guidance-box warm';hB.innerHTML='Sum=[0,0]+[0,2]=[0,2] &#8594; apply ReLU component-wise.'} else{hB.className='guidance-box cold';hB.innerHTML=''} }
  const btn1=$('rf-s1-btn-wrap'); if(btn1){btn1.style.opacity=okB?'1':'0.35';btn1.style.pointerEvents=okB?'':'none'}
  const c0=v('rf-c0'),c1=v('rf-c1'); const okC=c0===4&&c1===-2
  mark('rf-c0',c0!==null?c0===4:null); mark('rf-c1',c1!==null?c1===-2:null)
  const hC=$('rf-c-hint'); if(hC&&rfStage>=2){ if(okC){hC.className='guidance-box done';hC.innerHTML='<strong>&#10003;</strong> 1&middot;0+2&middot;2=4 &nbsp; 0&middot;0+(&#8722;1)&middot;2=&#8722;2'} else if(c0!==null||c1!==null){hC.className='guidance-box warm';hC.innerHTML='Use h&#8317;&#185;&#8318;=[0,2] with W&#8321;.'} else{hC.className='guidance-box cold';hC.innerHTML=''} }
  const d0=v('rf-d0'),d1=v('rf-d1'); const okD=d0===1&&d1===-5
  mark('rf-d0',d0!==null?d0===1:null); mark('rf-d1',d1!==null?d1===-5:null)
  const hD=$('rf-d-hint'); if(hD&&rfStage>=2){ if(okD){hD.className='guidance-box done';hD.innerHTML='<strong>&#10003;</strong> 0&middot;0+1&middot;1=1 &nbsp; 2&middot;0+(&#8722;5)&middot;1=&#8722;5'} else if(d0!==null||d1!==null){hD.className='guidance-box warm';hD.innerHTML='Use x&#8317;&#178;&#8318;=[0,1] with W&#8322;.'} else{hD.className='guidance-box cold';hD.innerHTML=''} }
  const h2b=$('rf-h2-block'); if(h2b){ const show=okC&&okD; h2b.style.opacity=show?'1':'0.35';h2b.style.pointerEvents=show?'':'none'; if(show){const eq=$('rf-h2-eq');if(eq)eq.textContent='ReLU([4+1, −2+(−5)]) = ReLU([5, −7]) = ?'} }
  const e0=v('rf-e0'),e1=v('rf-e1'); const okE=okC&&okD&&e0===5&&e1===0; rfFillOk=okE
  mark('rf-e0',e0!==null?e0===5:null); mark('rf-e1',e1!==null?e1===0:null)
  const hE=$('rf-e-hint'); if(hE&&okC&&okD){ if(okE){hE.className='guidance-box done';hE.innerHTML='<strong>&#10003; Correct!</strong> ReLU([5,&#8722;7])=[5,0]. Component 1 clipped to 0.'} else if(e0!==null||e1!==null){hE.className='guidance-box warm';hE.innerHTML='Sum=[4+1,&#8722;2+(&#8722;5)]=[5,&#8722;7] &#8594; apply ReLU.'} else{hE.className='guidance-box cold';hE.innerHTML=''} }
  const btn2=$('rf-s2-btn-wrap'); if(btn2){btn2.style.opacity=okE?'1':'0.35';btn2.style.pointerEvents=okE?'':'none'}
  rfUpdateSummary()
}
function rfRenderMCQ(){ const el=$('rf-q1-opts');if(!el||el.children.length)return; el.innerHTML=RF_Q1.map((o,i)=>`<div class="cg-mcq-opt" id="rf-q1-${i}" onclick="rfMCQClick(${i})">${o.t}</div>`).join('') }
function rfMCQClick(i){ document.querySelectorAll('[id^="rf-q1-"]').forEach(e=>e.onclick=null); $(`rf-q1-${i}`).classList.add(RF_Q1[i].c?'sel-ok':'sel-bad'); const hint=$('rf-q1-hint'); if(RF_Q1[i].c){ rfMCQ=true; if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. &#10003; Correct!</strong> ReLU zeros the component for this timestep &#8212; it carries no positive signal now. It is not permanently dead; a future input could reactivate it.'} } else { document.querySelectorAll('[id^="rf-q1-"]').forEach((e,j)=>{if(j!==i)e.onclick=()=>rfMCQClick(j)}); rfMCQ=false; if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Think about what ReLU(v) means for a single timestep &#8212; not permanently, just for now.'} } rfUpdateSummary() }
function rfUpdateSummary(){ const ref=($('rf-ref')||{value:''}).value; const el=$('rf-summary');if(!el)return; el.innerHTML=`<p><strong>Fill-in complete:</strong> ${rfFillOk?'<span style="color:var(--green)">&#10003;</span>':'not yet'}</p><p><strong>MCQ:</strong> ${rfMCQ===true?'<span style="color:var(--green)">&#10003;</span>':'not yet'}</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">&#10003;</span>':'not yet'}</p>`; updateBadge('rfwd-completed',isComplete('rnnfwd')) }
function initRNNFwd(){ const eq=$('rf-eq'); if(eq){ eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center"><div style="color:#b45309">$\\mathbf{h}^{(t)} = \\mathrm{ReLU}\\bigl(W_1\\,\\mathbf{h}^{(t-1)} + W_2\\,\\mathbf{x}^{(t)}\\bigr)$</div><div style="font-size:13px;color:var(--muted);margin-top:6px">Each step mixes prior memory (W&#8321;) with new input (W&#8322;), then applies ReLU.</div></div><div style="padding:14px 20px;text-align:center"><div style="color:#6d28d9;font-family:'Courier New',monospace;font-size:13px">$W_1=\\begin{pmatrix}1&2\\\\0&-1\\end{pmatrix}$ &nbsp; $W_2=\\begin{pmatrix}0&1\\\\2&-5\\end{pmatrix}$ &nbsp; $\\mathbf{h}^{(0)}=[0,0]^\\top,\\;\\mathbf{x}^{(1)}=[1,0]^\\top,\\;\\mathbf{x}^{(2)}=[0,1]^\\top$</div></div></div>`; typeset(eq) } rfUpdateSummary() }

// ══════════════════════════════════════════════════
//  10.2.1  RNN DESIGNER
// ══════════════════════════════════════════════════
let rdStage=0, rdQ1=null, rdQ2=null, rdQ3=null, rdQ4=null, rdQ5=null
const RD_Q1=[
  {t:'One-hot vector of size V (sparse, dimension V)', c:false},
  {t:'Learned embedding e = Ex, where E &#8712; &#8477;^{d&#215;V} and d &#8810; V', c:true},
  {t:"ASCII character codes of the word's letters", c:false},
  {t:'A random fixed vector assigned at startup', c:false},
]
const RD_Q2=[
  {t:'h&#8317;&#8304;&#8318; = 0  (zero-initialise &#8212; ignore the input word)', c:false},
  {t:'h&#8317;&#8304;&#8318; = e  (use the embedding vector directly)', c:false},
  {t:'h&#8317;&#8304;&#8318; = tanh(W_enc &#183; e + b_enc)  (learned nonlinear projection)', c:true},
  {t:'h&#8317;&#8304;&#8318; = softmax(e)  (normalise to a probability distribution)', c:false},
]
const RD_Q3=[
  {t:'h&#8317;&#7511;&#8318; = W &#183; h&#8317;&#7511;&#8331;&#185;&#8318; + b  (linear &#8212; no nonlinearity)', c:false},
  {t:'h&#8317;&#7511;&#8318; = ReLU(W &#183; h&#8317;&#7511;&#8331;&#185;&#8318; + b)  (unbounded activations)', c:false},
  {t:'h&#8317;&#7511;&#8318; = tanh(W &#183; h&#8317;&#7511;&#8331;&#185;&#8318; + b)  (bounded, smooth, classical RNN)', c:true},
  {t:'h&#8317;&#7511;&#8318; = sigmoid(W &#183; h&#8317;&#7511;&#8331;&#185;&#8318; + b)  (only positive half-space)', c:false},
]
const RD_Q4=[
  {t:'y&#8317;&#7511;&#8318; = V &#183; h&#8317;&#7511;&#8318; + c  (raw linear scores, no normalisation)', c:false},
  {t:'y&#8317;&#7511;&#8318; = softmax(V &#183; h&#8317;&#7511;&#8318; + c)  (valid probability distribution)', c:true},
  {t:'y&#8317;&#7511;&#8318; = sigmoid(V &#183; h&#8317;&#7511;&#8318; + c)  (V independent binary probabilities)', c:false},
  {t:'y&#8317;&#7511;&#8318; = argmax(V &#183; h&#8317;&#7511;&#8318;)  (non-differentiable)', c:false},
]
const RD_Q5=[
  {t:'Stop after a fixed number of steps (e.g. 10)', c:false},
  {t:'Stop when h&#8317;&#7511;&#8318; converges to a fixed point', c:false},
  {t:'Stop when the predicted word is the special [END] token', c:true},
  {t:'User provides the desired length in advance', c:false},
]
function rdUnlock(s){ rdStage=Math.max(rdStage,s); for(let i=1;i<=s;i++){const e=$(`rd-s${i}`);if(e)e.classList.add('unlocked')} if(s>=1) rdRenderMCQs(); if(s>=6) rdShowArch() }
function rdRenderMCQs(){ const defs=[null,RD_Q1,RD_Q2,RD_Q3,RD_Q4,RD_Q5]; for(let q=1;q<=5;q++){ const el=$(`rd-q${q}-opts`);if(!el||el.children.length)continue; el.innerHTML=defs[q].map((o,i)=>`<div class="cg-mcq-opt" id="rd-q${q}-${i}" onclick="rdMCQ(${q},${i})">${o.t}</div>`).join('') } }
function rdMCQ(q,i){ const defs=[null,RD_Q1,RD_Q2,RD_Q3,RD_Q4,RD_Q5]; const data=defs[q],pfx=`rd-q${q}-`,hid=`rd-q${q}-hint`; document.querySelectorAll(`[id^="${pfx}"]`).forEach(e=>e.onclick=null); $(`${pfx}${i}`).classList.add(data[i].c?'sel-ok':'sel-bad'); const hint=$(hid); const msgs=[null,'Correct! A learned embedding E maps the one-hot to a dense vector where similar words can be nearby.','Correct! tanh(W_enc&#183;e+b_enc) applies a learned nonlinear transformation to compress the input word into the hidden state dimension.','Correct! tanh bounds the hidden state to (&#8722;1,1), preventing unbounded growth. Linear collapses depth; ReLU can explode; sigmoid drops the negative half.','Correct! softmax converts raw scores to a proper probability distribution (positive, sums to 1).','Correct! Adding [END] to the vocabulary lets the model learn when to stop. Training sequences are terminated with [END].']; if(data[i].c){ if(q===1)rdQ1=true;else if(q===2)rdQ2=true;else if(q===3)rdQ3=true;else if(q===4)rdQ4=true;else rdQ5=true; rdUnlock(q+1); if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. &#10003; </strong>'+msgs[q]} } else { document.querySelectorAll(`[id^="${pfx}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>rdMCQ(q,j)}); if(q===1)rdQ1=false;else if(q===2)rdQ2=false;else if(q===3)rdQ3=false;else if(q===4)rdQ4=false;else rdQ5=false; if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Try again.'} } rdUpdateSummary() }
function rdShowArch(){ const el=$('rd-arch-eqs');if(!el)return; el.innerHTML='e = E &middot; x_in<br>h&#8317;&#8304;&#8318; = tanh(W_enc&middot;e + b)<br>h&#8317;&#7511;&#8318; = tanh(W&middot;h&#8317;&#7511;&#8331;&#185;&#8318; + b)<br>y&#8317;&#7511;&#8318; = softmax(V&middot;h&#8317;&#7511;&#8318; + c)<br>stop when argmax(y&#8317;&#7511;&#8318;) = [END]' }
function rdUpdateSummary(){ const ref=($('rd-ref')||{value:''}).value;const el=$('rd-summary');if(!el)return; const n=[rdQ1,rdQ2,rdQ3,rdQ4,rdQ5].filter(v=>v===true).length; el.innerHTML=`<p><strong>Design choices:</strong> ${n}/5</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">&#10003;</span>':'not yet'}</p>`; updateBadge('rdes-completed',isComplete('rnndesign')) }
function initRNNDesign(){ const eq=$('rd-eq'); if(eq){ eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center"><div style="color:#b45309;font-size:13px">encoder: $\\mathbf{e}=E\\mathbf{x}_{\\text{in}}$ &#8594; $\\mathbf{h}^{(0)}=\\tanh(W_{\\text{enc}}\\,\\mathbf{e}+\\mathbf{b}_{\\text{enc}})$</div></div><div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center"><div style="color:#6d28d9">decoder: $\\mathbf{h}^{(t)}=\\tanh(W\\,\\mathbf{h}^{(t-1)}+\\mathbf{b})$ &#8594; $\\mathbf{y}^{(t)}=\\mathrm{softmax}(V\\mathbf{h}^{(t)}+\\mathbf{c})$</div></div><div style="padding:14px 20px;text-align:center"><div style="color:#15803d;font-size:13px">stop when $\\arg\\max(\\mathbf{y}^{(t)})=[\\text{END}]$</div></div></div>`; typeset(eq) } rdUpdateSummary() }

// ══════════════════════════════════════════════════
//  10.2.2  RNN TANH SATURATION
// ══════════════════════════════════════════════════
let rnStage=0, rnMoves=0, rnQ1=null, rnQ2=null, rnQ3=null, rnQ4=null
const RN_Q1=[
  {t:'In the output layer o&#8317;&#7511;&#8318; = Vh&#8317;&#7511;&#8318; + c &#8212; V is applied at every timestep', c:false},
  {t:'In the hidden-to-hidden Jacobian &#8212; diag(1&#8722;h&#178;)&middot;W is multiplied T&#8722;1 times in BPTT', c:true},
  {t:'Equally across all weights &#8212; no single term dominates', c:false},
  {t:'In the input weights U &#8212; the input is fed at every timestep', c:false},
]
const RN_Q2=[
  {t:'Stays roughly constant &#8212; 10 steps is not many', c:false},
  {t:'Grows &#8212; W amplifies the signal each step', c:false},
  {t:'Shrinks to &#8776;0.2&#185;&#8304; &#8776; 10&#8315;&#8311; &#8212; effectively zero', c:true},
  {t:'Alternates sign and cancels out to zero', c:false},
]
const RN_Q3=[
  {t:'Use gradient clipping &#8212; cap the gradient norm at each step', c:false},
  {t:'Use LSTM / GRU &#8212; additive cell-state path lets gradients bypass repeated tanh multiplication', c:true},
  {t:'Reduce the number of timesteps T', c:false},
  {t:'Use a larger learning rate to compensate for small gradients', c:false},
]
const RN_Q4=[
  {t:'Hidden states can grow without bound &#8594; gradients may explode during BPTT', c:true},
  {t:'ReLU is strictly better in RNNs &#8212; no side effects whatsoever', c:false},
  {t:'The softmax output layer becomes numerically unstable', c:false},
  {t:'Learning becomes impossible &#8212; ReLU kills all gradients in recurrence', c:false},
]
function rnUnlock(s){ rnStage=Math.max(rnStage,s); for(let i=1;i<=s;i++){const e=$(`rn-s${i}`);if(e)e.classList.add('unlocked')} if(s>=2) rnRenderMCQs() }
function rnRenderMCQs(){ const defs=[null,RN_Q1,RN_Q2,RN_Q3,RN_Q4]; for(let q=1;q<=4;q++){ const el=$(`rn-q${q}-opts`);if(!el||el.children.length)continue; el.innerHTML=defs[q].map((o,i)=>`<div class="cg-mcq-opt" id="rn-q${q}-${i}" onclick="rnMCQ(${q},${i})">${o.t}</div>`).join('') } }
function rnMCQ(q,i){ const defs=[null,RN_Q1,RN_Q2,RN_Q3,RN_Q4]; const data=defs[q],pfx=`rn-q${q}-`,hid=`rn-q${q}-hint`; document.querySelectorAll(`[id^="${pfx}"]`).forEach(e=>e.onclick=null); $(`${pfx}${i}`).classList.add(data[i].c?'sel-ok':'sel-bad'); const hint=$(hid); const msgs=[null,'Correct! Each BPTT step multiplies by diag(1&#8722;h&#178;)&middot;W. Saturated hidden states (|h|&#8776;1) give 1&#8722;h&#178;&#8776;0. Multiplying T&#8722;1 of these crushes the gradient exponentially.','Correct! Each step multiplies by 0.2, so after 10 steps: 0.2&#185;&#8304; &#8776; 10&#8315;&#8311;. The network cannot learn which early input caused the error.','Correct! LSTM adds a cell state c&#8317;&#7511;&#8318; updated additively: c&#8317;&#7511;&#8318; = f&#8855;c&#8317;&#7511;&#8331;&#185;&#8318; + i&#8855;&#265;&#8317;&#7511;&#8318;. The additive update creates a gradient highway that bypasses repeated tanh derivatives.','Correct! tanh bounds h&#8317;&#7511;&#8318; to (&#8722;1,1). With ReLU there is no bound, so if &#8214;W&#8214;&gt;1 the hidden state grows each step and gradients explode.']; if(data[i].c){ if(q===1)rnQ1=true;else if(q===2)rnQ2=true;else if(q===3)rnQ3=true;else rnQ4=true; rnUnlock(q+1); if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. &#10003; </strong>'+msgs[q]} } else { document.querySelectorAll(`[id^="${pfx}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>rnMCQ(q,j)}); if(q===1)rnQ1=false;else if(q===2)rnQ2=false;else if(q===3)rnQ3=false;else rnQ4=false; if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Try again.'} } rnUpdateSummary() }
function rnSlider(){ rnMoves++; const btn=$('rn-s1-btn');if(btn&&rnMoves>=3)btn.disabled=false; const z=parseFloat($('rn-z').value); $('rn-z-val').textContent=z.toFixed(1); const tv=Math.tanh(z),dv=1-tv*tv; $('rn-tanh-v').textContent=tv.toFixed(3);$('rn-dt-v').textContent=dv.toFixed(3); const msg=$('rn-sat-msg'); if(msg)msg.innerHTML=dv<0.1?'<span style="color:var(--red)">&#9888; Saturated &#8212; tanh&#8242; near 0, gradient nearly eliminated</span>':dv<0.5?'<span style="color:var(--orange)">tanh&#8242; getting small &#8212; moderate saturation</span>':'<span style="color:var(--green)">Near z=0 &#8212; gradient healthy (tanh&#8242; &#8776; 1)</span>'; rnDrawCurve(z) }
function rnDrawCurve(z0){ const svg=$('rn-svg');if(!svg)return; const W=280,H=170,lm=28,bm=20,pw=W-lm-8,ph=H-bm-15; const zMin=-4,zMax=4,toX=z=>lm+(z-zMin)/(zMax-zMin)*pw,toY=v=>bm+ph/2-v*ph/2.2; let pt='',pd=''; for(let i=0;i<=100;i++){const z=zMin+(zMax-zMin)*i/100,t=Math.tanh(z),d=1-t*t;pt+=(i?'L':'M')+toX(z).toFixed(1)+','+toY(t).toFixed(1);pd+=(i?'L':'M')+toX(z).toFixed(1)+','+toY(d).toFixed(1)} const lx=toX(z0),tv=Math.tanh(z0),dv=1-tv*tv; let h=`<line x1="${lm}" y1="${bm}" x2="${lm}" y2="${bm+ph}" stroke="var(--border)" stroke-width="1"/><line x1="${lm}" y1="${bm+ph/2}" x2="${W-8}" y2="${bm+ph/2}" stroke="var(--border)" stroke-width="1"/>`; for(let z=-3;z<=3;z++) h+=`<text x="${toX(z).toFixed(1)}" y="${bm+ph/2+13}" text-anchor="middle" font-size="9" fill="var(--muted)">${z}</text>`;[-1,-0.5,0.5,1].forEach(v=>{const y=toY(v);h+=`<text x="${lm-3}" y="${y+3}" text-anchor="end" font-size="9" fill="var(--muted)">${v}</text>`}); h+=`<path d="${pt}" fill="none" stroke="#1d4ed8" stroke-width="2"/><path d="${pd}" fill="none" stroke="#b91c1c" stroke-width="2" stroke-dasharray="5,3"/><line x1="${lx}" y1="${bm}" x2="${lx}" y2="${bm+ph}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,2"/><circle cx="${lx}" cy="${toY(tv)}" r="4" fill="#1d4ed8"/><circle cx="${lx}" cy="${toY(dv)}" r="4" fill="#b91c1c"/><text x="${W-10}" y="${bm+12}" text-anchor="end" font-size="10" fill="#1d4ed8">tanh</text><text x="${W-10}" y="${bm+24}" text-anchor="end" font-size="10" fill="#b91c1c">tanh&#8242;</text>`; svg.innerHTML=h }
function rnDrawFlow(){ const svg=$('rn-flow-svg');if(!svg)return; const tp=parseFloat(($('rn-tp')||{value:'0.2'}).value),wr=parseFloat(($('rn-wr')||{value:'1.0'}).value); $('rn-tp-val').textContent=tp.toFixed(2);$('rn-wr-val').textContent=wr.toFixed(2); const T=10,W=260,H=130,lm=24,bm=22,pw=W-lm-8,ph=H-bm-14,factor=tp*wr; const mags=[];for(let t=0;t<T;t++)mags.push(Math.pow(factor,t)); const maxM=Math.max(...mags,0.001); let h=`<line x1="${lm}" y1="${bm}" x2="${lm}" y2="${bm+ph}" stroke="var(--border)" stroke-width="1"/><line x1="${lm}" y1="${bm+ph}" x2="${W-8}" y2="${bm+ph}" stroke="var(--border)" stroke-width="1"/>`; mags.forEach((m,i)=>{const x=lm+(i+0.5)*pw/T,barH=Math.max(2,(m/maxM)*ph*0.92),col=m<0.01?'#b91c1c':m>5?'#c2410c':'#3b82f6';h+=`<rect x="${(x-pw/T*0.35).toFixed(1)}" y="${(bm+ph-barH).toFixed(1)}" width="${(pw/T*0.7).toFixed(1)}" height="${barH.toFixed(1)}" fill="${col}" rx="2"/><text x="${x.toFixed(1)}" y="${bm+ph+12}" text-anchor="middle" font-size="9" fill="var(--muted)">${i+1}</text>`}); svg.innerHTML=h; const msg=$('rn-flow-msg');if(msg)msg.innerHTML=factor<0.7?'<span style="color:var(--red)">Vanishing &#8212; gradient disappears over long sequences.</span>':factor>1.2?'<span style="color:var(--orange)">Exploding &#8212; gradient grows over long sequences.</span>':'<span style="color:var(--green)">Balanced &#8212; gradient stays roughly constant.</span>' }
function rnUpdateSummary(){ const ref=($('rn-ref')||{value:''}).value;const el=$('rn-summary');if(!el)return; const n=[rnQ1,rnQ2,rnQ3,rnQ4].filter(v=>v===true).length; el.innerHTML=`<p><strong>Slider explored:</strong> ${rnMoves>=3?'<span style="color:var(--green)">&#10003;</span>':'move slider &#8805;3 times'}</p><p><strong>MCQs correct:</strong> ${n}/4</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">&#10003;</span>':'not yet'}</p>`; updateBadge('rtnh-completed',isComplete('rnntanh')) }
function initRNNTanh(){ const eq=$('rn-eq');if(eq){eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center"><div style="color:#b45309">$\\mathbf{o}^{(t)} = \\mathbf{c} + V\\mathbf{h}^{(t)}$</div><div style="color:#6d28d9;margin-top:4px">$\\mathbf{h}^{(t)} = \\tanh\\bigl(\\mathbf{b} + W\\mathbf{h}^{(t-1)} + U\\mathbf{x}^{(t)}\\bigr)$</div><div style="font-size:13px;color:var(--muted);margin-top:6px">When |Wh+Ux+b| is large, tanh saturates &#8212; derivative collapses toward zero.</div></div><div style="padding:14px 20px;text-align:center"><div style="color:#15803d;font-size:13px">BPTT: $\\frac{\\partial L}{\\partial \\mathbf{h}^{(1)}} = \\prod_{t=2}^{T} \\mathrm{diag}(1-{\\mathbf{h}^{(t)}}^2)\\cdot W \\cdot \\frac{\\partial L}{\\partial \\mathbf{h}^{(T)}}$</div></div></div>`; typeset(eq) } rnDrawCurve(0); rnDrawFlow(); rnUpdateSummary() }

// ══════════════════════════════════════════════════
//  10.3  BI-DIRECTIONAL RNN
// ══════════════════════════════════════════════════
let brStage=0, brEq1ok=false, brEq2ok=false, brEq3ok=false, brQ1=null, brQ2=null, brQ3=null
let brEq1aOk=false, brEq1bOk=false, brEq2cOk=false, brEq2dOk=false, brEq3eOk=false, brEq3fOk=false
const BR_Q1=[
  {t:'U_f — the input weight matrix',c:false},
  {t:'W_f — the forward recurrent weight',c:true},
  {t:'W_b — the backward recurrent weight',c:false},
  {t:'V_f — the forward output weight',c:false},
]
const BR_Q2=[
  {t:'The backward RNN reads the sequence right-to-left; at step t its "previous" computed state is t+1',c:true},
  {t:'It is a typo — both forward and backward should use (t−1)',c:false},
  {t:'To prevent vanishing gradients in the backward pass',c:false},
  {t:'Because V_b is applied after both streams are concatenated',c:false},
]
const BR_Q3=[
  {t:'Next-word language model generation — needs future context at every step',c:false},
  {t:'Named entity recognition — knowing words after an entity confirms its type',c:true},
  {t:'Real-time speech transcription — must output before hearing the full utterance',c:false},
  {t:'Online sentiment scoring — must classify as each token arrives',c:false},
]
const BR_SLOTS={
  eq1a:['W_f','U_f','W_b','V_f'],
  eq1b:['U_f','W_f','U_b','V_b'],
  eq2c:['W_b','U_b','W_f','V_b'],
  eq2d:['U_b','W_b','U_f','V_f'],
  eq3e:['V_f','W_f','U_f','V_b'],
  eq3f:['V_b','W_b','U_b','V_f'],
}
const BR_CORRECT={eq1a:'W_f',eq1b:'U_f',eq2c:'W_b',eq2d:'U_b',eq3e:'V_f',eq3f:'V_b'}
function brUnlock(s){ brStage=Math.max(brStage,s); for(let i=1;i<=s;i++){const e=$(`br-s${i}`);if(e)e.classList.add('unlocked')} if(s>=4) brRenderSlots() }
function brRenderSlots(){
  Object.entries(BR_SLOTS).forEach(([slot,opts])=>{
    const el=$(slot==='eq1a'?'br-eq1a-opts':slot==='eq1b'?'br-eq1b-opts':slot==='eq2c'?'br-eq2c-opts':slot==='eq2d'?'br-eq2d-opts':slot==='eq3e'?'br-eq3e-opts':'br-eq3f-opts')
    if(!el||el.children.length)return
    el.innerHTML=opts.map((o,i)=>`<div class="cg-mcq-opt" id="br-${slot}-${i}" onclick="brSlot('${slot}',${i})">${o}</div>`).join('')
  })
}
function brSlot(slot,i){
  const opts=BR_SLOTS[slot],correct=BR_CORRECT[slot],pfx=`br-${slot}-`
  document.querySelectorAll(`[id^="${pfx}"]`).forEach(e=>e.onclick=null)
  $(`${pfx}${i}`).classList.add(opts[i]===correct?'sel-ok':'sel-bad')
  const ok=opts[i]===correct
  if(slot==='eq1a')brEq1aOk=ok; else if(slot==='eq1b')brEq1bOk=ok
  else if(slot==='eq2c')brEq2cOk=ok; else if(slot==='eq2d')brEq2dOk=ok
  else if(slot==='eq3e')brEq3eOk=ok; else brEq3fOk=ok
  if(!ok){ document.querySelectorAll(`[id^="${pfx}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>brSlot(slot,j)}) }
  const hintMap={eq1a:'br-eq1-hint',eq1b:'br-eq1-hint',eq2c:'br-eq2-hint',eq2d:'br-eq2-hint',eq3e:'br-eq3-hint',eq3f:'br-eq3-hint'}
  const h=$(hintMap[slot])
  if(brEq1aOk&&brEq1bOk){ brEq1ok=true; if(h){h.className='guidance-box done';h.innerHTML='<strong>&#10003; h_f correct!</strong> W_f is recurrent (connects forward states); U_f reads the input.'} const b=$('br-eq2-block');if(b){b.style.opacity='1';b.style.pointerEvents=''} }
  else if(brEq2cOk&&brEq2dOk){ brEq2ok=true; if(h){h.className='guidance-box done';h.innerHTML='<strong>&#10003; h_b correct!</strong> W_b recurs right-to-left (into h_b^(t+1)); U_b reads the same input.'} const b=$('br-eq3-block');if(b){b.style.opacity='1';b.style.pointerEvents=''} }
  else if(brEq3eOk&&brEq3fOk){ brEq3ok=true; if(h){h.className='guidance-box done';h.innerHTML='<strong>&#10003; o correct!</strong> V_f projects the forward stream; V_b projects the backward stream — both added together.'} brUnlock(5) }
  else if(!ok&&h){ h.className='guidance-box warm';h.innerHTML='<strong>Not quite.</strong> Try again.' }
  brUpdateSummary()
}
function brHighlight(mode){
  ['br-fwd-btn','br-bwd-btn','br-out-btn'].forEach(id=>{const b=$(id);if(b)b.className='btn btn-g'})
  const activeId=mode==='fwd'?'br-fwd-btn':mode==='bwd'?'br-bwd-btn':'br-out-btn'
  const ab=$(activeId);if(ab)ab.className='btn btn-p'
  const msgs={fwd:'Forward stream (blue): h_f^(t) = tanh(W_f·h_f^(t−1) + U_f·x^(t)) — flows left→right, each state depends on the previous.',bwd:'Backward stream (red): h_b^(t) = tanh(W_b·h_b^(t+1) + U_b·x^(t)) — flows right→left, each state depends on the NEXT.',out:'Output (green): o^(t) = V_f·h_f^(t) + V_b·h_b^(t) — combines both streams at each timestep.'}
  const m=$('br-diagram-msg');if(m)m.textContent=msgs[mode]
  brDrawDiagram(mode)
}
function brDrawDiagram(highlight){
  const svg=$('br-svg');if(!svg)return
  const W=520,H=260,T=3,gap=140,lm=65,tm=30
  const xs=[lm,lm+gap,lm+2*gap],hfy=160,hby=70,xy=225,oy=15
  let h=''
  const col={none:'var(--border)',fwd:'#1d4ed8',bwd:'#b91c1c',out:'#15803d'}
  const dim=(mode,target)=>highlight===target||highlight==='none'?col[target]:col.none
  // x nodes
  xs.forEach((x,i)=>{ h+=`<circle cx="${x}" cy="${xy}" r="22" fill="var(--surf2)" stroke="var(--border)" stroke-width="1.5"/><text x="${x}" y="${xy+5}" text-anchor="middle" font-size="13" fill="var(--text)" font-style="italic">x<tspan dy="-6" font-size="9">(${i+1})</tspan></text>` })
  // h_f nodes
  xs.forEach((x,i)=>{ const c=highlight==='fwd'?'#dbeafe':'var(--surf2)'; h+=`<circle cx="${x}" cy="${hfy}" r="26" fill="${c}" stroke="${dim('','fwd')}" stroke-width="${highlight==='fwd'?2:1.5}"/><text x="${x}" y="${hfy+5}" text-anchor="middle" font-size="12" fill="var(--text)">h<tspan font-size="9">f</tspan><tspan dy="-6" font-size="9">(${i+1})</tspan></text>` })
  // h_b nodes
  xs.forEach((x,i)=>{ const c=highlight==='bwd'?'#fee2e2':'var(--surf2)'; h+=`<circle cx="${x}" cy="${hby}" r="26" fill="${c}" stroke="${dim('','bwd')}" stroke-width="${highlight==='bwd'?2:1.5}"/><text x="${x}" y="${hby+5}" text-anchor="middle" font-size="12" fill="var(--text)">h<tspan font-size="9">b</tspan><tspan dy="-6" font-size="9">(${i+1})</tspan></text>` })
  // o nodes
  xs.forEach((x,i)=>{ const c=highlight==='out'?'#dcfce7':'var(--surf2)'; h+=`<circle cx="${x}" cy="${oy+14}" r="18" fill="${c}" stroke="${dim('','out')}" stroke-width="${highlight==='out'?2:1.5}"/><text x="${x}" y="${oy+19}" text-anchor="middle" font-size="12" fill="var(--text)">o<tspan dy="-5" font-size="9">(${i+1})</tspan></text>` })
  // U_f arrows (x→h_f)
  xs.forEach(x=>{ const fc=dim('','fwd'); h+=`<line x1="${x}" y1="${xy-22}" x2="${x}" y2="${hfy+26}" stroke="${fc}" stroke-width="${highlight==='fwd'?2:1}" marker-end="url(#arr)"/><text x="${x+6}" y="${(xy+hfy)/2}" font-size="10" fill="${fc}">U_f</text>` })
  // W_f arrows (h_f→h_f)
  for(let i=0;i<2;i++){ const fc=dim('','fwd'); h+=`<line x1="${xs[i]+26}" y1="${hfy}" x2="${xs[i+1]-26}" y2="${hfy}" stroke="${fc}" stroke-width="${highlight==='fwd'?2:1}" marker-end="url(#arr)"/><text x="${(xs[i]+xs[i+1])/2}" y="${hfy-8}" text-anchor="middle" font-size="10" fill="${fc}">W_f</text>` }
  // continuation arrows for h_f
  h+=`<line x1="${xs[2]+26}" y1="${hfy}" x2="${xs[2]+50}" y2="${hfy}" stroke="${dim('','fwd')}" stroke-width="1" stroke-dasharray="4,3"/>`
  h+=`<line x1="${lm-26}" y1="${hfy}" x2="${lm-50}" y2="${hfy}" stroke="${dim('','fwd')}" stroke-width="1" stroke-dasharray="4,3"/>`
  // W_b arrows (h_b←h_b, right to left)
  for(let i=2;i>0;i--){ const bc=dim('','bwd'); h+=`<line x1="${xs[i]-26}" y1="${hby}" x2="${xs[i-1]+26}" y2="${hby}" stroke="${bc}" stroke-width="${highlight==='bwd'?2:1}" marker-end="url(#arr)"/><text x="${(xs[i]+xs[i-1])/2}" y="${hby-8}" text-anchor="middle" font-size="10" fill="${bc}">W_b</text>` }
  // U_b arrows (x→h_b)
  xs.forEach(x=>{ const bc=dim('','bwd'); h+=`<line x1="${x}" y1="${xy-22}" x2="${x}" y2="${hby+26}" stroke="${bc}" stroke-width="${highlight==='bwd'?2:1}" stroke-dasharray="5,3" marker-end="url(#arr)"/><text x="${x-14}" y="${(xy+hby)/2}" font-size="10" fill="${bc}">U_b</text>` })
  // continuation arrows for h_b
  h+=`<line x1="${xs[0]-26}" y1="${hby}" x2="${xs[0]-50}" y2="${hby}" stroke="${dim('','bwd')}" stroke-width="1" stroke-dasharray="4,3"/>`
  h+=`<line x1="${xs[2]+26}" y1="${hby}" x2="${xs[2]+50}" y2="${hby}" stroke="${dim('','bwd')}" stroke-width="1" stroke-dasharray="4,3"/>`
  // V_f arrows (h_f→o)
  xs.forEach(x=>{ const oc=dim('','out'); h+=`<line x1="${x-8}" y1="${hfy-26}" x2="${x-8}" y2="${oy+32}" stroke="${oc}" stroke-width="${highlight==='out'?2:1}" marker-end="url(#arr)"/><text x="${x-22}" y="${(hfy+oy)/2}" font-size="10" fill="${oc}">V_f</text>` })
  // V_b arrows (h_b→o)
  xs.forEach(x=>{ const oc=dim('','out'); h+=`<line x1="${x+8}" y1="${hby-26}" x2="${x+8}" y2="${oy+32}" stroke="${oc}" stroke-width="${highlight==='out'?2:1}" marker-end="url(#arr)"/><text x="${x+14}" y="${(hby+oy)/2}" font-size="10" fill="${oc}">V_b</text>` })
  // arrowhead def
  const defs=`<defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--muted)"/></marker></defs>`
  svg.innerHTML=defs+h
}
function brMCQ(q,i){ const defs=[null,BR_Q1,BR_Q2,BR_Q3]; const data=defs[q],pfx=`br-q${q}-`,hid=`br-q${q}-hint`; document.querySelectorAll(`[id^="${pfx}"]`).forEach(e=>e.onclick=null); $(`${pfx}${i}`).classList.add(data[i].c?'sel-ok':'sel-bad'); const hint=$(hid); const msgs=[null,'Correct! W_f is the recurrent weight — it connects one forward hidden state to the next. U_f is the input weight; V_f goes to the output.','Correct! The backward RNN scans right-to-left, so after computing h_b^(t+1) it moves left to compute h_b^(t). The "previous" state in scan order is t+1.','Correct! In NER the type of an entity like "Washington" (person vs city) depends on surrounding words — both before AND after. BiRNN sees both sides simultaneously.']; if(data[i].c){ if(q===1){brQ1=true;brUnlock(3)} else if(q===2){brQ2=true;brUnlock(4)} else brQ3=true; if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. &#10003;</strong> '+msgs[q]} } else { document.querySelectorAll(`[id^="${pfx}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>brMCQ(q,j)}); if(q===1)brQ1=false;else if(q===2)brQ2=false;else brQ3=false; if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Try again.'} } brUpdateSummary() }
function brRenderMCQs(){ [[1,BR_Q1,'br-q1-opts'],[2,BR_Q2,'br-q2-opts'],[3,BR_Q3,'br-q3-opts']].forEach(([q,data,id])=>{ const el=$(id);if(!el||el.children.length)return; el.innerHTML=data.map((o,i)=>`<div class="cg-mcq-opt" id="br-q${q}-${i}" onclick="brMCQ(${q},${i})">${o.t}</div>`).join('') }) }
function brUpdateSummary(){ const ref=($('br-ref')||{value:''}).value;const el=$('br-summary');if(!el)return; el.innerHTML=`<p><strong>Weight MCQ:</strong> ${brQ1===true?'&#10003;':'not yet'}</p><p><strong>Backward index MCQ:</strong> ${brQ2===true?'&#10003;':'not yet'}</p><p><strong>Equations:</strong> ${[brEq1ok,brEq2ok,brEq3ok].filter(Boolean).length}/3</p><p><strong>Context MCQ:</strong> ${brQ3===true?'&#10003;':'not yet'}</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">&#10003;</span>':'not yet'}</p>`; updateBadge('birnn-completed',isComplete('birnn')) }
function initBiRNN(){ const eq=$('br-eq');if(eq){eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center"><div style="color:#1d4ed8;font-size:13px">Forward: $\\mathbf{h}_f^{(t)} = \\tanh(W_f\\mathbf{h}_f^{(t-1)} + U_f\\mathbf{x}^{(t)})$</div><div style="color:#b91c1c;margin-top:4px;font-size:13px">Backward: $\\mathbf{h}_b^{(t)} = \\tanh(W_b\\mathbf{h}_b^{(t+1)} + U_b\\mathbf{x}^{(t)})$</div><div style="color:#15803d;margin-top:4px;font-size:13px">Output: $\\mathbf{o}^{(t)} = V_f\\mathbf{h}_f^{(t)} + V_b\\mathbf{h}_b^{(t)}$</div></div><div style="padding:10px 20px;text-align:center;font-size:12px;color:var(--muted)">Same input x&#8317;&#7511;&#8318;, two independent RNNs, outputs combined at each step.</div></div>`; typeset(eq) } brDrawDiagram('none'); brRenderMCQs(); brUpdateSummary() }

// ══════════════════════════════════════════════════
//  10.4  NER AS SEQ2SEQ
// ══════════════════════════════════════════════════
let nsStage=0, nsQ1=null, nsQ2=null, nsQ3=null, nsQ4=null
const NS_TOKENS=[
  {w:'Óscar',   bio:'B-PER', type:'Person',   color:'#eff6ff', border:'#93c5fd'},
  {w:'Romero',  bio:'I-PER', type:'Person',   color:'#eff6ff', border:'#93c5fd'},
  {w:'was',     bio:'O',     type:'—',        color:'var(--surf2)', border:'var(--border)'},
  {w:'born',    bio:'O',     type:'—',        color:'var(--surf2)', border:'var(--border)'},
  {w:'in',      bio:'O',     type:'—',        color:'var(--surf2)', border:'var(--border)'},
  {w:'El',      bio:'B-LOC', type:'Location', color:'#f0fdf4', border:'#86efac'},
  {w:'Salvador',bio:'I-LOC', type:'Location', color:'#f0fdf4', border:'#86efac'},
]
const NS_Q1=[
  {t:'One entity-type label (B-PER, I-LOC, O, …)',c:true},
  {t:'A probability distribution over all possible entity spans',c:false},
  {t:'A new word in a translated language',c:false},
  {t:'An attention weight over the full sequence',c:false},
]
const NS_Q2=[
  {t:'The seq2seq output can be shorter or longer than the input — it generates structured markup, not one label per token',c:true},
  {t:'The seq2seq output must be exactly the same length as the BIO output',c:false},
  {t:'The seq2seq model cannot handle multi-word entities',c:false},
  {t:'BIO tagging is always more accurate because it preserves alignment',c:false},
]
const NS_Q3=[
  {t:'The output can be variable length and can handle overlapping / nested entities without changing the architecture',c:true},
  {t:'It always achieves higher accuracy than token classification',c:false},
  {t:'It eliminates the need for any labeled training data',c:false},
  {t:'Each output position must correspond exactly to one input token',c:false},
]
const NS_Q4=[
  {t:'[B-ORG, O, O, O, O, B-PER, I-PER, O, B-LOC] — BIO labels, same length as input',c:false},
  {t:'<ORG> Google </ORG> was founded by <PER> Larry Page </PER> in <LOC> California </LOC>',c:true},
  {t:'Google, Larry Page, California — comma-separated names without types',c:false},
  {t:'The same sentence repeated: "Google was founded by Larry Page in California"',c:false},
]
function nsUnlock(s){ nsStage=Math.max(nsStage,s); for(let i=1;i<=s;i++){const e=$(`ns-s${i}`);if(e)e.classList.add('unlocked')} if(s>=2) nsRenderMCQs() }
function nsRenderMCQs(){ [[1,NS_Q1,'ns-q1-opts'],[2,NS_Q2,'ns-q2-opts'],[3,NS_Q3,'ns-q3-opts'],[4,NS_Q4,'ns-q4-opts']].forEach(([q,data,id])=>{ const el=$(id);if(!el||el.children.length)return; el.innerHTML=data.map((o,i)=>`<div class="cg-mcq-opt" id="ns-q${q}-${i}" onclick="nsMCQ(${q},${i})">${o.t}</div>`).join('') }) }
function nsMCQ(q,i){ const defs=[null,NS_Q1,NS_Q2,NS_Q3,NS_Q4]; const data=defs[q],pfx=`ns-q${q}-`,hid=`ns-q${q}-hint`; document.querySelectorAll(`[id^="${pfx}"]`).forEach(e=>e.onclick=null); $(`${pfx}${i}`).classList.add(data[i].c?'sel-ok':'sel-bad'); const hint=$(hid); const msgs=[null,'Correct! Each input token gets exactly one BIO label — the output sequence is the same length as the input.','Correct! The markup output can be any length: shorter if only entities are tagged, longer if extra tokens like &lt;/PER&gt; are added. This flexibility is the key structural difference.','Correct! Because the seq2seq decoder can generate any symbol at any step, it naturally handles nested spans and variable-length entity groups — no per-token alignment required.','Correct! The XML-markup format specifies which words belong to which entity type with opening and closing tags. The output length differs from the input length — a hallmark of seq2seq.']; if(data[i].c){ if(q===1){nsQ1=true;nsUnlock(3)} else if(q===2){nsQ2=true;nsUnlock(4)} else if(q===3){nsQ3=true;nsUnlock(5)} else nsQ4=true; if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. &#10003;</strong> '+msgs[q]} } else { document.querySelectorAll(`[id^="${pfx}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>nsMCQ(q,j)}); if(q===1)nsQ1=false;else if(q===2)nsQ2=false;else if(q===3)nsQ3=false;else nsQ4=false; if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Try again.'} } nsUpdateSummary() }
function nsUpdateSummary(){ const ref=($('ns-ref')||{value:''}).value;const el=$('ns-summary');if(!el)return; const n=[nsQ1,nsQ2,nsQ3,nsQ4].filter(v=>v===true).length; el.innerHTML=`<p><strong>MCQs:</strong> ${n}/4</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">&#10003;</span>':'not yet'}</p>`; updateBadge('nerseq-completed',isComplete('nerseq')) }
function initNERSeq(){ const eq=$('ns-eq');if(eq){eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden"><div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;gap:24px;flex-wrap:wrap;justify-content:center;font-size:13px"><div style="text-align:center"><div style="font-weight:700;color:#1d4ed8;margin-bottom:2px">Token Classification</div><div style="color:var(--muted)">output length = input length</div><div style="font-family:'Courier New',monospace;margin-top:4px">Óscar &#8594; B-PER &nbsp; El &#8594; B-LOC</div></div><div style="text-align:center"><div style="font-weight:700;color:#15803d;margin-bottom:2px">Seq2Seq</div><div style="color:var(--muted)">output length varies</div><div style="font-family:'Courier New',monospace;margin-top:4px">&lt;PER&gt;Óscar Romero&lt;/PER&gt; … &lt;LOC&gt;El Salvador&lt;/LOC&gt;</div></div></div></div>`} const tc=$('ns-tokens');if(tc)tc.innerHTML=NS_TOKENS.map((t,i)=>`<div onclick="nsClickToken(${i})" style="cursor:pointer;padding:8px 12px;background:${t.color};border:2px solid ${t.border};border-radius:8px;text-align:center;min-width:60px;transition:transform .15s" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform=''"><div style="font-weight:700;font-size:14px">${t.w}</div><div style="font-size:11px;margin-top:4px;color:var(--muted)">${t.bio}</div></div>`).join(''); $('ns-len').textContent=NS_TOKENS.length; nsUpdateSummary() }
function nsClickToken(i){ const t=NS_TOKENS[i];const m=$('ns-label-msg');if(!m)return; m.innerHTML=`<strong>${t.w}</strong> &#8594; label <strong style="color:${t.bio==='O'?'var(--muted)':t.bio.includes('PER')?'#1d4ed8':'#15803d'}">${t.bio}</strong>${t.type!=='—'?` &nbsp; (entity type: <strong>${t.type}</strong>)`:' &nbsp; (not an entity)'}`}

// ══════════════════════════════════════════════════
//  10.6  RECURSIVE NNs BEYOND NLP
// ══════════════════════════════════════════════════
let rcStage=0, rcQ1=null, rcQ2=null, rcQ3=null, rcQ4=null, rcMode='seq'
const RC_Q1=[
  {t:'A tree or hierarchical decomposition of the input',c:true},
  {t:'A sequence of equal-length vectors',c:false},
  {t:'A fixed-size grid (like an image)',c:false},
  {t:'A probability distribution over input symbols',c:false},
]
const RC_Q2=[
  {t:'Defining a meaningful hierarchy — e.g. grouping stocks by sector, then sector into market index — so leaves and internal nodes have interpretable semantics',c:true},
  {t:'Nothing special — recursive NNs work on any numerical input regardless of structure',c:false},
  {t:'Converting the time series into a parse tree using a grammar',c:false},
  {t:'It is impossible — recursive NNs cannot process numerical data',c:false},
]
const RC_Q3=[
  {t:'Program source code — abstract syntax trees have explicit, semantically meaningful tree structure',c:true},
  {t:'Medical image segmentation — pixel grids are spatial, not hierarchical',c:false},
  {t:'Audio waveform classification — 1D temporal sequence with no natural tree',c:false},
  {t:'Video object detection — spatial + temporal grid',c:false},
]
const RC_Q4=[
  {t:'Molecular property prediction from bond graphs (molecules form trees/graphs)',c:false},
  {t:'Predicting tomorrow\'s temperature from today\'s — a flat scalar sequence',c:true},
  {t:'JSON schema validation (JSON is a tree)',c:false},
  {t:'Sentiment analysis of code review comments using their parse tree',c:false},
]
function rcUnlock(s){ rcStage=Math.max(rcStage,s); for(let i=1;i<=s;i++){const e=$(`rc-s${i}`);if(e)e.classList.add('unlocked')} if(s>=2) rcRenderMCQs() }
function rcRenderMCQs(){ [[1,RC_Q1,'rc-q1-opts'],[2,RC_Q2,'rc-q2-opts'],[3,RC_Q3,'rc-q3-opts'],[4,RC_Q4,'rc-q4-opts']].forEach(([q,data,id])=>{ const el=$(id);if(!el||el.children.length)return; el.innerHTML=data.map((o,i)=>`<div class="cg-mcq-opt" id="rc-q${q}-${i}" onclick="rcMCQ(${q},${i})">${o.t}</div>`).join('') }) }
function rcMCQ(q,i){ const defs=[null,RC_Q1,RC_Q2,RC_Q3,RC_Q4]; const data=defs[q],pfx=`rc-q${q}-`,hid=`rc-q${q}-hint`; document.querySelectorAll(`[id^="${pfx}"]`).forEach(e=>e.onclick=null); $(`${pfx}${i}`).classList.add(data[i].c?'sel-ok':'sel-bad'); const hint=$(hid); const msgs=[null,'Correct! Recursive NNs compose representations bottom-up over a tree. Without a tree structure the model has no recursion pattern to follow.','Correct! The structure must be meaningful, not arbitrary. Sector hierarchies or portfolio trees give interpretable internal nodes. Random binary splits give nothing useful.','Correct! ASTs are the canonical non-NLP application. Every expression, statement and block is a subtree — the recursive NN naturally composes sub-expression embeddings into full-program representations.','Correct! A scalar temperature time series is flat — there is no natural way to form a tree from it. Recursive NNs add no value here; a plain RNN is the right tool.']; if(data[i].c){ if(q===1){rcQ1=true;rcUnlock(3)} else if(q===2){rcQ2=true;rcUnlock(4)} else if(q===3){rcQ3=true;rcUnlock(5)} else rcQ4=true; if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. &#10003;</strong> '+msgs[q]} } else { document.querySelectorAll(`[id^="${pfx}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>rcMCQ(q,j)}); if(q===1)rcQ1=false;else if(q===2)rcQ2=false;else if(q===3)rcQ3=false;else rcQ4=false; if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Try again.'} } rcUpdateSummary() }
function rcShow(mode){ rcMode=mode; ['rc-seq-btn','rc-tree-btn'].forEach(id=>{const b=$(id);if(b)b.className='btn btn-g'}); const ab=$(mode==='seq'?'rc-seq-btn':'rc-tree-btn');if(ab)ab.className='btn btn-p'; rcDrawDiagram(mode) }
function rcDrawDiagram(mode){ const svg=$('rc-svg');if(!svg)return; const words=['The','cat','sat'],W=480,H=200; let h=''; const cols=['#1d4ed8','#7c3aed','#b91c1c']; if(mode==='seq'){ const xs=[80,240,400],y=140; words.forEach((w,i)=>{ h+=`<rect x="${xs[i]-36}" y="${y-18}" width="72" height="36" rx="7" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.5"/><text x="${xs[i]}" y="${y+6}" text-anchor="middle" font-size="13" font-weight="600" fill="#1d4ed8">${w}</text>`; if(i<2)h+=`<line x1="${xs[i]+36}" y1="${y}" x2="${xs[i+1]-36}" y2="${y}" stroke="#1d4ed8" stroke-width="2" marker-end="url(#arr2)"/><text x="${(xs[i]+xs[i+1])/2}" y="${y-10}" text-anchor="middle" font-size="11" fill="#1d4ed8">h&#8317;${i+1}&#8318;</text>`; const hy=70; h+=`<line x1="${xs[i]}" y1="${y-18}" x2="${xs[i]}" y2="${hy+18}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr2)"/>`; h+=`<rect x="${xs[i]-28}" y="${hy-18}" width="56" height="36" rx="7" fill="var(--surf2)" stroke="var(--border)" stroke-width="1.5"/><text x="${xs[i]}" y="${hy+6}" text-anchor="middle" font-size="12" fill="var(--muted)">h&#8317;${i+1}&#8318;</text>`; }); const m=$('rc-mode-msg');if(m)m.innerHTML='<strong>RNN:</strong> Processes tokens left-to-right. Each hidden state h&#8317;&#7511;&#8318; depends only on the previous state and current input — linear chain, no tree.' } else { const lx=240,ly=60,ml=120,mr=360,ml2=60,mr2=180,ml3=300,mr3=420,leaf_y=160; h+=`<rect x="${lx-40}" y="${ly-18}" width="80" height="36" rx="8" fill="#dcfce7" stroke="#86efac" stroke-width="2"/><text x="${lx}" y="${ly+6}" text-anchor="middle" font-size="12" fill="#15803d">f(&#8901;,&#8901;)</text>`; [[ml,110],[mr,110]].forEach(([x,y])=>{ h+=`<rect x="${x-36}" y="${y-18}" width="72" height="36" rx="7" fill="#fef9c3" stroke="#fde047" stroke-width="1.5"/><text x="${x}" y="${y+6}" text-anchor="middle" font-size="12" fill="#a16207">f(&#8901;,&#8901;)</text>`; h+=`<line x1="${x}" y1="${y-18}" x2="${lx+(x<lx?-40:40)}" y2="${ly+18}" stroke="#86efac" stroke-width="2" marker-end="url(#arr2)"/>` }); [[ml2,leaf_y,'The'],[mr2,leaf_y,'cat'],[ml3,leaf_y,'sat'],[mr3,leaf_y,'']].forEach(([x,y,w],idx)=>{ if(!w)return; const c=cols[idx]||'#6b7280'; h+=`<rect x="${x-28}" y="${y-16}" width="56" height="32" rx="6" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.5"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="13" font-weight="600" fill="${c}">${w}</text>`; const parent=idx<2?ml:mr; h+=`<line x1="${x}" y1="${y-16}" x2="${parent}" y2="${idx===0?128:idx===1?128:128}" stroke="#fde047" stroke-width="1.5" marker-end="url(#arr2)"/>` }); const m=$('rc-mode-msg');if(m)m.innerHTML='<strong>Recursive NN:</strong> Processes a parse tree bottom-up. Internal nodes combine child representations via f(h_left, h_right). Requires a tree — not applicable to flat sequences.' } const defs=`<defs><marker id="arr2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--muted)"/></marker></defs>`; svg.innerHTML=defs+h }
function rcUpdateSummary(){ const ref=($('rc-ref')||{value:''}).value;const el=$('rc-summary');if(!el)return; const n=[rcQ1,rcQ2,rcQ3,rcQ4].filter(v=>v===true).length; el.innerHTML=`<p><strong>MCQs:</strong> ${n}/4</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">&#10003;</span>':'not yet'}</p>`; updateBadge('recnets-completed',isComplete('recnets')) }
function initRecNets(){ const eq=$('rc-eq');if(eq){eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden"><div style="padding:12px 20px;text-align:center"><div style="color:#b45309">$\\mathbf{h}_{\\text{node}} = f(\\mathbf{h}_{\\text{left child}},\\;\\mathbf{h}_{\\text{right child}})$</div><div style="font-size:13px;color:var(--muted);margin-top:6px">f is a learned function (e.g. tanh of a linear combination). Leaves = word embeddings; internal nodes = composed phrase representations.</div></div></div>`; typeset(eq) } rcShow('tree'); rcUpdateSummary() }

// ══════════════════════════════════════════════════
//  10.7  LINEAR RNN STABILITY
// ══════════════════════════════════════════════════
let lrStage=0, lrQ1=null, lrQ2=null, lrQ3=null, lrQ4=null, lrQ5=null, lrQ6=null, lrSliderMoves=0
const LR_Q1=[{t:'ux⁽¹⁾',c:true},{t:'wx⁽¹⁾',c:false},{t:'wh⁽⁰⁾ + x⁽¹⁾',c:false},{t:'u + w',c:false}]
const LR_Q2=[{t:'wux⁽¹⁾ + ux⁽²⁾',c:true},{t:'u²x⁽¹⁾ + ux⁽²⁾',c:false},{t:'w²x⁽¹⁾ + wx⁽²⁾',c:false},{t:'ux⁽¹⁾ + wx⁽²⁾',c:false}]
const LR_Q3=[{t:'w²ux⁽¹⁾ + wux⁽²⁾ + ux⁽³⁾',c:true},{t:'u³x⁽¹⁾ + u²x⁽²⁾ + ux⁽³⁾',c:false},{t:'w³x⁽¹⁾ + w²x⁽²⁾ + wx⁽³⁾',c:false},{t:'(wu)³x⁽¹⁾ + (wu)²x⁽²⁾ + wux⁽³⁾',c:false}]
const LR_Q4=[{t:'The value of w only — it appears as the exponent w^(T−k), controlling how past inputs are weighted',c:true},{t:'The value of u only',c:false},{t:'Both w and u equally — only their product matters',c:false},{t:'Neither — a linear RNN always weights all inputs equally',c:false}]
const LR_Q5=[{t:'Hidden state decays to zero — |w|<1 guarantees forgetting regardless of u',c:false},{t:'Hidden state grows without bound — |w|>1 dominates regardless of how small u is',c:true},{t:'Hidden state converges to the fixed point u/(1−w)',c:false},{t:'Hidden state oscillates between positive and negative values',c:false}]
const LR_Q6=[{t:'w sets the decay rate of past inputs (memory span); u only scales the amplitude of each input contribution without affecting stability',c:true},{t:'u controls forgetting; w controls the input amplitude',c:false},{t:'They have identical effects — only their product wu matters',c:false},{t:'w only affects the first timestep; u controls all later steps',c:false}]
function lrUnlock(s){ lrStage=Math.max(lrStage,s); for(let i=1;i<=s;i++){const e=$(`lr-s${i}`);if(e)e.classList.add('unlocked')} if(s>=1) lrRenderMCQs() }
function lrRenderMCQs(){ [[1,LR_Q1,'lr-q1-opts'],[2,LR_Q2,'lr-q2-opts'],[3,LR_Q3,'lr-q3-opts'],[4,LR_Q4,'lr-q4-opts'],[5,LR_Q5,'lr-q5-opts'],[6,LR_Q6,'lr-q6-opts']].forEach(([q,data,id])=>{ const el=$(id);if(!el||el.children.length)return; el.innerHTML=data.map((o,i)=>`<div class="cg-mcq-opt" id="lr-q${q}-${i}" onclick="lrMCQ(${q},${i})">${o.t}</div>`).join('') }) }
function lrMCQ(q,i){ const defs=[null,LR_Q1,LR_Q2,LR_Q3,LR_Q4,LR_Q5,LR_Q6]; const data=defs[q],pfx=`lr-q${q}-`,hid=`lr-q${q}-hint`; document.querySelectorAll(`[id^="${pfx}"]`).forEach(e=>e.onclick=null); $(`${pfx}${i}`).classList.add(data[i].c?'sel-ok':'sel-bad'); const hint=$(hid); const msgs=[null,'Correct! h&#8317;&#185;&#8318; = w&#183;0 + u&#183;x&#8317;&#185;&#8318; = u&#183;x&#8317;&#185;&#8318;. The h&#8317;&#8304;&#8318;=0 term vanishes.','Correct! h&#8317;&#178;&#8318; = w&#183;(ux&#8317;&#185;&#8318;) + ux&#8317;&#178;&#8318; = wux&#8317;&#185;&#8318; + ux&#8317;&#178;&#8318;.','Correct! h&#8317;&#179;&#8318; = w&#183;(wux&#8317;&#185;&#8318;+ux&#8317;&#178;&#8318;) + ux&#8317;&#179;&#8318; = w&#178;ux&#8317;&#185;&#8318; + wux&#8317;&#178;&#8318; + ux&#8317;&#179;&#8318;. The pattern: x&#8317;ᵏ&#8318; gets weight u&#183;w^(T&#8722;k).','Correct! w appears as w^(T&#8722;k) on past input x&#8317;ᵏ&#8318;. If |w|&lt;1 that exponent decays to 0; if |w|&gt;1 it explodes. u just uniformly scales all bars — it cannot change the pattern.','Correct! With |w|=1.4&gt;1, the factor w^(T&#8722;k) grows without bound as T increases. u=0.1 just makes every bar 10&#215; shorter — but they still grow exponentially with T.','Correct! w is the memory-decay parameter: it determines whether the past is forgotten (|w|&lt;1), preserved (|w|=1), or amplified (|w|&gt;1). u is just a gain on each new input and does not affect stability.']; if(data[i].c){ if(q===1){lrQ1=true;const s=$('lr-step2');if(s){s.style.opacity='1';s.style.pointerEvents=''}} else if(q===2){lrQ2=true;const s=$('lr-step3');if(s){s.style.opacity='1';s.style.pointerEvents=''}} else if(q===3){lrQ3=true;lrUnlock(2)} else if(q===4){lrQ4=true;lrUnlock(4)} else if(q===5){lrQ5=true;lrUnlock(5)} else lrQ6=true; if(hint){hint.className='guidance-box done';hint.innerHTML='<strong>'+String.fromCharCode(65+i)+'. &#10003;</strong> '+msgs[q]} } else { document.querySelectorAll(`[id^="${pfx}"]`).forEach((e,j)=>{if(j!==i)e.onclick=()=>lrMCQ(q,j)}); if(hint){hint.className='guidance-box warm';hint.innerHTML='<strong>Not quite.</strong> Try again.'} } lrUpdateSummary() }
function lrDrawMemory(){ lrSliderMoves++; const btn=$('lr-s2-btn');if(btn&&lrSliderMoves>=3)btn.disabled=false; const w=parseFloat($('lr-w').value),u=parseFloat($('lr-u').value); $('lr-w-val').textContent=w.toFixed(2);$('lr-u-val').textContent=u.toFixed(2); const svg=$('lr-svg');if(!svg)return; const T=10,W=280,H=150,lm=20,bm=20,pw=W-lm-8,ph=H-bm-10; const weights=[];for(let k=0;k<T;k++)weights.push(u*Math.pow(w,T-1-k)); const maxA=Math.max(...weights.map(Math.abs),0.001); let h=`<line x1="${lm}" y1="${bm}" x2="${lm}" y2="${bm+ph}" stroke="var(--border)" stroke-width="1"/><line x1="${lm}" y1="${bm+ph/2}" x2="${W-8}" y2="${bm+ph/2}" stroke="var(--border)" stroke-width="1"/>`; weights.forEach((v,i)=>{ const x=lm+(i+0.5)*pw/T,norm=v/maxA,barH=Math.abs(norm)*ph*0.45; const positive=v>=0; const col=Math.abs(w)<0.99?'#3b82f6':Math.abs(w)>1.01?'#b91c1c':'#15803d'; const y=positive?bm+ph/2-barH:bm+ph/2; h+=`<rect x="${(x-pw/T*0.35).toFixed(1)}" y="${y.toFixed(1)}" width="${(pw/T*0.7).toFixed(1)}" height="${barH.toFixed(1)}" fill="${col}" rx="2"/><text x="${x.toFixed(1)}" y="${bm+ph+12}" text-anchor="middle" font-size="9" fill="var(--muted)">${T-i}</text>` }); svg.innerHTML=h; const msg=$('lr-mem-msg'); if(msg){const aw=Math.abs(w);msg.innerHTML=aw<0.99?`<span style="color:var(--blue)">|w|&lt;1 — Decaying memory: older inputs (left bars) fade exponentially.</span>`:aw>1.01?`<span style="color:var(--red)">|w|&gt;1 — Exploding memory: older inputs are amplified, hidden state diverges.</span>`:`<span style="color:var(--green)">|w|=1 — Perfect memory: all past inputs contribute equally regardless of distance.</span>`} }
function lrUpdateSummary(){ const ref=($('lr-ref')||{value:''}).value;const el=$('lr-summary');if(!el)return; const n=[lrQ1,lrQ2,lrQ3,lrQ4,lrQ5,lrQ6].filter(v=>v===true).length; el.innerHTML=`<p><strong>Unroll MCQs:</strong> ${[lrQ1,lrQ2,lrQ3].filter(v=>v===true).length}/3</p><p><strong>Stability MCQs:</strong> ${[lrQ4,lrQ5,lrQ6].filter(v=>v===true).length}/3</p><p><strong>Slider explored:</strong> ${lrSliderMoves>=3?'<span style="color:var(--green)">&#10003;</span>':'move slider &#8805;3 times'}</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">&#10003;</span>':'not yet'}</p>`; updateBadge('linrnn-completed',isComplete('linrnn')) }
function initLinRNN(){ const eq=$('lr7-eq');if(eq){eq.innerHTML=`<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center"><div style="color:#b45309">$h^{(t)} = w\\,h^{(t-1)} + u\\,x^{(t)}, \\quad h^{(0)}=0$</div><div style="font-size:13px;color:var(--muted);margin-top:6px">Scalar inputs and weights; no nonlinearity. Unrolling reveals the closed form.</div></div><div style="padding:12px 20px;text-align:center;font-size:13px;color:#15803d">After unrolling: $h^{(T)} = u\\sum_{k=1}^{T} w^{T-k}\\,x^{(k)}$ &mdash; each past input x&#8317;ᵏ&#8318; is weighted by $u\\cdot w^{T-k}$.</div></div>`; typeset(eq) } lrDrawMemory(); lrUpdateSummary() }

// ══════════════════════════════════════════════════
//  10.10 GRU vs LSTM ARCHITECTURE
// ══════════════════════════════════════════════════
let ggStage=1, ggQ1=null, ggQ2=null, ggQ3=null, ggQ4=null
let ggToggles={cell:false,outgate:false,decouple:false,reset:false}
let ggToggleSeen=new Set()

const GG_Q1=[
  {t:'Gating mechanisms that selectively keep or overwrite memory at each timestep, preventing forced mixing of old and new information',c:true},
  {t:'Attention over input tokens to focus on the most relevant words in a sequence',c:false},
  {t:'Replacing tanh with ReLU activations to prevent vanishing gradients during backpropagation',c:false},
  {t:'Stacking multiple hidden layers to increase model capacity',c:false}
]
const GG_Q2=[
  {t:'Coupled vs. independent forget/input gates — GRU forces forget = (1−z), LSTM allows f and i to be any independent values',c:true},
  {t:'The number of tanh activations used in the candidate state computation',c:false},
  {t:'The dimensionality of the hidden state vector h(t)',c:false},
  {t:'Whether bias terms are included in the gate equations',c:false}
]
const GG_Q3=[
  {t:'4 — one variant per dimension',c:false},
  {t:'8 — only three dimensions are truly binary',c:false},
  {t:'16 — 2⁴ variants, one for each subset of the four features',c:true},
  {t:'Infinite — continuous weight parameters mean no discrete boundary',c:false}
]
const GG_Q4=[
  {t:'Many of the 16 variants perform comparably — the extra dimensions are not always necessary for strong performance',c:true},
  {t:'More parameters always leads to better performance on sequence modelling tasks',c:false},
  {t:'The separate cell state is essential and cannot be removed for any task',c:false},
  {t:'GRU is strictly worse than LSTM because it has fewer parameters',c:false}
]

function ggReviewed(){
  const s=$('gg-s2'); if(!s)return
  s.classList.add('unlocked')
  ggRenderMCQs()
  const h=$('gg-s1-hint'); if(h){h.style.display='block';h.className='guidance-box done';h.textContent='✓ Now identify what both architectures share in common.'}
}

function ggRenderMCQs(){
  [[1,GG_Q1,'gg-q1-opts'],[2,GG_Q2,'gg-q2-opts'],[3,GG_Q3,'gg-q3-opts'],[4,GG_Q4,'gg-q4-opts']].forEach(([q,data,id])=>{
    const el=$(id); if(!el||el.children.length)return
    el.innerHTML=data.map((o,i)=>`<div class="cg-mcq-opt" id="gg-q${q}-${i}" onclick="ggMCQ(${q},${i})">${o.t}</div>`).join('')
  })
}

function ggMCQ(q,i){
  const data=q===1?GG_Q1:q===2?GG_Q2:q===3?GG_Q3:GG_Q4
  const cur=q===1?ggQ1:q===2?ggQ2:q===3?ggQ3:ggQ4
  if(cur!==null)return
  const opt=data[i]; const correct=opt.c
  const el=$(`gg-q${q}-${i}`); if(!el)return
  el.className='cg-mcq-opt '+(correct?'sel-ok':'sel-bad')
  if(correct) data.forEach((_,j)=>{if(j!==i){const o=$(`gg-q${q}-${j}`);if(o)o.style.opacity='0.4'}})
  if(q===1) ggQ1=correct; else if(q===2) ggQ2=correct; else if(q===3) ggQ3=correct; else ggQ4=correct
  const hint=$(`gg-q${q}-hint`)
  const ok1='✓ Both use gates to decide how much of h(t-1) to keep vs. how much new input to incorporate — exactly the capability a vanilla RNN lacks.'
  const bad1='Attention is a different mechanism used in transformers, not RNNs. Think about what gates let the hidden state do that a vanilla RNN cannot.'
  const ok2='✓ In GRU the forget fraction (1−z) and input fraction (z) always sum to 1. LSTM decouples f and i, so both can be high or both can be low independently.'
  const bad2='Look at the GRU output rule: (1−z)⊙h(t-1) + z⊙h̃(t). What role does (1−z) play? Compare to LSTM: c(t) = f⊙c(t-1) + i⊙g(t).'
  const ok3='✓ 2⁴ = 16 variants. Each binary choice doubles the space. Four dimensions is small enough to search exhaustively.'
  const bad3='Count the dimensions: cell state, output gate, decoupled gates, reset gate — that is 4 binary choices. How many subsets does a set of 4 elements have?'
  const ok4='✓ The Minimal Gated Unit paper showed removing the output gate and separate cell state barely hurts — many LSTM dimensions are redundant for typical tasks.'
  const bad4='Think empirically: if a simpler model matches a complex one in performance, what does that tell you about whether all the complexity is necessary?'
  const msgs={1:{ok:ok1,bad:bad1},2:{ok:ok2,bad:bad2},3:{ok:ok3,bad:bad3},4:{ok:ok4,bad:bad4}}
  if(hint){hint.className='guidance-box '+(correct?'done':'warm');hint.textContent=msgs[q][correct?'ok':'bad']}
  if(correct){
    if(q===1){const s=$('gg-s3');if(s)s.classList.add('unlocked')}
    else if(q===2){const s=$('gg-s4');if(s)s.classList.add('unlocked');ggDrawCell()}
    else if(q===3){const s=$('gg-s6');if(s)s.classList.add('unlocked');ggRenderMCQs()}
    else ggUpdateSummary()
  }
}

function ggToggle(dim){
  ggToggles[dim]=!ggToggles[dim]
  const btn=$('gg-t-'+dim); if(btn) btn.className='btn '+(ggToggles[dim]?'btn-p':'btn-g')
  ggToggleSeen.add(dim)
  const prog=$('gg-toggle-progress'); if(prog) prog.textContent=`Dimensions toggled: ${ggToggleSeen.size}/4`
  ggDrawCell()
  if(ggToggleSeen.size>=4){
    const s=$('gg-s5'); if(s&&!s.classList.contains('unlocked')){s.classList.add('unlocked');ggRenderMCQs()}
    const h=$('gg-s4-hint'); if(h&&h.textContent===''){h.className='guidance-box done';h.textContent="✓ You've explored all 4 dimensions. Now think about how large the full search space is."}
  }
}

function ggDrawCell(){
  const svg=$('gg-svg'); if(!svg)return
  const W=540,H=160,t=ggToggles
  const blocks=[]
  if(t.reset) blocks.push({label:'r(t)\nreset gate',col:'#bfdbfe'})
  if(t.decouple){blocks.push({label:'f(t)\nforget',col:'#bbf7d0'});blocks.push({label:'i(t)\ninput',col:'#bbf7d0'})}
  else blocks.push({label:'z(t)\nupdate gate',col:'#fde68a'})
  blocks.push({label:'h̃(t)\ncandidate',col:'#e9d5ff'})
  if(t.cell) blocks.push({label:'c(t)\ncell state',col:'#fed7aa'})
  if(t.outgate) blocks.push({label:'o(t)\noutput gate',col:'#fecaca'})
  blocks.push({label:'h(t)\noutput',col:'#d1fae5'})
  const n=blocks.length, bw=64, bh=52, gap=(W-40-n*bw)/(n+1)
  let arrows='', rects=''
  blocks.forEach((b,idx)=>{
    const x=30+(idx+1)*gap+idx*bw, y=(H-bh)/2
    rects+=`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${bw}" height="${bh}" rx="6" fill="${b.col}" stroke="#9ca3af" stroke-width="1.5"/>`
    b.label.split('\n').forEach((line,li)=>{
      rects+=`<text x="${(x+bw/2).toFixed(0)}" y="${(y+18+li*16).toFixed(0)}" font-size="${li===0?11:10}" font-weight="${li===0?'600':'400'}" fill="#1f2937" text-anchor="middle">${line}</text>`
    })
    if(idx<n-1){
      const ax=x+bw, ay=H/2
      arrows+=`<line x1="${ax.toFixed(0)}" y1="${ay.toFixed(0)}" x2="${(ax+gap).toFixed(0)}" y2="${ay.toFixed(0)}" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#gg-arr)"/>`
    }
  })
  svg.innerHTML=`<defs><marker id="gg-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0L6,3L0,6Z" fill="#9ca3af"/></marker></defs><text x="8" y="${(H/2+4).toFixed(0)}" font-size="11" fill="#6b7280">x(t)→</text>${arrows}${rects}`
  const nOn=[t.cell,t.outgate,t.decouple,t.reset].filter(Boolean).length
  let name='Custom variant'
  if(!t.cell&&!t.outgate&&!t.decouple&&t.reset) name='GRU'
  else if(t.cell&&t.outgate&&t.decouple&&!t.reset) name='LSTM'
  else if(!t.cell&&!t.outgate&&!t.decouple&&!t.reset) name='Minimal RNN (no gating)'
  const lbl=$('gg-arch-label'); if(lbl) lbl.textContent=`Current variant: ${name} (${nOn}/4 dimensions active)`
}

function ggUpdateSummary(){
  const ref=($('gg-ref')||{value:''}).value
  const el=$('gg-summary'); if(!el)return
  el.innerHTML=`<p><strong>MCQs correct:</strong> ${[ggQ1,ggQ2,ggQ3,ggQ4].filter(v=>v===true).length}/4</p><p><strong>Dimensions explored:</strong> ${ggToggleSeen.size}/4</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('grucomp-completed',isComplete('grucomp'))
}

function initGRUComp(){ ggDrawCell(); ggUpdateSummary() }

// ══════════════════════════════════════════════════
//  10.TF TRANSFORMER POSITIONAL ENCODING
// ══════════════════════════════════════════════════
let tpStage=1, tpQ1=null, tpQ2=null, tpQ3=null, tpQ4=null
let tpOrdersSeen=new Set()

const TP_Q1=[
  {t:'Different frequencies create a unique fingerprint for each position; relative offsets can be expressed as linear transformations of sin/cos, making relative position learnable',c:true},
  {t:'The formula scales positions logarithmically so nearby tokens always have similar embeddings',c:false},
  {t:'The model memorises the numeric position index at each location during training',c:false},
  {t:'Sinusoids ensure the position embedding has unit norm, which stabilises gradient flow',c:false}
]
const TP_Q2=[
  {t:'Cannot generalise to sequences longer than the maximum position seen during training — position 513 has no learned embedding if max_len was 512',c:true},
  {t:'Uses significantly more GPU memory than sinusoidal PE at inference time',c:false},
  {t:'Cannot distinguish between adjacent positions because the embeddings are too similar',c:false},
  {t:'Requires a separate pre-training phase before the main transformer can learn',c:false}
]
const TP_Q3=[
  {t:'The model learns token-to-token distance |i−j| independently of absolute positions — better length generalisation since "3 steps away" transfers to new sequence lengths',c:true},
  {t:'It eliminates the need for the Q and K projection matrices entirely',c:false},
  {t:'Relative PE makes attention computation linear in sequence length instead of quadratic',c:false},
  {t:'It has strictly fewer parameters than absolute PE since biases are smaller than embedding tables',c:false}
]
const TP_Q4=[
  {t:'Penalises attention to distant tokens proportionally to distance, making the model prefer local context without modifying any input embeddings',c:true},
  {t:'Replaces the softmax operation with a linear function of token distance',c:false},
  {t:'Zeros out attention between tokens more than m positions apart',c:false},
  {t:'Adds a position-aware bias only to the very first attention layer',c:false}
]

const TP_ATT=[[0.6,0.3,0.1],[0.2,0.5,0.3],[0.3,0.2,0.5]]
const TP_ORDERS=[['the','cat','sat'],['sat','cat','the']]

function tpShowOrder(idx){
  tpOrdersSeen.add(idx)
  ;['tp-ord1-btn','tp-ord2-btn'].forEach((id,i)=>{const b=$(id);if(b)b.className='btn '+(i===idx?'btn-p':'btn-g')})
  tpDrawAttention(idx)
  const lbl=$('tp-order-label'); if(lbl) lbl.textContent=`Showing: Order ${idx+1} "${TP_ORDERS[idx].join(' ')}"`
  if(tpOrdersSeen.size>=2){
    const btn=$('tp-s1-btn'); if(btn){btn.disabled=false;btn.textContent='Same heatmap both times — continue →'}
    const note=$('tp-same-note'); if(note) note.style.display='block'
  }
}

function tpDrawAttention(orderIdx){
  const svg=$('tp-svg'); if(!svg)return
  const tokens=TP_ORDERS[orderIdx]
  const off=44, cellSz=44
  let s=''
  tokens.forEach((tok,j)=>{ s+=`<text x="${off+j*cellSz+cellSz/2}" y="${off-10}" font-size="12" text-anchor="middle" fill="var(--text)">${tok}</text>` })
  tokens.forEach((tok,i)=>{ s+=`<text x="${off-6}" y="${off+i*cellSz+cellSz/2+4}" font-size="12" text-anchor="end" fill="var(--text)">${tok}</text>` })
  tokens.forEach((_,i)=>{
    tokens.forEach((_,j)=>{
      const v=TP_ATT[i][j]
      s+=`<rect x="${off+j*cellSz}" y="${off+i*cellSz}" width="${cellSz}" height="${cellSz}" fill="rgba(37,99,235,${v.toFixed(2)})" stroke="#e2e8f0"/>`
      s+=`<text x="${off+j*cellSz+cellSz/2}" y="${off+i*cellSz+cellSz/2+4}" font-size="11" text-anchor="middle" fill="${v>0.4?'white':'#374151'}">${v.toFixed(1)}</text>`
    })
  })
  s+=`<text x="${off+tokens.length*cellSz/2}" y="${off+tokens.length*cellSz+18}" font-size="10" text-anchor="middle" fill="#6b7280">key →</text>`
  s+=`<text x="12" y="${off+tokens.length*cellSz/2}" font-size="10" text-anchor="middle" fill="#6b7280" transform="rotate(-90,12,${off+tokens.length*cellSz/2})">query</text>`
  svg.innerHTML=s
}

function tpDemoSeen(){
  if(tpOrdersSeen.size<2)return
  const s=$('tp-s2'); if(s)s.classList.add('unlocked')
  tpRenderMCQs()
  const h=$('tp-s1-hint'); if(h){h.className='guidance-box done';h.textContent='✓ The same attention weights appear regardless of token order — this is the permutation invariance problem positional encoding must solve.'}
}

function tpRenderMCQs(){
  [[1,TP_Q1,'tp-q1-opts'],[2,TP_Q2,'tp-q2-opts'],[3,TP_Q3,'tp-q3-opts'],[4,TP_Q4,'tp-q4-opts']].forEach(([q,data,id])=>{
    const el=$(id); if(!el||el.children.length)return
    el.innerHTML=data.map((o,i)=>`<div class="cg-mcq-opt" id="tp-q${q}-${i}" onclick="tpMCQ(${q},${i})">${o.t}</div>`).join('')
  })
}

function tpMCQ(q,i){
  const data=q===1?TP_Q1:q===2?TP_Q2:q===3?TP_Q3:TP_Q4
  const cur=q===1?tpQ1:q===2?tpQ2:q===3?tpQ3:tpQ4
  if(cur!==null)return
  const opt=data[i]; const correct=opt.c
  const el=$(`tp-q${q}-${i}`); if(!el)return
  el.className='cg-mcq-opt '+(correct?'sel-ok':'sel-bad')
  if(correct) data.forEach((_,j)=>{if(j!==i){const o=$(`tp-q${q}-${j}`);if(o)o.style.opacity='0.4'}})
  if(q===1)tpQ1=correct; else if(q===2)tpQ2=correct; else if(q===3)tpQ3=correct; else tpQ4=correct
  const hint=$(`tp-q${q}-hint`)
  const msgs={
    1:{ok:'✓ Different frequencies give each position a unique fingerprint. And sin(A+B) = sinA·cosB + cosA·sinB, so a fixed linear transformation converts PE(pos) to PE(pos+k), making relative position encodable.',
       bad:"Think about two properties: uniqueness (every position gets a different vector) and composability (relative offsets can be expressed as linear transformations). Random vectors give uniqueness but not composability."},
    2:{ok:'✓ Learned PE is a fixed-size lookup table. If the model was trained on sequences of length ≤ 512, position 513 has no row in the table — the model cannot handle it at inference time.',
       bad:'The limitation is about the hard upper bound on sequence length, not about computation or training time. What happens at inference time when a sequence exceeds the training maximum?'},
    3:{ok:"✓ Relative PE encodes distance rather than absolute position — the model learns 'this token is 3 steps to the right' rather than 'this token is at position 17'. This transfers to new, longer sequences.",
       bad:"Think about what the model learns. Is 'I am at absolute position 17' or 'I am 3 steps to the right of my neighbour' a more generalisable representation for longer sequences?"},
    4:{ok:'✓ ALiBi adds no parameters and modifies no input embeddings — it simply makes the softmax distribution prefer nearby tokens by subtracting a distance-proportional constant from each attention logit.',
       bad:'Subtracting m|i−j| from a logit before softmax reduces (but does not zero out) the attention weight on that token. What effect does this have on the overall distribution over all keys?'}
  }
  if(hint){hint.className='guidance-box '+(correct?'done':'warm');hint.textContent=msgs[q][correct?'ok':'bad']}
  if(correct){
    if(q===1){const s=$('tp-s3');if(s)s.classList.add('unlocked');tpRenderMCQs()}
    else if(q===2){const s=$('tp-s4');if(s)s.classList.add('unlocked');tpRenderMCQs()}
    else if(q===3){const s=$('tp-s5');if(s)s.classList.add('unlocked');tpRenderMCQs()}
    else tpUpdateSummary()
  }
}

function tpUpdateSummary(){
  const ref=($('tp-ref')||{value:''}).value
  const el=$('tp-summary'); if(!el)return
  el.innerHTML=`<p><strong>MCQs correct:</strong> ${[tpQ1,tpQ2,tpQ3,tpQ4].filter(v=>v===true).length}/4</p><p><strong>Demo explored:</strong> ${tpOrdersSeen.size>=2?'<span style="color:var(--green)">✓</span>':'see both orderings'}</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('trfpos-completed',isComplete('trfpos'))
}

function initTrfPos(){ tpDrawAttention(0); tpUpdateSummary() }

// ══════════════════════════════════════════════════
//  11.1 CANCER NLP
// ══════════════════════════════════════════════════
let cnStage=1, cnQ1=null, cnQ2=null, cnQ3=null, cnQ4=null, cnSliderMoves=0

const CN_Q1=[
  {t:'Binary document classification: flag each note as "cancer mentioned" or "not mentioned", then route flagged notes to the registrar review queue',c:true},
  {t:'Regression: output a continuous cancer probability score and give registrars a ranked list of all notes',c:false},
  {t:'Multiclass: classify each note into one of 20 specific cancer type categories',c:false},
  {t:'Token labelling (NER): identify which specific words in the note triggered a cancer mention',c:false}
]
const CN_Q2=[
  {t:'Recall (sensitivity) — minimises false negatives, ensuring nearly all cancer notes reach a registrar for review',c:true},
  {t:'Precision — minimises false positives so registrars are not sent too many non-cancer notes',c:false},
  {t:'Accuracy — correctly classifies as many notes as possible overall',c:false},
  {t:'F1-score — balances precision and recall equally since both error types are equally costly here',c:false}
]
const CN_Q3=[
  {t:'600 of the 1,000 flagged notes are not actually cancer — registrars must read them anyway, but every cancer patient is found',c:true},
  {t:'40% of cancer patients are missed and will never be reviewed by a registrar',c:false},
  {t:'Registrars can only afford to review 400 notes, so the remaining 600 cancer cases are permanently lost',c:false},
  {t:'40% of registrar time is wasted on duplicated effort from repeated model predictions',c:false}
]
const CN_Q4=[
  {t:'Recall ≥ 97%, Precision ≥ 30% — near-zero missed patients, and the flagged queue is far smaller than reading all 10,000 notes',c:true},
  {t:'Recall = 80%, Precision = 80% — balanced F1 that matches average human-level performance',c:false},
  {t:'Recall = 50%, Precision = 90% — very few false alarms but half of cancer patients would be missed',c:false},
  {t:'Accuracy > 95% — most documents correctly classified regardless of error type distribution',c:false}
]

function cnSliderMove(){
  const t=parseFloat($('cn-thresh').value)
  const valEl=$('cn-thresh-val'); if(valEl) valEl.textContent=t.toFixed(2)
  cnDrawMatrix(t)
  cnSliderMoves++
  const btn=$('cn-s1-btn'); if(btn&&cnSliderMoves>=3){btn.disabled=false;btn.textContent='I understand the trade-off →'}
}

function cnDrawMatrix(threshold){
  const svg=$('cn-svg'); if(!svg)return
  const pos=500, neg=9500, t=threshold
  const recall=Math.max(0.50,1.0-(t-0.10)/0.80*0.50)
  const precision=Math.min(0.95,0.05+(t-0.10)/0.80*0.90)
  const TP=Math.round(pos*recall), FN=pos-TP
  const flagged=precision>0.01?Math.round(TP/precision):9999
  const FP=Math.max(0,Math.min(neg,flagged-TP)), TN=neg-FP
  const lx=52,cw=92,ch=58,ry=36
  let s=''
  s+=`<text x="${lx+cw/2}" y="${ry-10}" font-size="10" text-anchor="middle" fill="var(--text)" font-weight="600">Pred: Cancer</text>`
  s+=`<text x="${lx+cw+cw/2}" y="${ry-10}" font-size="10" text-anchor="middle" fill="var(--text)" font-weight="600">Pred: Not Cancer</text>`
  s+=`<text x="8" y="${ry+ch/2}" font-size="9" fill="#059669" font-weight="600">Cancer</text>`
  s+=`<text x="8" y="${ry+ch/2+12}" font-size="9" fill="#6b7280">actual</text>`
  s+=`<text x="8" y="${ry+ch+ch/2}" font-size="9" fill="#6b7280">Not C.</text>`
  s+=`<text x="8" y="${ry+ch+ch/2+12}" font-size="9" fill="#6b7280">actual</text>`
  s+=`<rect x="${lx}" y="${ry}" width="${cw}" height="${ch}" fill="#d1fae5" stroke="#86efac" stroke-width="2" rx="4"/>`
  s+=`<text x="${lx+cw/2}" y="${ry+20}" font-size="12" font-weight="700" text-anchor="middle" fill="#065f46">TP</text>`
  s+=`<text x="${lx+cw/2}" y="${ry+36}" font-size="13" font-weight="700" text-anchor="middle" fill="#065f46">${TP}</text>`
  s+=`<text x="${lx+cw/2}" y="${ry+52}" font-size="9" text-anchor="middle" fill="#065f46">found ✓</text>`
  const fnW=1+Math.min(3,FN/30)
  s+=`<rect x="${lx+cw}" y="${ry}" width="${cw}" height="${ch}" fill="rgba(254,202,202,${0.5+Math.min(0.5,FN/100)})" stroke="#f87171" stroke-width="${fnW.toFixed(1)}" rx="4"/>`
  s+=`<text x="${lx+cw+cw/2}" y="${ry+20}" font-size="12" font-weight="700" text-anchor="middle" fill="#991b1b">FN ⚠</text>`
  s+=`<text x="${lx+cw+cw/2}" y="${ry+36}" font-size="13" font-weight="700" text-anchor="middle" fill="#991b1b">${FN}</text>`
  s+=`<text x="${lx+cw+cw/2}" y="${ry+52}" font-size="9" text-anchor="middle" fill="#991b1b">missed!</text>`
  s+=`<rect x="${lx}" y="${ry+ch}" width="${cw}" height="${ch}" fill="#fff7ed" stroke="#fdba74" stroke-width="2" rx="4"/>`
  s+=`<text x="${lx+cw/2}" y="${ry+ch+20}" font-size="12" font-weight="700" text-anchor="middle" fill="#9a3412">FP</text>`
  s+=`<text x="${lx+cw/2}" y="${ry+ch+36}" font-size="13" font-weight="700" text-anchor="middle" fill="#9a3412">${FP.toLocaleString()}</text>`
  s+=`<text x="${lx+cw/2}" y="${ry+ch+52}" font-size="9" text-anchor="middle" fill="#9a3412">extra work</text>`
  s+=`<rect x="${lx+cw}" y="${ry+ch}" width="${cw}" height="${ch}" fill="#f9fafb" stroke="#d1d5db" stroke-width="1" rx="4"/>`
  s+=`<text x="${lx+cw+cw/2}" y="${ry+ch+20}" font-size="12" font-weight="700" text-anchor="middle" fill="#374151">TN</text>`
  s+=`<text x="${lx+cw+cw/2}" y="${ry+ch+36}" font-size="13" font-weight="700" text-anchor="middle" fill="#374151">${TN.toLocaleString()}</text>`
  s+=`<text x="${lx+cw+cw/2}" y="${ry+ch+52}" font-size="9" text-anchor="middle" fill="#6b7280">skipped ✓</text>`
  svg.innerHTML=s
  const m=$('cn-metrics'); if(m) m.innerHTML=`Recall:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>${(recall*100).toFixed(0)}%</strong><br>Precision: &nbsp;<strong>${(precision*100).toFixed(0)}%</strong><br>Flagged:&nbsp;&nbsp;&nbsp;&nbsp; <strong>${flagged.toLocaleString()}</strong><br>FN missed: <strong style="color:#dc2626">${FN} patients</strong>`
  const warn=$('cn-warning'); if(warn){
    if(recall<0.90) warn.innerHTML=`<span style="color:#dc2626;font-weight:600">⚠ ${FN} cancer patients would never be reviewed!</span>`
    else if(FP>5000) warn.innerHTML=`<span style="color:#d97706">High false alarm rate — ${FP.toLocaleString()} extra notes for registrars</span>`
    else warn.innerHTML=`<span style="color:#15803d">Reasonable balance at this threshold</span>`
  }
}

function cnAdvanceS1(){
  if(cnSliderMoves<3)return
  const s=$('cn-s2'); if(s)s.classList.add('unlocked')
  cnRenderMCQs()
  const h=$('cn-s1-hint'); if(h){h.className='guidance-box done';h.textContent='✓ Notice how raising the threshold quickly increases missed cancer patients (FN). Now frame the classification task.'}
}

function cnRenderMCQs(){
  [[1,CN_Q1,'cn-q1-opts'],[2,CN_Q2,'cn-q2-opts'],[3,CN_Q3,'cn-q3-opts'],[4,CN_Q4,'cn-q4-opts']].forEach(([q,data,id])=>{
    const el=$(id); if(!el||el.children.length)return
    el.innerHTML=data.map((o,i)=>`<div class="cg-mcq-opt" id="cn-q${q}-${i}" onclick="cnMCQ(${q},${i})">${o.t}</div>`).join('')
  })
}

function cnMCQ(q,i){
  const data=q===1?CN_Q1:q===2?CN_Q2:q===3?CN_Q3:CN_Q4
  const cur=q===1?cnQ1:q===2?cnQ2:q===3?cnQ3:cnQ4
  if(cur!==null)return
  const opt=data[i]; const correct=opt.c
  const el=$(`cn-q${q}-${i}`); if(!el)return
  el.className='cg-mcq-opt '+(correct?'sel-ok':'sel-bad')
  if(correct) data.forEach((_,j)=>{if(j!==i){const o=$(`cn-q${q}-${j}`);if(o)o.style.opacity='0.4'}})
  if(q===1)cnQ1=correct; else if(q===2)cnQ2=correct; else if(q===3)cnQ3=correct; else cnQ4=correct
  const hint=$(`cn-q${q}-hint`)
  const msgs={
    1:{ok:"✓ Binary document classification is the right framing. The registrar reviews flagged notes — the model just needs to decide which notes to prioritise.",
       bad:'Token-level or multiclass approaches add complexity that does not serve the goal of speeding up the review queue. Think about the simplest output that helps the registrar.'},
    2:{ok:'✓ Recall (= TP / (TP + FN)) is paramount. A false negative means a cancer patient is never reviewed — that is the catastrophic failure mode.',
       bad:'The confusion matrix showed that raising the threshold sharply increases FN (missed patients). Which metric directly minimises FN as a fraction of all true positives?'},
    3:{ok:'✓ 40% precision means 600/1000 flagged notes are non-cancer (false positives). Registrars must read them — extra work — but every cancer patient in the 400 true positives gets reviewed.',
       bad:'Re-read: 98% recall means 490/500 cancer notes ARE flagged (only 10 FN). 40% precision means 60% of the flagged notes are non-cancer. Those are false positives, not missed cancer patients.'},
    4:{ok:'✓ Very high recall with moderate precision is the right profile. The model shrinks the review queue from 10,000 notes to roughly 1,600 while missing almost no patients.',
       bad:'With only 5% of notes being cancer, accuracy can exceed 95% even when recall is only 50%. Balanced F1 would still miss one in five cancer patients.'}
  }
  if(hint){hint.className='guidance-box '+(correct?'done':'warm');hint.textContent=msgs[q][correct?'ok':'bad']}
  if(correct){
    if(q===1){const s=$('cn-s3');if(s)s.classList.add('unlocked');cnRenderMCQs()}
    else if(q===2){const s=$('cn-s4');if(s)s.classList.add('unlocked');cnRenderMCQs()}
    else if(q===3){const s=$('cn-s5');if(s)s.classList.add('unlocked');cnRenderMCQs()}
    else cnUpdateSummary()
  }
}

function cnUpdateSummary(){
  const ref=($('cn-ref')||{value:''}).value
  const el=$('cn-summary'); if(!el)return
  el.innerHTML=`<p><strong>MCQs correct:</strong> ${[cnQ1,cnQ2,cnQ3,cnQ4].filter(v=>v===true).length}/4</p><p><strong>Threshold explored:</strong> ${cnSliderMoves>=3?'<span style="color:var(--green)">✓</span>':'move slider ≥3 times'}</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('cancernlp-completed',isComplete('cancernlp'))
}

function initCancerNLP(){ cnDrawMatrix(0.5); cnUpdateSummary() }

// ══════════════════════════════════════════════════
//  11.3 LEARNING CURVE DIAGNOSIS
// ══════════════════════════════════════════════════
let lcStage=1, lcQ1=null, lcQ2=null, lcQ3=null, lcQ4=null
let lcPatternsSeen=new Set()

const LC_Q1=[
  {t:'Both moderate bias (low performance on train) AND moderate variance (notable train-dev gap) — the model underperforms and also slightly overfits',c:true},
  {t:'High bias only — both curves are low and very close together with a tiny gap',c:false},
  {t:'High variance only — training performance is near 100% with a large gap to dev',c:false},
  {t:'No problem — 60%/45% is expected for this task and no fix is needed',c:false}
]
const LC_Q2=[
  {t:'Add more training data (dev curve still has room to rise), apply light regularisation to close the gap, and consider a more expressive model to address the bias',c:true},
  {t:'Reduce model capacity significantly — the model is severely overfitting its training data',c:false},
  {t:'Maximise regularisation strength — the gap is entirely a variance problem',c:false},
  {t:'Do nothing — both curves will naturally converge if training continues long enough',c:false}
]
const LC_Q3=[
  {t:'High variance (overfitting) — the model memorises the training set but fails to generalise; train ≈ 100% while dev stagnates at 60%',c:true},
  {t:'High bias — the model has not learned the task well enough',c:false},
  {t:'Both high bias and high variance — train is also low in addition to the low dev performance',c:false},
  {t:'Data distribution shift — train and dev data come from different populations',c:false}
]
const LC_Q4=[
  {t:'Adding more layers and parameters to the model — this increases capacity and makes overfitting worse',c:true},
  {t:'Adding dropout regularisation to hidden layers',c:false},
  {t:'Collecting more training data',c:false},
  {t:'Applying L2 weight regularisation',c:false}
]

const LC_PATTERNS={
  hb:{label:'High Bias (Underfitting)',
    train:[0,18,30,36,40,42,44,45,46,47,47,48],
    dev:  [0,14,24,30,34,36,38,40,41,42,43,44],
    desc:'<strong>Diagnosis:</strong> Both curves are low and converge close together.<br><br><strong>Fix:</strong> Use a larger or more expressive model, add more features, or reduce over-strong regularisation.'},
  hv:{label:'High Variance (Overfitting)',
    train:[0,35,62,80,89,94,97,98,99,100,100,100],
    dev:  [0,16,25,29,32,33,35,36,36,37,37,37],
    desc:'<strong>Diagnosis:</strong> Train near 100% while dev is far behind and has stopped improving.<br><br><strong>Fix:</strong> Regularisation (dropout, L2), more training data, data augmentation, or smaller model.'},
  more:{label:'More Data Would Help',
    train:[0,22,38,50,57,63,67,70,72,73,74,75],
    dev:  [0,10,22,33,41,47,52,56,59,62,65,67],
    desc:'<strong>Diagnosis:</strong> Both curves are still rising — the model has not converged and needs more signal.<br><br><strong>Fix:</strong> Collect more training data. The model is learning but starved for examples.'},
  done:{label:'Converged (No Problem)',
    train:[0,40,60,72,80,84,87,89,90,91,92,92],
    dev:  [0,32,52,65,72,78,81,84,86,88,89,90],
    desc:'<strong>Diagnosis:</strong> Both curves converge to high performance with a small gap.<br><br><strong>Status:</strong> The model is well-fitted. Further gains will be incremental.'}
}

function lcShowPattern(key){
  lcPatternsSeen.add(key)
  const pat=LC_PATTERNS[key]
  Object.keys(LC_PATTERNS).forEach(k=>{const b=$(`lc-pat-${k}-btn`);if(b)b.className='btn '+(k===key?'btn-p':'btn-g')})
  lcDrawCurve('lc-anatomy-svg',pat.train,pat.dev,pat.label,240,180)
  const desc=$('lc-anatomy-desc'); if(desc) desc.innerHTML=`<strong>${pat.label}</strong><br><br>${pat.desc}`
  const prog=$('lc-pattern-progress'); if(prog) prog.textContent=`Patterns explored: ${lcPatternsSeen.size}/4`
  const btn=$('lc-s1-btn')
  if(lcPatternsSeen.size>=4&&btn){btn.disabled=false;btn.textContent='I can read learning curves →'}
}

function lcDrawCurve(svgId,trainPts,devPts,title,W,H){
  const svg=$(svgId); if(!svg)return
  W=W||parseInt(svg.getAttribute('width')||240)
  H=H||parseInt(svg.getAttribute('height')||170)
  const px=32,py=title?22:14,pw=W-px-8,ph=H-py-26
  let s=''
  if(title) s+=`<text x="${(px+pw/2).toFixed(0)}" y="13" font-size="10" text-anchor="middle" fill="var(--text)" font-weight="600">${title}</text>`
  s+=`<line x1="${px}" y1="${py}" x2="${px}" y2="${py+ph}" stroke="var(--border)" stroke-width="1.5"/>`
  s+=`<line x1="${px}" y1="${py+ph}" x2="${px+pw}" y2="${py+ph}" stroke="var(--border)" stroke-width="1.5"/>`
  ;[0,50,100].forEach(v=>{
    const y=py+ph-v/100*ph
    s+=`<line x1="${px-3}" y1="${y.toFixed(0)}" x2="${px}" y2="${y.toFixed(0)}" stroke="var(--border)" stroke-width="1"/>`
    s+=`<text x="${px-5}" y="${(y+4).toFixed(0)}" font-size="9" fill="var(--muted)" text-anchor="end">${v}</text>`
  })
  ;[0,50,100].forEach(v=>{
    const x=px+v/100*pw
    s+=`<text x="${x.toFixed(0)}" y="${(py+ph+12).toFixed(0)}" font-size="9" fill="var(--muted)" text-anchor="middle">${v}%</text>`
  })
  const toPath=pts=>{
    const n=pts.length
    return pts.map((v,i)=>{const x=px+i/(n-1)*pw,y=py+ph-Math.min(100,Math.max(0,v))/100*ph;return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`}).join(' ')
  }
  s+=`<path d="${toPath(trainPts)}" fill="none" stroke="#1d4ed8" stroke-width="2"/>`
  s+=`<path d="${toPath(devPts)}" fill="none" stroke="#dc2626" stroke-width="2"/>`
  const tx=px+pw-4
  const tLastY=py+ph-Math.min(100,trainPts[trainPts.length-1])/100*ph
  const dLastY=py+ph-Math.min(100,devPts[devPts.length-1])/100*ph
  s+=`<text x="${tx}" y="${(tLastY-4).toFixed(0)}" font-size="9" fill="#1d4ed8" text-anchor="end">train</text>`
  s+=`<text x="${tx}" y="${(dLastY+12).toFixed(0)}" font-size="9" fill="#dc2626" text-anchor="end">dev</text>`
  svg.innerHTML=s
}

function lcAdvanceS1(){
  if(lcPatternsSeen.size<4)return
  const s=$('lc-s2'); if(s)s.classList.add('unlocked')
  lcRenderMCQs()
  lcDrawCurve('lc-taskA-svg',[0,12,28,38,45,50,54,57,58,59,60,60],[0,8,18,26,31,35,38,41,42,43,45,45],null,240,170)
  lcDrawCurve('lc-taskB-svg',[0,30,55,70,82,89,93,96,98,99,100,100],[0,18,32,41,47,51,54,56,57,58,60,60],null,240,170)
}

function lcRenderMCQs(){
  [[1,LC_Q1,'lc-q1-opts'],[2,LC_Q2,'lc-q2-opts'],[3,LC_Q3,'lc-q3-opts'],[4,LC_Q4,'lc-q4-opts']].forEach(([q,data,id])=>{
    const el=$(id); if(!el||el.children.length)return
    el.innerHTML=data.map((o,i)=>`<div class="cg-mcq-opt" id="lc-q${q}-${i}" onclick="lcMCQ(${q},${i})">${o.t}</div>`).join('')
  })
}

function lcMCQ(q,i){
  const data=q===1?LC_Q1:q===2?LC_Q2:q===3?LC_Q3:LC_Q4
  const cur=q===1?lcQ1:q===2?lcQ2:q===3?lcQ3:lcQ4
  if(cur!==null)return
  const opt=data[i]; const correct=opt.c
  const el=$(`lc-q${q}-${i}`); if(!el)return
  el.className='cg-mcq-opt '+(correct?'sel-ok':'sel-bad')
  if(correct) data.forEach((_,j)=>{if(j!==i){const o=$(`lc-q${q}-${j}`);if(o)o.style.opacity='0.4'}})
  if(q===1)lcQ1=correct; else if(q===2)lcQ2=correct; else if(q===3)lcQ3=correct; else lcQ4=correct
  const hint=$(`lc-q${q}-hint`)
  const msgs={
    1:{ok:'✓ Task A shows both signals: train accuracy is mediocre (≈60%, bias) and the 15-point gap reveals moderate overfitting (variance). Neither alone fully explains it.',
       bad:'Look at both signals: the absolute level of train accuracy and the size of the train-dev gap. High bias means train is low; high variance means the gap is large.'},
    2:{ok:'✓ More data helps because the dev curve still has room to rise (it has not plateaued). Regularisation closes the gap. A better/larger model addresses the mediocre train accuracy.',
       bad:"Reducing model capacity is the fix for Task B-style pure overfitting. Task A's train accuracy is only 60% — the model hasn't learned enough yet."},
    3:{ok:'✓ Classic overfitting: train = 100% (the model memorised the data) while dev = 60% (it learned noise rather than signal).',
       bad:'If the model also had high bias, train performance would be low too. Here train = 100%, so the model has plenty of capacity — it just cannot generalise to unseen data.'},
    4:{ok:'✓ Adding parameters makes the model more flexible and more likely to memorise the training data further — exactly the problem we are trying to fix.',
       bad:'Think about the cause of overfitting: too much model capacity relative to available data. Which action increases capacity vs. which ones constrain or augment data?'}
  }
  if(hint){hint.className='guidance-box '+(correct?'done':'warm');hint.textContent=msgs[q][correct?'ok':'bad']}
  if(correct){
    if(q===1){const s=$('lc-s3');if(s)s.classList.add('unlocked');lcRenderMCQs()}
    else if(q===2){const s=$('lc-s4');if(s)s.classList.add('unlocked');lcRenderMCQs()}
    else if(q===3){const s=$('lc-s5');if(s)s.classList.add('unlocked');lcRenderMCQs()}
    else lcUpdateSummary()
  }
}

function lcUpdateSummary(){
  const ref=($('lc-ref')||{value:''}).value
  const el=$('lc-summary'); if(!el)return
  el.innerHTML=`<p><strong>MCQs correct:</strong> ${[lcQ1,lcQ2,lcQ3,lcQ4].filter(v=>v===true).length}/4</p><p><strong>Patterns explored:</strong> ${lcPatternsSeen.size}/4</p><p><strong>Reflection:</strong> ${ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet'}</p>`
  updateBadge('learncurve-completed',isComplete('learncurve'))
}

function initLearnCurve(){ lcUpdateSummary() }

// ══════════════════════════════════════════════════
//  11.4 HYPERBAND
// ══════════════════════════════════════════════════
let hbQ1=null, hbQ2=null, hbQ3=null, hbQ4=null
let hbBracketsSeen=new Set()

const HB_BRACKETS={
  3:{n:1000,iters:1,desc:'1000 configs × 1 iter each → keep best 100 → 10 configs × 10 iters → keep best 1. Broad exploration, almost no compute per config.'},
  2:{n:100,iters:10,desc:'100 configs × 10 iters each → keep best 10 → 1 config × 1000 iters. Moderate explore/exploit balance.'},
  1:{n:20,iters:100,desc:'20 configs × 100 iters each → keep best 2. Fewer configs, more confident early estimates.'},
  0:{n:4,iters:1000,desc:'4 configs × 1000 iters each (full budget). Pure exploitation: only 4 random starts, each trained to completion.'}
}
const HB_Q1=[
  {t:'s_max = 2',c:false},
  {t:'s_max = 3 &nbsp;&nbsp;→ int(log₁₀(1000)/log₁₀(10)) = int(3/1) = 3',c:true},
  {t:'s_max = 4',c:false},
  {t:'s_max = 1000',c:false}
]
const HB_Q2=[
  {t:'10 configurations',c:false},
  {t:'20 configurations &nbsp;&nbsp;→ int(ceil(2 × 10)) = 20',c:true},
  {t:'100 configurations',c:false},
  {t:'2 configurations',c:false}
]
const HB_Q3=[
  {t:'1000 &nbsp;&nbsp;(only bracket s=3 calls it)',c:false},
  {t:'124 &nbsp;&nbsp;(100 + 20 + 4, skipping s=3)',c:false},
  {t:'1124 &nbsp;&nbsp;(1000 + 100 + 20 + 4)',c:true},
  {t:'4000 &nbsp;&nbsp;(1000 × 4 brackets)',c:false}
]
const HB_Q4=[
  {t:'Configs that perform poorly after just 1 iteration are unlikely to become the eventual winner — so we can cheaply discard them and concentrate compute on survivors',c:true},
  {t:'Running 1000 configs for 1 iteration is statistically equivalent to running 1 config for 1000 iterations',c:false},
  {t:'Bracket s=3 ensures diversity by uniformly sampling the hyperparameter space',c:false},
  {t:'Using only 1 iteration prevents overfitting during the hyperparameter search itself',c:false}
]

function hbShowBracket(s){
  hbBracketsSeen.add(s)
  const b=HB_BRACKETS[s]
  ;[3,2,1,0].forEach(k=>{const btn=$('hb-b'+k+'-btn');if(btn)btn.className='btn '+(k===s?'btn-p':'btn-g')})
  const desc=$('hb-bracket-desc')
  if(desc) desc.innerHTML='<strong>Bracket s='+s+':</strong> starts with <strong>'+b.n+'</strong> config(s), <strong>'+b.iters+'</strong> iter(s) each. '+b.desc
  const prog=$('hb-bracket-progress')
  if(prog) prog.textContent='Brackets explored: '+hbBracketsSeen.size+'/4'
  hbDrawFunnel(s)
  if(hbBracketsSeen.size>=4){const btn=$('hb-s1-btn');if(btn){btn.disabled=false;btn.textContent='I understand the brackets →'}}
}

function hbDrawFunnel(active){
  const svg=$('hb-svg'); if(!svg)return
  const W=540,H=160
  const brackets=[{s:3,n:1000,col:'#bfdbfe'},{s:2,n:100,col:'#bbf7d0'},{s:1,n:20,col:'#fde68a'},{s:0,n:4,col:'#fecaca'}]
  const bw=114,gap=12,startX=18
  let s=''
  brackets.forEach((b,i)=>{
    const x=startX+i*(bw+gap)
    const ht=Math.max(28,Math.min(120,b.n/1000*120))
    const yc=20+(120-ht)/2
    const isActive=b.s===active
    s+='<rect x="'+x+'" y="'+yc+'" width="'+bw+'" height="'+ht+'" rx="6" fill="'+b.col+'" stroke="'+(isActive?'#1d4ed8':'#d1d5db')+'" stroke-width="'+(isActive?2.5:1)+'"/>'
    s+='<text x="'+(x+bw/2)+'" y="'+(yc+ht/2-10)+'" font-size="12" font-weight="700" fill="#1a1210" text-anchor="middle">s='+b.s+'</text>'
    s+='<text x="'+(x+bw/2)+'" y="'+(yc+ht/2+6)+'" font-size="11" fill="#374151" text-anchor="middle">'+b.n+' configs</text>'
    s+='<text x="'+(x+bw/2)+'" y="'+(yc+ht/2+20)+'" font-size="9" fill="var(--muted)" text-anchor="middle">n_configs</text>'
  })
  svg.innerHTML=s
}

function hbAdvanceS1(){
  if(hbBracketsSeen.size<4)return
  const s=$('hb-s2');if(s)s.classList.add('unlocked')
  hbRenderMCQs()
}

function hbRenderMCQs(){
  [[1,HB_Q1,'hb-q1-opts'],[2,HB_Q2,'hb-q2-opts'],[3,HB_Q3,'hb-q3-opts'],[4,HB_Q4,'hb-q4-opts']].forEach(function(tuple){
    const q=tuple[0],data=tuple[1],id=tuple[2]
    const el=$(id); if(!el||el.children.length)return
    el.innerHTML=data.map(function(o,i){return '<div class="cg-mcq-opt" id="hb-q'+q+'-'+i+'" onclick="hbMCQ('+q+','+i+')">'+o.t+'</div>'}).join('')
  })
}

function hbMCQ(q,i){
  const data=q===1?HB_Q1:q===2?HB_Q2:q===3?HB_Q3:HB_Q4
  const cur=q===1?hbQ1:q===2?hbQ2:q===3?hbQ3:hbQ4
  if(cur!==null)return
  const opt=data[i],correct=opt.c
  const el=$('hb-q'+q+'-'+i); if(!el)return
  el.className='cg-mcq-opt '+(correct?'sel-ok':'sel-bad')
  if(correct) data.forEach(function(_,j){if(j!==i){const o=$('hb-q'+q+'-'+j);if(o)o.style.opacity='0.4'}})
  if(q===1)hbQ1=correct; else if(q===2)hbQ2=correct; else if(q===3)hbQ3=correct; else hbQ4=correct
  const hint=$('hb-q'+q+'-hint')
  const msgs={
    1:{ok:'✓ s_max = int(log₁₀(1000)/log₁₀(10)) = int(3/1) = 3. The outer loop runs s = 3, 2, 1, 0 — four brackets in total.',
       bad:'Apply the formula: log₁₀(1000) = 3, log₁₀(10) = 1, so 3/1 = 3. int(3) = 3.'},
    2:{ok:'✓ int(ceil(int(4/2) × 10)) = int(ceil(2 × 10)) = 20. Bracket s=1 starts with 20 configurations.',
       bad:'Step by step: int((s_max+1)/(s+1)) = int(4/2) = 2. Then 2 × eta^1 = 2 × 10 = 20.'},
    3:{ok:'✓ 1000+100+20+4 = 1124. random_hyperparameters() is called once per starting config at the top of each bracket.',
       bad:'Sum each bracket\'s n_configs: s=3→1000, s=2→100, s=1→20, s=0→4. Total = 1124.'},
    4:{ok:'✓ The "early performance predicts final performance" assumption. Cheap early screening lets Hyperband concentrate compute on survivors without sampling fewer configs overall.',
       bad:'The key insight is prediction: if a bad config after 1 iteration is likely still bad after 1000, we can safely discard it early and save compute.'}
  }
  if(hint){hint.className='guidance-box '+(correct?'done':'warm');hint.textContent=msgs[q][correct?'ok':'bad']}
  if(correct){
    if(q===1){const s=$('hb-s3');if(s)s.classList.add('unlocked');hbRenderMCQs()}
    else if(q===2){const s=$('hb-s4');if(s)s.classList.add('unlocked');hbRenderMCQs()}
    else if(q===3){const s=$('hb-s5');if(s)s.classList.add('unlocked');hbRenderMCQs()}
    else hbUpdateSummary()
  }
}

function hbUpdateSummary(){
  const ref=($('hb-ref')||{value:''}).value
  const el=$('hb-summary'); if(!el)return
  el.innerHTML='<p><strong>MCQs correct:</strong> '+[hbQ1,hbQ2,hbQ3,hbQ4].filter(function(v){return v===true}).length+'/4</p><p><strong>Brackets explored:</strong> '+hbBracketsSeen.size+'/4</p><p><strong>Reflection:</strong> '+(ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet')+'</p>'
  updateBadge('hypband-completed',isComplete('hypband'))
}

function initHyperband(){ hbDrawFunnel(-1); hbUpdateSummary() }

// ══════════════════════════════════════════════════
//  11.LS LIME FOR EEG
// ══════════════════════════════════════════════════
let leQ1=null, leQ2=null, leQ3=null, leQ4=null
let leDomainsSeen=new Set()

const LE_DOMAINS={
  text:{label:'Text',inst:'A sentence: "I loved this movie!"',repr:'Individual words (tokens)',nbhd:'Randomly mask words → run model → fit local linear model on word importance',tokens:['I','loved','this','movie','!'],cols:['#bfdbfe','#bbf7d0','#fde68a','#e9d5ff','#fecaca'],mask:[1,3]},
  img:{label:'Image',inst:'A photo — H×W×3 pixel tensor',repr:'Superpixels: contiguous image regions',nbhd:'Zero out / blur superpixel regions → run model → fit local linear model',tokens:['SP1','SP2','SP3','SP4','SP5'],cols:['#fed7aa','#bbf7d0','#bfdbfe','#e9d5ff','#fde68a'],mask:[0,2]},
  tab:{label:'Tabular',inst:'A patient row: [age=45, hr=72, bp=130, ...]',repr:'Individual feature columns',nbhd:'Sample feature values from training distribution → perturb → fit local linear model',tokens:['age','hr','bp','lab','rx'],cols:['#bfdbfe','#fde68a','#fecaca','#bbf7d0','#e9d5ff'],mask:[1,4]}
}

const LE_Q1=[
  {t:'A single voltage value from one electrode at one moment in time',c:false},
  {t:'A fixed-length time window: ~10 seconds × 19 channels → a matrix of voltage values that the model classifies as seizure or not',c:true},
  {t:'The entire EEG recording spanning hours of continuous monitoring',c:false},
  {t:'A spectrogram image of frequency-domain features derived from the signal',c:false}
]
const LE_Q2=[
  {t:'Individual sample points (one feature per millisecond per electrode) — as fine-grained as possible',c:false},
  {t:'Time segments per channel: divide each electrode\'s signal into short windows (e.g., 1-second chunks) that can each be independently masked',c:true},
  {t:'Only frequency bands (delta, theta, alpha, beta, gamma) — discard all temporal structure',c:false},
  {t:'Pairs of spatially adjacent electrodes grouped by scalp position',c:false}
]
const LE_Q3=[
  {t:'Replace the segment with the canonical seizure waveform to measure sensitivity',c:false},
  {t:'Remove the electrode wire to produce genuine signal absence',c:false},
  {t:'Replace the segment with zeros, channel mean, or Gaussian noise — simulating no informative signal from that electrode at that time',c:true},
  {t:'Replay the same segment from an earlier (non-seizure) part of the recording',c:false}
]
const LE_Q4=[
  {t:'The model is safe to deploy without further review — a neurologist validated it',c:false},
  {t:'The model is likely using clinically valid features, not spurious correlations — neurologist alignment is evidence the model reasons correctly',c:true},
  {t:'The LIME explanation is unreliable because it coincidentally matched the neurologist\'s expectation',c:false},
  {t:'The neighborhood sampling was biased toward temporal channels, causing spurious alignment',c:false}
]

function leShowDomain(key){
  leDomainsSeen.add(key)
  const d=LE_DOMAINS[key]
  ;['text','img','tab'].forEach(function(k){const b=$('le-d-'+k+'-btn');if(b)b.className='btn '+(k===key?'btn-p':'btn-g')})
  const desc=$('le-domain-desc')
  if(desc) desc.innerHTML='<strong>'+d.label+'</strong> — Instance: <em>'+d.inst+'</em><br>Interpretable repr: <em>'+d.repr+'</em><br>Neighborhood: <em>'+d.nbhd+'</em>'
  const prog=$('le-domain-progress')
  if(prog) prog.textContent='Domains explored: '+leDomainsSeen.size+'/3'
  leDrawDomain(key)
  if(leDomainsSeen.size>=3){const btn=$('le-s1-btn');if(btn){btn.disabled=false;btn.textContent='Now apply to EEG →'}}
}

function leDrawDomain(key){
  const svg=$('le-svg'); if(!svg)return
  const d=LE_DOMAINS[key],W=480,H=120
  const tw=62,gap=9,totalW=d.tokens.length*(tw+gap)-gap,startX=(W-totalW)/2
  let s=''
  s+='<text x="'+W/2+'" y="16" font-size="11" font-weight="700" fill="var(--text)" text-anchor="middle">'+d.label+' — original instance</text>'
  d.tokens.forEach(function(t,i){
    const x=startX+i*(tw+gap),y=24
    s+='<rect x="'+x+'" y="'+y+'" width="'+tw+'" height="26" rx="5" fill="'+d.cols[i]+'" stroke="var(--border)" stroke-width="1"/>'
    s+='<text x="'+(x+tw/2)+'" y="'+(y+17)+'" font-size="11" font-weight="600" fill="#1a1210" text-anchor="middle">'+t+'</text>'
  })
  s+='<text x="'+W/2+'" y="70" font-size="10" fill="var(--muted)" text-anchor="middle">Sample neighbor: mask some components</text>'
  d.tokens.forEach(function(t,i){
    const x=startX+i*(tw+gap),y=76,masked=d.mask.includes(i)
    s+='<rect x="'+x+'" y="'+y+'" width="'+tw+'" height="26" rx="5" fill="'+(masked?'#f3f4f6':d.cols[i])+'" stroke="'+(masked?'#9ca3af':'var(--border)')+'" stroke-width="1" stroke-dasharray="'+(masked?'4,2':'none')+'"/>'
    s+='<text x="'+(x+tw/2)+'" y="'+(y+17)+'" font-size="'+(masked?9:11)+'" font-weight="600" fill="'+(masked?'#9ca3af':'#1a1210')+'" text-anchor="middle">'+(masked?'[MASK]':t)+'</text>'
  })
  svg.innerHTML=s
}

function leAdvanceS1(){
  if(leDomainsSeen.size<3)return
  const s=$('le-s2');if(s)s.classList.add('unlocked')
  leRenderMCQs()
}

function leRenderMCQs(){
  [[1,LE_Q1,'le-q1-opts'],[2,LE_Q2,'le-q2-opts'],[3,LE_Q3,'le-q3-opts'],[4,LE_Q4,'le-q4-opts']].forEach(function(tuple){
    const q=tuple[0],data=tuple[1],id=tuple[2]
    const el=$(id); if(!el||el.children.length)return
    el.innerHTML=data.map(function(o,i){return '<div class="cg-mcq-opt" id="le-q'+q+'-'+i+'" onclick="leMCQ('+q+','+i+')">'+o.t+'</div>'}).join('')
  })
}

function leMCQ(q,i){
  const data=q===1?LE_Q1:q===2?LE_Q2:q===3?LE_Q3:LE_Q4
  const cur=q===1?leQ1:q===2?leQ2:q===3?leQ3:leQ4
  if(cur!==null)return
  const opt=data[i],correct=opt.c
  const el=$('le-q'+q+'-'+i); if(!el)return
  el.className='cg-mcq-opt '+(correct?'sel-ok':'sel-bad')
  if(correct) data.forEach(function(_,j){if(j!==i){const o=$('le-q'+q+'-'+j);if(o)o.style.opacity='0.4'}})
  if(q===1)leQ1=correct; else if(q===2)leQ2=correct; else if(q===3)leQ3=correct; else leQ4=correct
  const hint=$('le-q'+q+'-hint')
  const msgs={
    1:{ok:'✓ EEG classifiers take a fixed-length window (typically 2–30 seconds) as input — a matrix of channels × time samples. That matrix is one instance.',
       bad:'A single sample is too small; the full recording is too large. The classifiable unit is a time window — typically seconds-long — containing the temporal pattern the model classifies.'},
    2:{ok:'✓ Time segments per channel give clinically interpretable units: a neurologist can assess which electrode and which time window drove the prediction. Individual ms-samples are too fine-grained; frequency bands alone lose the "when did it happen" information.',
       bad:'Individual millisecond samples are too granular for human interpretation. Frequency bands alone discard temporal structure. Electrode pairs add complexity without clearly interpretable semantics.'},
    3:{ok:'✓ The masked value must be neutral — not a signal the model reacts to strongly. Zeros or channel mean are standard; Gaussian noise is more realistic. The goal: the model receives "no information" from that component.',
       bad:'Using a seizure waveform as a mask confuses the model rather than simulating absence. Replaying earlier signal doesn\'t simulate "no information" either.'},
    4:{ok:'✓ Neurologist agreement is evidence (not proof) that the model learned genuine clinical patterns. It distinguishes "model found real signal" from "model exploited spurious training artifacts."',
       bad:'The alignment is informative evidence. It does not prove safety, but it is the right interpretation: the explanation aligns with domain knowledge, suggesting the model reasons correctly.'}
  }
  if(hint){hint.className='guidance-box '+(correct?'done':'warm');hint.textContent=msgs[q][correct?'ok':'bad']}
  if(correct){
    if(q===1){const s=$('le-s3');if(s)s.classList.add('unlocked');leRenderMCQs()}
    else if(q===2){const s=$('le-s4');if(s)s.classList.add('unlocked');leRenderMCQs()}
    else if(q===3){const s=$('le-s5');if(s)s.classList.add('unlocked');leRenderMCQs()}
    else leUpdateSummary()
  }
}

function leUpdateSummary(){
  const ref=($('le-ref')||{value:''}).value
  const el=$('le-summary'); if(!el)return
  el.innerHTML='<p><strong>MCQs correct:</strong> '+[leQ1,leQ2,leQ3,leQ4].filter(function(v){return v===true}).length+'/4</p><p><strong>Domains explored:</strong> '+leDomainsSeen.size+'/3</p><p><strong>Reflection:</strong> '+(ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet')+'</p>'
  updateBadge('limeeeg-completed',isComplete('limeeeg'))
}

function initLIMEEEG(){ leDrawDomain('text'); leUpdateSummary() }

// ══════════════════════════════════════════════════
//  11.GA GRADIENT ATTRIBUTION
// ══════════════════════════════════════════════════
let gaQ1=null, gaQ2=null, gaQ3=null, gaQ4=null
let gaMethodsSeen=new Set()

const GA_METHODS={
  sal:{label:'Saliency',formula:'sᵢ = |∂f(x)/∂xᵢ|',
    desc:'Measures how much a tiny change to token i\'s embedding would change the output. One backward pass. Fast but local.',
    scores:{'I':0.05,'loved':0.82,'this':0.10,'movie':0.03,'!':0.02},color:'#1d4ed8'},
  lime:{label:'LIME',formula:'argmin_g  L(f,g,π_x) + Ω(g)',
    desc:'Masks tokens, runs the model on each masked version, fits a local linear model. Measures actual prediction change when tokens are removed.',
    scores:{'I':0.01,'loved':0.61,'this':0.08,'movie':0.30,'!':0.05},color:'#15803d'},
  shap:{label:'SHAP / KernelSHAP',formula:'φᵢ = Σ_S |S|!(n-|S|-1)!/n! [f(S∪i)-f(S)]',
    desc:'Shapley values: fair attribution computed as the average marginal contribution across all possible token coalitions.',
    scores:{'I':0.02,'loved':0.70,'this':0.12,'movie':0.16,'!':0.04},color:'#7c3aed'}
}
const GA_TOKENS=['I','loved','this','movie','!']
const GA_METHOD_KEYS=['sal','lime','shap']

const GA_Q1=[
  {t:'"loved" is responsible for 82% of the model\'s POSITIVE confidence score',c:false},
  {t:'The embedding of "loved" is the most locally sensitive point — a small perturbation there would most change the output',c:true},
  {t:'Removing "loved" from the sentence would reduce confidence by 82%',c:false},
  {t:'"loved" appeared in 82% of positive training examples so the model learned to weight it heavily',c:false}
]
const GA_Q2=[
  {t:'Gradient attribution is broken for negation — it always highlights the strongest sentiment word regardless of context',c:false},
  {t:'The model uses "bad" as a shortcut: the gradient there is steep (strong polarity signal in embedding space) even though the negation makes the overall sentiment positive',c:true},
  {t:'The model is wrong — predicting POSITIVE while highlighting "bad" is a contradiction',c:false},
  {t:'Saliency correctly identifies "bad" because removing it would change the prediction from POSITIVE to NEGATIVE',c:false}
]
const GA_Q3=[
  {t:'LIME is less accurate — its linear approximation is too coarse for transformer attention patterns',c:false},
  {t:'Saliency measures local gradient at the exact input; LIME measures actual prediction change when tokens are fully removed — they ask different questions and can both be correct',c:true},
  {t:'One of the two methods has a bug — correct implementations should always agree',c:false},
  {t:'"movie" appears more often in training data than "loved" so LIME overestimates its importance',c:false}
]
const GA_Q4=[
  {t:'Ask a domain expert if the highlighted tokens seem reasonable for the task',c:false},
  {t:'Compare multiple methods — if saliency, LIME, and SHAP agree, all three are trustworthy',c:false},
  {t:'Randomize the model\'s weights and re-run the explanation — if explanations stay the same, the method ignores the model and cannot be trusted',c:true},
  {t:'Run on many examples and average attributions to reduce noise',c:false}
]

function gaShowMethod(key){
  gaMethodsSeen.add(key)
  const m=GA_METHODS[key]
  GA_METHOD_KEYS.forEach(function(k){const b=$('ga-m-'+k+'-btn');if(b)b.className='btn '+(k===key?'btn-p':'btn-g')})
  const desc=$('ga-method-desc')
  if(desc) desc.innerHTML='<strong>'+m.label+'</strong> &nbsp;<code>'+m.formula+'</code><br>'+m.desc
  const prog=$('ga-methods-progress')
  if(prog) prog.textContent='Methods explored: '+gaMethodsSeen.size+'/3'
  gaDrawBars(key)
  if(gaMethodsSeen.size>=3){const btn=$('ga-s1-btn');if(btn){btn.disabled=false;btn.textContent='I understand all three methods →'}}
}

function gaDrawBars(activeKey){
  const svg=$('ga-svg'); if(!svg)return
  const W=520,H=140,tokens=GA_TOKENS,keys=GA_METHOD_KEYS
  const labelW=46,barAreaW=W-labelW-8,tw=barAreaW/tokens.length
  const rowH=34,startY=24,startX=labelW
  let s=''
  tokens.forEach(function(t,i){
    s+='<text x="'+(startX+i*tw+tw/2)+'" y="16" font-size="10" fill="var(--text)" font-weight="600" text-anchor="middle">'+t+'</text>'
  })
  keys.forEach(function(key,ri){
    const m=GA_METHODS[key],y=startY+ri*rowH,isActive=key===activeKey
    s+='<text x="'+(labelW-4)+'" y="'+(y+16)+'" font-size="9" fill="'+(isActive?m.color:'var(--muted)')+'" text-anchor="end" font-weight="'+(isActive?'700':'400')+'">'+key+'</text>'
    tokens.forEach(function(t,i){
      const score=m.scores[t]||0,bw=score*tw*0.88
      const x=startX+i*tw+(tw-bw)/2
      s+='<rect x="'+x+'" y="'+(y+4)+'" width="'+bw+'" height="22" rx="3" fill="'+(isActive?m.color:'#d1d5db')+'" opacity="'+(isActive?0.85:0.3)+'"/>'
      s+='<text x="'+(startX+i*tw+tw/2)+'" y="'+(y+19)+'" font-size="9" fill="'+(isActive?'#fff':'#9ca3af')+'" text-anchor="middle">'+score.toFixed(2)+'</text>'
    })
  })
  svg.innerHTML=s
}

function gaAdvanceS1(){
  if(gaMethodsSeen.size<3)return
  const s=$('ga-s2');if(s)s.classList.add('unlocked')
  gaRenderMCQs()
}

function gaRenderMCQs(){
  [[1,GA_Q1,'ga-q1-opts'],[2,GA_Q2,'ga-q2-opts'],[3,GA_Q3,'ga-q3-opts'],[4,GA_Q4,'ga-q4-opts']].forEach(function(tuple){
    const q=tuple[0],data=tuple[1],id=tuple[2]
    const el=$(id); if(!el||el.children.length)return
    el.innerHTML=data.map(function(o,i){return '<div class="cg-mcq-opt" id="ga-q'+q+'-'+i+'" onclick="gaMCQ('+q+','+i+')">'+o.t+'</div>'}).join('')
  })
}

function gaMCQ(q,i){
  const data=q===1?GA_Q1:q===2?GA_Q2:q===3?GA_Q3:GA_Q4
  const cur=q===1?gaQ1:q===2?gaQ2:q===3?gaQ3:gaQ4
  if(cur!==null)return
  const opt=data[i],correct=opt.c
  const el=$('ga-q'+q+'-'+i); if(!el)return
  el.className='cg-mcq-opt '+(correct?'sel-ok':'sel-bad')
  if(correct) data.forEach(function(_,j){if(j!==i){const o=$('ga-q'+q+'-'+j);if(o)o.style.opacity='0.4'}})
  if(q===1)gaQ1=correct; else if(q===2)gaQ2=correct; else if(q===3)gaQ3=correct; else gaQ4=correct
  const hint=$('ga-q'+q+'-hint')
  const msgs={
    1:{ok:'✓ Saliency = gradient magnitude. It measures local sensitivity at the current input point — not global importance, not causal contribution. A large gradient means a small push changes the output; it does not mean removal changes the output.',
       bad:'Saliency does not measure the fraction of confidence or the effect of removal. It measures the gradient — the slope of the output surface at that embedding location.'},
    2:{ok:'✓ "Clever Hans" effect: the model\'s gradient near "bad" is steep (strong polarity signal in embedding space), revealing a shortcut. The correct prediction comes from the full "not bad" context, but saliency only shows local sensitivity, not full causal reasoning.',
       bad:'Saliency is not broken for negation — it accurately reports the gradient. The issue is that gradient ≠ causal explanation. The model\'s shortcut happens to work here but may fail on other negation patterns.'},
    3:{ok:'✓ Saliency asks "what if I nudge this embedding by ε?" (continuous, local). LIME asks "what if I remove this word entirely?" (discrete, global). A word can be locally smooth but globally critical. Both are correct; they answer different questions.',
       bad:'Both methods can be correctly implemented and still disagree — they measure fundamentally different things. The disagreement is informative, not a sign of a bug in either method.'},
    4:{ok:'✓ The "model parameter randomization test": randomize all weights and re-run. If explanations do not change, the method is describing input structure, not the model\'s learned behavior. This is the gold-standard sanity check.',
       bad:'Expert agreement and multi-method consensus are useful but do not prove the method looks at the model. Only the randomization test directly verifies whether explanations depend on the model\'s specific learned weights.'}
  }
  if(hint){hint.className='guidance-box '+(correct?'done':'warm');hint.textContent=msgs[q][correct?'ok':'bad']}
  if(correct){
    if(q===1){const s=$('ga-s3');if(s)s.classList.add('unlocked');gaRenderMCQs()}
    else if(q===2){const s=$('ga-s4');if(s)s.classList.add('unlocked');gaRenderMCQs()}
    else if(q===3){const s=$('ga-s5');if(s)s.classList.add('unlocked');gaRenderMCQs()}
    else gaUpdateSummary()
  }
}

function gaUpdateSummary(){
  const ref=($('ga-ref')||{value:''}).value
  const el=$('ga-summary'); if(!el)return
  el.innerHTML='<p><strong>MCQs correct:</strong> '+[gaQ1,gaQ2,gaQ3,gaQ4].filter(function(v){return v===true}).length+'/4</p><p><strong>Methods explored:</strong> '+gaMethodsSeen.size+'/3</p><p><strong>Reflection:</strong> '+(ref.length>10?'<span style="color:var(--green)">✓</span>':'not yet')+'</p>'
  updateBadge('gradattr-completed',isComplete('gradattr'))
}

function initGradAttr(){ gaDrawBars('sal'); gaUpdateSummary() }

