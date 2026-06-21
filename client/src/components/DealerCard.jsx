import React, { useState } from 'react'
import { ChevronRight, Target, Rocket, Zap, StickyNote, X, Check, Edit3, Phone, MessageCircle, FileText, TrendingDown, TrendingUp, ShieldCheck, Hourglass } from 'lucide-react'
import BadgeSegment from './BadgeSegment'
import ProgressBar from './ProgressBar'
import AlertChip from './AlertChip'
import './DealerCard.css'

export default function DealerCard({ dealer, onClick, note, onSaveNote, dealerData, onSaveMeta, onAddAcao, ciclosJanela }) {
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(note || '')
  const [isEditingMeta, setIsEditingMeta] = useState(false)
  const [metaValue, setMetaValue] = useState(dealerData?.meta || '')
  const {
    codigo,
    nome,
    segmento,
    ciclos,
    totalGeral,
    totalCicloAtual,
    faltaManter,
    faltaSubir,
    percentManter,
    percentSubir,
    metaCicloPonderada,
    percentCiclo,
    impulso,
    nearLevelUp,
    atRisk,
    mantem,
    cairiaPara,
    subiriaPara
  } = dealer

  const getImpulsoType = () => {
    // Quando o Dashboard já calculou o tipo, usa direto (cores corretas no AlertChip)
    if (dealer.statusType) return dealer.statusType
    // Fallback: mapeia os rótulos em português usados pela aplicação
    const s = (impulso || '').toUpperCase()
    if (s.includes('CRÍTICO') || s.includes('CRITICO') || s.includes('ACELERAR')) return 'critical'
    if (s.includes('AQUECENDO')) return 'warning'
    if (s.includes('CAMINHO')) return 'track'
    if (s.includes('QUASE')) return 'almost'
    if (s.includes('SUBIR') || s.includes('LEVEL')) return 'levelup'
    if (s.includes('MISSÃO') || s.includes('MISSAO') || s.includes('CUMPRIDA')) return 'success'
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

  // Meta handlers
  const handleSaveMeta = (e) => {
    e.stopPropagation()
    const valor = parseFloat(metaValue) || null
    if (onSaveMeta) {
      onSaveMeta(valor)
    }
    setIsEditingMeta(false)
  }

  const handleCancelMeta = (e) => {
    e.stopPropagation()
    setMetaValue(dealerData?.meta || '')
    setIsEditingMeta(false)
  }

  // Acao handler
  const handleAcao = (e, tipo) => {
    e.stopPropagation()
    if (onAddAcao) {
      onAddAcao(tipo)
    }
  }

  // Formatar tempo relativo
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return 'ontem'
    if (diffDays < 7) return `${diffDays}d`
    return `${Math.floor(diffDays / 7)}sem`
  }

  // Pegar última ação de cada tipo
  const getUltimaAcao = (tipo) => {
    const acoes = dealerData?.acoes || []
    const acao = acoes.find(a => a.tipo === tipo)
    return acao ? formatTimeAgo(acao.data) : null
  }

  // Calcular progresso da meta pessoal
  const metaPessoal = dealerData?.meta
  const metaProgress = metaPessoal ? Math.min(100, (totalCicloAtual / metaPessoal) * 100) : 0

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

      {/* TRILHA: ciclos em que houve compra */}
      {Array.isArray(ciclosJanela) && ciclosJanela.length > 0 && (
        <div className="dealer-card__cycles">
          <span className="dealer-card__cycles-label">COMPROU NOS CICLOS</span>
          <div className="dealer-card__cycles-strip">
            {ciclosJanela.map(c => {
              const bought = (ciclos?.[c] || 0) > 0
              return (
                <span
                  key={c}
                  className={`dealer-card__cycle ${bought ? 'dealer-card__cycle--on' : ''}`}
                  title={`Ciclo ${c}${bought ? ` — ${formatCurrency(ciclos[c])}` : ' — sem compra'}`}
                >
                  {parseInt(c, 10)}
                </span>
              )
            })}
          </div>
        </div>
      )}

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
            {cairiaPara === 'Cobre' ? 'qualquer pedido' : formatCurrency(faltaManter)}
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

      {/* META PESSOAL */}
      <div className="dealer-card__meta">
        <div className="dealer-card__meta-header">
          <span className="dealer-card__meta-label">
            <Target size={12} /> META PESSOAL
          </span>
          {!isEditingMeta && (
            <button
              className="dealer-card__meta-edit-btn"
              onClick={(e) => { e.stopPropagation(); setIsEditingMeta(true); }}
            >
              <Edit3 size={10} />
            </button>
          )}
        </div>

        {isEditingMeta ? (
          <div className="dealer-card__meta-editor">
            <div className="dealer-card__meta-input-wrapper">
              <span>R$</span>
              <input
                type="number"
                className="dealer-card__meta-input"
                value={metaValue}
                onChange={(e) => setMetaValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="0,00"
                autoFocus
              />
            </div>
            <div className="dealer-card__meta-actions">
              <button className="dealer-card__meta-btn dealer-card__meta-btn--save" onClick={handleSaveMeta}>
                <Check size={12} />
              </button>
              <button className="dealer-card__meta-btn dealer-card__meta-btn--cancel" onClick={handleCancelMeta}>
                <X size={12} />
              </button>
            </div>
          </div>
        ) : metaPessoal ? (
          <div className="dealer-card__meta-display">
            <div className="dealer-card__meta-progress">
              <div
                className="dealer-card__meta-progress-bar"
                style={{ width: `${metaProgress}%` }}
              />
            </div>
            <div className="dealer-card__meta-values">
              <span>{formatCurrency(totalCicloAtual)} / {formatCurrency(metaPessoal)}</span>
              <span className="dealer-card__meta-percent">{metaProgress.toFixed(0)}%</span>
            </div>
          </div>
        ) : (
          <button
            className="dealer-card__meta-add"
            onClick={(e) => { e.stopPropagation(); setIsEditingMeta(true); }}
          >
            Definir meta
          </button>
        )}
      </div>

      {/* CHECKLIST DE AÇÕES */}
      <div className="dealer-card__acoes">
        <div className="dealer-card__acoes-btns">
          <button
            className={`dealer-card__acao-btn ${getUltimaAcao('ligou') ? 'dealer-card__acao-btn--done' : ''}`}
            onClick={(e) => handleAcao(e, 'ligou')}
            title={getUltimaAcao('ligou') ? `Ligou há ${getUltimaAcao('ligou')}` : 'Registrar ligação'}
          >
            <Phone size={14} />
            <span>Ligou</span>
            {getUltimaAcao('ligou') && <small>{getUltimaAcao('ligou')}</small>}
          </button>
          <button
            className={`dealer-card__acao-btn ${getUltimaAcao('whatsapp') ? 'dealer-card__acao-btn--done' : ''}`}
            onClick={(e) => handleAcao(e, 'whatsapp')}
            title={getUltimaAcao('whatsapp') ? `WhatsApp há ${getUltimaAcao('whatsapp')}` : 'Registrar WhatsApp'}
          >
            <MessageCircle size={14} />
            <span>WhatsApp</span>
            {getUltimaAcao('whatsapp') && <small>{getUltimaAcao('whatsapp')}</small>}
          </button>
          <button
            className={`dealer-card__acao-btn ${getUltimaAcao('catalogo') ? 'dealer-card__acao-btn--done' : ''}`}
            onClick={(e) => handleAcao(e, 'catalogo')}
            title={getUltimaAcao('catalogo') ? `Catálogo há ${getUltimaAcao('catalogo')}` : 'Registrar envio de catálogo'}
          >
            <FileText size={14} />
            <span>Catálogo</span>
            {getUltimaAcao('catalogo') && <small>{getUltimaAcao('catalogo')}</small>}
          </button>
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

      {/* PREVISÃO NA VIRADA (sobe a qualquer hora; cai só nas viradas 9→10 e 17→1) */}
      {cairiaPara ? (
        <div className="dealer-card__forecast dealer-card__forecast--down">
          <TrendingDown size={14} />
          {cairiaPara === 'Cobre' ? (
            <span>Sem compras: <strong>vira Cobre</strong> na virada — <strong>qualquer pedido</strong> mantém {segmento}</span>
          ) : (
            <span>Se a virada fosse hoje, <strong>cai para {cairiaPara}</strong> — falta {formatCurrency(faltaManter)} p/ manter {segmento}</span>
          )}
        </div>
      ) : subiriaPara ? (
        <div className="dealer-card__forecast dealer-card__forecast--up">
          <TrendingUp size={14} />
          <span><strong>Já subiu para {subiriaPara}!</strong> Acúmulo garante o novo nível</span>
        </div>
      ) : mantem ? (
        <div className="dealer-card__forecast dealer-card__forecast--keep">
          <ShieldCheck size={14} />
          <span><strong>Mantém {segmento}</strong> na virada{faltaSubir != null ? ` — falta ${formatCurrency(faltaSubir)} p/ subir` : ''}</span>
        </div>
      ) : (
        <div className="dealer-card__forecast dealer-card__forecast--building">
          <Hourglass size={14} />
          <span><strong>Janela em construção</strong> — {faltaManter < 1 ? `qualquer pedido mantém ${segmento}` : `falta ${formatCurrency(faltaManter)} p/ manter ${segmento}`}</span>
        </div>
      )}

      <div className="dealer-card__footer">
        <div className="dealer-card__impulso">
          <AlertChip type={getImpulsoType()}>{impulso}</AlertChip>
        </div>
      </div>

      <button className="dealer-card__details" onClick={onClick}>
        <span>DETALHES</span>
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
