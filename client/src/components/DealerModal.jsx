import React from 'react'
import { X, TrendingUp, TrendingDown, ShieldCheck, Hourglass, Target, Rocket, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, Tooltip } from 'recharts'
import BadgeSegment from './BadgeSegment'
import ProgressBar from './ProgressBar'
import './DealerModal.css'

export default function DealerModal({ dealer, cicloAtual, onClose }) {
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
    impulso,
    mantem,
    cairiaPara,
    subiriaPara
  } = dealer

  const formatCurrency = (val) =>
    `R$ ${(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  // Rótulo compacto sobre cada barra (valor exato fica no tooltip e na tabela)
  const barLabel = (v) => {
    if (!v || v <= 0) return ''
    if (v >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
    return String(Math.round(v))
  }

  // Prepare chart data (ordenado cronologicamente: ano*100 + mês)
  const cycleNum = (c) => {
    const [m, y] = String(c).split('/').map(Number)
    return (y || 0) * 100 + (m || 0)
  }
  const chartData = Object.entries(ciclos || {})
    .sort((a, b) => cycleNum(a[0]) - cycleNum(b[0]))
    .map(([ciclo, total]) => ({
      ciclo: ciclo.replace(/\/\d{4}$/, ''),
      cicloFull: ciclo,
      total,
      isCurrent: ciclo === cicloAtual
    }))
  const maxTotalCiclos = Math.max(...chartData.map(d => d.total), 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <span className="modal__title-label">DADOS DO REVENDEDOR</span>
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

          {/* PREVISÃO NA VIRADA */}
          <div className={`dealer-modal__forecast dealer-modal__forecast--${cairiaPara ? 'down' : subiriaPara ? 'up' : mantem ? 'keep' : 'building'}`}>
            {cairiaPara ? (
              <>
                <TrendingDown size={18} />
                {cairiaPara === 'Cobre' ? (
                  <span>Sem compras na janela: <strong>vira Cobre</strong> na virada. <strong>Qualquer pedido</strong> mantém {segmento}.</span>
                ) : (
                  <span>Se a virada fosse hoje, <strong>cai para {cairiaPara}</strong>. Falta <strong>{formatCurrency(faltaManter)}</strong> para manter {segmento}.</span>
                )}
              </>
            ) : subiriaPara ? (
              <>
                <TrendingUp size={18} />
                <span>O acúmulo já garante <strong>{subiriaPara}</strong> — subiu de segmentação!</span>
              </>
            ) : mantem ? (
              <>
                <ShieldCheck size={18} />
                <span><strong>Mantém {segmento}</strong> na próxima virada.</span>
              </>
            ) : (
              <>
                <Hourglass size={18} />
                <span><strong>Janela em construção</strong> — {faltaManter < 1 ? `qualquer pedido mantém ${segmento}` : <>falta <strong>{formatCurrency(faltaManter)}</strong> p/ manter {segmento}</>}.</span>
              </>
            )}
          </div>

          {/* MAIN STATS */}
          <div className="dealer-modal__stats">
            <div className="dealer-modal__stat">
              <span className="dealer-modal__stat-label">TOTAL DA JANELA</span>
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
                <strong className={faltaManter > 0 ? 'text-warning' : 'text-neon'}>{cairiaPara === 'Cobre' ? 'qualquer pedido' : formatCurrency(faltaManter)}</strong>
                {cairiaPara !== 'Cobre' && <span className="mono text-muted">({percentManter.toFixed(1)}%)</span>}
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
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={chartData} margin={{ top: 26, right: 10, left: 10, bottom: 10 }}>
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
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: '#1a1a1f', border: '1px solid #3a3a42', borderRadius: 4, fontFamily: 'JetBrains Mono', fontSize: 12 }}
                    labelStyle={{ color: '#a0a0a8' }}
                    formatter={(v) => [formatCurrency(v), 'Comprou']}
                    labelFormatter={(l) => `Ciclo ${l}`}
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
                    <LabelList
                      dataKey="total"
                      position="top"
                      formatter={barLabel}
                      fill="#e0e0e8"
                      fontSize={9}
                      style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}
                    />
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
                    const percent = maxTotalCiclos > 0 ? ((item.total / maxTotalCiclos) * 100).toFixed(1) : '0.0'
                    return (
                      <tr key={idx} className={item.isCurrent ? 'current' : ''}>
                        <td className="mono">{item.cicloFull}</td>
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
