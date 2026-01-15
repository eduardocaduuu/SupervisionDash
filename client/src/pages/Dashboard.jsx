import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { useParams } from 'react-router-dom'
import {
  DollarSign, Users, TrendingUp, AlertTriangle,
  Search, SlidersHorizontal, Grid, List, Download
} from 'lucide-react'
import HUDHeader from '../components/HUDHeader'
import MetricCard from '../components/MetricCard'
import DealerCard from '../components/DealerCard'
import DealerModal from '../components/DealerModal'
import CiclosTab from './CiclosTab'
import RankTab from './RankTab'
import './Dashboard.css'

// SAFELIST: text-red-500 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]
// SAFELIST: text-yellow-400 bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_10px_rgba(250,204,21,0.2)]
// SAFELIST: text-green-400 bg-green-400/10 border-green-400/20 shadow-[0_0_10px_rgba(74,222,128,0.2)]
// SAFELIST: text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]

// Configuração robusta de Status (Texto + Estilo)
const getStatusConfig = (rawStatus) => {
  if (!rawStatus) return { label: 'Unknown', style: 'bg-gray-500/10 text-gray-400 border-gray-500/20' }
  
  const s = rawStatus.toString().toUpperCase().trim()

  // 1. 🔴 NEON VERMELHO (Crítico)
  if (s.includes('CRITIC') || s.includes('CRÍTICO') || s.includes('BOOST') || s.includes('NEED') || s.includes('ACELERAR')) {
    return {
      label: 'CRÍTICO - PRECISA ACELERAR',
      style: 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
    }
  }

  // 2. 🟡 NEON AMARELO (Aquecendo)
  if (s.includes('WARM') || s.includes('AQUECENDO')) {
    return {
      label: 'AQUECENDO',
      style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(250,204,21,0.2)]'
    }
  }

  // 3. 🟢 NEON VERDE CLARO (No Caminho)
  if (s.includes('TRACK') || s.includes('CAMINHO') || s.includes('SYSTEM OK')) {
    return {
      label: 'NO CAMINHO',
      style: 'bg-green-400/10 text-green-400 border-green-400/20 shadow-[0_0_10px_rgba(74,222,128,0.2)]'
    }
  }

  // 4. ❇️ NEON ESMERALDA/FORTE (Quase lá / Meta)
  if (s.includes('ALMOST') || s.includes('QUASE')) {
    return {
      label: 'QUASE LÁ',
      style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
    }
  }
  
  if (s.includes('READY') || s.includes('LEVEL') || s.includes('PRONTO') || s.includes('SUBIR')) {
    return {
      label: 'PRONTO PARA SUBIR',
      style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
    }
  }

  if (s.includes('MISSION') || s.includes('MISSÃO') || s.includes('SECURE') || s.includes('CUMPRIDA')) {
    return {
      label: 'MISSÃO CUMPRIDA',
      style: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
    }
  }
  
  return {
    label: rawStatus,
    style: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }
}

export default function Dashboard() {
  const { setorId } = useParams()
  const [dashboardData, setDashboardData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('revendedores')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('levelUp')
  const [selectedDealer, setSelectedDealer] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [activeFilter, setActiveFilter] = useState('ALL') // 'ALL', 'NEAR_LEVEL_UP', 'AT_RISK'

  useEffect(() => {
    fetch(`/api/setor/${setorId}`)
      .then(r => r.json())
      .then(data => {
        setDashboardData(data)
        setIsLoading(false)
      })
      .catch(console.error)
  }, [setorId])

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading__spinner"></div>
        <span className="mono">CARREGANDO DADOS DO SETOR...</span>
      </div>
    )
  }

  const { setor, cicloAtual, snapshotAtivo, kpis, dealers } = dashboardData

  // Filter and sort dealers
  let filteredDealers = dealers.filter(d => {
    // 1. Filtro de Busca (Texto)
    const matchesSearch = d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false

    // 2. Filtro Ativo (Cards)
    if (activeFilter === 'NEAR_LEVEL_UP') return d.nearLevelUp
    if (activeFilter === 'AT_RISK') return d.atRisk
    
    return true
  })

  filteredDealers = [...filteredDealers].sort((a, b) => {
    switch (sortBy) {
      case 'levelUp':
        return (b.percentSubir || 0) - (a.percentSubir || 0)
      case 'delta':
        return b.deltaDia - a.deltaDia
      case 'total':
        return b.totalGeral - a.totalGeral
      case 'risk':
        return a.percentManter - b.percentManter
      default:
        return 0
    }
  })

  const handleDealerClick = (dealer) => {
    setSelectedDealer(dealer)
  }

  // Toggle Filter Logic
  const handleFilterClick = (filterType) => {
    if (activeFilter === filterType) {
      setActiveFilter('ALL')
    } else {
      setActiveFilter(filterType)
    }
  }

  // Export Logic
  const handleExport = (e, filterType) => {
    e.stopPropagation()
    
    let filteredData = dealers
    if (filterType === 'NEAR_LEVEL_UP') filteredData = dealers.filter(d => d.nearLevelUp)
    if (filterType === 'AT_RISK') filteredData = dealers.filter(d => d.atRisk)
    
    const dataToExport = filteredData.map(d => ({
      Codigo: d.codigo,
      Nome: d.nome,
      Setor: d.setorId,
      Segmento: d.segmento,
      'Total Geral': d.totalGeral,
      'Meta Manter': d.metaManter,
      'Meta Subir': d.metaSubir || ''
    }))

    const date = new Date().toISOString().split('T')[0]
    const filename = `Revendedores_${filterType}_${setorId}_${date}.xlsx`

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Revendedores")
    XLSX.writeFile(wb, filename)
  }

  return (
    <div className="dashboard">
      <HUDHeader
        setor={setor}
        cicloAtual={cicloAtual}
        snapshotAtivo={snapshotAtivo}
      />

      <main className="main-content">
        <div className="container">
          {/* KPIs */}
          <section className="dashboard__kpis">
            {/* TOTAL (Reset Filter) */}
            <div 
              className="kpi-wrapper" 
              onClick={() => handleFilterClick('ALL')}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <MetricCard
                label="TOTAL DO SETOR"
                value={kpis.totalSetor}
                format="currency"
                icon={DollarSign}
              />
            </div>

            {/* REVENDEDORES (Filter ALL) */}
            <div 
              className="kpi-wrapper"
              onClick={() => handleFilterClick('ALL')}
              style={{ 
                cursor: 'pointer', 
                position: 'relative',
                outline: activeFilter === 'ALL' ? '3px solid var(--color-neon-primary)' : 'none',
                outlineOffset: '2px',
                borderRadius: '4px'
              }}
            >
              <MetricCard
                label="REVENDEDORES"
                value={kpis.qtdRevendedores}
                icon={Users}
                variant="cyan"
              />
              <button 
                className="kpi-export-btn"
                onClick={(e) => handleExport(e, 'ALL')}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', padding: 4, borderRadius: 4, cursor: 'pointer' }}
              >
                <Download size={14} />
              </button>
            </div>

            {/* NEAR LEVEL UP (Filter) */}
            <div 
              className="kpi-wrapper"
              onClick={() => handleFilterClick('NEAR_LEVEL_UP')}
              style={{ 
                cursor: 'pointer', 
                position: 'relative',
                outline: activeFilter === 'NEAR_LEVEL_UP' ? '3px solid var(--color-neon-secondary)' : 'none',
                outlineOffset: '2px',
                borderRadius: '4px'
              }}
            >
              <MetricCard
                label="PERTO DE SUBIR"
                value={kpis.nearLevelUp}
                subtext="≥80% meta subir"
                icon={TrendingUp}
                variant="cyan"
              />
              <button 
                className="kpi-export-btn"
                onClick={(e) => handleExport(e, 'NEAR_LEVEL_UP')}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', padding: 4, borderRadius: 4, cursor: 'pointer' }}
              >
                <Download size={14} />
              </button>
            </div>

            {/* AT RISK (Filter) */}
            <div 
              className="kpi-wrapper"
              onClick={() => handleFilterClick('AT_RISK')}
              style={{ 
                cursor: 'pointer', 
                position: 'relative',
                outline: activeFilter === 'AT_RISK' ? '3px solid var(--color-neon-danger)' : 'none',
                outlineOffset: '2px',
                borderRadius: '4px'
              }}
            >
              <MetricCard
                label="EM RISCO"
                value={kpis.atRisk}
                subtext="<30% meta manter"
                icon={AlertTriangle}
                variant="danger"
              />
              <button 
                className="kpi-export-btn"
                onClick={(e) => handleExport(e, 'AT_RISK')}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', padding: 4, borderRadius: 4, cursor: 'pointer' }}
              >
                <Download size={14} />
              </button>
            </div>
          </section>

          {/* TABS */}
          <div className="dashboard__tabs">
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'revendedores' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('revendedores')}
              >
                REVENDEDORES
              </button>
              <button
                className={`tab ${activeTab === 'ciclos' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('ciclos')}
              >
                CICLOS
              </button>
              <button
                className={`tab ${activeTab === 'rank' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('rank')}
              >
                RANK DO DIA
              </button>
            </div>
          </div>

          {/* TAB CONTENT */}
          {activeTab === 'revendedores' && (
            <>
              {/* SEARCH & SORT */}
              <div className="search-sort-bar">
                <div className="search-box">
                  <Search size={18} className="search-box__icon" />
                  <input
                    type="text"
                    className="input search-box__input"
                    placeholder="Buscar por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="sort-group">
                  <SlidersHorizontal size={16} />
                  <select
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="levelUp">Mais perto de SUBIR</option>
                    <option value="delta">Maior Δ do dia</option>
                    <option value="total">Maior total</option>
                    <option value="risk">Maior risco</option>
                  </select>
                </div>
                <div className="view-toggle">
                  <button
                    className={`view-toggle__btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    className={`view-toggle__btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>

              {/* DEALERS GRID */}
              <div className={`dealers-grid ${viewMode === 'list' ? 'dealers-grid--list' : ''}`}>
                {filteredDealers.map(dealer => {
                  const { label, style } = getStatusConfig(dealer.impulso)
                  const dealerDisplay = {
                    ...dealer,
                    impulso: label, // Força o texto traduzido
                    statusClass: style // Gera a cor baseada na tradução
                  }
                  return (
                    <DealerCard
                      key={dealer.codigo}
                      dealer={dealerDisplay}
                      onClick={() => handleDealerClick(dealerDisplay)}
                    />
                  )
                })}
              </div>

              {filteredDealers.length === 0 && (
                <div className="no-results">
                  <span className="mono">NENHUM REVENDEDOR ENCONTRADO</span>
                </div>
              )}
            </>
          )}

          {activeTab === 'ciclos' && (
            <CiclosTab setorId={setorId} />
          )}

          {activeTab === 'rank' && (
            <RankTab setorId={setorId} />
          )}
        </div>
      </main>

      {/* DEALER MODAL */}
      {selectedDealer && (
        <DealerModal
          dealer={selectedDealer}
          onClose={() => setSelectedDealer(null)}
        />
      )}
    </div>
  )
}
