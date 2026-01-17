import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Clock, LogOut, Shield } from 'lucide-react'
import './HUDHeader.css'

export default function HUDHeader({ setor, cicloAtual }) {
  const navigate = useNavigate()

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
          <span className="hud-header__back-text">EXIT</span>
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
          <span>ONLINE</span>
        </div>
      </div>

      <div className="hud-header__right">
        <div className="hud-header__badge hud-header__badge--cycle">
          <Clock size={14} />
          <span className="hud-header__badge-label">CICLO</span>
          <span className="hud-header__badge-value mono">{cicloAtual}</span>
        </div>

        <div className="hud-header__badge hud-header__badge--time">
          <span className="hud-header__badge-value mono animate-blink">{timestamp}</span>
        </div>

        <button
          className="hud-header__admin-btn"
          onClick={() => navigate('/admin/login')}
          title="Admin"
        >
          <Shield size={18} />
        </button>
      </div>
    </header>
  )
}
