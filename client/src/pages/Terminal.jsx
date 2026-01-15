import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal as TerminalIcon, Database, ChevronRight, Activity, Shield, Clock } from 'lucide-react'
import './Terminal.css'

export default function Terminal() {
  const navigate = useNavigate()
  const [setores, setSetores] = useState([])
  const [config, setConfig] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const inputRef = useRef(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/setores').then(r => r.json()),
      fetch('/api/config').then(r => r.json())
    ]).then(([setoresData, configData]) => {
      setSetores(setoresData)
      setConfig(configData)
      setIsLoading(false)
    }).catch(console.error)
  }, [])

  const filteredSetores = setores.filter(s =>
    s.nome.toLowerCase().includes(inputValue.toLowerCase()) ||
    s.id.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredSetores.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredSetores[selectedIndex]) {
        handleSelectSetor(filteredSetores[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleSelectSetor = (setor) => {
    navigate(`/dashboard/${setor.id}`)
  }

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    setShowDropdown(true)
    setSelectedIndex(0)
  }

  return (
    <div className="terminal-page">
      {/* DECORATIVE ELEMENTS */}
      <div className="terminal-page__corner terminal-page__corner--tl"></div>
      <div className="terminal-page__corner terminal-page__corner--tr"></div>
      <div className="terminal-page__corner terminal-page__corner--bl"></div>
      <div className="terminal-page__corner terminal-page__corner--br"></div>

      {/* HEADER BAR */}
      <div className="terminal-page__header">
        <div className="terminal-page__header-left">
          <Activity size={14} className="animate-pulse" />
          <span>SYSTEM ONLINE</span>
        </div>
        <div className="terminal-page__header-center">
          <span className="mono">SUPERVISION // SEGMENTS TRACKER v1.0</span>
        </div>
        <div className="terminal-page__header-right">
          <button
            className="terminal-page__admin-btn"
            onClick={() => navigate('/admin/login')}
          >
            <Shield size={14} />
            <span>ADMIN</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="terminal-page__content">
        <div className="terminal-box">
          {/* TITLE */}
          <div className="terminal-box__header">
            <TerminalIcon size={24} />
            <h1>SETOR ACCESS</h1>
          </div>

          {/* INPUT SECTION */}
          <div className="terminal-box__body">
            <div className="terminal-input-group">
              <label className="terminal-label">
                <Database size={14} />
                <span>DATABASE LOOKUP</span>
              </label>
              <div className="terminal-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  className="terminal-input"
                  placeholder="Digite o nome ou código do setor..."
                  value={inputValue}
                  onChange={handleInputChange}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <span className="terminal-input__cursor animate-blink">_</span>
              </div>

              {/* DROPDOWN */}
              {showDropdown && filteredSetores.length > 0 && (
                <div className="terminal-dropdown">
                  <div className="terminal-dropdown__header">
                    <span className="mono">{filteredSetores.length} REGISTROS ENCONTRADOS</span>
                  </div>
                  {filteredSetores.map((setor, idx) => (
                    <div
                      key={setor.id}
                      className={`terminal-dropdown__item ${idx === selectedIndex ? 'terminal-dropdown__item--active' : ''}`}
                      onClick={() => handleSelectSetor(setor)}
                    >
                      <span className="terminal-dropdown__id mono">{setor.id}</span>
                      <span className="terminal-dropdown__name">{setor.nome}</span>
                      <ChevronRight size={14} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ENTER BUTTON */}
            <button
              className="terminal-enter-btn"
              onClick={() => filteredSetores[selectedIndex] && handleSelectSetor(filteredSetores[selectedIndex])}
              disabled={!filteredSetores[selectedIndex]}
            >
              <span>ENTER DASHBOARD</span>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* STATUS PANEL */}
          <div className="terminal-box__footer">
            <div className="terminal-status">
              <div className="terminal-status__item">
                <span className="terminal-status__label">SNAPSHOT ATIVO</span>
                <span className={`terminal-status__value terminal-status__value--${config?.snapshotAtivo}`}>
                  {config?.snapshotAtivo?.toUpperCase() || '---'}
                </span>
              </div>
              <div className="terminal-status__divider"></div>
              <div className="terminal-status__item">
                <span className="terminal-status__label">CICLO ATUAL</span>
                <span className="terminal-status__value terminal-status__value--cycle">
                  {config?.cicloAtual || '---'}
                </span>
              </div>
              <div className="terminal-status__divider"></div>
              <div className="terminal-status__item">
                <span className="terminal-status__label">TOTAL SETORES</span>
                <span className="terminal-status__value">
                  {setores.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* DECORATIVE ASCII */}
        <div className="terminal-ascii">
          <pre>{`
╔═══════════════════════════════════════╗
║  ▄▄▄▄▄ ▄▄▄▄▄ ▄▄▄▄▄ ▄▄▄▄▄ ▄▄▄▄▄ ▄▄▄▄  ║
║  █   █ █   █ █   █ █     █   █ █   █ ║
║  █▄▄▄█ █▄▄▄█ █▄▄▄█ █▄▄▄▄ █▄▄▄█ █▄▄▄█ ║
║                                       ║
║   SEGMENTS TRACKING SYSTEM READY      ║
╚═══════════════════════════════════════╝
          `}</pre>
        </div>
      </div>

      {/* LOADING STATE */}
      {isLoading && (
        <div className="terminal-loading">
          <div className="terminal-loading__spinner"></div>
          <span className="mono">LOADING DATABASE...</span>
        </div>
      )}
    </div>
  )
}
