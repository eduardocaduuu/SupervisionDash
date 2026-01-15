import React from 'react'
import { X, TrendingUp, Target, Rocket, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import BadgeSegment from './BadgeSegment'
import ProgressBar from './ProgressBar'
import './DealerModal.css'

export default function DealerModal({ dealer, onClose }) {
  if (!dealer) return null

  const {
    codigo,
    nome,
    segmento,
    totalGeral,
    totalCicloAtual,
    faltaManter,
    faltaSubir,
    percentManter,
    percentSubir,
    ciclos,
    impulso
  } = dealer

  const formatCurrency = (val) =>
    `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  // Prepare chart data
  const chartData = Object.entries(ciclos || {}).map(([ciclo, total]) => ({
    ciclo: ciclo.replace('/2026', ''),
    total,
    isCurrent: ciclo === '01/2026' // This should come from config
  }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <span className="modal__title-label">DEALER INTEL</span>
            <span className="modal__title-code mono">{codigo}</span>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal__body">
          {/* HEADER INFO */}
          <div className="dealer-modal__header">
            <div className="dealer-modal__name">
              <h2>{nome}</h2>
              <BadgeSegment segment={segmento} />
            </div>
            <div className="dealer-modal__impulso">
              <span className="dealer-modal__impulso-label">STATUS</span>
              <span className="dealer-modal__impulso-value">{impulso}</span>
            </div>
          </div>

          {/* MAIN STATS */}
          <div className="dealer-modal__stats">
            <div className="dealer-modal__stat">
              <span className="dealer-modal__stat-label">TOTAL 9 CICLOS</span>
              <span className="dealer-modal__stat-value mono">{formatCurrency(totalGeral)}</span>
            </div>
            <div className="dealer-modal__stat dealer-modal__stat--secondary">
              <span className="dealer-modal__stat-label">CICLO ATUAL</span>
              <span className="dealer-modal__stat-value mono">{formatCurrency(totalCicloAtual)}</span>
            </div>
          </div>

          {/* PROGRESS BARS */}
          <div className="dealer-modal__progress">
            <div className="dealer-modal__progress-item">
              <div className="dealer-modal__progress-header">
                <Target size={16} />
                <span>META MANTER</span>
              </div>
              <ProgressBar
                label=""
                value={percentManter}
                showValue={false}
                variant={percentManter < 30 ? 'danger' : percentManter < 80 ? 'warning' : 'default'}
              />
              <div className="dealer-modal__progress-info">
                <span className="text-muted">Falta:</span>
                <strong className={faltaManter > 0 ? 'text-warning' : 'text-neon'}>{formatCurrency(faltaManter)}</strong>
                <span className="mono text-muted">({percentManter.toFixed(1)}%)</span>
              </div>
            </div>

            {percentSubir !== null && (
              <div className="dealer-modal__progress-item">
                <div className="dealer-modal__progress-header dealer-modal__progress-header--cyan">
                  <Rocket size={16} />
                  <span>META SUBIR</span>
                </div>
                <ProgressBar
                  label=""
                  value={percentSubir}
                  showValue={false}
                  variant="cyan"
                />
                <div className="dealer-modal__progress-info">
                  <span className="text-muted">Falta:</span>
                  <strong className="text-cyan">{formatCurrency(faltaSubir)}</strong>
                  <span className="mono text-muted">({percentSubir.toFixed(1)}%)</span>
                </div>
              </div>
            )}
          </div>

          {/* CICLOS CHART */}
          <div className="dealer-modal__chart">
            <div className="dealer-modal__chart-header">
              <TrendingUp size={16} />
              <span>HISTÓRICO POR CICLO</span>
            </div>
            <div className="dealer-modal__chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <XAxis
                    dataKey="ciclo"
                    tick={{ fill: '#a0a0a8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#3a3a42' }}
                    tickLine={{ stroke: '#3a3a42' }}
                  />
                  <YAxis
                    tick={{ fill: '#a0a0a8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#3a3a42' }}
                    tickLine={{ stroke: '#3a3a42' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isCurrent ? '#b8d977' : '#77d9c3'}
                        stroke={entry.isCurrent ? '#b8d977' : '#77d9c3'}
                        strokeWidth={2}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CICLOS TABLE */}
          <div className="dealer-modal__table">
            <div className="dealer-modal__table-header">
              <Award size={16} />
              <span>DETALHAMENTO</span>
            </div>
            <div className="table-container">
              <table className="table-neo">
                <thead>
                  <tr>
                    <th>Ciclo</th>
                    <th>Total</th>
                    <th>% do Maior</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((item, idx) => {
                    const maxTotal = Math.max(...chartData.map(d => d.total))
                    const percent = ((item.total / maxTotal) * 100).toFixed(1)
                    return (
                      <tr key={idx} className={item.isCurrent ? 'current' : ''}>
                        <td className="mono">{item.ciclo}/2026</td>
                        <td className="mono">{formatCurrency(item.total)}</td>
                        <td className="mono">{percent}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>FECHAR</button>
        </div>
      </div>
    </div>
  )
}
