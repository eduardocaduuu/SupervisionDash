import React from 'react'
import { TrendingUp, TrendingDown, ChevronRight, Target, Rocket, Zap } from 'lucide-react'
import BadgeSegment from './BadgeSegment'
import ProgressBar from './ProgressBar'
import AlertChip from './AlertChip'
import './DealerCard.css'

export default function DealerCard({ dealer, onClick }) {
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
    metaCicloPonderada,
    percentCiclo,
    deltaDia,
    impulso,
    nearLevelUp,
    atRisk
  } = dealer

  const getImpulsoType = () => {
    if (impulso.includes('CRITICAL')) return 'critical'
    if (impulso.includes('WARMING') || impulso.includes('BOOST')) return 'warning'
    if (impulso.includes('SECURE') || impulso.includes('ALMOST')) return 'success'
    if (impulso.includes('LEVEL UP')) return 'info'
    return 'info'
  }

  const formatCurrency = (val) =>
    `R$ ${(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div className={`dealer-card ${atRisk ? 'dealer-card--at-risk' : ''} ${nearLevelUp ? 'dealer-card--level-up' : ''}`}>
      <div className="dealer-card__header">
        <div className="dealer-card__info">
          <span className="dealer-card__code mono">{codigo}</span>
          <h3 className="dealer-card__name">{nome}</h3>
        </div>
        <BadgeSegment segment={segmento} />
      </div>

      <div className="dealer-card__total">
        <span className="dealer-card__total-label">TOTAL 9 CICLOS</span>
        <span className="dealer-card__total-value mono">{formatCurrency(totalGeral)}</span>
      </div>

      <div className="dealer-card__progress">
        <ProgressBar
          label="MANTER"
          value={percentManter}
          variant={atRisk ? 'danger' : 'default'}
        />
        {percentSubir !== null && (
          <ProgressBar
            label="SUBIR"
            value={percentSubir}
            variant="cyan"
          />
        )}
      </div>

      <div className="dealer-card__targets">
        <div className="dealer-card__target">
          <Target size={14} />
          <span>Falta p/ manter:</span>
          <strong className={faltaManter > 0 ? 'text-warning' : 'text-neon'}>
            {formatCurrency(faltaManter)}
          </strong>
        </div>
        {faltaSubir !== null && (
          <div className="dealer-card__target">
            <Rocket size={14} />
            <span>Falta p/ subir:</span>
            <strong className="text-cyan">{formatCurrency(faltaSubir)}</strong>
          </div>
        )}
      </div>

      {/* META CICLO ATUAL */}
      <div className="mx-4 mb-4 p-3 bg-slate-900/80 border border-yellow-500/30 rounded flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-yellow-500 uppercase flex items-center gap-1">
            <Zap size={12} /> META CICLO ATUAL
          </span>
          <span className="font-mono text-xs text-yellow-500 font-bold">
            {formatCurrency(metaCicloPonderada)}
          </span>
        </div>
        
        <ProgressBar 
          label="" 
          value={percentCiclo} 
          variant="warning" 
          showValue={false}
          ticks={0}
        />
        
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span>Atual: {formatCurrency(totalCicloAtual)}</span>
          <span className="text-yellow-500 font-bold">{percentCiclo?.toFixed(1)}%</span>
        </div>
      </div>

      <div className="dealer-card__footer">
        <div className="dealer-card__impulso">
          <AlertChip type={getImpulsoType()}>{impulso}</AlertChip>
        </div>
        <div className={`dealer-card__delta ${deltaDia >= 0 ? 'dealer-card__delta--positive' : 'dealer-card__delta--negative'}`}>
          {deltaDia >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span className="mono">Δ {deltaDia >= 0 ? '+' : ''}{formatCurrency(deltaDia)}</span>
        </div>
      </div>

      <button className="dealer-card__details" onClick={onClick}>
        <span>DETALHES</span>
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
