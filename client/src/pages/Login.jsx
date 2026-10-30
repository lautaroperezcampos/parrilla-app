import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { btnPrimary, inputClass, labelClass } from '../lib/ui.js'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setErrorMsg(
        err.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-carbon p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6">
        <div className="flex flex-col items-center gap-3 pb-2">
          <img src="/logo.png" alt="Parrilla Don Blas" className="h-28 w-28 rounded-full shadow" />
          <h1 className="font-display text-2xl text-carbon">
            Don Blas <span className="text-brasa">App</span>
          </h1>
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Contraseña</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {errorMsg && <p className="text-sm text-estado-ocupada">{errorMsg}</p>}
        <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
