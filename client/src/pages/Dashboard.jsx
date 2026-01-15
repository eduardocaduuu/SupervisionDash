import React, { useState, useEffect } from 'react'
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
        <span className="mono">LOADING SECTOR DATA...</span>
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
    
    let dataToExport = dealers
    if (filterType === 'NEAR_LEVEL_UP') dataToExport = dealers.filter(d => d.nearLevelUp)
    if (filterType === 'AT_RISK') dataToExport = dealers.filter(d => d.atRisk)
    
    const headers = ['Codigo', 'Nome', 'Setor', 'Segmento', 'Total Geral', 'Meta Manter', 'Meta Subir']
    const rows = dataToExport.map(d => [
      d.codigo, 
      d.nome, 
      d.setorId, 
      d.segmento, 
      d.totalGeral.toString().replace('.', ','), 
      d.metaManter, 
      d.metaSubir || ''
    ])
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `export_${filterType}_${setorId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
                label="NEAR LEVEL UP"
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
                label="AT RISK"
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
                {filteredDealers.map(dealer => (
                  <DealerCard
                    key={dealer.codigo}
                    dealer={dealer}
                    onClick={() => handleDealerClick(dealer)}
                  />
                ))}
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
