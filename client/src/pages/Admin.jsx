import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, LogOut, Save, CheckCircle, AlertTriangle, FileSpreadsheet, TrendingUp,
  Gift, Trash2, Send, MessageSquare, Users, ChevronDown, ChevronUp, Filter,
  Building2, Target, Rocket, Search, X, Trophy, Star, Sparkles, RefreshCw
} from 'lucide-react'
import Panel from '../components/Panel'
import DealerCard from '../components/DealerCard'
import BadgeSegment from '../components/BadgeSegment'
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

  // Bases (Setores)
  const [setores, setSetores] = useState([])
  const [basesData, setBasesData] = useState({})
  const [expandedBase, setExpandedBase] = useState(null)
  const [loadingBases, setLoadingBases] = useState(true)
  const [baseFilter, setBaseFilter] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('TODOS')

  // Notes
  const [notes, setNotes] = useState({})

  // Active Tab
  const [activeAdminTab, setActiveAdminTab] = useState('config') // 'config', 'bases' ou 'missao'

  // Missão Cumprida
  const [missionData, setMissionData] = useState([])
  const [loadingMission, setLoadingMission] = useState(false)
  const [missionLoaded, setMissionLoaded] = useState(false)

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

  // Carregar setores e notes
  useEffect(() => {
    Promise.all([
      fetch('/api/setores').then(r => r.json()),
      fetch('/api/notes').then(r => r.json())
    ])
      .then(([setoresData, notesData]) => {
        setSetores(setoresData || [])
        setNotes(notesData || {})
        setLoadingBases(false)
      })
      .catch(err => {
        console.error('Erro ao carregar setores:', err)
        setLoadingBases(false)
      })
  }, [])

  // Carregar dados da base quando expandir
  const handleExpandBase = async (setorId) => {
    if (expandedBase === setorId) {
      setExpandedBase(null)
      return
    }

    setExpandedBase(setorId)

    if (!basesData[setorId]) {
      try {
        const res = await fetch(`/api/dashboard?setorId=${setorId}`)
        const data = await res.json()
        setBasesData(prev => ({ ...prev, [setorId]: data }))
      } catch (err) {
        console.error('Erro ao carregar base:', err)
      }
    }
  }

  // Salvar nota
  const handleSaveNote = async (resellerId, noteText) => {
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resellerId, note: noteText })
      })
      setNotes(prev => ({ ...prev, [resellerId]: noteText }))
    } catch (error) {
      console.error('Erro ao salvar nota:', error)
    }
  }

  // Carregar dados da Missão Cumprida
  const loadMissionData = async () => {
    setLoadingMission(true)

    try {
      const results = []

      // Carregar dados de todas as bases em paralelo (em lotes para não sobrecarregar)
      const batchSize = 5
      for (let i = 0; i < setores.length; i += batchSize) {
        const batch = setores.slice(i, i + batchSize)
        const batchPromises = batch.map(async (setor) => {
          try {
            const res = await fetch(`/api/dashboard?setorId=${setor.id}`)
            const data = await res.json()

            // Filtrar revendedores que bateram a meta do ciclo (percentCiclo >= 100)
            const missionAccomplished = (data.dealers || []).filter(d => d.percentCiclo >= 100)

            if (missionAccomplished.length > 0) {
              return {
                setor: data.setor,
                setorId: setor.id,
                dealers: missionAccomplished,
                totalDealers: data.kpis?.qtdRevendedores || 0
              }
            }
            return null
          } catch (err) {
            console.error(`Erro ao carregar setor ${setor.id}:`, err)
            return null
          }
        })

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults.filter(Boolean))
      }

      // Ordenar por quantidade de dealers que cumpriram a missão
      results.sort((a, b) => b.dealers.length - a.dealers.length)

      setMissionData(results)
      setMissionLoaded(true)
    } catch (error) {
      console.error('Erro ao carregar missão:', error)
    }

    setLoadingMission(false)
  }

  // Carregar missão quando mudar para a aba
  useEffect(() => {
    if (activeAdminTab === 'missao' && !missionLoaded && setores.length > 0) {
      loadMissionData()
    }
  }, [activeAdminTab, setores, missionLoaded])

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

  // Status config para os dealers
  const getStatusConfig = (rawStatus) => {
    if (!rawStatus) return { label: 'Unknown', type: 'info' }
    const s = rawStatus.toString().toUpperCase().trim()
    if (s.includes('CRITIC') || s.includes('CRÍTICO') || s.includes('ACELERAR')) return { label: 'CRÍTICO', type: 'critical' }
    if (s.includes('WARM') || s.includes('AQUECENDO')) return { label: 'AQUECENDO', type: 'warning' }
    if (s.includes('TRACK') || s.includes('CAMINHO')) return { label: 'NO CAMINHO', type: 'track' }
    if (s.includes('ALMOST') || s.includes('QUASE')) return { label: 'QUASE LÁ', type: 'almost' }
    if (s.includes('READY') || s.includes('LEVEL') || s.includes('PRONTO') || s.includes('SUBIR')) return { label: 'PRONTO P/ SUBIR', type: 'levelup' }
    if (s.includes('MISSION') || s.includes('MISSÃO') || s.includes('CUMPRIDA')) return { label: 'MISSÃO CUMPRIDA', type: 'success' }
    return { label: rawStatus, type: 'info' }
  }

  // Filtrar setores
  const filteredSetores = setores.filter(setor => {
    if (!baseFilter) return true
    return setor.nome.toLowerCase().includes(baseFilter.toLowerCase()) ||
           setor.id.includes(baseFilter)
  })

  // Obter segmentos únicos de uma base
  const getUniqueSegments = (baseData) => {
    if (!baseData?.dealers) return []
    return [...new Set(baseData.dealers.map(d => d.segmento).filter(Boolean))].sort()
  }

  // Filtrar dealers por segmento
  const filterDealersBySegment = (dealers) => {
    if (segmentFilter === 'TODOS') return dealers
    return dealers.filter(d => d.segmento === segmentFilter)
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

      {/* TABS */}
      <div className="admin__tabs">
        <button
          className={`admin__tab ${activeAdminTab === 'config' ? 'admin__tab--active' : ''}`}
          onClick={() => setActiveAdminTab('config')}
        >
          <FileSpreadsheet size={16} />
          CONFIGURAÇÕES
        </button>
        <button
          className={`admin__tab ${activeAdminTab === 'bases' ? 'admin__tab--active' : ''}`}
          onClick={() => setActiveAdminTab('bases')}
        >
          <Building2 size={16} />
          BASES ({setores.length})
        </button>
        <button
          className={`admin__tab admin__tab--mission ${activeAdminTab === 'missao' ? 'admin__tab--active' : ''}`}
          onClick={() => setActiveAdminTab('missao')}
        >
          <Trophy size={16} />
          MISSÃO CUMPRIDA
          {missionLoaded && missionData.length > 0 && (
            <span className="admin__tab-badge">{missionData.reduce((acc, b) => acc + b.dealers.length, 0)}</span>
          )}
        </button>
      </div>

      <main className="admin__content">
        <div className="container">
          {/* TAB: CONFIGURAÇÕES */}
          {activeAdminTab === 'config' && (
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
          )}

          {/* TAB: BASES */}
          {activeAdminTab === 'bases' && (
          <div className="admin__bases">
            {/* FILTROS */}
            <div className="admin__bases-filters">
              <div className="admin__bases-search">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Buscar base por nome ou código..."
                  value={baseFilter}
                  onChange={(e) => setBaseFilter(e.target.value)}
                />
                {baseFilter && (
                  <button onClick={() => setBaseFilter('')}>
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="admin__bases-count">
                <Users size={16} />
                <span>{filteredSetores.length} bases encontradas</span>
              </div>
            </div>

            {/* LISTA DE BASES */}
            {loadingBases ? (
              <div className="admin__bases-loading">
                <div className="admin-loading__spinner"></div>
                <span>Carregando bases...</span>
              </div>
            ) : (
              <div className="admin__bases-list">
                {filteredSetores.map(setor => {
                  const isExpanded = expandedBase === setor.id
                  const baseData = basesData[setor.id]

                  return (
                    <div key={setor.id} className={`admin__base-card ${isExpanded ? 'admin__base-card--expanded' : ''}`}>
                      {/* HEADER DA BASE */}
                      <div
                        className="admin__base-header"
                        onClick={() => handleExpandBase(setor.id)}
                      >
                        <div className="admin__base-info">
                          <span className="admin__base-id mono">{setor.id}</span>
                          <h3 className="admin__base-name">{setor.nome}</h3>
                        </div>
                        <div className="admin__base-meta">
                          {baseData && (
                            <div className="admin__base-stats">
                              <span className="admin__base-stat">
                                <Users size={14} />
                                {baseData.kpis?.qtdRevendedores || 0}
                              </span>
                              <span className="admin__base-stat admin__base-stat--success">
                                <TrendingUp size={14} />
                                {baseData.kpis?.nearLevelUp || 0}
                              </span>
                              <span className="admin__base-stat admin__base-stat--danger">
                                <AlertTriangle size={14} />
                                {baseData.kpis?.atRisk || 0}
                              </span>
                            </div>
                          )}
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>

                      {/* CONTEÚDO EXPANDIDO */}
                      {isExpanded && (
                        <div className="admin__base-content">
                          {!baseData ? (
                            <div className="admin__base-loading">
                              <div className="admin-loading__spinner" style={{ width: 30, height: 30 }}></div>
                              <span>Carregando revendedores...</span>
                            </div>
                          ) : (
                            <>
                              {/* FILTRO DE SEGMENTO */}
                              <div className="admin__base-toolbar">
                                <div className="admin__base-segment-filter">
                                  <Filter size={16} />
                                  <select
                                    value={segmentFilter}
                                    onChange={(e) => setSegmentFilter(e.target.value)}
                                  >
                                    <option value="TODOS">Todos os Segmentos</option>
                                    {getUniqueSegments(baseData).map(seg => (
                                      <option key={seg} value={seg}>{seg}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="admin__base-summary">
                                  <span className="admin__base-total">
                                    Total: <strong>R$ {(baseData.kpis?.totalSetor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                  </span>
                                </div>
                              </div>

                              {/* SEGMENTOS BADGES */}
                              {baseData.kpis?.segmentosCount && (
                                <div className="admin__base-segments">
                                  {Object.entries(baseData.kpis.segmentosCount).map(([seg, count]) => (
                                    <button
                                      key={seg}
                                      className={`admin__segment-badge ${segmentFilter === seg ? 'admin__segment-badge--active' : ''}`}
                                      onClick={() => setSegmentFilter(segmentFilter === seg ? 'TODOS' : seg)}
                                    >
                                      <BadgeSegment segment={seg} />
                                      <span className="admin__segment-count">{count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* DEALERS GRID */}
                              <div className="admin__base-dealers">
                                {filterDealersBySegment(baseData.dealers || []).map(dealer => {
                                  const { label } = getStatusConfig(dealer.impulso)
                                  return (
                                    <DealerCard
                                      key={dealer.codigo}
                                      dealer={{ ...dealer, impulso: label }}
                                      onClick={() => {}}
                                      note={notes[dealer.codigo] || ''}
                                      onSaveNote={(noteText) => handleSaveNote(dealer.codigo, noteText)}
                                    />
                                  )
                                })}
                              </div>

                              {filterDealersBySegment(baseData.dealers || []).length === 0 && (
                                <div className="admin__base-empty">
                                  <span>Nenhum revendedor encontrado com o filtro selecionado.</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {filteredSetores.length === 0 && !loadingBases && (
              <div className="admin__bases-empty">
                <Building2 size={48} />
                <h3>Nenhuma base encontrada</h3>
                <p>Tente ajustar o filtro de busca.</p>
              </div>
            )}
          </div>
          )}

          {/* TAB: MISSÃO CUMPRIDA */}
          {activeAdminTab === 'missao' && (
          <div className="admin__mission">
            {/* HEADER DA MISSÃO */}
            <div className="admin__mission-header">
              <div className="admin__mission-title">
                <Trophy size={32} className="admin__mission-icon" />
                <div>
                  <h2>MISSÃO DADA É MISSÃO CUMPRIDA!</h2>
                  <p>
                    Revendedores que atingiram <strong>100%</strong> da meta do ciclo atual
                    <span className="admin__mission-meta">
                      (Meta: {config?.representatividade?.[config?.cicloAtual]}% do ciclo {config?.cicloAtual})
                    </span>
                  </p>
                </div>
              </div>
              <button
                className="btn btn--ghost"
                onClick={() => { setMissionLoaded(false); loadMissionData(); }}
                disabled={loadingMission}
              >
                <RefreshCw size={16} className={loadingMission ? 'spin' : ''} />
                ATUALIZAR
              </button>
            </div>

            {/* LOADING */}
            {loadingMission && (
              <div className="admin__mission-loading">
                <div className="admin-loading__spinner"></div>
                <span>Analisando todas as bases...</span>
                <p className="text-muted">Isso pode levar alguns segundos</p>
              </div>
            )}

            {/* RESULTADOS */}
            {!loadingMission && missionLoaded && (
              <>
                {/* RESUMO */}
                <div className="admin__mission-summary">
                  <div className="admin__mission-stat">
                    <Star size={24} />
                    <div>
                      <span className="admin__mission-stat-value">
                        {missionData.reduce((acc, b) => acc + b.dealers.length, 0)}
                      </span>
                      <span className="admin__mission-stat-label">Revendedores</span>
                    </div>
                  </div>
                  <div className="admin__mission-stat">
                    <Building2 size={24} />
                    <div>
                      <span className="admin__mission-stat-value">{missionData.length}</span>
                      <span className="admin__mission-stat-label">Bases com Sucesso</span>
                    </div>
                  </div>
                  <div className="admin__mission-stat">
                    <Sparkles size={24} />
                    <div>
                      <span className="admin__mission-stat-value">
                        {missionData.length > 0
                          ? Math.round((missionData.reduce((acc, b) => acc + b.dealers.length, 0) /
                              missionData.reduce((acc, b) => acc + b.totalDealers, 0)) * 100)
                          : 0}%
                      </span>
                      <span className="admin__mission-stat-label">Taxa de Sucesso</span>
                    </div>
                  </div>
                </div>

                {/* LISTA DE BASES COM SUCESSO */}
                {missionData.length > 0 ? (
                  <div className="admin__mission-list">
                    {missionData.map((base, idx) => (
                      <div key={base.setorId} className="admin__mission-base">
                        <div className="admin__mission-base-header">
                          <div className="admin__mission-base-rank">
                            {idx < 3 ? (
                              <Trophy size={24} className={`trophy-${idx + 1}`} />
                            ) : (
                              <span className="rank-number">{idx + 1}º</span>
                            )}
                          </div>
                          <div className="admin__mission-base-info">
                            <span className="admin__mission-base-id mono">{base.setorId}</span>
                            <h3 className="admin__mission-base-name">{base.setor?.nome || 'Base'}</h3>
                          </div>
                          <div className="admin__mission-base-stats">
                            <div className="admin__mission-base-achieved">
                              <CheckCircle size={18} />
                              <span><strong>{base.dealers.length}</strong> de {base.totalDealers}</span>
                            </div>
                            <div className="admin__mission-base-percent">
                              {Math.round((base.dealers.length / base.totalDealers) * 100)}%
                            </div>
                          </div>
                        </div>

                        <div className="admin__mission-dealers">
                          {base.dealers
                            .sort((a, b) => b.percentCiclo - a.percentCiclo)
                            .map((dealer, dealerIdx) => (
                            <div key={dealer.codigo} className="admin__mission-dealer">
                              <div className="admin__mission-dealer-rank">
                                {dealerIdx === 0 && <Star size={14} className="star-gold" />}
                                {dealerIdx === 1 && <Star size={14} className="star-silver" />}
                                {dealerIdx === 2 && <Star size={14} className="star-bronze" />}
                              </div>
                              <div className="admin__mission-dealer-info">
                                <span className="admin__mission-dealer-code mono">{dealer.codigo}</span>
                                <span className="admin__mission-dealer-name">{dealer.nome}</span>
                              </div>
                              <BadgeSegment segment={dealer.segmento} />
                              <div className="admin__mission-dealer-value">
                                <span className="admin__mission-dealer-total">
                                  R$ {dealer.totalCicloAtual?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="admin__mission-dealer-percent">
                                  {dealer.percentCiclo?.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin__mission-empty">
                    <Target size={64} />
                    <h3>Nenhuma missão cumprida ainda</h3>
                    <p>
                      Quando revendedores atingirem 100% da meta do ciclo atual,
                      eles aparecerão aqui. Continue incentivando suas equipes!
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          )}
        </div>
      </main>
    </div>
  )
}
