import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, LogOut, Save, CheckCircle, AlertTriangle, FileSpreadsheet, TrendingUp,
  Gift, Trash2, Send, MessageSquare
} from 'lucide-react'
import Panel from '../components/Panel'
import './Admin.css'

export default function Admin() {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState(null)
  const [representatividade, setRepresentatividade] = useState({})

  // Mensagem de recompensa
  const [mensagemTitulo, setMensagemTitulo] = useState('')
  const [mensagemTexto, setMensagemTexto] = useState('')
  const [mensagemStatus, setMensagemStatus] = useState(null)

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(data => {
        setConfig(data)
        setRepresentatividade(data.representatividade)
        // Carregar mensagem existente
        if (data.mensagemRecompensa) {
          setMensagemTitulo(data.mensagemRecompensa.titulo || '')
          setMensagemTexto(data.mensagemRecompensa.texto || '')
        }
        setIsLoading(false)
      })
      .catch(err => {
        console.error(err)
        navigate('/admin/login')
      })
  }, [navigate])

  const handleCicloChange = async (ciclo) => {
    try {
      await fetch('/api/admin/ciclo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo })
      })
      setConfig(prev => ({ ...prev, cicloAtual: ciclo }))
    } catch (err) {
      console.error(err)
    }
  }

  const handleRepresentatividadeChange = (ciclo, value) => {
    const numValue = Math.min(100, Math.max(0, parseInt(value) || 0))
    setRepresentatividade(prev => ({ ...prev, [ciclo]: numValue }))
  }

  const handleSaveRepresentatividade = async () => {
    setSaveStatus('loading')

    try {
      const res = await fetch('/api/admin/representatividade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ representatividade })
      })

      if (res.ok) {
        setSaveStatus('success')
        const configRes = await fetch('/api/admin/config')
        const configData = await configRes.json()
        setConfig(configData)
      } else {
        setSaveStatus('error')
      }
    } catch (err) {
      setSaveStatus('error')
    }

    setTimeout(() => setSaveStatus(null), 3000)
  }

  // Salvar mensagem de recompensa
  const handleSaveMensagem = async () => {
    if (!mensagemTexto.trim()) return

    setMensagemStatus('loading')

    try {
      const res = await fetch('/api/admin/mensagem-recompensa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: mensagemTitulo || 'Nova Meta!',
          texto: mensagemTexto
        })
      })

      if (res.ok) {
        setMensagemStatus('success')
        const configRes = await fetch('/api/admin/config')
        const configData = await configRes.json()
        setConfig(configData)
      } else {
        setMensagemStatus('error')
      }
    } catch (err) {
      setMensagemStatus('error')
    }

    setTimeout(() => setMensagemStatus(null), 3000)
  }

  // Remover mensagem de recompensa
  const handleRemoveMensagem = async () => {
    setMensagemStatus('loading')

    try {
      const res = await fetch('/api/admin/mensagem-recompensa', {
        method: 'DELETE'
      })

      if (res.ok) {
        setMensagemTitulo('')
        setMensagemTexto('')
        setConfig(prev => ({ ...prev, mensagemRecompensa: null }))
        setMensagemStatus('removed')
      } else {
        setMensagemStatus('error')
      }
    } catch (err) {
      setMensagemStatus('error')
    }

    setTimeout(() => setMensagemStatus(null), 3000)
  }

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading__spinner"></div>
        <span className="mono">CARREGANDO PAINEL ADMIN...</span>
      </div>
    )
  }

  const ciclos = Object.keys(representatividade)

  return (
    <div className="admin">
      {/* HEADER */}
      <header className="admin__header">
        <div className="admin__header-left">
          <Shield size={24} />
          <div>
            <h1>PAINEL ADMINISTRATIVO</h1>
            <span className="mono text-muted">Configuração do Sistema</span>
          </div>
        </div>
        <button className="admin__logout" onClick={() => navigate('/')}>
          <LogOut size={18} />
          <span>SAIR</span>
        </button>
      </header>

      <main className="admin__content">
        <div className="container">
          <div className="admin__grid admin__grid--simple">
            {/* CICLO ATUAL */}
            <Panel title="CICLO ATUAL" variant="cyan" className="admin__config">
              <div className="config-section">
                <p className="config-hint">
                  Selecione o ciclo atual para calcular as metas ponderadas de todas as supervisoras.
                </p>
                <div className="ciclo-select-wrapper">
                  <FileSpreadsheet size={20} />
                  <select
                    className="config-select config-select--large"
                    value={config.cicloAtual}
                    onChange={(e) => handleCicloChange(e.target.value)}
                  >
                    {ciclos.map(ciclo => (
                      <option key={ciclo} value={ciclo}>{ciclo}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Panel>

            {/* REPRESENTATIVIDADE */}
            <Panel
              title="REPRESENTATIVIDADE POR CICLO"
              variant="pink"
              className="admin__repr"
              headerRight={
                <button
                  className={`btn btn--sm ${saveStatus === 'success' ? 'btn--secondary' : saveStatus === 'error' ? 'btn--danger' : ''}`}
                  onClick={handleSaveRepresentatividade}
                  disabled={saveStatus === 'loading'}
                >
                  {saveStatus === 'loading' ? (
                    <span>SALVANDO...</span>
                  ) : saveStatus === 'success' ? (
                    <>
                      <CheckCircle size={14} />
                      <span>SALVO</span>
                    </>
                  ) : saveStatus === 'error' ? (
                    <>
                      <AlertTriangle size={14} />
                      <span>ERRO</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>SALVAR CONFIG</span>
                    </>
                  )}
                </button>
              }
            >
              <div className="repr-grid">
                {ciclos.map(ciclo => (
                  <div key={ciclo} className="repr-item">
                    <label className="repr-item__label">{ciclo}</label>
                    <div className="repr-item__input-wrapper">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="repr-item__input"
                        value={representatividade[ciclo]}
                        onChange={(e) => handleRepresentatividadeChange(ciclo, e.target.value)}
                      />
                      <span className="repr-item__suffix">%</span>
                    </div>
                    <div
                      className="repr-item__bar"
                      style={{ width: `${representatividade[ciclo]}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="repr-help">
                <TrendingUp size={16} />
                <p>
                  <strong>Ajuste as metas em tempo real!</strong> Ao alterar a % do ciclo atual,
                  a meta ponderada muda automaticamente para todas as supervisoras.
                </p>
              </div>
            </Panel>

            {/* MENSAGEM DE RECOMPENSA */}
            <Panel
              title="MENSAGEM DE RECOMPENSA"
              variant="warning"
              className="admin__mensagem"
              headerRight={
                config.mensagemRecompensa?.ativa && (
                  <span className="mensagem-ativa-badge">
                    <CheckCircle size={12} />
                    ATIVA
                  </span>
                )
              }
            >
              <div className="mensagem-form">
                <div className="mensagem-form__field">
                  <label>
                    <Gift size={16} />
                    Título da Mensagem
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Nova Meta Especial!"
                    value={mensagemTitulo}
                    onChange={(e) => setMensagemTitulo(e.target.value)}
                    className="mensagem-input"
                  />
                </div>

                <div className="mensagem-form__field">
                  <label>
                    <MessageSquare size={16} />
                    Mensagem para as Supervisoras
                  </label>
                  <textarea
                    placeholder="Ex: Quem atingir a nova meta de 12% ganha um brinde especial! Vamos juntas!"
                    value={mensagemTexto}
                    onChange={(e) => setMensagemTexto(e.target.value)}
                    className="mensagem-textarea"
                    rows={4}
                  />
                </div>

                <div className="mensagem-form__actions">
                  <button
                    className={`btn ${mensagemStatus === 'success' ? 'btn--secondary' : ''}`}
                    onClick={handleSaveMensagem}
                    disabled={!mensagemTexto.trim() || mensagemStatus === 'loading'}
                  >
                    {mensagemStatus === 'loading' ? (
                      <span>ENVIANDO...</span>
                    ) : mensagemStatus === 'success' ? (
                      <>
                        <CheckCircle size={14} />
                        <span>MENSAGEM ATIVA!</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>ATIVAR MENSAGEM</span>
                      </>
                    )}
                  </button>

                  {config.mensagemRecompensa?.ativa && (
                    <button
                      className="btn btn--danger"
                      onClick={handleRemoveMensagem}
                      disabled={mensagemStatus === 'loading'}
                    >
                      <Trash2 size={14} />
                      <span>REMOVER</span>
                    </button>
                  )}
                </div>

                {mensagemStatus === 'removed' && (
                  <p className="mensagem-feedback mensagem-feedback--removed">
                    Mensagem removida com sucesso!
                  </p>
                )}

                <div className="mensagem-info">
                  <p>
                    Esta mensagem aparecerá para <strong>todas as supervisoras</strong> assim que
                    entrarem no dashboard. Ela ficará visível até você remover.
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  )
}
