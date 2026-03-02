import React, { useState, useEffect, useRef, useMemo } from 'react'
import { MapPin, TrendingUp, DollarSign, Package, RefreshCw, Flame, Maximize2 } from 'lucide-react'
import './MapaCalorTab.css'

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

export default function MapaCalorTab({ setorId }) {
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)

  // Carregar dados da API filtrados por setor
  useEffect(() => {
    if (setorId) {
      fetchMapData()
    }
  }, [setorId])

  const fetchMapData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/map/data?setorId=${setorId}`)
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
        zoomControl: true,
        attributionControl: false
      })

      // Tile layer escuro para combinar com o tema
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
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

  // Atualizar markers quando dados mudam
  useEffect(() => {
    if (!mapInstanceRef.current || !mapData?.data?.length) return

    // Limpar layers anteriores
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers()
    }

    // Adicionar círculos coloridos
    mapData.data.forEach(city => {
      const intensity = city.intensidade
      const radius = 15 + (intensity * 35)

      // Cor baseada na intensidade (verde -> amarelo -> vermelho)
      const hue = 80 - (intensity * 80)
      const color = `hsl(${hue}, 70%, 50%)`

      const circle = L.circleMarker([city.coordinates.lat, city.coordinates.lng], {
        radius: radius,
        fillColor: color,
        fillOpacity: 0.6,
        color: color,
        weight: 2,
        opacity: 0.8
      })

      // Tooltip
      circle.bindTooltip(`
        <div style="text-align: center;">
          <strong>${city.cidade}</strong><br/>
          ${formatCurrency(city.totalValor)}<br/>
          <small>${city.qtdPedidos} pedidos</small>
        </div>
      `, {
        direction: 'top',
        offset: [0, -10]
      })

      markersLayerRef.current.addLayer(circle)

      // Adicionar label de valor
      const valueIcon = L.divIcon({
        className: 'mapa-value-marker',
        html: `<span>${formatCurrency(city.totalValor, true)}</span>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
      })

      const marker = L.marker([city.coordinates.lat, city.coordinates.lng], {
        icon: valueIcon
      })

      markersLayerRef.current.addLayer(marker)
    })

    // Ajustar zoom para mostrar todos os pontos
    if (mapData.data.length > 0) {
      const bounds = L.latLngBounds(
        mapData.data.map(c => [c.coordinates.lat, c.coordinates.lng])
      )
      mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] })
    }

  }, [mapData])

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

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (!mapData?.data?.length) return null

    return {
      totalCidades: mapData.data.length,
      totalValor: mapData.data.reduce((sum, c) => sum + c.totalValor, 0),
      totalItens: mapData.data.reduce((sum, c) => sum + c.totalItens, 0),
      totalPedidos: mapData.data.reduce((sum, c) => sum + c.qtdPedidos, 0),
      ticketMedio: mapData.data.reduce((sum, c) => sum + c.totalValor, 0) /
                   Math.max(1, mapData.data.reduce((sum, c) => sum + c.qtdPedidos, 0))
    }
  }, [mapData])

  // Renderizar loading
  if (loading) {
    return (
      <div className="mapa-tab">
        <div className="mapa-tab__loading">
          <div className="mapa-tab__spinner"></div>
          <span className="mono">CARREGANDO MAPA DE CALOR...</span>
        </div>
      </div>
    )
  }

  // Renderizar erro ou sem dados
  if (error || !mapData?.data?.length) {
    return (
      <div className="mapa-tab">
        <div className="mapa-tab__empty">
          <MapPin size={48} />
          <h3>{error || 'Nenhum dado encontrado'}</h3>
          <p>Não há dados de mapa disponíveis para este setor.</p>
          <button className="mapa-tab__btn" onClick={fetchMapData}>
            <RefreshCw size={16} />
            <span>Tentar Novamente</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mapa-tab">
      {/* Header */}
      <div className="mapa-tab__header">
        <div className="mapa-tab__title">
          <Flame size={24} />
          <h2>MAPA DE CALOR</h2>
        </div>
        <div className="mapa-tab__actions">
          <button className="mapa-tab__refresh" onClick={fetchMapData} title="Atualizar">
            <RefreshCw size={16} />
          </button>
          <button
            className="mapa-tab__expand"
            onClick={() => window.open(`/mapa-calor?setor=${setorId}`, '_blank')}
            title="Abrir em nova aba"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mapa-tab__stats">
          <div className="mapa-tab__stat">
            <MapPin size={18} />
            <div>
              <span className="mapa-tab__stat-value">{stats.totalCidades}</span>
              <span className="mapa-tab__stat-label">Cidades</span>
            </div>
          </div>
          <div className="mapa-tab__stat mapa-tab__stat--primary">
            <DollarSign size={18} />
            <div>
              <span className="mapa-tab__stat-value">{formatCurrency(stats.totalValor)}</span>
              <span className="mapa-tab__stat-label">Valor Total</span>
            </div>
          </div>
          <div className="mapa-tab__stat">
            <Package size={18} />
            <div>
              <span className="mapa-tab__stat-value">{stats.totalPedidos}</span>
              <span className="mapa-tab__stat-label">Pedidos</span>
            </div>
          </div>
          <div className="mapa-tab__stat">
            <TrendingUp size={18} />
            <div>
              <span className="mapa-tab__stat-value">{formatCurrency(stats.ticketMedio)}</span>
              <span className="mapa-tab__stat-label">Ticket Médio</span>
            </div>
          </div>
        </div>
      )}

      {/* Mapa */}
      <div className="mapa-tab__map-container">
        <div ref={mapRef} className="mapa-tab__map"></div>

        {/* Legenda */}
        <div className="mapa-tab__legend">
          <span>Intensidade:</span>
          <div className="mapa-tab__legend-bar"></div>
          <div className="mapa-tab__legend-labels">
            <span>Baixo</span>
            <span>Alto</span>
          </div>
        </div>
      </div>

      {/* Top Cidades */}
      <div className="mapa-tab__ranking">
        <div className="mapa-tab__ranking-header">
          <TrendingUp size={16} />
          <span>TOP CIDADES</span>
        </div>
        <div className="mapa-tab__ranking-list">
          {mapData.data
            .sort((a, b) => b.totalValor - a.totalValor)
            .slice(0, 5)
            .map((city, index) => (
              <div key={city.cidade} className="mapa-tab__ranking-item">
                <span className="mapa-tab__ranking-pos">#{index + 1}</span>
                <span className="mapa-tab__ranking-city">{city.cidade}</span>
                <span className="mapa-tab__ranking-value">{formatCurrency(city.totalValor)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
