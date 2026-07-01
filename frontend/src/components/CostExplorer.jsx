import { useState, useEffect, useRef } from 'react'

// Defaults from 6.2 Activity
const INIT_DATA = [
  { y: [0, 1], p: [0.5, 0.5] },
  { y: [1, 0], p: [0.9, 0.1] },
  { y: [0, 1], p: [0.9, 0.1] },
]

function log2(x) { return Math.log(Math.max(1e-10, x)) / Math.LN2 }

function computeRow(y, p) {
  const logP  = p.map(v => log2(v))
  const elem  = y.map((yi, i) => yi * logP[i])
  const rowSum = elem.reduce((s, v) => s + v, 0)
  return { logP, elem, rowSum }
}

function computeCost(data) {
  const rows = data.map(({ y, p }) => computeRow(y, p))
  // Per-class cost (as in activity): sum each dimension then divide
  const dim0Sum = rows.reduce((s, r) => s + r.elem[0], 0)
  const dim1Sum = rows.reduce((s, r) => s + r.elem[1], 0)
  const costVec = [-(dim0Sum / data.length), -(dim1Sum / data.length)]
  const costScalar = -(rows.reduce((s, r) => s + r.rowSum, 0) / data.length)
  return { rows, costVec, costScalar }
}

function CostCurveCanvas({ y, pIdx, data, activeRow }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, W, H)

    // Draw cost curve for each data row
    INIT_DATA.forEach((row, ri) => {
      const isActive = ri === activeRow
      ctx.beginPath()
      for (let px = 0; px < W; px++) {
        const p1  = 0.01 + 0.98 * (px / (W - 1))
        const p2  = 1 - p1
        const pr  = [p1, p2]
        const { rowSum } = computeRow(row.y, pr)
        const cost = -rowSum
        const py   = H - 2 - (cost / 5) * (H - 4)
        if (px === 0) ctx.moveTo(px, Math.max(2, Math.min(H - 2, py)))
        else          ctx.lineTo(px, Math.max(2, Math.min(H - 2, py)))
      }
      ctx.strokeStyle = isActive
        ? (ri === 0 ? '#38bdf8' : ri === 1 ? '#f97316' : '#a78bfa')
        : 'rgba(100,116,139,0.3)'
      ctx.lineWidth = isActive ? 2 : 1
      ctx.stroke()

      // Current operating point
      const curP1   = data[ri].p[0]
      const { rowSum } = computeRow(row.y, data[ri].p)
      const curCost = -rowSum
      const cx = (curP1 - 0.01) / 0.98 * (W - 1)
      const cy = H - 2 - (curCost / 5) * (H - 4)
      ctx.beginPath(); ctx.arc(cx, Math.max(4, Math.min(H - 4, cy)), 4, 0, 2 * Math.PI)
      ctx.fillStyle = isActive
        ? (ri === 0 ? '#38bdf8' : ri === 1 ? '#f97316' : '#a78bfa')
        : 'rgba(100,116,139,0.5)'
      ctx.fill()
    })

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, H - 1); ctx.lineTo(W, H - 1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, 0);     ctx.lineTo(0, H);     ctx.stroke()

    // Axis labels
    ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('p(class 1)', W / 2, H - 1)
    ctx.save(); ctx.translate(8, H / 2); ctx.rotate(-Math.PI / 2)
    ctx.fillText('−log₂ loss', 0, 0); ctx.restore()

    ctx.textAlign = 'left'
    ctx.fillText('0', 2, H - 2)
    ctx.textAlign = 'right'
    ctx.fillText('1', W - 2, H - 2)
  }, [data, activeRow])

  return (
    <canvas ref={ref} width={280} height={140}
      style={{ borderRadius: 6, display: 'block', border: '1px solid var(--border)' }} />
  )
}

export default function CostExplorer() {
  const [data, setData]         = useState(INIT_DATA.map(r => ({ ...r, p: [...r.p] })))
  const [activeRow, setActiveRow] = useState(0)

  const { rows, costVec, costScalar } = computeCost(data)

  function setP(rowIdx, p1) {
    setData(prev => prev.map((r, i) =>
      i === rowIdx ? { ...r, p: [p1, 1 - p1] } : r
    ))
  }

  function reset() { setData(INIT_DATA.map(r => ({ ...r, p: [...r.p] }))) }

  const rowColors = ['#38bdf8', '#f97316', '#a78bfa']

  return (
    <div className="module" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Left: controls + step-by-step */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Predicted Probabilities</div>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={reset}>
              Reset
            </button>
          </div>

          {data.map((row, ri) => {
            const isActive = ri === activeRow
            const { rowSum } = rows[ri]
            return (
              <div key={ri}
                onClick={() => setActiveRow(ri)}
                style={{
                  padding: '12px 14px',
                  marginBottom: 8,
                  borderRadius: 8,
                  border: `1px solid ${isActive ? rowColors[ri] : 'var(--border)'}`,
                  background: isActive ? 'var(--surf2)' : 'transparent',
                  cursor: 'pointer',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: rowColors[ri] }}>
                    Row {ri + 1}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    y = [{row.y.join(', ')}] &nbsp;
                    <span style={{ color: rowColors[ri] }}>
                      loss = {(-rowSum).toFixed(4)}
                    </span>
                  </span>
                </div>
                <div className="slider-row">
                  <span className="slider-label" style={{ width: 120, fontSize: 11 }}>
                    p(class 1)
                    <span className="val">{row.p[0].toFixed(2)}</span>
                  </span>
                  <input type="range" min={0.01} max={0.99} step={0.01} value={row.p[0]}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { e.stopPropagation(); setP(ri, parseFloat(e.target.value)) }}
                    style={{ flex: 1 }} />
                </div>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  p(class 2) = {row.p[1].toFixed(2)} (1 − p(class 1))
                </p>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="card-title">Cost Curves</div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            Each curve = −log₂ loss for one row as p(class 1) varies. Dots = current prediction.
          </p>
          <CostCurveCanvas data={data} activeRow={activeRow} />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {data.map((_, ri) => (
              <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
                <div style={{ width: 12, height: 3, borderRadius: 2, background: rowColors[ri] }} />
                Row {ri + 1} (y=[{data[ri].y.join(',')}])
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: algebra */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div className="card-title">Step 1 — y ⊙ log₂ p for each row</div>
          <table className="data-table" style={{ marginBottom: 4 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>y (truth)</th>
                <th>p (predicted)</th>
                <th>log₂(p)</th>
                <th>y ⊙ log₂(p)</th>
                <th>row sum</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, ri) => {
                const { logP, elem, rowSum } = rows[ri]
                return (
                  <tr key={ri}
                    className={ri === activeRow ? 'active-row' : ''}
                    onClick={() => setActiveRow(ri)}
                    style={{ cursor: 'pointer' }}>
                    <td style={{ color: rowColors[ri], fontWeight: 700 }}>{ri + 1}</td>
                    <td style={{ fontFamily: 'Courier New' }}>
                      [{row.y.join(', ')}]
                    </td>
                    <td style={{ fontFamily: 'Courier New', color: '#93c5fd' }}>
                      [{row.p.map(v => v.toFixed(2)).join(', ')}]
                    </td>
                    <td style={{ fontFamily: 'Courier New', color: '#fde68a' }}>
                      [{logP.map(v => v.toFixed(2)).join(', ')}]
                    </td>
                    <td style={{ fontFamily: 'Courier New', color: '#c4b5fd' }}>
                      [{elem.map(v => v.toFixed(2)).join(', ')}]
                    </td>
                    <td style={{ fontFamily: 'Courier New', color: rowSum < -1 ? '#fca5a5' : '#86efac', fontWeight: 700 }}>
                      {rowSum.toFixed(4)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title">Step 2 — Sum over data</div>
          <div className="algebra">
            <div className="algebra-step">
              Σ y ⊙ log₂ p(y|x) = (
              {rows[0].elem[0].toFixed(2)} + {rows[1].elem[0].toFixed(2)} + {rows[2].elem[0].toFixed(2)},&nbsp;
              {rows[0].elem[1].toFixed(2)} + {rows[1].elem[1].toFixed(2)} + {rows[2].elem[1].toFixed(2)}
              )
            </div>
            <div className="algebra-step" style={{ marginLeft: 16 }}>
              = (
              <span className="hl-blue">{rows.reduce((s, r) => s + r.elem[0], 0).toFixed(4)}</span>
              ,&nbsp;
              <span className="hl-blue">{rows.reduce((s, r) => s + r.elem[1], 0).toFixed(4)}</span>
              )
            </div>

            <div className="algebra-result">
              J(W) = −(1/3) × ({rows.reduce((s, r) => s + r.elem[0], 0).toFixed(4)}, {rows.reduce((s, r) => s + r.elem[1], 0).toFixed(4)})
            </div>
            <div className="algebra-result" style={{ color: '#86efac', marginTop: 4 }}>
              = ({costVec[0].toFixed(4)}, {costVec[1].toFixed(4)})
              &nbsp;<span style={{ color: 'var(--muted)', fontSize: 11 }}>(per-class cost)</span>
            </div>
          </div>

          <div className="algebra" style={{ marginTop: 12 }}>
            <div className="algebra-step">Scalar cross-entropy (sum all elements):</div>
            <div className="algebra-result" style={{ color: '#fde68a' }}>
              J(W) = {costScalar.toFixed(4)} bits
            </div>
          </div>

          {Math.abs(costVec[0] - 0.05) < 0.01 && Math.abs(costVec[1] - 1.44) < 0.01 && (
            <div style={{ marginTop: 12, padding: 10, background: '#14532d', borderRadius: 6, fontSize: 12, color: '#86efac' }}>
              ✓ Matches the 6.2 Activity answer: J(W) = (0.05, 1.44)
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Intuition</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--muted)' }}>
            <p>
              <strong style={{ color: 'var(--text)' }}>Low cost</strong> = the model confidently
              predicts the correct class. <strong style={{ color: 'var(--text)' }}>High cost</strong>
              = the model is either wrong or uncertain.
            </p>
            <p style={{ marginTop: 8 }}>
              Notice Row 3 (y=[0,1], p=[0.9,0.1]): the model is confidently
              <em> wrong</em> — assigning 90% probability to class 0 when the truth is class 1.
              This produces a high loss of {(-rows[2].rowSum).toFixed(3)}.
            </p>
            <p style={{ marginTop: 8 }}>
              <strong style={{ color: 'var(--text)' }}>Try it:</strong> slide Row 3's probability
              toward 0.01 to see the cost explode → −log₂(0.01) ≈ 6.6 bits.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
