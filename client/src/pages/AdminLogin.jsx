import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock, User, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react'
import './AdminLogin.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null) // null, 'loading', 'granted', 'denied'
  const [errorShake, setErrorShake] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, password })
      })

      if (res.ok) {
        setStatus('granted')
        setTimeout(() => navigate('/admin'), 1500)
      } else {
        setStatus('denied')
        setErrorShake(true)
        setTimeout(() => {
          setErrorShake(false)
          setStatus(null)
        }, 2000)
      }
    } catch (err) {
      setStatus('denied')
      setTimeout(() => setStatus(null), 2000)
    }
  }

  return (
    <div className="admin-login">
      <button className="admin-login__back" onClick={() => navigate('/')}>
        <ArrowLeft size={18} />
        <span>VOLTAR</span>
      </button>

      <div className={`admin-login__box ${errorShake ? 'shake' : ''}`}>
        <div className="admin-login__header">
          <Shield size={32} />
          <h1>ACESSO ADMIN</h1>
          <span className="admin-login__subtitle mono">AREA RESTRITA</span>
        </div>

        <form className="admin-login__form" onSubmit={handleSubmit}>
          <div className="admin-login__input-group">
            <label className="admin-login__label">
              <User size={14} />
              <span>USUÁRIO</span>
            </label>
            <input
              type="text"
              className="admin-login__input"
              placeholder="Digite o usuário..."
              value={user}
              onChange={(e) => setUser(e.target.value)}
              disabled={status === 'loading' || status === 'granted'}
              autoFocus
            />
          </div>

          <div className="admin-login__input-group">
            <label className="admin-login__label">
              <Lock size={14} />
              <span>SENHA</span>
            </label>
            <input
              type="password"
              className="admin-login__input"
              placeholder="Digite a senha..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === 'loading' || status === 'granted'}
            />
          </div>

          <button
            type="submit"
            className="admin-login__submit"
            disabled={!user || !password || status === 'loading' || status === 'granted'}
          >
            {status === 'loading' ? (
              <>
                <span className="admin-login__spinner"></span>
                <span>AUTENTICANDO...</span>
              </>
            ) : (
              <span>ENTRAR</span>
            )}
          </button>
        </form>

        {/* STATUS OVERLAY */}
        {(status === 'granted' || status === 'denied') && (
          <div className={`admin-login__status admin-login__status--${status}`}>
            {status === 'granted' ? (
              <>
                <CheckCircle size={48} />
                <span className="admin-login__status-text">ACESSO LIBERADO</span>
                <span className="admin-login__status-sub mono">Redirecionando...</span>
              </>
            ) : (
              <>
                <AlertTriangle size={48} />
                <span className="admin-login__status-text">ACESSO NEGADO</span>
                <span className="admin-login__status-sub mono">Credenciais invalidas</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="admin-login__footer mono">
        SUPERVISAO SEGMENTOS // PAINEL ADMIN v1.0
      </div>
    </div>
  )
}
