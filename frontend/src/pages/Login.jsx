import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/auth/login', form)
      login(data.token, data.user)
      navigate(data.user.role === 'admin' ? '/admin' : '/')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8" style={{ backgroundColor: '#F5F3FF' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Login to GIKI Bazaar</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">GIKI Email</label>
              <input name="email" type="email" value={form.email} onChange={handle} required
                placeholder="you@giki.edu.pk"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 placeholder-gray-400 text-sm transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input name="password" type="password" value={form.password} onChange={handle} required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 placeholder-gray-400 text-sm transition-colors" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2">
              {loading ? <LoadingSpinner size="sm" color="white" /> : 'Login'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            No account?{' '}
            <Link to="/register" className="text-purple-600 font-medium hover:text-purple-700">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
