import React, { useState, useEffect, useRef, useMemo } from 'react'
import { MapPin, TrendingUp, Users, DollarSign, Package, Filter, RefreshCw, Flame, Eye, EyeOff, Maximize2, X, ChevronDown, ChevronUp } from 'lucide-react'
import './HeatMapAlagoas.css'

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

export default function HeatMapAlagoas() {
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedResponsavel, setSelectedResponsavel] = useState('all')
  const [showMarkers, setShowMarkers] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [hoveredCity, setHoveredCity] = useState(null)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const heatLayerRef = useRef(null)
  const markersLayerRef = useRef(null)

  // Carregar dados da API
  useEffect(() => {
    fetchMapData()
  }, [])

  const fetchMapData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/map/data')
      const data = await res.json()

      if (data.success) {
        setMapData(data)
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

  // Filtrar dados por responsável
  const filteredData = useMemo(() => {
    if (!mapData?.data) return []

    if (selectedResponsavel === 'all') {
      return mapData.data
    }

    return mapData.data.filter(city =>
      city.responsaveis.includes(selectedResponsavel)
    )
  }, [mapData, selectedResponsavel])

  // Lista de responsáveis únicos
  const responsaveis = useMemo(() => {
    if (!mapData?.stats?.responsaveis) return []
    return mapData.stats.responsaveis.sort()
  }, [mapData])

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
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current)
    }
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers()
    }

    // Criar dados para heatmap
    const heatData = filteredData.map(city => [
      city.coordinates.lat,
      city.coordinates.lng,
      city.intensidade
    ])

    // Adicionar heatmap usando círculos coloridos (sem leaflet.heat)
    filteredData.forEach(city => {
      const intensity = city.intensidade
      const radius = 15 + (intensity * 35)

      // Cor baseada na intensidade (verde abacate -> amarelo -> vermelho)
      const hue = 80 - (intensity * 80) // 80 (verde) -> 0 (vermelho)
      const color = `hsl(${hue}, 70%, 50%)`

      const circle = L.circleMarker([city.coordinates.lat, city.coordinates.lng], {
        radius: radius,
        fillColor: color,
        fillOpacity: 0.6,
        color: color,
        weight: 2,
        opacity: 0.8
      })

      // Tooltip customizado
      circle.bindTooltip(createTooltipContent(city), {
        className: 'heatmap-tooltip',
        direction: 'top',
        offset: [0, -10],
        permanent: false
      })

      circle.on('mouseover', () => setHoveredCity(city))
      circle.on('mouseout', () => setHoveredCity(null))

      markersLayerRef.current.addLayer(circle)
    })

    // Adicionar markers se habilitado
    if (showMarkers) {
      filteredData.forEach(city => {
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="marker-pin" style="--intensity: ${city.intensidade}">
                   <span class="marker-label">${formatCurrency(city.totalValor)}</span>
                 </div>`,
          iconSize: [60, 30],
          iconAnchor: [30, 15]
        })

        const marker = L.marker([city.coordinates.lat, city.coordinates.lng], {
          icon: customIcon
        })

        marker.bindTooltip(createTooltipContent(city), {
          className: 'heatmap-tooltip',
          direction: 'top',
          offset: [0, -15]
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
      <div className="heatmap-container">
        <div className="heatmap-loading">
          <div className="heatmap-loading__spinner"></div>
          <span className="mono">CARREGANDO MAPA DE CALOR...</span>
        </div>
      </div>
    )
  }

  // Renderizar erro
  if (error) {
    return (
      <div className="heatmap-container">
        <div className="heatmap-error">
          <MapPin size={32} />
          <p>{error}</p>
          <button className="heatmap-btn" onClick={fetchMapData}>
            <RefreshCw size={16} />
            <span>Tentar Novamente</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`heatmap-container ${isExpanded ? 'heatmap-container--expanded' : ''}`}>
      {/* Header */}
      <div className="heatmap-header">
        <div className="heatmap-header__title">
          <Flame size={20} className="heatmap-header__icon" />
          <h3>MAPA DE CALOR - ALAGOAS</h3>
        </div>
        <div className="heatmap-header__actions">
          <button
            className={`heatmap-icon-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filtros"
          >
            <Filter size={18} />
          </button>
          <button
            className={`heatmap-icon-btn ${showMarkers ? 'active' : ''}`}
            onClick={() => setShowMarkers(!showMarkers)}
            title={showMarkers ? 'Ocultar valores' : 'Mostrar valores'}
          >
            {showMarkers ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <button
            className="heatmap-icon-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimizar' : 'Expandir'}
          >
            {isExpanded ? <X size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="heatmap-filters">
          <div className="heatmap-filter-group">
            <label>
              <Users size={14} />
              <span>SUPERVISORA</span>
            </label>
            <select
              value={selectedResponsavel}
              onChange={(e) => setSelectedResponsavel(e.target.value)}
              className="heatmap-select"
            >
              <option value="all">Todas as Supervisoras</option>
              {responsaveis.map(resp => (
                <option key={resp} value={resp}>{resp}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="heatmap-stats">
          <div className="heatmap-stat">
            <MapPin size={16} />
            <div className="heatmap-stat__content">
              <span className="heatmap-stat__value">{stats.totalCidades}</span>
              <span className="heatmap-stat__label">Cidades</span>
            </div>
          </div>
          <div className="heatmap-stat heatmap-stat--primary">
            <DollarSign size={16} />
            <div className="heatmap-stat__content">
              <span className="heatmap-stat__value">{formatCurrency(stats.totalValor)}</span>
              <span className="heatmap-stat__label">Valor Total</span>
            </div>
          </div>
          <div className="heatmap-stat">
            <Package size={16} />
            <div className="heatmap-stat__content">
              <span className="heatmap-stat__value">{stats.totalPedidos}</span>
              <span className="heatmap-stat__label">Pedidos</span>
            </div>
          </div>
          <div className="heatmap-stat">
            <TrendingUp size={16} />
            <div className="heatmap-stat__content">
              <span className="heatmap-stat__value">{formatCurrency(stats.ticketMedio)}</span>
              <span className="heatmap-stat__label">Ticket Médio</span>
            </div>
          </div>
        </div>
      )}

      {/* Mapa */}
      <div className="heatmap-map-wrapper">
        <div ref={mapRef} className="heatmap-map"></div>

        {/* Legenda */}
        <div className="heatmap-legend">
          <span className="heatmap-legend__title">Intensidade</span>
          <div className="heatmap-legend__gradient">
            <div className="heatmap-legend__bar"></div>
            <div className="heatmap-legend__labels">
              <span>Baixo</span>
              <span>Alto</span>
            </div>
          </div>
        </div>

        {/* Cidade em hover */}
        {hoveredCity && (
          <div className="heatmap-hover-card">
            <div className="heatmap-hover-card__header">
              <MapPin size={14} />
              <span>{hoveredCity.cidade}</span>
            </div>
            <div className="heatmap-hover-card__value">
              {formatCurrency(hoveredCity.totalValor)}
            </div>
          </div>
        )}
      </div>

      {/* Top Cidades */}
      <div className="heatmap-ranking">
        <div className="heatmap-ranking__header">
          <TrendingUp size={16} />
          <span>TOP 5 CIDADES</span>
        </div>
        <div className="heatmap-ranking__list">
          {filteredData
            .sort((a, b) => b.totalValor - a.totalValor)
            .slice(0, 5)
            .map((city, index) => (
              <div key={city.cidade} className="heatmap-ranking__item">
                <span className="heatmap-ranking__position">#{index + 1}</span>
                <span className="heatmap-ranking__city">{city.cidade}</span>
                <span className="heatmap-ranking__value">{formatCurrency(city.totalValor)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
