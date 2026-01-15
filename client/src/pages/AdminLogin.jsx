import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react'
import './AdminLogin.css'

export default function AdminLogin() {
  const navigate = useNavigate()
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
        body: JSON.stringify({ password })
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
          <h1>ADMIN ACCESS</h1>
          <span className="admin-login__subtitle mono">RESTRICTED AREA</span>
        </div>

        <form className="admin-login__form" onSubmit={handleSubmit}>
          <div className="admin-login__input-group">
            <label className="admin-login__label">
              <Lock size={14} />
              <span>AUTHENTICATION KEY</span>
            </label>
            <input
              type="password"
              className="admin-login__input"
              placeholder="Enter admin password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === 'loading' || status === 'granted'}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="admin-login__submit"
            disabled={!password || status === 'loading' || status === 'granted'}
          >
            {status === 'loading' ? (
              <>
                <span className="admin-login__spinner"></span>
                <span>AUTHENTICATING...</span>
              </>
            ) : (
              <span>AUTHENTICATE</span>
            )}
          </button>
        </form>

        {/* STATUS OVERLAY */}
        {(status === 'granted' || status === 'denied') && (
          <div className={`admin-login__status admin-login__status--${status}`}>
            {status === 'granted' ? (
              <>
                <CheckCircle size={48} />
                <span className="admin-login__status-text">ACCESS GRANTED</span>
                <span className="admin-login__status-sub mono">Redirecting...</span>
              </>
            ) : (
              <>
                <AlertTriangle size={48} />
                <span className="admin-login__status-text">ACCESS DENIED</span>
                <span className="admin-login__status-sub mono">Invalid credentials</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="admin-login__footer mono">
        SUPERVISION SEGMENTS // ADMIN PANEL v1.0
      </div>
    </div>
  )
}
