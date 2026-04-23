// Login / Signup — Aminos earth tone design
// Supabase auth via /api/auth/login and /api/auth/signup

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AminosLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <path d="M 4 20 Q 8 8, 14 14 T 24 14 Q 28 14, 28 20" stroke="#5a7a20" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <circle cx="9" cy="15" r="2.6" fill="#5a7a20"/>
        <circle cx="23" cy="15" r="2.6" fill="#b8875a"/>
        <path d="M 28 20 L 28 24" stroke="#5a7a20" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: 17, fontWeight: 600, color: '#2a1a08', letterSpacing: '-0.015em', fontFamily: 'Geist, system-ui, sans-serif' }}>Aminos</span>
    </div>
  )
}

export default function Login() {
  const [tab, setTab] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { login, loginAsGuest } = useAuth()
  const navigate = useNavigate()

  const handleGuest = () => { loginAsGuest(); navigate('/app') }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setNotice('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Login failed')
      login(data)
      navigate('/app')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setNotice('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Sign up failed')
      setNotice(data.message)
      setTab('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    fontSize: 14, fontFamily: 'Geist, system-ui, sans-serif',
    color: '#2a1a08', background: 'rgba(245,240,232,0.8)',
    border: '1px solid rgba(120,90,40,0.25)', borderRadius: 8,
    outline: 'none', transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f0e8',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      // Noise overlay via pseudo — use a wrapper div instead
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Noise */}
      <div aria-hidden style={{
        pointerEvents: 'none', position: 'fixed', inset: 0, zIndex: 0, opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
      }}/>

      {/* Subtle radial glow behind card */}
      <div aria-hidden style={{
        pointerEvents: 'none', position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(143,168,90,0.07) 0%, transparent 70%)',
      }}/>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, animation: 'fadeUp 0.5s ease-out both' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <AminosLogo />
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(245,240,232,0.95)', borderRadius: 16,
          border: '1px solid rgba(120,90,40,0.15)',
          boxShadow: '0 8px 40px rgba(42,26,8,0.08)',
          overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(120,90,40,0.12)' }}>
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setNotice('') }}
                style={{
                  flex: 1, padding: '14px 0',
                  fontSize: 13, fontWeight: tab === t ? 600 : 400,
                  fontFamily: 'Geist, system-ui, sans-serif',
                  color: tab === t ? '#2a1a08' : 'rgba(70,45,15,0.45)',
                  background: tab === t ? 'transparent' : 'rgba(120,90,40,0.03)',
                  border: 'none', borderBottom: tab === t ? '2px solid #2a1a08' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                  marginBottom: -1,
                }}>
                {t === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ padding: 28 }}>
            {notice && (
              <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 8, background: 'rgba(220,240,210,0.9)', border: '1px solid rgba(90,140,60,0.35)', fontSize: 13, color: '#2a5020', lineHeight: 1.5 }}>
                {notice}
              </div>
            )}
            {error && (
              <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,235,230,0.9)', border: '1px solid rgba(196,102,74,0.35)', fontSize: 13, color: '#8a2010', lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            <form onSubmit={tab === 'login' ? handleLogin : handleSignup}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(70,45,15,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Geist Mono, monospace' }}>
                  Email
                </label>
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(143,168,90,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(120,90,40,0.25)'}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(70,45,15,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Geist Mono, monospace' }}>
                  Password
                </label>
                <input
                  type="password" required autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(143,168,90,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(120,90,40,0.25)'}
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" disabled={loading} style={{
                marginTop: 6,
                width: '100%', padding: '11px 0',
                fontSize: 14, fontWeight: 600, fontFamily: 'Geist, system-ui, sans-serif',
                color: '#f5f0e8', background: loading ? 'rgba(42,26,8,0.5)' : '#2a1a08',
                border: 'none', borderRadius: 9999, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#3d2810' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2a1a08' }}>
                {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(245,240,232,0.3)', borderTop: '2px solid #f5f0e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}/>}
                {loading ? 'Please wait…' : tab === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>
          </div>
        </div>

        {/* Guest option */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button onClick={handleGuest} style={{
            width: '100%', padding: '10px 0',
            fontSize: 13, fontFamily: 'Geist, system-ui, sans-serif',
            color: 'rgba(70,45,15,0.55)',
            background: 'transparent',
            border: '1px solid rgba(120,90,40,0.18)',
            borderRadius: 9999, cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(120,90,40,0.35)'; e.currentTarget.style.color = '#2a1a08' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(120,90,40,0.18)'; e.currentTarget.style.color = 'rgba(70,45,15,0.55)' }}>
            Continue as guest
          </button>
          <p style={{ marginTop: 10, fontSize: 11, color: 'rgba(70,45,15,0.3)', fontFamily: 'Geist Mono, monospace' }}>
            No account needed · history not saved
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <Link to="/" style={{ fontSize: 12, color: 'rgba(70,45,15,0.4)', textDecoration: 'none', fontFamily: 'Geist, system-ui, sans-serif', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(42,26,8,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(70,45,15,0.4)'}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
