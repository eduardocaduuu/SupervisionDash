import React, { useState, useEffect } from 'react'
import { Package, ShoppingCart, TrendingUp, Link2 } from 'lucide-react'
import Panel from '../components/Panel'
import './ProdutosTab.css'

export default function ProdutosTab({ setorId }) {
  const [produtosData, setProdutosData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`/api/setor/${setorId}/produtos`)
      .then(r => {
        if (!r.ok) throw new Error('Erro ao carregar dados')
        return r.json()
      })
      .then(data => {
        setProdutosData(data)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [setorId])

  if (isLoading) {
    return (
      <div className="produtos-loading">
        <span className="mono">CARREGANDO DADOS DE PRODUTOS...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="produtos-error">
        <span className="mono">ERRO: {error}</span>
      </div>
    )
  }

  const { totalTransacoes, totalProdutosUnicos, associacoes, topProdutos } = produtosData

  return (
    <div className="produtos-tab">
      {/* ESTATISTICAS */}
      <div className="produtos-stats">
        <div className="produtos-stat">
          <ShoppingCart size={20} />
          <div className="produtos-stat__info">
            <span className="produtos-stat__value mono">{totalTransacoes}</span>
            <span className="produtos-stat__label">Transacoes</span>
          </div>
        </div>
        <div className="produtos-stat">
          <Package size={20} />
          <div className="produtos-stat__info">
            <span className="produtos-stat__value mono">{totalProdutosUnicos}</span>
            <span className="produtos-stat__label">Produtos Unicos</span>
          </div>
        </div>
      </div>

      {/* PRODUTOS MAIS VENDIDOS */}
      <Panel
        title="TOP 10 PRODUTOS MAIS VENDIDOS"
        headerRight={<TrendingUp size={18} />}
        noPadding
      >
        <div className="top-produtos-list">
          {topProdutos && topProdutos.length > 0 ? (
            topProdutos.map((produto, idx) => (
              <div key={idx} className="top-produto-item">
                <div className="top-produto-item__position">
                  <span className="mono">{idx + 1}</span>
                </div>
                <div className="top-produto-item__info">
                  <span className="top-produto-item__name">{produto.nome}</span>
                </div>
                <div className="top-produto-item__qty">
                  <span className="mono">{produto.quantidade} un</span>
                </div>
              </div>
            ))
          ) : (
            <div className="produtos-empty">
              <span className="mono">NENHUM PRODUTO ENCONTRADO</span>
            </div>
          )}
        </div>
      </Panel>

      {/* ASSOCIACOES */}
      <Panel
        title="PRODUTOS COMPRADOS JUNTOS"
        headerRight={<Link2 size={18} />}
        className="produtos-tab__associacoes"
      >
        <p className="associacoes-desc">
          Produtos que aparecem frequentemente na mesma compra
        </p>
        <div className="associacoes-list">
          {associacoes && associacoes.length > 0 ? (
            associacoes.map((assoc, idx) => (
              <div key={idx} className="associacao-item">
                <div className="associacao-item__rank">
                  <span className="mono">{idx + 1}</span>
                </div>
                <div className="associacao-item__produtos">
                  <div className="associacao-item__produto">
                    <Package size={14} />
                    <span>{assoc.produto1}</span>
                  </div>
                  <div className="associacao-item__connector">
                    <Link2 size={12} />
                  </div>
                  <div className="associacao-item__produto">
                    <Package size={14} />
                    <span>{assoc.produto2}</span>
                  </div>
                </div>
                <div className="associacao-item__stats">
                  <span className="associacao-item__freq mono">{assoc.frequencia}x</span>
                  <span className="associacao-item__percent">{assoc.percentual}%</span>
                </div>
              </div>
            ))
          ) : (
            <div className="produtos-empty">
              <span className="mono">NENHUMA ASSOCIACAO ENCONTRADA</span>
              <p>Ainda nao ha dados suficientes para identificar padroes de compra</p>
            </div>
          )}
        </div>
      </Panel>

      {/* LEGENDA */}
      <div className="produtos-legend">
        <div className="produtos-legend__item">
          <Link2 size={14} />
          <span>Frequencia = quantas vezes os produtos foram comprados juntos</span>
        </div>
        <div className="produtos-legend__item">
          <TrendingUp size={14} />
          <span>% = percentual das transacoes que incluem esses produtos</span>
        </div>
      </div>
    </div>
  )
}
