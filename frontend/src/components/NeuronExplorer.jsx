import { useState } from 'react'

const DEFAULT_INPUTS  = [1.0, 1.0, 0.0, -1.0, 1.0, 0.0]
const DEFAULT_WEIGHTS = [0.5, 1.0, 1.0,  1.0, 0.5, 1.0]

function Slider({ label, value, min, max, step = 0.1, onChange, className = '' }) {
  return (
    <div className="slider-row">
      <span className="slider-label">
        <span>{label}</span>
        <span className="val">{value >= 0 ? '+' : ''}{value.toFixed(2)}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        className={className}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

function NeuronSVG({ inputs, weights, a_j, o_j }) {
  const W = 460, H = 300
  const cx = 250, cy = 150, r = 44
  const inputXs = 40
  const ys = [30, 74, 118, 162, 206, 250]
  const outX = W - 40

  function weightColor(w) {
    if (w > 0.05)  return `rgba(59,130,246,${Math.min(1, Math.abs(w) * 0.5 + 0.3)})`
    if (w < -0.05) return `rgba(239,68,68,${Math.min(1, Math.abs(w) * 0.5 + 0.3)})`
    return 'rgba(100,116,139,0.4)'
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 460 }}>
      {/* Connection lines */}
      {inputs.map((x, i) => {
        const prod = x * weights[i]
        return (
          <g key={i}>
            <line
              x1={inputXs + 12} y1={ys[i]}
              x2={cx - r} y2={cy}
              stroke={weightColor(weights[i])} strokeWidth={Math.abs(weights[i]) * 2.5 + 0.5}
            />
            <text x={(inputXs + 12 + cx - r) / 2} y={ys[i] - 5}
              fill={prod >= 0 ? '#93c5fd' : '#fca5a5'}
              fontSize="10" textAnchor="middle" fontFamily="Courier New">
              {prod >= 0 ? '+' : ''}{prod.toFixed(2)}
            </text>
          </g>
        )
      })}

      {/* Input nodes */}
      {inputs.map((x, i) => (
        <g key={i}>
          <circle cx={inputXs} cy={ys[i]} r={12}
            fill={x >= 0 ? '#1d4ed8' : '#991b1b'} stroke={x >= 0 ? '#3b82f6' : '#ef4444'} strokeWidth={1.5} />
          <text x={inputXs} y={ys[i] + 4} textAnchor="middle"
            fill="white" fontSize="10" fontWeight="700" fontFamily="Courier New">
            {x >= 0 ? '+' : ''}{x.toFixed(1)}
          </text>
          <text x={inputXs} y={ys[i] - 16} textAnchor="middle"
            fill="#94a3b8" fontSize="9" fontFamily="Courier New">x{i + 1}</text>
        </g>
      ))}

      {/* Weight labels on lines */}
      {weights.map((w, i) => (
        <text key={i}
          x={inputXs + 30} y={ys[i] + (cy - ys[i]) * 0.22 + 10}
          fill={w >= 0 ? '#fde68a' : '#fca5a5'}
          fontSize="9" fontFamily="Courier New">
          w{i + 1}={w >= 0 ? '+' : ''}{w.toFixed(1)}
        </text>
      ))}

      {/* Central neuron */}
      <circle cx={cx} cy={cy} r={r}
        fill="#1e293b" stroke={o_j > 0 ? '#22c55e' : '#475569'} strokeWidth={2.5} />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#94a3b8" fontSize="10">
        aⱼ = {a_j.toFixed(3)}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={o_j > 0 ? '#86efac' : '#64748b'} fontSize="11" fontWeight="700">
        ReLU
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill={o_j > 0 ? '#86efac' : '#94a3b8'} fontSize="10">
        oⱼ = {o_j.toFixed(3)}
      </text>

      {/* Output line */}
      <line x1={cx + r} y1={cy} x2={outX - 12} y2={cy}
        stroke={o_j > 0 ? '#22c55e' : '#475569'} strokeWidth={2} markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L0,8 L8,4 z" fill={o_j > 0 ? '#22c55e' : '#475569'} />
        </marker>
      </defs>
      <circle cx={outX} cy={cy} r={12}
        fill={o_j > 0 ? '#15803d' : '#1e293b'}
        stroke={o_j > 0 ? '#22c55e' : '#475569'} strokeWidth={1.5} />
      <text x={outX} y={cy + 4} textAnchor="middle"
        fill="white" fontSize="9" fontWeight="700" fontFamily="Courier New">
        {o_j.toFixed(2)}
      </text>
      <text x={outX} y={cy - 18} textAnchor="middle" fill="#94a3b8" fontSize="9">oⱼ</text>
    </svg>
  )
}

export default function NeuronExplorer() {
  const [inputs, setInputs]   = useState(DEFAULT_INPUTS)
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)

  const a_j = inputs.reduce((sum, x, i) => sum + x * weights[i], 0)
  const o_j = Math.max(0, a_j)

  const updateInput  = (i, v) => setInputs(prev  => prev.map((x, j) => j === i ? v : x))
  const updateWeight = (i, v) => setWeights(prev => prev.map((w, j) => j === i ? v : w))

  const reset = () => { setInputs(DEFAULT_INPUTS); setWeights(DEFAULT_WEIGHTS) }

  return (
    <div className="module" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Left: diagram + sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div className="card-title">Neuron Diagram</div>
          <NeuronSVG inputs={inputs} weights={weights} a_j={a_j} o_j={o_j} />
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Controls</div>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={reset}>
              Reset to 0.0 Activity
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>INPUTS (xᵢ)</p>
              {inputs.map((x, i) => (
                <Slider key={i} label={`x${i + 1}`} value={x} min={-3} max={3}
                  onChange={v => updateInput(i, v)} />
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>WEIGHTS (wᵢ)</p>
              {weights.map((w, i) => (
                <Slider key={i} label={`w${i + 1}`} value={w} min={-3} max={3}
                  className={`weight-slider${w < 0 ? ' neg-weight' : ''}`}
                  onChange={v => updateWeight(i, v)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right: algebra */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div className="card-title">Step-by-Step Computation</div>

          <div className="algebra">
            <div className="algebra-step">
              <span className="hl-blue">aⱼ</span> = Σᵢ ( xᵢ × wᵢ )
            </div>
            <div className="algebra-step" style={{ marginLeft: 14 }}>
              = {inputs.map((x, i) => (
                <span key={i}>
                  {i > 0 && ' + '}
                  (<span className="hl-blue">{x >= 0 ? '' : ''}{x.toFixed(2)}</span>
                  {' × '}
                  <span className="hl-orange">{weights[i] >= 0 ? '' : ''}{weights[i].toFixed(2)}</span>)
                </span>
              ))}
            </div>
            <div className="algebra-step" style={{ marginLeft: 14 }}>
              = {inputs.map((x, i) => {
                const p = x * weights[i]
                return (
                  <span key={i} style={{ color: p >= 0 ? '#93c5fd' : '#fca5a5' }}>
                    {i > 0 && ' + '}{p >= 0 ? '' : ''}{p.toFixed(4)}
                  </span>
                )
              })}
            </div>
            <div className="algebra-result" style={{ color: a_j >= 0 ? '#93c5fd' : '#fca5a5' }}>
              aⱼ = {a_j.toFixed(4)}
            </div>
          </div>

          <div className="algebra" style={{ marginTop: 12 }}>
            <div className="algebra-step">
              Apply <span className="hl-green">ReLU</span> activation:
            </div>
            <div className="algebra-step" style={{ marginLeft: 14 }}>
              oⱼ = max(0, aⱼ) = max(0, <span className="hl-blue">{a_j.toFixed(4)}</span>)
            </div>
            <div className="algebra-result" style={{ color: o_j > 0 ? '#86efac' : '#94a3b8' }}>
              oⱼ = {o_j.toFixed(4)}
              {a_j < 0 && <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11, marginLeft: 10 }}>
                (clamped to 0)
              </span>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Intuition</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--muted)' }}>
            <p>
              <strong style={{ color: 'var(--text)' }}>Weighted sum</strong> aⱼ combines all inputs —
              positive weights reinforce, negative weights suppress.
            </p>
            <p style={{ marginTop: 8 }}>
              <strong style={{ color: 'var(--text)' }}>ReLU</strong> passes through positive signals
              and blocks negative ones. This non-linearity lets networks learn complex boundaries.
            </p>
            <p style={{ marginTop: 8 }}>
              Current: {a_j >= 0
                ? <span style={{ color: 'var(--green)' }}>neuron is <strong>active</strong> (aⱼ ≥ 0)</span>
                : <span style={{ color: 'var(--red)' }}>neuron is <strong>inactive</strong> (aⱼ {'<'} 0, ReLU outputs 0)</span>
              }
            </p>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: 'var(--surf2)', borderRadius: 8 }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>TRY IT:</p>
            <ul style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 16, lineHeight: 2 }}>
              <li>Make all weights negative — what happens to oⱼ?</li>
              <li>Set one input to 0 — which term disappears?</li>
              <li>Can you drive aⱼ to exactly 0? To −5?</li>
              <li>The defaults reproduce the <strong style={{ color: 'var(--text)' }}>0.0 Activity</strong> answer.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
