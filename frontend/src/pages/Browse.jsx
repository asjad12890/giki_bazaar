import { useState, useEffect } from 'react'
import { api, imgUrl } from '../api'
import { pkr, timeAgo, CONDITION_COLORS } from '../utils'
import ListingModal from '../components/ListingModal'
import LoadingSpinner from '../components/LoadingSpinner'

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair']

export default function Browse() {
  const [listings, setListings] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    api.get('/categories').then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    fetchListings()
  }, [category, condition])

  const fetchListings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      if (condition) params.set('condition', condition)
      setListings(await api.get(`/listings?${params}`))
    } catch {}
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3FF' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Browse Listings</h1>
          <p className="text-gray-500 text-sm">Discover items from fellow GIKI students</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <form
            onSubmit={(e) => { e.preventDefault(); fetchListings() }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search listings..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 placeholder-gray-400 text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 text-sm bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 text-sm bg-white"
            >
              <option value="">All Conditions</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <LoadingSpinner size="lg" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-600 font-medium text-lg">No listings found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                className="group text-left bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                  {l.image_path ? (
                    <img
                      src={imgUrl(l.image_path)}
                      alt={l.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">📦</div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                    {l.title}
                  </h3>
                  <p className="text-purple-600 font-extrabold text-lg">{pkr(l.price)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {l.condition && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONDITION_COLORS[l.condition] || 'bg-gray-100 text-gray-600'}`}>
                        {l.condition}
                      </span>
                    )}
                    {l.category_name && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {l.category_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                    <span>@{l.seller_username}</span>
                    <span>{timeAgo(l.created_at)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedId && (
        <ListingModal listingId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
