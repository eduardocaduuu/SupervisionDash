import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  DollarSign, Users, TrendingUp, AlertTriangle,
  Search, SlidersHorizontal, Grid, List
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
  let filteredDealers = dealers.filter(d =>
    d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  filteredDealers = [...filteredDealers].sort((a, b) => {
    switch (sortBy) {
      case 'levelUp':
        return (b.percentSubir || 0) - (a.percentSubir || 0)
      case 'delta':
        return b.deltaDia - a.deltaDia
      case 'total':
        return b.totalCicloAtual - a.totalCicloAtual
      case 'risk':
        return a.percentManter - b.percentManter
      default:
        return 0
    }
  })

  const handleDealerClick = (dealer) => {
    setSelectedDealer(dealer)
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
            <MetricCard
              label="TOTAL DO SETOR"
              value={kpis.totalSetor}
              format="currency"
              icon={DollarSign}
            />
            <MetricCard
              label="REVENDEDORES"
              value={kpis.qtdRevendedores}
              icon={Users}
              variant="cyan"
            />
            <MetricCard
              label="NEAR LEVEL UP"
              value={kpis.nearLevelUp}
              subtext="≥80% meta subir"
              icon={TrendingUp}
              variant="cyan"
            />
            <MetricCard
              label="AT RISK"
              value={kpis.atRisk}
              subtext="<30% meta manter"
              icon={AlertTriangle}
              variant="danger"
            />
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
