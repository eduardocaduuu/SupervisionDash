import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, ChevronRight, Target, Rocket } from 'lucide-react'
import BadgeSegment from './BadgeSegment'
import ProgressBar from './ProgressBar'
import AlertChip from './AlertChip'
import './DealerCard.css'

export default function DealerCard({ dealer, onClick, note = '', onSaveNote }) {
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
    deltaDia,
    impulso,
    nearLevelUp,
    atRisk
  } = dealer

  const [localNote, setLocalNote] = useState(note)

  useEffect(() => {
    setLocalNote(note)
  }, [note])

  const handleBlur = () => {
    if (localNote !== note && onSaveNote) {
      onSaveNote(localNote)
    }
  }

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

      {/* NOTES (Cyberpunk Style) */}
      <div className="px-4 pb-4">
        <textarea
          className="w-full bg-slate-900/50 text-emerald-400 placeholder-slate-600 text-xs border border-slate-700 rounded p-2 mt-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none h-20 font-mono"
          placeholder="// Adicionar observação..."
          value={localNote}
          onChange={(e) => setLocalNote(e.target.value)}
          onBlur={handleBlur}
        />
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
