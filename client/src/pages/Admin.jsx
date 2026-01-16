import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, LogOut, Save, CheckCircle, AlertTriangle, FileSpreadsheet, TrendingUp
} from 'lucide-react'
import Panel from '../components/Panel'
import './Admin.css'

export default function Admin() {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState(null)
  const [representatividade, setRepresentatividade] = useState({})

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(data => {
        setConfig(data)
        setRepresentatividade(data.representatividade)
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
          </div>
        </div>
      </main>
    </div>
  )
}
