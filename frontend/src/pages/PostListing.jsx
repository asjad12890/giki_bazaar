import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import LoadingSpinner from '../components/LoadingSpinner'

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair']

export default function PostListing() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ title: '', description: '', price: '', category_id: '', condition: '' })
  const [errors, setErrors] = useState({})
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get('/categories').then(setCategories).catch(() => {})
  }, [])

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.price || isNaN(form.price) || +form.price < 0) e.price = 'Enter a valid price'
    if (!form.category_id) e.category_id = 'Select a category'
    if (!form.condition) e.condition = 'Select a condition'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setApiError('')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('price', form.price)
      fd.append('category_id', form.category_id)
      fd.append('condition', form.condition)
      if (image) fd.append('image', image)
      await api.post('/listings', fd)
      setSuccess(true)
      setTimeout(() => navigate('/my-listings'), 2000)
    } catch (err) {
      setApiError(err.message)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4" style={{ backgroundColor: '#F5F3FF' }}>
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Listing Submitted!</h2>
          <p className="text-gray-500 text-sm">Your listing is pending admin approval.</p>
          <p className="text-gray-400 text-xs">Redirecting to My Listings…</p>
        </div>
      </div>
    )
  }

  const err = (name) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name]}</p> : null
  const inputCls = (name) => `w-full px-4 py-2.5 rounded-xl border ${errors[name] ? 'border-red-400 bg-red-50' : 'border-gray-300'} focus:border-purple-500 focus:outline-none text-gray-800 placeholder-gray-400 text-sm transition-colors bg-white`

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#F5F3FF' }}>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Post a Listing</h1>
          <p className="text-gray-500 text-sm mt-1">Items require admin approval before going live</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm mb-5">
              {apiError}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Title *</label>
              <input name="title" value={form.title} onChange={handle} placeholder="What are you selling?"
                className={`mt-1.5 ${inputCls('title')}`} />
              {err('title')}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea name="description" value={form.description} onChange={handle} rows={4}
                placeholder="Describe your item — condition details, edition, etc."
                className={`mt-1.5 w-full px-4 py-2.5 rounded-xl border ${errors.description ? 'border-red-400' : 'border-gray-300'} focus:border-purple-500 focus:outline-none text-gray-800 placeholder-gray-400 text-sm resize-none transition-colors`} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Price (PKR) *</label>
                <input name="price" type="number" min="0" step="1" value={form.price} onChange={handle}
                  placeholder="0"
                  className={`mt-1.5 ${inputCls('price')}`} />
                {err('price')}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Category *</label>
                <select name="category_id" value={form.category_id} onChange={handle}
                  className={`mt-1.5 ${inputCls('category_id')}`}>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {err('category_id')}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Condition *</label>
              <select name="condition" value={form.condition} onChange={handle}
                className={`mt-1.5 ${inputCls('condition')}`}>
                <option value="">Select condition</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {err('condition')}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Image (optional)</label>
              <div className="mt-1.5">
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-300 hover:border-purple-400 cursor-pointer transition-colors bg-gray-50 hover:bg-purple-50">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-500">{image ? image.name : 'Click to upload image'}</span>
                  <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                </label>
                {preview && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 aspect-video">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              {loading ? <LoadingSpinner size="sm" color="white" /> : 'Submit for Approval'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
