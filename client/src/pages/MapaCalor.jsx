import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, TrendingUp, Users, DollarSign, Package, Filter, RefreshCw, Flame, Eye, EyeOff, ArrowLeft, ChevronDown, ChevronUp, X } from 'lucide-react'
import './MapaCalor.css'

// Importar Leaflet e CSS
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix para ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

export default function MapaCalor() {
  const navigate = useNavigate()
  const [mapData, setMapData] = useState(null)
  const [allResponsaveis, setAllResponsaveis] = useState([])
  const [totalGeral, setTotalGeral] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedResponsavel, setSelectedResponsavel] = useState('all')
  const [showMarkers, setShowMarkers] = useState(true)
  const [showFilters, setShowFilters] = useState(true)
  const [hoveredCity, setHoveredCity] = useState(null)
  const [showRanking, setShowRanking] = useState(true)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)

  // Carregar dados da API (recarrega quando filtro muda)
  useEffect(() => {
    fetchMapData(selectedResponsavel)
  }, [selectedResponsavel])

  const fetchMapData = async (responsavel) => {
    setLoading(true)
    setError(null)
    try {
      // Passar filtro de responsável para a API
      const url = responsavel && responsavel !== 'all'
        ? `/api/map/data?responsavel=${encodeURIComponent(responsavel)}`
        : '/api/map/data'

      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        setMapData(data)

        // Salvar lista de responsáveis e total geral no primeiro carregamento
        if (responsavel === 'all' || !responsavel) {
          setAllResponsaveis(data.stats?.responsaveis || [])
          setTotalGeral({
            cidades: data.stats?.totalCidades || 0,
            valor: data.stats?.totalValor || 0,
            pedidos: data.stats?.totalPedidos || 0
          })
        }
      } else {
        setError(data.error || 'Erro ao carregar dados do mapa')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
      console.error('Erro ao carregar mapa:', err)
    } finally {
      setLoading(false)
    }
  }

  // Dados já vêm filtrados do backend
  const filteredData = useMemo(() => {
    return mapData?.data || []
  }, [mapData])

  // Lista de responsáveis únicos (carregada no primeiro load)
  const responsaveis = useMemo(() => {
    return allResponsaveis
  }, [allResponsaveis])

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || loading || error) return

    // Centro de Alagoas
    const centerLat = -9.5
    const centerLng = -36.5

    // Criar mapa se não existir
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 8,
        zoomControl: false,
        attributionControl: false
      })

      // Adicionar controle de zoom customizado
      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapInstanceRef.current)

      // Tile layer escuro para combinar com o tema
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)

      // Criar layer groups
      markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [loading, error])

  // Atualizar heatmap e markers quando dados mudam
  useEffect(() => {
    if (!mapInstanceRef.current || !filteredData.length) return

    // Limpar layers anteriores
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers()
    }

    // Adicionar círculos coloridos para o heatmap
    filteredData.forEach(city => {
      const intensity = city.intensidade
      const radius = 20 + (intensity * 50)

      // Cor baseada na intensidade (verde abacate -> amarelo -> vermelho)
      const hue = 80 - (intensity * 80)
      const color = `hsl(${hue}, 70%, 50%)`

      const circle = L.circleMarker([city.coordinates.lat, city.coordinates.lng], {
        radius: radius,
        fillColor: color,
        fillOpacity: 0.6,
        color: color,
        weight: 3,
        opacity: 0.9
      })

      // Tooltip customizado
      circle.bindTooltip(createTooltipContent(city), {
        className: 'mapa-tooltip',
        direction: 'top',
        offset: [0, -10],
        permanent: false
      })

      circle.on('mouseover', () => setHoveredCity(city))
      circle.on('mouseout', () => setHoveredCity(null))

      markersLayerRef.current.addLayer(circle)
    })

    // Adicionar markers com valores se habilitado
    if (showMarkers) {
      filteredData.forEach(city => {
        const customIcon = L.divIcon({
          className: 'mapa-marker',
          html: `<div class="mapa-marker-pin">
                   <span class="mapa-marker-label">${formatCurrency(city.totalValor, true)}</span>
                 </div>`,
          iconSize: [80, 35],
          iconAnchor: [40, 17]
        })

        const marker = L.marker([city.coordinates.lat, city.coordinates.lng], {
          icon: customIcon
        })

        marker.bindTooltip(createTooltipContent(city), {
          className: 'mapa-tooltip',
          direction: 'top',
          offset: [0, -20]
        })

        markersLayerRef.current.addLayer(marker)
      })
    }

  }, [filteredData, showMarkers])

  // Criar conteúdo do tooltip
  const createTooltipContent = (city) => {
    return `
      <div class="tooltip-content">
        <div class="tooltip-header">${city.cidade}</div>
        <div class="tooltip-row">
          <span>Valor Total:</span>
          <strong>${formatCurrency(city.totalValor)}</strong>
        </div>
        <div class="tooltip-row">
          <span>Pedidos:</span>
          <strong>${city.qtdPedidos}</strong>
        </div>
        <div class="tooltip-row">
          <span>Itens:</span>
          <strong>${city.totalItens}</strong>
        </div>
        <div class="tooltip-row">
          <span>Ticket Médio:</span>
          <strong>${formatCurrency(city.ticketMedio)}</strong>
        </div>
        ${city.responsaveis.length > 0 ? `
          <div class="tooltip-divider"></div>
          <div class="tooltip-responsaveis">
            ${city.responsaveis.map(r => `<span class="tooltip-tag">${r}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `
  }

  // Formatar moeda
  const formatCurrency = (value, short = false) => {
    if (short && value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value)
  }

  // Calcular estatísticas filtradas
  const stats = useMemo(() => {
    if (!filteredData.length) return null

    return {
      totalCidades: filteredData.length,
      totalValor: filteredData.reduce((sum, c) => sum + c.totalValor, 0),
      totalItens: filteredData.reduce((sum, c) => sum + c.totalItens, 0),
      totalPedidos: filteredData.reduce((sum, c) => sum + c.qtdPedidos, 0),
      ticketMedio: filteredData.reduce((sum, c) => sum + c.totalValor, 0) /
                   filteredData.reduce((sum, c) => sum + c.qtdPedidos, 0)
    }
  }, [filteredData])

  // Renderizar loading
  if (loading) {
    return (
      <div className="mapa-page">
        <div className="mapa-loading">
          <div className="mapa-loading__spinner"></div>
          <span className="mono">CARREGANDO MAPA DE CALOR...</span>
        </div>
      </div>
    )
  }

  // Renderizar erro
  if (error) {
    return (
      <div className="mapa-page">
        <div className="mapa-error">
          <MapPin size={48} />
          <h2>Erro ao carregar mapa</h2>
          <p>{error}</p>
          <div className="mapa-error__actions">
            <button className="mapa-btn" onClick={fetchMapData}>
              <RefreshCw size={18} />
              <span>Tentar Novamente</span>
            </button>
            <button className="mapa-btn mapa-btn--secondary" onClick={() => navigate('/')}>
              <ArrowLeft size={18} />
              <span>Voltar</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mapa-page">
      {/* Header */}
      <header className="mapa-header">
        <div className="mapa-header__left">
          <button className="mapa-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
          <div className="mapa-header__title">
            <Flame size={24} className="mapa-header__icon" />
            <h1>MAPA DE CALOR</h1>
            <span className="mapa-header__subtitle">ALAGOAS</span>
          </div>
        </div>
        <div className="mapa-header__actions">
          <button
            className={`mapa-header-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            <span>Filtros</span>
          </button>
          <button
            className={`mapa-header-btn ${showMarkers ? 'active' : ''}`}
            onClick={() => setShowMarkers(!showMarkers)}
          >
            {showMarkers ? <Eye size={18} /> : <EyeOff size={18} />}
            <span>Valores</span>
          </button>
          <button
            className={`mapa-header-btn ${showRanking ? 'active' : ''}`}
            onClick={() => setShowRanking(!showRanking)}
          >
            <TrendingUp size={18} />
            <span>Ranking</span>
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="mapa-stats">
          <div className="mapa-stat">
            <MapPin size={18} />
            <div className="mapa-stat__content">
              <span className="mapa-stat__value">{stats.totalCidades}</span>
              <span className="mapa-stat__label">Cidades</span>
            </div>
          </div>
          <div className="mapa-stat mapa-stat--highlight">
            <DollarSign size={18} />
            <div className="mapa-stat__content">
              <span className="mapa-stat__value">{formatCurrency(stats.totalValor, true)}</span>
              <span className="mapa-stat__label">Valor Total</span>
            </div>
          </div>
          <div className="mapa-stat">
            <Package size={18} />
            <div className="mapa-stat__content">
              <span className="mapa-stat__value">{stats.totalPedidos.toLocaleString('pt-BR')}</span>
              <span className="mapa-stat__label">Pedidos</span>
            </div>
          </div>
          <div className="mapa-stat">
            <TrendingUp size={18} />
            <div className="mapa-stat__content">
              <span className="mapa-stat__value">{formatCurrency(stats.ticketMedio, true)}</span>
              <span className="mapa-stat__label">Ticket Médio</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mapa-content">
        {/* Filtros Sidebar */}
        {showFilters && (
          <aside className="mapa-sidebar">
            <div className="mapa-sidebar__header">
              <Users size={16} />
              <span>FILTRAR POR SUPERVISORA</span>
            </div>
            <div className="mapa-sidebar__content">
              <button
                className={`mapa-filter-btn ${selectedResponsavel === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedResponsavel('all')}
              >
                <span>Todas as Supervisoras</span>
                <span className="mapa-filter-btn__count">{totalGeral?.cidades || 0}</span>
              </button>
              {responsaveis.map(resp => (
                <button
                  key={resp}
                  className={`mapa-filter-btn ${selectedResponsavel === resp ? 'active' : ''}`}
                  onClick={() => setSelectedResponsavel(resp)}
                >
                  <span>{resp}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Mapa */}
        <div className="mapa-wrapper">
          <div ref={mapRef} className="mapa-leaflet"></div>

          {/* Legenda */}
          <div className="mapa-legend">
            <span className="mapa-legend__title">INTENSIDADE DE VENDAS</span>
            <div className="mapa-legend__bar"></div>
            <div className="mapa-legend__labels">
              <span>Baixo</span>
              <span>Médio</span>
              <span>Alto</span>
            </div>
          </div>

          {/* Hover Card */}
          {hoveredCity && (
            <div className="mapa-hover-card">
              <div className="mapa-hover-card__header">
                <MapPin size={16} />
                <span>{hoveredCity.cidade}</span>
              </div>
              <div className="mapa-hover-card__value">
                {formatCurrency(hoveredCity.totalValor)}
              </div>
              <div className="mapa-hover-card__details">
                <span>{hoveredCity.qtdPedidos} pedidos</span>
                <span>{hoveredCity.totalItens} itens</span>
              </div>
            </div>
          )}
        </div>

        {/* Ranking Sidebar */}
        {showRanking && (
          <aside className="mapa-ranking">
            <div className="mapa-ranking__header">
              <TrendingUp size={16} />
              <span>TOP 10 CIDADES</span>
            </div>
            <div className="mapa-ranking__list">
              {filteredData
                .sort((a, b) => b.totalValor - a.totalValor)
                .slice(0, 10)
                .map((city, index) => (
                  <div key={city.cidade} className={`mapa-ranking__item ${index < 3 ? 'mapa-ranking__item--top' : ''}`}>
                    <span className="mapa-ranking__position">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <div className="mapa-ranking__info">
                      <span className="mapa-ranking__city">{city.cidade}</span>
                      <span className="mapa-ranking__pedidos">{city.qtdPedidos} pedidos</span>
                    </div>
                    <span className="mapa-ranking__value">{formatCurrency(city.totalValor, true)}</span>
                  </div>
                ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
