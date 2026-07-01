import { useState } from 'react'
import NeuronExplorer from './components/NeuronExplorer'
import XORBuilder from './components/XORBuilder'
import CostExplorer from './components/CostExplorer'

const TABS = [
  { id: 'neuron', label: '0.0 Neuron Explorer', sub: 'Weighted sum + ReLU activation' },
  { id: 'xor',    label: '6.1 XOR Builder',     sub: 'Decision boundaries & weight effects' },
  { id: 'cost',   label: '6.2 Cost Explorer',   sub: 'Cross-entropy loss surface' },
]

export default function App() {
  const [tab, setTab] = useState('neuron')

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1>Neural Networks Sandbox</h1>
          <p className="header-sub">ISTA 457 / INFO 557 · Interactive Learning Environment</p>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-label">{t.label}</span>
            <span className="tab-sub">{t.sub}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'neuron' && <NeuronExplorer />}
        {tab === 'xor'    && <XORBuilder />}
        {tab === 'cost'   && <CostExplorer />}
      </main>
    </div>
  )
}
