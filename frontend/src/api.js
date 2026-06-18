const API_BASE = import.meta.env.VITE_API_URL

async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...options.headers }

  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({ detail: 'Server error' }))

  if (!res.ok) throw new Error(data.detail || 'Something went wrong')
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (path, body) =>
    request(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  del: (path) => request(path, { method: 'DELETE' }),
}

// image_path/image_url are now full Supabase Storage public URLs
export const imgUrl = (path) => path || null
