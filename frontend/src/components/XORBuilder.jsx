import { useState, useEffect, useRef, useCallback } from 'react'

// A known correct XOR solution with ReLU-Sigmoid
const XOR_SOLUTION = {
  w1: [[10, 10], [10, 10]], b1: [0, -10],
  w2: [[5], [-10]],         b2: [-5],
}
const XOR_RANDOM = {
  w1: [[0.5, -0.5], [0.5, -0.5]], b1: [0, 0],
  w2: [[1], [1]],                 b2: [0],
}

const XOR_POINTS = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]]

function relu(x)    { return Math.max(0, x) }
function sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x)))) }

function forward(x1, x2, w1, b1, w2, b2) {
  const z10 = x1 * w1[0][0] + x2 * w1[1][0] + b1[0]
  const z11 = x1 * w1[0][1] + x2 * w1[1][1] + b1[1]
  const a10 = relu(z10), a11 = relu(z11)
  const z2  = a10 * w2[0][0] + a11 * w2[1][0] + b2[0]
  return { z10, z11, a10, a11, z2, out: sigmoid(z2) }
}

function drawBoundary(canvas, w1, b1, w2, b2) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  const img = ctx.createImageData(W, H)
  const d = img.data

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const x1 = -0.2 + 1.4 * px / (W - 1)
      const x2 =  1.2 - 1.4 * py / (H - 1)
      const out = forward(x1, x2, w1, b1, w2, b2).out
      const idx = (py * W + px) * 4
      if (out > 0.5) {
        const t = (out - 0.5) * 2
        d[idx]   = Math.round(30 + 180 * t)
        d[idx+1] = Math.round(20 * (1 - t))
        d[idx+2] = Math.round(20 * (1 - t))
      } else {
        const t = (0.5 - out) * 2
        d[idx]   = Math.round(20 * (1 - t))
        d[idx+1] = Math.round(20 * (1 - t))
        d[idx+2] = Math.round(30 + 180 * t)
      }
      d[idx+3] = 230
    }
  }
  ctx.putImageData(img, 0, 0)

  // Grid lines at 0 and 1
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  for (const v of [0, 1]) {
    const px = Math.round((v + 0.2) / 1.4 * (W - 1))
    const py = Math.round((1.2 - v) / 1.4 * (H - 1))
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke()
  }

  // Data points
  for (const [x1, x2, lbl] of XOR_POINTS) {
    const px = Math.round((x1 + 0.2) / 1.4 * (W - 1))
    const py = Math.round((1.2 - x2) / 1.4 * (H - 1))
    ctx.beginPath(); ctx.arc(px, py, 10, 0, 2 * Math.PI)
    ctx.fillStyle   = lbl ? 'rgba(239,68,68,0.9)' : 'rgba(59,130,246,0.9)'
    ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = 'white'; ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(lbl.toString(), px, py)
  }

  // Axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
  ctx.fillText('x₁', W / 2, H - 2)
  ctx.save(); ctx.translate(10, H / 2); ctx.rotate(-Math.PI / 2)
  ctx.fillText('x₂', 0, 0); ctx.restore()
}

function NetworkSVG({ w1, b1, w2, b2 }) {
  const nodes = {
    i1: [50, 90], i2: [50, 190],
    h1: [200, 90], h2: [200, 190],
    o:  [340, 140],
  }
  function wColor(v) {
    const t = Math.min(1, Math.abs(v) / 8)
    return v >= 0
      ? `rgba(59,130,246,${0.3 + 0.7 * t})`
      : `rgba(239,68,68,${0.3 + 0.7 * t})`
  }
  function wWidth(v) { return Math.max(0.5, Math.min(4, Math.abs(v) * 0.4 + 0.5)) }

  const edges = [
    { from: 'i1', to: 'h1', w: w1[0][0] },
    { from: 'i1', to: 'h2', w: w1[0][1] },
    { from: 'i2', to: 'h1', w: w1[1][0] },
    { from: 'i2', to: 'h2', w: w1[1][1] },
    { from: 'h1', to: 'o',  w: w2[0][0] },
    { from: 'h2', to: 'o',  w: w2[1][0] },
  ]

  // Compute activations for [0,0],[0,1],[1,0],[1,1]
  const acts = XOR_POINTS.map(([x1, x2]) => forward(x1, x2, w1, b1, w2, b2))

  return (
    <svg viewBox="0 0 400 280" style={{ width: '100%' }}>
      {edges.map((e, i) => {
        const [x1, y1] = nodes[e.from]
        const [x2, y2] = nodes[e.to]
        return (
          <line key={i} x1={x1 + 14} y1={y1} x2={x2 - 14} y2={y2}
            stroke={wColor(e.w)} strokeWidth={wWidth(e.w)} />
        )
      })}

      {/* Labels for weights */}
      <text x={120} y={70}  fill="#fde68a" fontSize="9" fontFamily="Courier New" textAnchor="middle">
        w={w1[0][0].toFixed(1)}
      </text>
      <text x={120} y={148} fill="#fde68a" fontSize="9" fontFamily="Courier New" textAnchor="middle">
        w={w1[0][1].toFixed(1)}
      </text>
      <text x={120} y={152} fill="#fde68a" fontSize="9" fontFamily="Courier New" textAnchor="middle">
        &nbsp;
      </text>
      <text x={270} y={105} fill="#fde68a" fontSize="9" fontFamily="Courier New" textAnchor="middle">
        w={w2[0][0].toFixed(1)}
      </text>
      <text x={270} y={175} fill="#fde68a" fontSize="9" fontFamily="Courier New" textAnchor="middle">
        w={w2[1][0].toFixed(1)}
      </text>

      {/* Input nodes */}
      {[['i1','x₁',0], ['i2','x₂',1]].map(([k, lbl]) => (
        <g key={k}>
          <circle cx={nodes[k][0]} cy={nodes[k][1]} r={14}
            fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1.5} />
          <text x={nodes[k][0]} y={nodes[k][1] + 4}
            textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="700">{lbl}</text>
        </g>
      ))}

      {/* Hidden nodes with biases */}
      {[['h1', 0], ['h2', 1]].map(([k, i]) => (
        <g key={k}>
          <circle cx={nodes[k][0]} cy={nodes[k][1]} r={14}
            fill="#2d1b69" stroke="#8b5cf6" strokeWidth={1.5} />
          <text x={nodes[k][0]} y={nodes[k][1] + 4}
            textAnchor="middle" fill="#c4b5fd" fontSize="9" fontFamily="Courier New">
            b={b1[i].toFixed(1)}
          </text>
        </g>
      ))}

      {/* Output node */}
      <circle cx={nodes.o[0]} cy={nodes.o[1]} r={16}
        fill="#14532d" stroke="#22c55e" strokeWidth={1.5} />
      <text x={nodes.o[0]} y={nodes.o[1] + 4}
        textAnchor="middle" fill="#86efac" fontSize="9" fontFamily="Courier New">
        b={b2[0].toFixed(1)}
      </text>

      {/* Output predictions for each XOR point */}
      {acts.map(({ out }, i) => {
        const [x1, x2, lbl] = XOR_POINTS[i]
        return (
          <g key={i}>
            <circle cx={370 + (i % 2) * 22} cy={230 + Math.floor(i / 2) * 22} r={9}
              fill={Math.round(out) === lbl ? '#15803d' : '#991b1b'}
              stroke={Math.round(out) === lbl ? '#22c55e' : '#ef4444'}
              strokeWidth={1.5} />
            <text x={370 + (i % 2) * 22} y={234 + Math.floor(i / 2) * 22}
              textAnchor="middle" fill="white" fontSize="8" fontWeight="700">
              {out.toFixed(2)}
            </text>
          </g>
        )
      })}
      <text x={363} y={220} fill="#94a3b8" fontSize="9">preds</text>

      {/* Layer labels */}
      <text x={50}  y={270} textAnchor="middle" fill="#475569" fontSize="10">Input</text>
      <text x={200} y={270} textAnchor="middle" fill="#475569" fontSize="10">Hidden (ReLU)</text>
      <text x={340} y={270} textAnchor="middle" fill="#475569" fontSize="10">Output (σ)</text>
    </svg>
  )
}

function WSlider({ label, value, onChange }) {
  return (
    <div className="slider-row">
      <span className="slider-label" style={{ width: 110 }}>
        <span style={{ fontSize: 11 }}>{label}</span>
        <span className="val">{value >= 0 ? '+' : ''}{value.toFixed(1)}</span>
      </span>
      <input type="range" min={-15} max={15} step={0.5} value={value}
        className={`weight-slider${value < 0 ? ' neg-weight' : ''}`}
        onChange={e => onChange(parseFloat(e.target.value))} />
    </div>
  )
}

export default function XORBuilder() {
  const [w1, setW1] = useState(XOR_SOLUTION.w1.map(r => [...r]))
  const [b1, setB1] = useState([...XOR_SOLUTION.b1])
  const [w2, setW2] = useState(XOR_SOLUTION.w2.map(r => [...r]))
  const [b2, setB2] = useState([...XOR_SOLUTION.b2])

  const [training, setTraining]   = useState(false)
  const [runs, setRuns]           = useState(null)
  const [selected, setSelected]   = useState(null)

  const canvasRef = useRef(null)

  const redraw = useCallback(() => drawBoundary(canvasRef.current, w1, b1, w2, b2),
    [w1, b1, w2, b2])

  useEffect(() => { redraw() }, [redraw])

  function setPreset(p) {
    setW1(p.w1.map(r => [...r])); setB1([...p.b1])
    setW2(p.w2.map(r => [...r])); setB2([...p.b2])
    setRuns(null); setSelected(null)
  }

  async function trainRuns() {
    setTraining(true)
    try {
      const res = await fetch('/api/train_xor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n_init: 10, epochs: 3000, lr: 0.1 }),
      })
      const data = await res.json()
      setRuns(data.results)
      setSelected(0)
    } catch (e) {
      alert('Backend not running. Start with: uvicorn main:app --reload')
    }
    setTraining(false)
  }

  function selectRun(r) {
    setSelected(r.init)
    // Load the boundary data — since we only get z values from server,
    // we show a message. For full interactivity we'd load the weights.
  }

  // XOR accuracy
  const preds = XOR_POINTS.map(([x1, x2, lbl]) => {
    const out = forward(x1, x2, w1, b1, w2, b2).out
    return Math.round(out) === lbl
  })
  const correct = preds.filter(Boolean).length
  const solved = correct === 4

  return (
    <div className="module" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
      {/* Left: controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div className="card-title">Presets</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={() => setPreset(XOR_SOLUTION)}>✓ XOR Solution</button>
            <button className="btn btn-warn"    onClick={() => setPreset(XOR_RANDOM)}>Random Init</button>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-title">Weights</div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Hidden layer (W₁)</p>
          <WSlider label="W₁[x₁→h₁]" value={w1[0][0]}
            onChange={v => setW1(p => { const n=p.map(r=>[...r]); n[0][0]=v; return n })} />
          <WSlider label="W₁[x₁→h₂]" value={w1[0][1]}
            onChange={v => setW1(p => { const n=p.map(r=>[...r]); n[0][1]=v; return n })} />
          <WSlider label="W₁[x₂→h₁]" value={w1[1][0]}
            onChange={v => setW1(p => { const n=p.map(r=>[...r]); n[1][0]=v; return n })} />
          <WSlider label="W₁[x₂→h₂]" value={w1[1][1]}
            onChange={v => setW1(p => { const n=p.map(r=>[...r]); n[1][1]=v; return n })} />
          <WSlider label="b₁[h₁]" value={b1[0]}
            onChange={v => setB1(p => { const n=[...p]; n[0]=v; return n })} />
          <WSlider label="b₁[h₂]" value={b1[1]}
            onChange={v => setB1(p => { const n=[...p]; n[1]=v; return n })} />

          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '12px 0 8px' }}>Output layer (W₂)</p>
          <WSlider label="W₂[h₁→o]" value={w2[0][0]}
            onChange={v => setW2(p => { const n=p.map(r=>[...r]); n[0][0]=v; return n })} />
          <WSlider label="W₂[h₂→o]" value={w2[1][0]}
            onChange={v => setW2(p => { const n=p.map(r=>[...r]); n[1][0]=v; return n })} />
          <WSlider label="b₂[o]" value={b2[0]}
            onChange={v => setB2(p => { const n=[...p]; n[0]=v; return n })} />
        </div>
      </div>

      {/* Right: visualizations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Decision Boundary & Network</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge ${solved ? 'badge-green' : 'badge-red'}`}>
                {correct}/4 XOR correct
              </span>
              <button className="btn btn-primary" onClick={trainRuns} disabled={training}>
                {training ? '⏳ Training…' : '▶ Train 10 Random Inits'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                Decision boundary (🔵=0, 🔴=1)
              </p>
              <canvas ref={canvasRef} width={220} height={220}
                style={{ borderRadius: 8, display: 'block', border: '1px solid var(--border)' }} />
              <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                Circles: XOR data points with true labels
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Network architecture</p>
              <NetworkSVG w1={w1} b1={b1} w2={w2} b2={b2} />
            </div>
          </div>
        </div>

        {/* Predictions table */}
        <div className="card">
          <div className="card-title">Forward Pass — All XOR Inputs</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>x₁</th><th>x₂</th>
                <th>h₁ (ReLU)</th><th>h₂ (ReLU)</th>
                <th>z₂</th><th>ŷ = σ(z₂)</th>
                <th>y (truth)</th><th>✓</th>
              </tr>
            </thead>
            <tbody>
              {XOR_POINTS.map(([x1, x2, lbl], i) => {
                const { z10, z11, a10, a11, z2, out } = forward(x1, x2, w1, b1, w2, b2)
                const ok = Math.round(out) === lbl
                return (
                  <tr key={i} style={{ background: ok ? '#052e16' : '#3b0a0a' }}>
                    <td>{x1}</td><td>{x2}</td>
                    <td style={{ color: '#c4b5fd' }}>{a10.toFixed(2)}</td>
                    <td style={{ color: '#c4b5fd' }}>{a11.toFixed(2)}</td>
                    <td style={{ color: '#94a3b8' }}>{z2.toFixed(2)}</td>
                    <td style={{ color: ok ? '#86efac' : '#fca5a5', fontWeight: 700 }}>{out.toFixed(3)}</td>
                    <td>{lbl}</td>
                    <td>{ok ? '✓' : '✗'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Training results */}
        {runs && (
          <div className="card">
            <div className="card-title">
              10 Random Initializations —
              {' '}<span style={{ color: 'var(--green)' }}>{runs.filter(r => r.converged).length} converged</span>
              {' '}/ <span style={{ color: 'var(--red)' }}>{runs.filter(r => !r.converged).length} failed</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
              Click a run to see its loss curve. This illustrates why random initialization matters.
            </p>
            <div className="run-grid">
              {runs.map(r => (
                <div key={r.init}
                  className={`run-card${r.converged ? ' converged' : ''}${selected === r.init ? ' selected' : ''}`}
                  onClick={() => setSelected(r.init === selected ? null : r.init)}>
                  <p className={`run-badge ${r.converged ? 'badge badge-green' : 'badge badge-red'}`}>
                    Run {r.init + 1} {r.converged ? '✓' : '✗'}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                    loss: {r.final_loss.toFixed(4)}
                  </p>
                  <LossCurve losses={r.losses} converged={r.converged} />
                </div>
              ))}
            </div>

            {selected !== null && runs[selected] && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                  Run {selected + 1} — {runs[selected].converged ? '✅ Converged to correct XOR' : '❌ Got stuck (local minimum)'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Final loss: <strong style={{ color: 'var(--text)' }}>{runs[selected].final_loss.toFixed(6)}</strong>
                  {' · '}Epochs: 3000
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LossCurve({ losses, converged }) {
  const W = 120, H = 50
  if (!losses || losses.length < 2) return null
  const maxL = Math.max(...losses.map(l => l.loss))
  const minL = Math.min(...losses.map(l => l.loss))
  const range = maxL - minL || 1

  const pts = losses.map((l, i) => {
    const x = (i / (losses.length - 1)) * W
    const y = H - ((l.loss - minL) / range) * (H - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', marginTop: 6, display: 'block' }}>
      <polyline points={pts}
        fill="none"
        stroke={converged ? '#22c55e' : '#ef4444'}
        strokeWidth={1.5} />
    </svg>
  )
}
