import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'
import {
  Shield, LogOut, Upload, Clock, Settings, Save,
  CheckCircle, AlertTriangle, Sun, Moon, FileSpreadsheet
} from 'lucide-react'
import Panel from '../components/Panel'
import './Admin.css'
import { SalesFileParser } from '../utils/SalesFileParser'

export default function Admin() {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadStatus, setUploadStatus] = useState({ manha: null, tarde: null })
  const [saveStatus, setSaveStatus] = useState(null)
  const [representatividade, setRepresentatividade] = useState({})
  const fileInputManha = useRef(null)
  const fileInputTarde = useRef(null)

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

  const handleFileUpload = async (snapshot, file) => {
    if (!file) return

    setUploadStatus(prev => ({ ...prev, [snapshot]: 'loading' }))

    try {
      // 1. Parse Universal (Excel ou CSV) -> JSON Normalizado
      const normalizedData = await SalesFileParser.parse(file)

      // 2. Converter JSON para CSV Padrão (para manter compatibilidade com Backend)
      const worksheet = XLSX.utils.json_to_sheet(normalizedData)
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' }) // Força separador ;
      
      // 3. Criar Blob para envio
      const blob = new Blob([csvOutput], { type: 'text/csv' })
      const cleanFile = new File([blob], `snapshot_${snapshot}.csv`, { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', cleanFile)

      const res = await fetch(`/api/admin/upload?snapshot=${snapshot}`, {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        setUploadStatus(prev => ({ ...prev, [snapshot]: 'success' }))
        // Refresh config
        const configRes = await fetch('/api/admin/config')
        const configData = await configRes.json()
        setConfig(configData)
      } else {
        setUploadStatus(prev => ({ ...prev, [snapshot]: 'error' }))
      }
    } catch (err) {
      setUploadStatus(prev => ({ ...prev, [snapshot]: 'error' }))
    }

    setTimeout(() => {
      setUploadStatus(prev => ({ ...prev, [snapshot]: null }))
    }, 3000)
  }

  const handleSnapshotChange = async (snapshot) => {
    try {
      await fetch('/api/admin/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot })
      })
      setConfig(prev => ({ ...prev, snapshotAtivo: snapshot }))
    } catch (err) {
      console.error(err)
    }
  }

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
        <span className="mono">LOADING ADMIN PANEL...</span>
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
            <h1>ADMIN PANEL</h1>
            <span className="mono text-muted">System Configuration</span>
          </div>
        </div>
        <button className="admin__logout" onClick={() => navigate('/')}>
          <LogOut size={18} />
          <span>EXIT ADMIN</span>
        </button>
      </header>

      <main className="admin__content">
        <div className="container">
          <div className="admin__grid">
            {/* UPLOAD SECTION */}
            <Panel title="CSV UPLOAD" variant="cyan" className="admin__upload">
              <div className="upload-grid">
                {/* MANHÃ */}
                <div className="upload-box">
                  <div className="upload-box__header">
                    <Sun size={20} />
                    <span>SNAPSHOT MANHÃ</span>
                  </div>
                  <div
                    className={`dropzone ${uploadStatus.manha === 'loading' ? 'dropzone--loading' : ''}`}
                    onClick={() => fileInputManha.current?.click()}
                  >
                    {uploadStatus.manha === 'success' ? (
                      <CheckCircle size={32} className="text-neon" />
                    ) : uploadStatus.manha === 'error' ? (
                      <AlertTriangle size={32} className="text-danger" />
                    ) : uploadStatus.manha === 'loading' ? (
                      <div className="dropzone__spinner"></div>
                    ) : (
                      <Upload size={32} className="dropzone__icon" />
                    )}
                    <span className="dropzone__text">
                      {uploadStatus.manha === 'success' ? 'UPLOAD CONCLUÍDO' :
                       uploadStatus.manha === 'error' ? 'ERRO NO UPLOAD' :
                       uploadStatus.manha === 'loading' ? 'UPLOADING...' :
                       'Clique ou arraste CSV'}
                    </span>
                    {config.uploads?.manha && (
                      <span className="dropzone__hint">
                        Último: {new Date(config.uploads.manha.timestamp).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <input
                    ref={fileInputManha}
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    hidden
                    onChange={(e) => handleFileUpload('manha', e.target.files[0])}
                  />
                </div>

                {/* TARDE */}
                <div className="upload-box">
                  <div className="upload-box__header">
                    <Moon size={20} />
                    <span>SNAPSHOT TARDE</span>
                  </div>
                  <div
                    className={`dropzone ${uploadStatus.tarde === 'loading' ? 'dropzone--loading' : ''}`}
                    onClick={() => fileInputTarde.current?.click()}
                  >
                    {uploadStatus.tarde === 'success' ? (
                      <CheckCircle size={32} className="text-neon" />
                    ) : uploadStatus.tarde === 'error' ? (
                      <AlertTriangle size={32} className="text-danger" />
                    ) : uploadStatus.tarde === 'loading' ? (
                      <div className="dropzone__spinner"></div>
                    ) : (
                      <Upload size={32} className="dropzone__icon" />
                    )}
                    <span className="dropzone__text">
                      {uploadStatus.tarde === 'success' ? 'UPLOAD CONCLUÍDO' :
                       uploadStatus.tarde === 'error' ? 'ERRO NO UPLOAD' :
                       uploadStatus.tarde === 'loading' ? 'UPLOADING...' :
                       'Clique ou arraste CSV'}
                    </span>
                    {config.uploads?.tarde && (
                      <span className="dropzone__hint">
                        Último: {new Date(config.uploads.tarde.timestamp).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <input
                    ref={fileInputTarde}
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    hidden
                    onChange={(e) => handleFileUpload('tarde', e.target.files[0])}
                  />
                </div>
              </div>
            </Panel>

            {/* SNAPSHOT & CICLO */}
            <Panel title="SYSTEM CONFIG" variant="default" className="admin__config">
              {/* SNAPSHOT TOGGLE */}
              <div className="config-section">
                <h3 className="config-section__title">
                  <Clock size={16} />
                  SNAPSHOT ATIVO
                </h3>
                <div className="snapshot-toggle">
                  <button
                    className={`snapshot-toggle__btn ${config.snapshotAtivo === 'manha' ? 'active' : ''}`}
                    onClick={() => handleSnapshotChange('manha')}
                  >
                    <Sun size={18} />
                    <span>MANHÃ</span>
                  </button>
                  <button
                    className={`snapshot-toggle__btn ${config.snapshotAtivo === 'tarde' ? 'active' : ''}`}
                    onClick={() => handleSnapshotChange('tarde')}
                  >
                    <Moon size={18} />
                    <span>TARDE</span>
                  </button>
                </div>
              </div>

              {/* CICLO SELECT */}
              <div className="config-section">
                <h3 className="config-section__title">
                  <FileSpreadsheet size={16} />
                  CICLO ATUAL
                </h3>
                <select
                  className="config-select"
                  value={config.cicloAtual}
                  onChange={(e) => handleCicloChange(e.target.value)}
                >
                  {ciclos.map(ciclo => (
                    <option key={ciclo} value={ciclo}>{ciclo}</option>
                  ))}
                </select>
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
                    <span>SAVING...</span>
                  ) : saveStatus === 'success' ? (
                    <>
                      <CheckCircle size={14} />
                      <span>SAVED</span>
                    </>
                  ) : saveStatus === 'error' ? (
                    <>
                      <AlertTriangle size={14} />
                      <span>ERROR</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>SAVE CONFIG</span>
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
              <p className="repr-help">
                Valores de 0 a 100. Define o peso de cada ciclo no cálculo das metas.
              </p>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  )
}
