import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.username.trim()) e.username = 'Username is required'
    else if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) e.username = 'Username: 3-20 characters, letters/numbers/underscores only'
    if (!form.email) e.email = 'Email is required'
    else if (!form.email.endsWith('@giki.edu.pk')) e.email = 'Only @giki.edu.pk emails allowed'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setApiError('')
    setLoading(true)
    try {
      const data = await api.post('/auth/register', form)
      login(data.token, data.user)
      navigate('/')
    } catch (err) {
      setApiError(err.message)
    }
    setLoading(false)
  }

  const field = (name, label, type = 'text', placeholder = '') => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input name={name} type={type} value={form[name]} onChange={handle} placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-xl border ${errors[name] ? 'border-red-400 bg-red-50' : 'border-gray-300'} focus:border-purple-500 focus:outline-none text-gray-800 placeholder-gray-400 text-sm transition-colors`} />
      {errors[name] && <p className="text-red-500 text-xs">{errors[name]}</p>}
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8" style={{ backgroundColor: '#F5F3FF' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">GIKI students only • @giki.edu.pk required</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 space-y-5">
          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {field('name', 'Full Name', 'text', 'Your full name')}
            {field('username', 'Username', 'text', 'e.g. ali_khan')}
            {field('email', 'GIKI Email', 'email', 'you@giki.edu.pk')}
            {field('password', 'Password', 'password', '••••••••')}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2">
              {loading ? <LoadingSpinner size="sm" color="white" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-600 font-medium hover:text-purple-700">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
