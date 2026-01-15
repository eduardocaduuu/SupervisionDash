import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { TrendingUp, Info, BarChart3 } from 'lucide-react'
import Panel from '../components/Panel'
import './CiclosTab.css'

export default function CiclosTab({ setorId }) {
  const [ciclosData, setCiclosData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/setor/${setorId}/ciclos`)
      .then(r => r.json())
      .then(data => {
        setCiclosData(data)
        setIsLoading(false)
      })
      .catch(console.error)
  }, [setorId])

  if (isLoading) {
    return (
      <div className="ciclos-loading">
        <span className="mono">LOADING CYCLES DATA...</span>
      </div>
    )
  }

  const formatCurrency = (val) =>
    `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const maxTotal = Math.max(...ciclosData.map(d => d.total))

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="ciclos-tooltip">
          <span className="ciclos-tooltip__label">Ciclo {label}</span>
          <span className="ciclos-tooltip__value">{formatCurrency(payload[0].value)}</span>
        </div>
      )
    }
    return null
  }

  return (
    <div className="ciclos-tab">
      {/* INFO PANEL */}
      <Panel
        title="SOBRE REPRESENTATIVIDADE"
        variant="cyan"
        className="ciclos-tab__info"
      >
        <div className="ciclos-info">
          <Info size={20} className="ciclos-info__icon" />
          <p>
            A <strong>representatividade</strong> é um multiplicador (0-100%) aplicado ao valor de cada ciclo
            para calcular as metas de <strong>MANTER</strong> e <strong>SUBIR</strong>.
            Ciclos com maior representatividade têm maior peso no cálculo do total ponderado.
          </p>
        </div>
      </Panel>

      {/* CHART */}
      <Panel
        title="EVOLUÇÃO POR CICLO"
        headerRight={<BarChart3 size={18} />}
        className="ciclos-tab__chart"
      >
        <div className="ciclos-chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ciclosData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <XAxis
                dataKey="ciclo"
                tick={{ fill: '#a0a0a8', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#3a3a42', strokeWidth: 2 }}
                tickLine={{ stroke: '#3a3a42' }}
              />
              <YAxis
                tick={{ fill: '#a0a0a8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#3a3a42', strokeWidth: 2 }}
                tickLine={{ stroke: '#3a3a42' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="total"
                radius={[4, 4, 0, 0]}
                stroke="#1a1a1f"
                strokeWidth={2}
              >
                {ciclosData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.total === maxTotal ? '#b8d977' : '#77d9c3'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* TABLE */}
      <Panel
        title="DETALHAMENTO POR CICLO"
        headerRight={<TrendingUp size={18} />}
        noPadding
      >
        <div className="table-container">
          <table className="table-neo">
            <thead>
              <tr>
                <th>CICLO</th>
                <th>TOTAL</th>
                <th>% DO MAIOR</th>
                <th>REPRESENTATIVIDADE</th>
                <th>PESO</th>
              </tr>
            </thead>
            <tbody>
              {ciclosData.map((item, idx) => {
                const percentOfMax = ((item.total / maxTotal) * 100).toFixed(1)
                const isMax = item.total === maxTotal
                return (
                  <tr key={idx} className={isMax ? 'highlight' : ''}>
                    <td className="mono">{item.ciclo}</td>
                    <td className="mono">{formatCurrency(item.total)}</td>
                    <td>
                      <div className="ciclos-percent-bar">
                        <div
                          className="ciclos-percent-bar__fill"
                          style={{ width: `${percentOfMax}%` }}
                        />
                        <span className="mono">{percentOfMax}%</span>
                      </div>
                    </td>
                    <td className="mono text-cyan">{item.representatividade}%</td>
                    <td className="mono text-muted">
                      x{(item.representatividade / 100).toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
