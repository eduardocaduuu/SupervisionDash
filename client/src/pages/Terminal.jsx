import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal as TerminalIcon, Database, ChevronRight, Activity, Shield, AlertTriangle } from 'lucide-react'
import './Terminal.css'

// Códigos de gerência bloqueados
const GERENCIAS_BLOQUEADAS = ['13706', '13707']

export default function Terminal() {
  const navigate = useNavigate()
  const [setores, setSetores] = useState([])
  const [config, setConfig] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
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

  // Verificar se é código de gerência
  const isGerencia = (value) => {
    return GERENCIAS_BLOQUEADAS.includes(value.trim())
  }

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
      handleSubmit()
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleSelectSetor = (setor) => {
    setError(null)
    navigate(`/dashboard/${setor.id}`)
  }

  const handleSubmit = () => {
    setError(null)

    // Verificar se é código de gerência
    if (isGerencia(inputValue)) {
      setError('Código inválido. Informe o código do setor (ex: 19698). Códigos de gerência (13706, 13707) não são permitidos.')
      return
    }

    // Se tem seleção no dropdown, usar ela
    if (filteredSetores[selectedIndex]) {
      handleSelectSetor(filteredSetores[selectedIndex])
      return
    }

    // Tentar buscar pelo valor digitado diretamente
    const setor = setores.find(s => s.id === inputValue.trim())
    if (setor) {
      handleSelectSetor(setor)
    } else {
      setError('Setor não encontrado. Verifique o código informado.')
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setInputValue(value)
    setShowDropdown(true)
    setSelectedIndex(0)
    setError(null)

    // Verificar gerência em tempo real
    if (isGerencia(value)) {
      setError('Código inválido. Informe o código do setor (ex: 19698). Códigos de gerência (13706, 13707) não são permitidos.')
    }
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
                  className={`terminal-input ${error ? 'terminal-input--error' : ''}`}
                  placeholder="Digite o código do setor (ex: 19698)..."
                  value={inputValue}
                  onChange={handleInputChange}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <span className="terminal-input__cursor animate-blink">_</span>
              </div>

              {/* ERROR MESSAGE */}
              {error && (
                <div className="terminal-error">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* DROPDOWN */}
              {showDropdown && filteredSetores.length > 0 && !error && (
                <div className="terminal-dropdown">
                  <div className="terminal-dropdown__header">
                    <span className="mono">{filteredSetores.length} REGISTROS ENCONTRADOS</span>
                  </div>
                  {filteredSetores.slice(0, 10).map((setor, idx) => (
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
                  {filteredSetores.length > 10 && (
                    <div className="terminal-dropdown__more">
                      <span className="mono">+ {filteredSetores.length - 10} mais resultados...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ENTER BUTTON */}
            <button
              className="terminal-enter-btn"
              onClick={handleSubmit}
              disabled={!inputValue.trim() || !!error}
            >
              <span>ENTER DASHBOARD</span>
              <ChevronRight size={20} />
            </button>

            {/* HELP TEXT */}
            <div className="terminal-help">
              <span className="mono text-muted">
                Informe o código do setor (primeiro número). Ex: 19698, 1260, 4005
              </span>
            </div>
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
