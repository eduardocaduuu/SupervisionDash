import React, { useState, useEffect } from 'react'
import { Trophy, Zap } from 'lucide-react'
import Panel from '../components/Panel'
import BadgeSegment from '../components/BadgeSegment'
import './RankTab.css'

export default function RankTab({ setorId }) {
  const [rankData, setRankData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/setor/${setorId}/rank`)
      .then(r => r.json())
      .then(data => {
        setRankData(data)
        setIsLoading(false)
      })
      .catch(console.error)
  }, [setorId])

  if (isLoading) {
    return (
      <div className="rank-loading">
        <span className="mono">LOADING RANK DATA...</span>
      </div>
    )
  }

  const { ranking, missionBoosters } = rankData

  const formatCurrency = (val) =>
    `R$ ${Math.abs(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const getMedalClass = (position) => {
    if (position === 0) return 'rank-item--gold'
    if (position === 1) return 'rank-item--silver'
    if (position === 2) return 'rank-item--bronze'
    return ''
  }

  return (
    <div className="rank-tab">
      {/* MISSION BOOSTERS */}
      <Panel
        title="MISSION BOOSTERS"
        variant="warning"
        className="rank-tab__boosters"
      >
        <div className="mission-boosters">
          {missionBoosters.map((msg, idx) => (
            <div key={idx} className="mission-booster">
              <Zap size={16} />
              <span>{msg}</span>
            </div>
          ))}
          {missionBoosters.length === 0 && (
            <div className="mission-booster mission-booster--empty">
              <span className="mono">NENHUMA MISSÃO ESPECIAL ATIVA</span>
            </div>
          )}
        </div>
      </Panel>

      {/* RANKING */}
      <Panel
        title="TOP 10 - MAIOR Δ DO DIA"
        headerRight={<Trophy size={18} />}
        noPadding
      >
        <div className="rank-list">
          {ranking.map((dealer, idx) => (
            <div key={dealer.codigo} className={`rank-item ${getMedalClass(idx)}`}>
              <div className="rank-item__position">
                {idx < 3 ? (
                  <Trophy size={20} />
                ) : (
                  <span className="mono">{idx + 1}</span>
                )}
              </div>
              <div className="rank-item__info">
                <span className="rank-item__code mono">{dealer.codigo}</span>
                <span className="rank-item__name">{dealer.nome}</span>
                <BadgeSegment segment={dealer.segmento} />
              </div>
              <div className="rank-item__metrics">
                <div className="rank-item__total">
                  <span className="rank-item__label">TOTAL CICLO</span>
                  <span className="rank-item__value mono">{formatCurrency(dealer.totalCicloAtual)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* LEGEND */}
      <div className="rank-legend">
        <div className="rank-legend__item">
          <Trophy size={14} className="rank-legend__icon rank-legend__icon--gold" />
          <span>1º Lugar</span>
        </div>
        <div className="rank-legend__item">
          <Trophy size={14} className="rank-legend__icon rank-legend__icon--silver" />
          <span>2º Lugar</span>
        </div>
        <div className="rank-legend__item">
          <Trophy size={14} className="rank-legend__icon rank-legend__icon--bronze" />
          <span>3º Lugar</span>
        </div>
      </div>
    </div>
  )
}
