import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal as TerminalIcon, Key, ChevronRight, Activity, Shield, AlertTriangle, Loader, Info, Clock, RefreshCw, Bell } from 'lucide-react'
import './Terminal.css'

export default function Terminal() {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        setConfig(data)
        setIsLoading(false)
      })
      .catch(console.error)
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    const codigo = inputValue.trim()

    if (!codigo) {
      setError('Digite o codigo do seu setor')
      return
    }

    setError(null)
    setIsValidating(true)

    try {
      // Validar o codigo do setor no backend
      const res = await fetch(`/api/validar-setor/${codigo}`)
      const data = await res.json()

      if (res.ok && data.valid) {
        // Codigo valido - redirecionar para o dashboard
        navigate(`/dashboard/${codigo}`)
      } else {
        // Codigo invalido
        setError(data.error || 'Codigo de setor invalido. Verifique e tente novamente.')
      }
    } catch (err) {
      setError('Erro ao validar codigo. Tente novamente.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '') // Apenas numeros
    setInputValue(value)
    setError(null)
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
          <span>SISTEMA ATIVO</span>
        </div>
        <div className="terminal-page__header-center">
          <span className="mono">SUPERVISAO // RASTREADOR DE SEGMENTOS v1.0</span>
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
            <h1>ACESSO SUPERVISORA</h1>
          </div>

          {/* INPUT SECTION */}
          <div className="terminal-box__body">
            <div className="terminal-input-group">
              <label className="terminal-label">
                <Key size={14} />
                <span>CODIGO DO SETOR</span>
              </label>
              <div className="terminal-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  className={`terminal-input ${error ? 'terminal-input--error' : ''}`}
                  placeholder="Digite o codigo do seu setor..."
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  maxLength={10}
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
            </div>

            {/* ENTER BUTTON */}
            <button
              className="terminal-enter-btn"
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isValidating}
            >
              {isValidating ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  <span>VALIDANDO...</span>
                </>
              ) : (
                <>
                  <span>ENTRAR</span>
                  <ChevronRight size={20} />
                </>
              )}
            </button>

            {/* HELP TEXT */}
            <div className="terminal-help">
              <span className="mono text-muted">
                Informe o codigo de estrutura comercial do seu setor para acessar o dashboard.
              </span>
            </div>
          </div>

          {/* STATUS PANEL */}
          <div className="terminal-box__footer">
            <div className="terminal-status">
              <div className="terminal-status__item">
                <span className="terminal-status__label">CICLO ATUAL</span>
                <span className="terminal-status__value terminal-status__value--cycle">
                  {config?.cicloAtual || '---'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* INFO CARD */}
        <div className="terminal-info-card">
          <div className="terminal-info-card__header">
            <Info size={18} />
            <span>Informações Importantes</span>
          </div>
          <div className="terminal-info-card__body">
            <div className="terminal-info-card__item">
              <Clock size={16} className="terminal-info-card__icon" />
              <div>
                <strong>Atualização de Dados</strong>
                <p>Esta plataforma é atualizada automaticamente com os dados de vendas <strong>3 vezes ao dia</strong>: 08:30, 14:30 e 17:00.</p>
              </div>
            </div>
            <div className="terminal-info-card__item">
              <RefreshCw size={16} className="terminal-info-card__icon" />
              <div>
                <strong>Segmentações</strong>
                <p>As segmentações dos revendedores são atualizadas no <strong>segundo dia útil</strong> de cada novo ciclo, conforme os resultados consolidados.</p>
              </div>
            </div>
            <div className="terminal-info-card__item">
              <Bell size={16} className="terminal-info-card__icon" />
              <div>
                <strong>Alertas Slack</strong>
                <p>O bot de alertas envia notificações <strong>todos os dias</strong>, nos horários: 09:00 e 16:30.</p>
              </div>
            </div>
          </div>
          <div className="terminal-info-card__footer">
            <span>Essas informações servem como apoio à gestão e acompanhamento das metas de cada base.</span>
          </div>
        </div>

        {/* DECORATIVE ASCII */}
        <div className="terminal-ascii">
          <pre>{`
+-----------------------------------------------+
|  ███████╗██╗   ██╗██████╗ ███████╗██████╗     |
|  ██╔════╝██║   ██║██╔══██╗██╔════╝██╔══██╗    |
|  ███████╗██║   ██║██████╔╝█████╗  ██████╔╝    |
|  ╚════██║██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗    |
|  ███████║╚██████╔╝██║     ███████╗██║  ██║    |
|  ╚══════╝ ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝    |
|                                               |
|    SISTEMA DE RASTREAMENTO DE SEGMENTOS       |
+-----------------------------------------------+
          `}</pre>
        </div>
      </div>

      {/* LOADING STATE */}
      {isLoading && (
        <div className="terminal-loading">
          <div className="terminal-loading__spinner"></div>
          <span className="mono">INICIANDO SISTEMA...</span>
        </div>
      )}
    </div>
  )
}
