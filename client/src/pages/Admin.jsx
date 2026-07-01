import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, LogOut, Save, CheckCircle, AlertTriangle, FileSpreadsheet, TrendingUp,
  Gift, Trash2, Send, MessageSquare, Users, ChevronDown, ChevronUp, Filter,
  Building2, Target, Rocket, Search, X, Trophy, Star, Sparkles, RefreshCw,
  File, Database, Clock, Mail, Edit3, Plus, Globe, User
} from 'lucide-react'
import Panel from '../components/Panel'
import DealerCard from '../components/DealerCard'
import BadgeSegment from '../components/BadgeSegment'
import './Admin.css'

export default function Admin() {
  const navigate = useNavigate()

  // Chamadas autenticadas ao admin: injeta o token e, se receber 401,
  // limpa o token e volta para o login.
  const adminFetch = async (url, options = {}) => {
    const token = sessionStorage.getItem('adminToken') || ''
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` }
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
      sessionStorage.removeItem('adminToken')
      navigate('/admin/login')
      throw new Error('unauthorized')
    }
    return res
  }

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

  // Upload de arquivos
  const [filesStatus, setFilesStatus] = useState({ vendas: {}, segmentos: {} })
  const [refreshingFilesStatus, setRefreshingFilesStatus] = useState(false)
  const [filesStatusPulse, setFilesStatusPulse] = useState(false)

  // Validação da planilha de Segmentos (fluxo: selecionar -> validar -> corrigir -> aplicar)
  const [segVal, setSegVal] = useState(null)          // { loading, filename, report, rows, error }
  const [segSetorNomes, setSegSetorNomes] = useState({}) // setorId -> nome corrigido (override)
  const [segPapelMap, setSegPapelMap] = useState({})     // valorOriginal -> papel escolhido
  const [segApplying, setSegApplying] = useState(null)   // null | 'loading' | 'success' | 'error'
  const [segApplyMsg, setSegApplyMsg] = useState('')

  // Validação da planilha de Vendas
  const [venVal, setVenVal] = useState(null)             // { loading, file, filename, report, setores, error }
  const [venSetorMap, setVenSetorMap] = useState({})     // nomeSetorOriginal -> codigo escolhido
  const [venApplying, setVenApplying] = useState(null)
  const [venApplyMsg, setVenApplyMsg] = useState('')

  // Sistema de Mensagens
  const [mensagens, setMensagens] = useState([])
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const [editingMensagem, setEditingMensagem] = useState(null)
  const [novaMensagem, setNovaMensagem] = useState({
    titulo: '',
    texto: '',
    targetType: 'all',
    targetSetores: []
  })
  const [mensagemFormStatus, setMensagemFormStatus] = useState(null)

  useEffect(() => {
    adminFetch('/api/admin/config')
      .then(r => r.json())
      .then(data => {
        setConfig(data)
        setRepresentatividade(data.representatividade || {})
        // Carregar mensagem existente
        if (data.mensagemRecompensa) {
          setMensagemTitulo(data.mensagemRecompensa.titulo || '')
          setMensagemTexto(data.mensagemRecompensa.texto || '')
        }
        setIsLoading(false)
      })
      .catch(err => {
        // adminFetch já redireciona no 401; não desloga por erro transitório (rede/500)
        if (err.message === 'unauthorized') return
        console.error('Erro ao carregar config admin:', err)
        setIsLoading(false)
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

    // Reseta o filtro de segmento ao abrir outra base (o filtro é compartilhado)
    setSegmentFilter('TODOS')
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

  // Carregar status dos arquivos quando mudar para a aba dados
  const loadFilesStatus = async ({ withFeedback = false } = {}) => {
    if (withFeedback) {
      setRefreshingFilesStatus(true)
      setFilesStatusPulse(false)
    }

    try {
      const res = await adminFetch('/api/admin/files/status')
      const data = await res.json()
      setFilesStatus(data)
    } catch (err) {
      console.error('Erro ao carregar status dos arquivos:', err)
    } finally {
      if (withFeedback) {
        setRefreshingFilesStatus(false)
        setFilesStatusPulse(true)
        setTimeout(() => setFilesStatusPulse(false), 1200)
      }
    }
  }

  useEffect(() => {
    if (activeAdminTab === 'dados') {
      loadFilesStatus()
    }
  }, [activeAdminTab])

  // Carregar mensagens quando mudar para a aba
  const loadMensagens = async () => {
    setLoadingMensagens(true)
    try {
      const res = await adminFetch('/api/admin/mensagens')
      const data = await res.json()
      setMensagens(data)
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    }
    setLoadingMensagens(false)
  }

  useEffect(() => {
    if (activeAdminTab === 'mensagens') {
      loadMensagens()
    }
  }, [activeAdminTab])

  // Criar nova mensagem
  const handleCreateMensagem = async () => {
    if (!novaMensagem.texto.trim()) return

    setMensagemFormStatus('loading')
    try {
      const res = await adminFetch('/api/admin/mensagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaMensagem)
      })

      if (res.ok) {
        setMensagemFormStatus('success')
        setNovaMensagem({ titulo: '', texto: '', targetType: 'all', targetSetores: [] })
        loadMensagens()
      } else {
        setMensagemFormStatus('error')
      }
    } catch (err) {
      setMensagemFormStatus('error')
    }
    setTimeout(() => setMensagemFormStatus(null), 3000)
  }

  // Atualizar mensagem existente
  const handleUpdateMensagem = async () => {
    if (!editingMensagem) return

    setMensagemFormStatus('loading')
    try {
      const res = await adminFetch(`/api/admin/mensagens/${editingMensagem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMensagem)
      })

      if (res.ok) {
        setMensagemFormStatus('success')
        setEditingMensagem(null)
        loadMensagens()
      } else {
        setMensagemFormStatus('error')
      }
    } catch (err) {
      setMensagemFormStatus('error')
    }
    setTimeout(() => setMensagemFormStatus(null), 3000)
  }

  // Deletar mensagem
  const handleDeleteMensagem = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) return

    try {
      const res = await adminFetch(`/api/admin/mensagens/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadMensagens()
      }
    } catch (err) {
      console.error('Erro ao deletar mensagem:', err)
    }
  }

  // Toggle ativa/inativa
  const handleToggleMensagemAtiva = async (mensagem) => {
    try {
      await adminFetch(`/api/admin/mensagens/${mensagem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativa: !mensagem.ativa })
      })
      loadMensagens()
    } catch (err) {
      console.error('Erro ao atualizar mensagem:', err)
    }
  }

  // Handler para selecionar setores
  const handleSetorSelect = (setorId, isEditing = false) => {
    if (isEditing && editingMensagem) {
      const current = editingMensagem.targetSetores || []
      const updated = current.includes(setorId)
        ? current.filter(s => s !== setorId)
        : [...current, setorId]
      setEditingMensagem({ ...editingMensagem, targetSetores: updated })
    } else {
      const current = novaMensagem.targetSetores || []
      const updated = current.includes(setorId)
        ? current.filter(s => s !== setorId)
        : [...current, setorId]
      setNovaMensagem({ ...novaMensagem, targetSetores: updated })
    }
  }

  // ── Validação da planilha de Segmentos ──────────────────────────
  const SEGMENTOS_VALIDOS = ['Cobre', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Rubi', 'Esmeralda', 'Diamante']
  const normCodeCli = (c) => String(c ?? '').replace(/\./g, '').replace(/\s+/g, '').trim()

  const handleValidateSegmentos = async (file) => {
    if (!file) return
    setSegVal({ loading: true })
    setSegSetorNomes({}); setSegPapelMap({}); setSegApplying(null); setSegApplyMsg('')

    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await adminFetch('/api/admin/files/validate?tipo=segmentos', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setSegVal({ loading: false, filename: data.filename, report: data.report, rows: data.rows })
      } else {
        setSegVal({ loading: false, error: data.error || 'Falha na validação' })
      }
    } catch (err) {
      if (err.message === 'unauthorized') return
      setSegVal({ loading: false, error: 'Erro ao enviar arquivo para validação' })
    }
  }

  const handleCancelSegVal = () => {
    setSegVal(null); setSegSetorNomes({}); setSegPapelMap({}); setSegApplying(null); setSegApplyMsg('')
  }

  const handleApplySegmentos = async () => {
    if (!segVal?.rows) return
    // Aplica as correções do admin sobre as linhas base
    const rows = segVal.rows.map(r => {
      const out = { ...r }
      const sid = normCodeCli(out.CodigoEstruturaComercial)
      const nomeOverride = segSetorNomes[sid]
      if (nomeOverride != null && String(nomeOverride).trim() !== '') out.EstruturaComercial = nomeOverride
      const papelKey = String(out.Papel ?? '').trim()
      if (segPapelMap[papelKey]) out.Papel = segPapelMap[papelKey]
      return out
    })

    setSegApplying('loading'); setSegApplyMsg('')
    try {
      const res = await adminFetch('/api/admin/files/commit?tipo=segmentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      })
      const data = await res.json()
      if (res.ok) {
        setSegApplying('success')
        setSegApplyMsg(`Importado com sucesso: ${data.revendedores} revendedores, ${data.setores} setores.`)
        loadFilesStatus({ withFeedback: true })
        setTimeout(() => { setSegVal(null); setSegApplying(null); setSegApplyMsg('') }, 3000)
      } else {
        setSegApplying('error'); setSegApplyMsg(data.error || 'Falha ao importar')
      }
    } catch (err) {
      if (err.message === 'unauthorized') return
      setSegApplying('error'); setSegApplyMsg('Erro ao aplicar importação')
    }
  }

  // ── Validação da planilha de Vendas ─────────────────────────────
  const handleValidateVendas = async (file) => {
    if (!file) return
    setVenVal({ loading: true, file })
    setVenSetorMap({}); setVenApplying(null); setVenApplyMsg('')

    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await adminFetch('/api/admin/files/validate?tipo=vendas', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setVenVal({ loading: false, file, filename: data.filename, report: data.report, setores: data.setores || [] })
      } else {
        setVenVal({ loading: false, file, error: data.error || 'Falha na validação' })
      }
    } catch (err) {
      if (err.message === 'unauthorized') return
      setVenVal({ loading: false, file, error: 'Erro ao enviar arquivo para validação' })
    }
  }

  const handleCancelVenVal = () => {
    setVenVal(null); setVenSetorMap({}); setVenApplying(null); setVenApplyMsg('')
  }

  const handleApplyVendas = async () => {
    if (!venVal?.file) return
    setVenApplying('loading'); setVenApplyMsg('')
    const formData = new FormData()
    formData.append('file', venVal.file)
    formData.append('corrections', JSON.stringify(venSetorMap))
    try {
      const res = await adminFetch('/api/admin/files/commit-vendas', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setVenApplying('success')
        const ciclos = data.historico?.ciclos?.length ? ` Ciclos no histórico: ${data.historico.ciclos.join(', ')}.` : ''
        setVenApplyMsg(`Vendas importadas: ${data.linhas} linhas.${ciclos}`)
        loadFilesStatus({ withFeedback: true })
        setTimeout(() => { setVenVal(null); setVenApplying(null); setVenApplyMsg('') }, 3500)
      } else {
        setVenApplying('error'); setVenApplyMsg(data.error || 'Falha ao importar')
      }
    } catch (err) {
      if (err.message === 'unauthorized') return
      setVenApplying('error'); setVenApplyMsg('Erro ao aplicar importação')
    }
  }

  const handleCicloChange = async (ciclo) => {
    try {
      await adminFetch('/api/admin/ciclo', {
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
      const res = await adminFetch('/api/admin/representatividade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ representatividade })
      })

      if (res.ok) {
        setSaveStatus('success')
        const configRes = await adminFetch('/api/admin/config')
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
      const res = await adminFetch('/api/admin/mensagem-recompensa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: mensagemTitulo || 'Nova Meta!',
          texto: mensagemTexto
        })
      })

      if (res.ok) {
        setMensagemStatus('success')
        const configRes = await adminFetch('/api/admin/config')
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
      const res = await adminFetch('/api/admin/mensagem-recompensa', {
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

  // Ano base dos ciclos (do ciclo vigente ou da 1ª chave cadastrada)
  const anoCiclos =
    config?.cicloAtual?.match(/\/(\d{4})/)?.[1] ||
    Object.keys(representatividade)[0]?.match(/\/(\d{4})/)?.[1] ||
    '2026'
  const fmtCiclo = (n) => `${String(n).padStart(2, '0')}/${anoCiclos}`
  // Peso de um ciclo (espelha o backend repDoCiclo): a janela 10-17 reaproveita
  // os pesos dos ciclos 2-9 por posição (10←2, 11←3, ... 17←9).
  const pesoEspelhado = (n) => (n >= 10 ? representatividade[fmtCiclo(n - 8)] : representatividade[fmtCiclo(n)])
  // 17 ciclos: 1-9 são editáveis; 10-17 são derivados (somente leitura).
  const ciclos = Array.from({ length: 17 }, (_, i) => i + 1)
  // Peso do ciclo vigente (robusto para ciclos 10-17, que não ficam na config)
  const pesoCicloVigente = (() => {
    const mm = String(config?.cicloAtual || '').match(/(\d{1,2})\/\d{4}/)
    return mm ? pesoEspelhado(parseInt(mm[1], 10)) : config?.representatividade?.[config?.cicloAtual]
  })()

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
        <button
          className={`admin__tab ${activeAdminTab === 'dados' ? 'admin__tab--active' : ''}`}
          onClick={() => setActiveAdminTab('dados')}
        >
          <Database size={16} />
          IMPORTAR DADOS
        </button>
        <button
          className={`admin__tab admin__tab--mensagens ${activeAdminTab === 'mensagens' ? 'admin__tab--active' : ''}`}
          onClick={() => setActiveAdminTab('mensagens')}
        >
          <Mail size={16} />
          MENSAGENS
          {mensagens.filter(m => m.ativa).length > 0 && (
            <span className="admin__tab-badge admin__tab-badge--mensagens">{mensagens.filter(m => m.ativa).length}</span>
          )}
        </button>
      </div>

      <main className="admin__content">
        <div className="container">
          {/* TAB: CONFIGURAÇÕES */}
          {activeAdminTab === 'config' && (
          <div className="admin__grid admin__grid--simple">
            {/* REPRESENTATIVIDADE COM SELEÇÃO DE CICLO VIGENTE */}
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
                {ciclos.map(n => {
                  const cicloStr = fmtCiclo(n)
                  const espelhado = n >= 10
                  const peso = espelhado ? pesoEspelhado(n) : representatividade[cicloStr]
                  const isVigente = config.cicloAtual === cicloStr
                  return (
                    <div
                      key={cicloStr}
                      className={`repr-item ${isVigente ? 'repr-item--vigente' : ''} ${espelhado ? 'repr-item--espelhado' : ''}`}
                      onClick={() => handleCicloChange(cicloStr)}
                    >
                      <div className="repr-item__radio">
                        <input
                          type="radio"
                          name="cicloVigente"
                          checked={isVigente}
                          onChange={() => handleCicloChange(cicloStr)}
                          className="repr-item__radio-input"
                        />
                        <span className="repr-item__radio-custom"></span>
                      </div>
                      <label className="repr-item__label">
                        {cicloStr}
                        {espelhado && (
                          <span className="repr-item__mirror">espelha ciclo {String(n - 8).padStart(2, '0')}</span>
                        )}
                      </label>
                      <div className="repr-item__input-wrapper">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="repr-item__input"
                          value={peso ?? ''}
                          readOnly={espelhado}
                          disabled={espelhado}
                          onChange={(e) => {
                            e.stopPropagation()
                            if (!espelhado) handleRepresentatividadeChange(cicloStr, e.target.value)
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="repr-item__suffix">%</span>
                      </div>
                      <div
                        className="repr-item__bar"
                        style={{ width: `${peso || 0}%` }}
                      />
                      {isVigente && (
                        <span className="repr-item__badge">VIGENTE</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="repr-help">
                <TrendingUp size={16} />
                <p>
                  <strong>Clique no ciclo para defini-lo como vigente!</strong> A meta ponderada
                  de todas as supervisoras é calculada com base na % do ciclo selecionado.
                  Os <strong>ciclos 10–17</strong> reaproveitam automaticamente os pesos dos
                  <strong> ciclos 2–9</strong> (10 = ciclo 02, 11 = ciclo 03, … 17 = ciclo 09),
                  por isso aparecem em modo somente leitura.
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
                                      ciclosJanela={baseData.ciclosJanela}
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
                      (Meta: {pesoCicloVigente}% do ciclo {config?.cicloAtual})
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
                        {(() => {
                          const totDealers = missionData.reduce((acc, b) => acc + (b.totalDealers || 0), 0)
                          const totOk = missionData.reduce((acc, b) => acc + b.dealers.length, 0)
                          return totDealers > 0 ? Math.round((totOk / totDealers) * 100) : 0
                        })()}%
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
                              {base.totalDealers > 0 ? Math.round((base.dealers.length / base.totalDealers) * 100) : 0}%
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

          {/* TAB: IMPORTAR DADOS */}
          {activeAdminTab === 'dados' && (
          <div className="admin__dados">
            <div className="admin__dados-header">
              <Database size={32} />
              <div>
                <h2>IMPORTAR PLANILHAS</h2>
                <p>Atualize os dados do sistema importando novas planilhas de vendas e segmentos.</p>
              </div>
              <button
                className={`btn btn--ghost admin__dados-refresh-btn ${filesStatusPulse ? 'admin__dados-refresh-btn--success' : ''}`}
                onClick={() => loadFilesStatus({ withFeedback: true })}
                disabled={refreshingFilesStatus}
              >
                <RefreshCw size={16} className={refreshingFilesStatus ? 'spin' : ''} />
                {refreshingFilesStatus ? 'ATUALIZANDO...' : filesStatusPulse ? 'ATUALIZADO' : 'ATUALIZAR STATUS'}
              </button>
            </div>

            <div className="admin__dados-grid">
              {/* VENDAS */}
              <div className="admin__dados-card">
                <div className="admin__dados-card-header">
                  <FileSpreadsheet size={24} />
                  <div>
                    <h3>Planilha de Vendas</h3>
                    <span className="admin__dados-filename mono">
                      {filesStatus.vendas?.filename || 'vendas_bd.csv / .xlsx'}
                    </span>
                  </div>
                </div>

                <div className="admin__dados-card-status">
                  {filesStatus.vendas?.exists ? (
                    <>
                      <div className="admin__dados-status-row">
                        <CheckCircle size={16} className="text-success" />
                        <span>Arquivo presente</span>
                      </div>
                      <div className="admin__dados-status-row">
                        <File size={16} />
                        <span>{filesStatus.vendas.sizeFormatted}</span>
                      </div>
                      <div className="admin__dados-status-row">
                        <Clock size={16} />
                        <span>Atualizado em: {filesStatus.vendas.lastModifiedFormatted}</span>
                      </div>
                    </>
                  ) : (
                    <div className="admin__dados-status-row">
                      <AlertTriangle size={16} className="text-warning" />
                      <span>Arquivo não encontrado</span>
                    </div>
                  )}
                </div>

                <div className="admin__dados-card-upload">
                  <label className={`admin__dados-upload-btn ${venVal?.loading ? 'admin__dados-upload-btn--loading' : ''}`}>
                    {venVal?.loading ? (
                      <>
                        <div className="admin-loading__spinner" style={{ width: 18, height: 18 }}></div>
                        <span>VALIDANDO...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        <span>SELECIONAR E VALIDAR (CSV/XLSX)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={(e) => { handleValidateVendas(e.target.files[0]); e.target.value = '' }}
                      disabled={venVal?.loading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span className="admin__dados-upload-hint">A planilha é validada antes de importar — você revisa os erros e mapeia setores aqui mesmo.</span>
                </div>
              </div>

              {/* SEGMENTOS */}
              <div className="admin__dados-card">
                <div className="admin__dados-card-header">
                  <FileSpreadsheet size={24} />
                  <div>
                    <h3>Planilha de Segmentos</h3>
                    <span className="admin__dados-filename mono">Segmentos_bd.xlsx</span>
                  </div>
                </div>

                <div className="admin__dados-card-status">
                  {filesStatus.segmentos?.exists ? (
                    <>
                      <div className="admin__dados-status-row">
                        <CheckCircle size={16} className="text-success" />
                        <span>Arquivo presente</span>
                      </div>
                      <div className="admin__dados-status-row">
                        <File size={16} />
                        <span>{filesStatus.segmentos.sizeFormatted}</span>
                      </div>
                      <div className="admin__dados-status-row">
                        <Clock size={16} />
                        <span>Atualizado em: {filesStatus.segmentos.lastModifiedFormatted}</span>
                      </div>
                    </>
                  ) : (
                    <div className="admin__dados-status-row">
                      <AlertTriangle size={16} className="text-warning" />
                      <span>Arquivo não encontrado</span>
                    </div>
                  )}
                </div>

                <div className="admin__dados-card-upload">
                  <label className={`admin__dados-upload-btn ${segVal?.loading ? 'admin__dados-upload-btn--loading' : ''}`}>
                    {segVal?.loading ? (
                      <>
                        <div className="admin-loading__spinner" style={{ width: 18, height: 18 }}></div>
                        <span>VALIDANDO...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        <span>SELECIONAR E VALIDAR XLSX</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => { handleValidateSegmentos(e.target.files[0]); e.target.value = '' }}
                      disabled={segVal?.loading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span className="admin__dados-upload-hint">A planilha é validada antes de importar — você revisa e corrige os erros aqui mesmo.</span>
                </div>
              </div>
            </div>

            {/* PAINEL DE VALIDAÇÃO / CORREÇÃO DA PLANILHA DE SEGMENTOS */}
            {segVal && (
              <div className="seg-val">
                <div className="seg-val__head">
                  <h3><Database size={18} /> Validação — Segmentos {segVal.filename ? <span className="mono">({segVal.filename})</span> : null}</h3>
                  <button className="btn btn--ghost btn--sm" onClick={handleCancelSegVal}><X size={14} /> Fechar</button>
                </div>

                {segVal.loading && (
                  <div className="seg-val__loading"><div className="admin-loading__spinner" style={{ width: 22, height: 22 }}></div><span>Validando planilha...</span></div>
                )}

                {segVal.error && (
                  <div className="seg-val__banner seg-val__banner--err"><AlertTriangle size={16} /><span>{segVal.error}</span></div>
                )}

                {segVal.report && (() => {
                  const rep = segVal.report
                  const blocking = rep.errors.length > 0
                  return (
                    <>
                      <div className="seg-val__summary">
                        <span className="seg-chip seg-chip--ok"><CheckCircle size={14} /> {rep.linhasValidas} válidas</span>
                        {rep.errors.length > 0 && <span className="seg-chip seg-chip--err"><AlertTriangle size={14} /> {rep.errors.length} erro(s)</span>}
                        {rep.warnings.length > 0 && <span className="seg-chip seg-chip--warn"><AlertTriangle size={14} /> {rep.warnings.length} aviso(s)</span>}
                      </div>

                      {rep.errors.length > 0 && (
                        <div className="seg-block seg-block--err">
                          <h4><AlertTriangle size={15} /> Erros que impedem a importação</h4>
                          <ul>{rep.errors.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
                        </div>
                      )}

                      {rep.warnings.length > 0 && (
                        <div className="seg-block seg-block--warn">
                          <h4><AlertTriangle size={15} /> Avisos (importa, mas revise)</h4>
                          <ul>{rep.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>
                        </div>
                      )}

                      {rep.setores.length > 0 && (
                        <div className="seg-block">
                          <h4><Edit3 size={15} /> Setores para revisar ({rep.setores.length})</h4>
                          <div className="seg-setores">
                            {rep.setores.map(s => {
                              const tag = s.inconsistente ? '2+ nomes' : s.novo ? 'novo' : 'renomeado'
                              const tagCls = s.inconsistente ? 'incons' : s.novo ? 'novo' : 'renom'
                              return (
                                <div className="seg-setor" key={s.setorId}>
                                  <div className="seg-setor__top">
                                    <span className="mono seg-setor__id">setor {s.setorId}</span>
                                    <span className={`seg-tag seg-tag--${tagCls}`}>{tag}</span>
                                  </div>
                                  {!s.novo && !s.inconsistente && (
                                    <div className="seg-setor__diff"><span className="old">{s.nomeAtual}</span> <span className="arrow">→</span> <span className="new">{s.nomeNovo}</span></div>
                                  )}
                                  {s.novo && (<div className="seg-setor__diff">novo setor: <span className="new">{s.nomeNovo}</span></div>)}
                                  {s.inconsistente && (
                                    <div className="seg-setor__diff">
                                      <label>Nome correto:&nbsp;</label>
                                      <select
                                        value={segSetorNomes[s.setorId] ?? s.nomeNovo}
                                        onChange={e => setSegSetorNomes(p => ({ ...p, [s.setorId]: e.target.value }))}
                                      >
                                        {s.nomesNoArquivo.map(n => <option key={n.nome} value={n.nome}>{n.nome} ({n.count})</option>)}
                                      </select>
                                    </div>
                                  )}
                                  <input
                                    className="seg-setor__override"
                                    type="text"
                                    placeholder="Corrigir nome (opcional)"
                                    value={segSetorNomes[s.setorId] ?? ''}
                                    onChange={e => setSegSetorNomes(p => ({ ...p, [s.setorId]: e.target.value }))}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {rep.papelInvalido.length > 0 && (
                        <div className="seg-block">
                          <h4><Edit3 size={15} /> Segmentos (Papel) não reconhecidos ({rep.papelInvalido.length})</h4>
                          <div className="seg-papel">
                            {rep.papelInvalido.map(p => (
                              <div className="seg-papel__item" key={p.valor}>
                                <div className="seg-papel__row">
                                  <span className="seg-papel__val mono">"{p.label}" <em>({p.count} rev.)</em></span>
                                  <span className="arrow">→</span>
                                  <select
                                    value={segPapelMap[p.valor] ?? ''}
                                    onChange={e => setSegPapelMap(m => ({ ...m, [p.valor]: e.target.value }))}
                                  >
                                    <option value="">Manter (vira Bronze/calculado)</option>
                                    {SEGMENTOS_VALIDOS.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                                  </select>
                                </div>
                                {p.lista && p.lista.length > 0 && (
                                  <ul className="seg-quem">
                                    {p.lista.map(rv => (
                                      <li key={rv.codigo}>
                                        <span className="mono">{rv.codigo}</span>{rv.nome ? ` — ${rv.nome}` : ''}
                                        {rv.setor ? <span className="text-muted"> · {rv.setor}</span> : null}
                                      </li>
                                    ))}
                                    {p.count > p.lista.length && (
                                      <li className="text-muted">…e mais {p.count - p.lista.length}</li>
                                    )}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="seg-val__actions">
                        <button className="btn" disabled={blocking || segApplying === 'loading'} onClick={handleApplySegmentos}>
                          {segApplying === 'loading' ? 'APLICANDO...' : blocking ? 'CORRIJA OS ERROS PARA IMPORTAR' : 'APLICAR IMPORTAÇÃO'}
                        </button>
                        <button className="btn btn--ghost" onClick={handleCancelSegVal}>Cancelar</button>
                        {segApplyMsg && (
                          <span className={`seg-val__applymsg ${segApplying === 'error' ? 'err' : 'ok'}`}>
                            {segApplying === 'error' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />} {segApplyMsg}
                          </span>
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            {/* PAINEL DE VALIDAÇÃO / CORREÇÃO DA PLANILHA DE VENDAS */}
            {venVal && (
              <div className="seg-val">
                <div className="seg-val__head">
                  <h3><Database size={18} /> Validação — Vendas {venVal.filename ? <span className="mono">({venVal.filename})</span> : null}</h3>
                  <button className="btn btn--ghost btn--sm" onClick={handleCancelVenVal}><X size={14} /> Fechar</button>
                </div>

                {venVal.loading && (
                  <div className="seg-val__loading"><div className="admin-loading__spinner" style={{ width: 22, height: 22 }}></div><span>Validando planilha...</span></div>
                )}

                {venVal.error && (
                  <div className="seg-val__banner seg-val__banner--err"><AlertTriangle size={16} /><span>{venVal.error}</span></div>
                )}

                {venVal.report && (() => {
                  const rep = venVal.report
                  const blocking = rep.errors.length > 0
                  return (
                    <>
                      <div className="seg-val__summary">
                        <span className="seg-chip seg-chip--ok"><CheckCircle size={14} /> {rep.vendas} vendas</span>
                        {rep.naoVenda > 0 && <span className="seg-chip">{rep.naoVenda} não-venda</span>}
                        {rep.errors.length > 0 && <span className="seg-chip seg-chip--err"><AlertTriangle size={14} /> {rep.errors.length} erro(s)</span>}
                        {rep.warnings.length > 0 && <span className="seg-chip seg-chip--warn"><AlertTriangle size={14} /> {rep.warnings.length} aviso(s)</span>}
                      </div>

                      {rep.ciclos && rep.ciclos.length > 0 && (
                        <div className="seg-block">
                          <h4><Database size={15} /> Ciclos na planilha</h4>
                          <ul>{rep.ciclos.map(c => (
                            <li key={c.ciclo}><span className="mono">{c.ciclo}</span> — {c.linhas} vendas · R$ {c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
                          ))}</ul>
                        </div>
                      )}

                      {rep.errors.length > 0 && (
                        <div className="seg-block seg-block--err">
                          <h4><AlertTriangle size={15} /> Erros que impedem a importação</h4>
                          <ul>{rep.errors.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
                        </div>
                      )}

                      {rep.warnings.length > 0 && (
                        <div className="seg-block seg-block--warn">
                          <h4><AlertTriangle size={15} /> Avisos (importa, mas revise)</h4>
                          <ul>{rep.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>
                        </div>
                      )}

                      {rep.setoresNaoResolvidos && rep.setoresNaoResolvidos.length > 0 && (
                        <div className="seg-block">
                          <h4><Edit3 size={15} /> Setores não reconhecidos ({rep.setoresNaoResolvidos.length}) — mapeie para o setor correto</h4>
                          <div className="seg-papel">
                            {rep.setoresNaoResolvidos.map(s => (
                              <div className="seg-papel__row" key={s.nome}>
                                <span className="seg-papel__val">"{s.nome}" <em>({s.count} vendas)</em></span>
                                <span className="arrow">→</span>
                                <select value={venSetorMap[s.nome] ?? ''} onChange={e => setVenSetorMap(m => ({ ...m, [s.nome]: e.target.value }))}>
                                  <option value="">Não mapear (ignora essas vendas)</option>
                                  {(venVal.setores || []).map(st => <option key={st.id} value={st.id}>{st.id} — {st.nome}</option>)}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {rep.revendedoresSemCadastro && rep.revendedoresSemCadastro.count > 0 && (
                        <div className="seg-block seg-block--warn">
                          <h4><AlertTriangle size={15} /> Revendedores nas vendas sem cadastro ({rep.revendedoresSemCadastro.count})</h4>
                          <ul className="seg-quem">
                            {rep.revendedoresSemCadastro.lista.map(rv => (
                              <li key={rv.codigo}>
                                <span className="mono">{rv.codigo}</span>{rv.nome ? ` — ${rv.nome}` : ''}
                                {rv.setor ? <span className="text-muted"> · {rv.setor}</span> : null}
                              </li>
                            ))}
                            {rep.revendedoresSemCadastro.count > rep.revendedoresSemCadastro.lista.length && (
                              <li className="text-muted">…e mais {rep.revendedoresSemCadastro.count - rep.revendedoresSemCadastro.lista.length}</li>
                            )}
                          </ul>
                        </div>
                      )}

                      <div className="seg-val__actions">
                        <button className="btn" disabled={blocking || venApplying === 'loading'} onClick={handleApplyVendas}>
                          {venApplying === 'loading' ? 'APLICANDO...' : blocking ? 'CORRIJA OS ERROS PARA IMPORTAR' : 'APLICAR IMPORTAÇÃO'}
                        </button>
                        <button className="btn btn--ghost" onClick={handleCancelVenVal}>Cancelar</button>
                        {venApplyMsg && (
                          <span className={`seg-val__applymsg ${venApplying === 'error' ? 'err' : 'ok'}`}>
                            {venApplying === 'error' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />} {venApplyMsg}
                          </span>
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            <div className="admin__dados-info">
              <AlertTriangle size={18} />
              <div>
                <strong>Atenção:</strong>
                <p>
                  Ao importar novos arquivos, os dados anteriores serão substituídos.
                  Certifique-se de que os arquivos estão no formato correto antes de enviar.
                </p>
                <ul>
                  <li><strong>Vendas:</strong> Arquivo CSV ou Excel (.xlsx) com dados de vendas por ciclo</li>
                  <li><strong>Segmentos:</strong> Arquivo Excel (.xlsx) com cadastro de revendedores e segmentos</li>
                </ul>
              </div>
            </div>
          </div>
          )}

          {/* TAB: MENSAGENS */}
          {activeAdminTab === 'mensagens' && (
          <div className="admin__mensagens">
            {/* HEADER */}
            <div className="admin__mensagens-header">
              <Mail size={32} />
              <div>
                <h2>SISTEMA DE MENSAGENS</h2>
                <p>Envie mensagens para todas as supervisoras ou para grupos específicos.</p>
              </div>
              <button className="btn btn--ghost" onClick={loadMensagens}>
                <RefreshCw size={16} className={loadingMensagens ? 'spin' : ''} />
                ATUALIZAR
              </button>
            </div>

            <div className="admin__mensagens-grid">
              {/* FORMULÁRIO DE NOVA MENSAGEM */}
              <Panel
                title={editingMensagem ? "EDITAR MENSAGEM" : "NOVA MENSAGEM"}
                variant="accent"
                className="admin__mensagem-form-panel"
              >
                <div className="mensagem-form-new">
                  {/* Título */}
                  <div className="mensagem-form__field">
                    <label>
                      <Gift size={16} />
                      Título
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Meta Especial do Ciclo!"
                      value={editingMensagem ? editingMensagem.titulo : novaMensagem.titulo}
                      onChange={(e) => editingMensagem
                        ? setEditingMensagem({ ...editingMensagem, titulo: e.target.value })
                        : setNovaMensagem({ ...novaMensagem, titulo: e.target.value })
                      }
                      className="mensagem-input"
                    />
                  </div>

                  {/* Texto */}
                  <div className="mensagem-form__field">
                    <label>
                      <MessageSquare size={16} />
                      Mensagem
                    </label>
                    <textarea
                      placeholder="Digite a mensagem para as supervisoras..."
                      value={editingMensagem ? editingMensagem.texto : novaMensagem.texto}
                      onChange={(e) => editingMensagem
                        ? setEditingMensagem({ ...editingMensagem, texto: e.target.value })
                        : setNovaMensagem({ ...novaMensagem, texto: e.target.value })
                      }
                      className="mensagem-textarea"
                      rows={4}
                    />
                  </div>

                  {/* Tipo de Destinatário */}
                  <div className="mensagem-form__field">
                    <label>
                      <Users size={16} />
                      Destinatários
                    </label>
                    <div className="mensagem-target-selector">
                      <button
                        type="button"
                        className={`mensagem-target-btn ${(editingMensagem ? editingMensagem.targetType : novaMensagem.targetType) === 'all' ? 'active' : ''}`}
                        onClick={() => editingMensagem
                          ? setEditingMensagem({ ...editingMensagem, targetType: 'all', targetSetores: [] })
                          : setNovaMensagem({ ...novaMensagem, targetType: 'all', targetSetores: [] })
                        }
                      >
                        <Globe size={18} />
                        <span>TODAS</span>
                        <small>Envia para todas as supervisoras</small>
                      </button>
                      <button
                        type="button"
                        className={`mensagem-target-btn ${(editingMensagem ? editingMensagem.targetType : novaMensagem.targetType) === 'group' ? 'active' : ''}`}
                        onClick={() => editingMensagem
                          ? setEditingMensagem({ ...editingMensagem, targetType: 'group' })
                          : setNovaMensagem({ ...novaMensagem, targetType: 'group' })
                        }
                      >
                        <Users size={18} />
                        <span>GRUPO</span>
                        <small>Selecione múltiplos setores</small>
                      </button>
                      <button
                        type="button"
                        className={`mensagem-target-btn ${(editingMensagem ? editingMensagem.targetType : novaMensagem.targetType) === 'single' ? 'active' : ''}`}
                        onClick={() => editingMensagem
                          ? setEditingMensagem({ ...editingMensagem, targetType: 'single' })
                          : setNovaMensagem({ ...novaMensagem, targetType: 'single' })
                        }
                      >
                        <User size={18} />
                        <span>INDIVIDUAL</span>
                        <small>Apenas um setor</small>
                      </button>
                    </div>
                  </div>

                  {/* Seleção de Setores (se não for ALL) */}
                  {(editingMensagem ? editingMensagem.targetType : novaMensagem.targetType) !== 'all' && (
                    <div className="mensagem-form__field">
                      <label>
                        <Building2 size={16} />
                        Selecione {(editingMensagem ? editingMensagem.targetType : novaMensagem.targetType) === 'single' ? 'o setor' : 'os setores'}
                      </label>
                      <div className="mensagem-setores-list">
                        {setores.map(setor => {
                          const isSelected = editingMensagem
                            ? (editingMensagem.targetSetores || []).includes(setor.id)
                            : (novaMensagem.targetSetores || []).includes(setor.id)
                          const targetType = editingMensagem ? editingMensagem.targetType : novaMensagem.targetType

                          return (
                            <button
                              key={setor.id}
                              type="button"
                              className={`mensagem-setor-chip ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                // Se for single, limpa antes de adicionar
                                if (targetType === 'single') {
                                  if (editingMensagem) {
                                    setEditingMensagem({ ...editingMensagem, targetSetores: isSelected ? [] : [setor.id] })
                                  } else {
                                    setNovaMensagem({ ...novaMensagem, targetSetores: isSelected ? [] : [setor.id] })
                                  }
                                } else {
                                  handleSetorSelect(setor.id, !!editingMensagem)
                                }
                              }}
                            >
                              <span className="mono">{setor.id}</span>
                              <span className="mensagem-setor-nome">{setor.nome.substring(0, 30)}{setor.nome.length > 30 ? '...' : ''}</span>
                              {isSelected && <CheckCircle size={14} />}
                            </button>
                          )
                        })}
                      </div>
                      <small className="mensagem-setores-hint">
                        {(editingMensagem ? editingMensagem.targetSetores : novaMensagem.targetSetores)?.length || 0} setor(es) selecionado(s)
                      </small>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="mensagem-form__actions">
                    {editingMensagem ? (
                      <>
                        <button
                          className={`btn ${mensagemFormStatus === 'success' ? 'btn--secondary' : ''}`}
                          onClick={handleUpdateMensagem}
                          disabled={!editingMensagem.texto?.trim() || mensagemFormStatus === 'loading'}
                        >
                          {mensagemFormStatus === 'loading' ? (
                            <span>SALVANDO...</span>
                          ) : mensagemFormStatus === 'success' ? (
                            <>
                              <CheckCircle size={14} />
                              <span>SALVO!</span>
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              <span>SALVAR ALTERAÇÕES</span>
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn--ghost"
                          onClick={() => setEditingMensagem(null)}
                        >
                          <X size={14} />
                          CANCELAR
                        </button>
                      </>
                    ) : (
                      <button
                        className={`btn ${mensagemFormStatus === 'success' ? 'btn--secondary' : ''}`}
                        onClick={handleCreateMensagem}
                        disabled={!novaMensagem.texto?.trim() || mensagemFormStatus === 'loading' ||
                          ((novaMensagem.targetType !== 'all') && (!novaMensagem.targetSetores?.length))}
                      >
                        {mensagemFormStatus === 'loading' ? (
                          <span>ENVIANDO...</span>
                        ) : mensagemFormStatus === 'success' ? (
                          <>
                            <CheckCircle size={14} />
                            <span>MENSAGEM CRIADA!</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>CRIAR MENSAGEM</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </Panel>

              {/* LISTA DE MENSAGENS */}
              <Panel
                title="MENSAGENS ATIVAS"
                variant="pink"
                className="admin__mensagens-lista-panel"
              >
                {loadingMensagens ? (
                  <div className="admin__mensagens-loading">
                    <div className="admin-loading__spinner"></div>
                    <span>Carregando mensagens...</span>
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="admin__mensagens-empty">
                    <Mail size={48} />
                    <h3>Nenhuma mensagem</h3>
                    <p>Crie sua primeira mensagem para as supervisoras.</p>
                  </div>
                ) : (
                  <div className="admin__mensagens-list">
                    {mensagens.map(msg => (
                      <div key={msg.id} className={`admin__mensagem-card ${msg.ativa ? '' : 'admin__mensagem-card--inativa'}`}>
                        <div className="admin__mensagem-card-header">
                          <div className="admin__mensagem-card-title">
                            <Gift size={16} />
                            <h4>{msg.titulo || 'Sem título'}</h4>
                          </div>
                          <div className="admin__mensagem-card-badges">
                            {msg.targetType === 'all' && (
                              <span className="admin__mensagem-badge admin__mensagem-badge--all">
                                <Globe size={12} /> TODAS
                              </span>
                            )}
                            {msg.targetType === 'group' && (
                              <span className="admin__mensagem-badge admin__mensagem-badge--group">
                                <Users size={12} /> {msg.targetSetores?.length || 0} SETORES
                              </span>
                            )}
                            {msg.targetType === 'single' && (
                              <span className="admin__mensagem-badge admin__mensagem-badge--single">
                                <User size={12} /> {msg.targetSetores?.[0] || '---'}
                              </span>
                            )}
                            <span className={`admin__mensagem-badge ${msg.ativa ? 'admin__mensagem-badge--ativa' : 'admin__mensagem-badge--inativa'}`}>
                              {msg.ativa ? 'ATIVA' : 'INATIVA'}
                            </span>
                          </div>
                        </div>

                        <p className="admin__mensagem-card-texto">{msg.texto}</p>

                        {msg.targetType !== 'all' && msg.targetSetores?.length > 0 && (
                          <div className="admin__mensagem-card-setores">
                            <small>Setores: {msg.targetSetores.join(', ')}</small>
                          </div>
                        )}

                        <div className="admin__mensagem-card-footer">
                          <span className="admin__mensagem-card-date">
                            <Clock size={12} />
                            {new Date(msg.createdAt).toLocaleDateString('pt-BR')} às {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="admin__mensagem-card-actions">
                            <button
                              className="admin__mensagem-btn admin__mensagem-btn--toggle"
                              onClick={() => handleToggleMensagemAtiva(msg)}
                              title={msg.ativa ? 'Desativar' : 'Ativar'}
                            >
                              {msg.ativa ? <X size={14} /> : <CheckCircle size={14} />}
                            </button>
                            <button
                              className="admin__mensagem-btn admin__mensagem-btn--edit"
                              onClick={() => setEditingMensagem(msg)}
                              title="Editar"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              className="admin__mensagem-btn admin__mensagem-btn--delete"
                              onClick={() => handleDeleteMensagem(msg.id)}
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  )
}
