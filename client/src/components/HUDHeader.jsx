import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Clock, Eye, EyeOff, Scan, LogOut, Shield } from 'lucide-react'
import { EffectsContext } from '../App'
import './HUDHeader.css'

export default function HUDHeader({ setor, cicloAtual, snapshotAtivo }) {
  const navigate = useNavigate()
  const { reduceEffects, setReduceEffects, scanlines, setScanlines } = useContext(EffectsContext)

  const timestamp = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  return (
    <header className="hud-header">
      <div className="hud-header__left">
        <button className="hud-header__back" onClick={() => navigate('/')}>
          <LogOut size={18} />
          <span>EXIT</span>
        </button>
        <div className="hud-header__title">
          <span className="hud-header__label">SETOR</span>
          <h1 className="hud-header__name">{setor?.nome || 'LOADING...'}</h1>
          <span className="hud-header__id mono">{setor?.id}</span>
        </div>
      </div>

      <div className="hud-header__center">
        <div className="hud-header__status">
          <Activity size={14} className="animate-pulse" />
          <span>SYSTEM OK</span>
        </div>
      </div>

      <div className="hud-header__right">
        <div className="hud-header__badge hud-header__badge--cycle">
          <Clock size={14} />
          <span className="hud-header__badge-label">CICLO</span>
          <span className="hud-header__badge-value mono">{cicloAtual}</span>
        </div>

        <div className={`hud-header__badge hud-header__badge--snapshot ${snapshotAtivo === 'tarde' ? 'hud-header__badge--tarde' : ''}`}>
          <span className="hud-header__badge-label">SNAPSHOT</span>
          <span className="hud-header__badge-value mono">{snapshotAtivo?.toUpperCase()}</span>
        </div>

        <div className="hud-header__badge hud-header__badge--time">
          <span className="hud-header__badge-value mono animate-blink">{timestamp}</span>
        </div>

        <div className="hud-header__controls">
          <button
            className={`hud-header__toggle ${scanlines ? 'active' : ''}`}
            onClick={() => setScanlines(!scanlines)}
            title="Toggle Scanlines"
          >
            <Scan size={16} />
          </button>
          <button
            className={`hud-header__toggle ${reduceEffects ? 'active' : ''}`}
            onClick={() => setReduceEffects(!reduceEffects)}
            title="Reduce Effects"
          >
            {reduceEffects ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            className="hud-header__toggle"
            onClick={() => navigate('/admin/login')}
            title="Admin"
          >
            <Shield size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
