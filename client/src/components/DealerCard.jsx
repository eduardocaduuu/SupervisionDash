import React, { useState } from 'react'
import { TrendingUp, TrendingDown, ChevronRight, Target, Rocket, Zap, StickyNote, X, Check, Edit3 } from 'lucide-react'
import BadgeSegment from './BadgeSegment'
import ProgressBar from './ProgressBar'
import AlertChip from './AlertChip'
import './DealerCard.css'

export default function DealerCard({ dealer, onClick, note, onSaveNote }) {
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(note || '')
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

  const handleSaveNote = (e) => {
    e.stopPropagation()
    if (onSaveNote) {
      onSaveNote(noteText)
    }
    setIsEditingNote(false)
  }

  const handleCancelNote = (e) => {
    e.stopPropagation()
    setNoteText(note || '')
    setIsEditingNote(false)
  }

  const handleOpenNote = (e) => {
    e.stopPropagation()
    setNoteText(note || '')
    setIsEditingNote(true)
  }

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

      {/* OBSERVAÇÕES (POST-IT) */}
      <div className="dealer-card__note">
        {isEditingNote ? (
          <div className="dealer-card__note-editor">
            <textarea
              className="dealer-card__note-textarea"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Digite sua observação..."
              onClick={(e) => e.stopPropagation()}
              autoFocus
              maxLength={200}
            />
            <div className="dealer-card__note-actions">
              <button
                className="dealer-card__note-btn dealer-card__note-btn--save"
                onClick={handleSaveNote}
                title="Salvar"
              >
                <Check size={14} />
              </button>
              <button
                className="dealer-card__note-btn dealer-card__note-btn--cancel"
                onClick={handleCancelNote}
                title="Cancelar"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : note ? (
          <div className="dealer-card__note-display" onClick={handleOpenNote}>
            <StickyNote size={12} className="dealer-card__note-icon" />
            <span className="dealer-card__note-text">{note}</span>
            <Edit3 size={12} className="dealer-card__note-edit" />
          </div>
        ) : (
          <button
            className="dealer-card__note-add"
            onClick={handleOpenNote}
          >
            <StickyNote size={12} />
            <span>Adicionar observação</span>
          </button>
        )}
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
