import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Flame } from 'lucide-react'
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
  const [searchParams] = useSearchParams()
  const setorId = searchParams.get('setor')

  const [mapData, setMapData] = useState(null)
  const [allResponsaveis, setAllResponsaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedResponsavel, setSelectedResponsavel] = useState('all')
  const [hoveredCity, setHoveredCity] = useState(null)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)

  // Carregar dados da API (recarrega quando filtro muda)
  useEffect(() => {
    fetchMapData(selectedResponsavel)
  }, [selectedResponsavel, setorId])

  const fetchMapData = async (responsavel) => {
    setLoading(true)
    setError(null)
    try {
      // Se tiver setorId, usa filtro por setor, senão usa filtro por responsável
      let url = '/api/map/data'
      if (setorId) {
        url = `/api/map/data?setorId=${setorId}`
      } else if (responsavel && responsavel !== 'all') {
        url = `/api/map/data?responsavel=${encodeURIComponent(responsavel)}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        setMapData(data)
        if (!setorId && (responsavel === 'all' || !responsavel)) {
          setAllResponsaveis(data.stats?.responsaveis || [])
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

  const filteredData = useMemo(() => {
    return mapData?.data || []
  }, [mapData])

  const responsaveis = useMemo(() => {
    return allResponsaveis.sort()
  }, [allResponsaveis])

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || loading || error) return

    const centerLat = -9.5
    const centerLng = -36.5

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 8,
        zoomControl: true,
        attributionControl: false
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)

      markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [loading, error])

  // Atualizar heatmap quando dados mudam
  useEffect(() => {
    if (!mapInstanceRef.current || !filteredData.length) return

    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers()
    }

    filteredData.forEach(city => {
      const intensity = city.intensidade
      const radius = 20 + (intensity * 50)
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

      circle.bindTooltip(createTooltipContent(city), {
        className: 'mapa-tooltip',
        direction: 'top',
        offset: [0, -10],
        permanent: false
      })

      circle.on('mouseover', () => setHoveredCity(city))
      circle.on('mouseout', () => setHoveredCity(null))

      markersLayerRef.current.addLayer(circle)

      // Marker com valor
      const customIcon = L.divIcon({
        className: 'mapa-marker',
        html: `<div class="mapa-marker-pin">
                 <span class="mapa-marker-label">${formatCurrency(city.totalValor)}</span>
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
  }, [filteredData])

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
      </div>
    `
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value)
  }

  if (loading) {
    return (
      <div className="mapa-fullscreen">
        <div className="mapa-loading">
          <div className="mapa-loading__spinner"></div>
          <span>CARREGANDO MAPA...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mapa-fullscreen">
        <div className="mapa-error">
          <p>{error}</p>
          <button onClick={() => fetchMapData(selectedResponsavel)}>Tentar Novamente</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mapa-fullscreen">
      {/* Filtro flutuante */}
      <div className="mapa-filter-float">
        <div className="mapa-filter-float__header">
          <Flame size={18} />
          <span>MAPA DE CALOR {setorId ? `- SETOR ${setorId}` : ''}</span>
        </div>
        {!setorId && (
          <div className="mapa-filter-float__select">
            <Users size={14} />
            <select
              value={selectedResponsavel}
              onChange={(e) => setSelectedResponsavel(e.target.value)}
            >
              <option value="all">Todas as Supervisoras</option>
              {responsaveis.map(resp => (
                <option key={resp} value={resp}>{resp}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Mapa */}
      <div ref={mapRef} className="mapa-full"></div>

      {/* Legenda */}
      <div className="mapa-legend-float">
        <span className="mapa-legend-float__title">INTENSIDADE</span>
        <div className="mapa-legend-float__bar"></div>
        <div className="mapa-legend-float__labels">
          <span>Baixo</span>
          <span>Alto</span>
        </div>
      </div>

      {/* Hover Card */}
      {hoveredCity && (
        <div className="mapa-hover-float">
          <div className="mapa-hover-float__city">{hoveredCity.cidade}</div>
          <div className="mapa-hover-float__value">{formatCurrency(hoveredCity.totalValor)}</div>
          <div className="mapa-hover-float__details">
            {hoveredCity.qtdPedidos} pedidos | {hoveredCity.totalItens} itens
          </div>
        </div>
      )}
    </div>
  )
}
