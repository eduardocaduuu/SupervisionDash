import { Routes, Route } from 'react-router-dom'
import { useState, useEffect, createContext } from 'react'
import Terminal from './pages/Terminal'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import AdminLogin from './pages/AdminLogin'
import './styles/components.css'

// Context for effects toggle
export const EffectsContext = createContext()

function App() {
  const [reduceEffects, setReduceEffects] = useState(false)
  const [scanlines, setScanlines] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('reduce-effects', reduceEffects)
    document.body.classList.toggle('scanlines-on', scanlines && !reduceEffects)
  }, [reduceEffects, scanlines])

  return (
    <EffectsContext.Provider value={{ reduceEffects, setReduceEffects, scanlines, setScanlines }}>
      <div className="app-wrapper">
        <Routes>
          <Route path="/" element={<Terminal />} />
          <Route path="/dashboard/:setorId" element={<Dashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </EffectsContext.Provider>
  )
}

export default App
