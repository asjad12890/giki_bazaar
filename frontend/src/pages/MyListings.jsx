import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, imgUrl } from '../api'
import { pkr, STATUS_COLORS, timeAgo } from '../utils'
import LoadingSpinner from '../components/LoadingSpinner'

const STATUS_LABELS = { pending: 'Pending Approval', approved: 'Approved', rejected: 'Rejected', sold: 'Sold', deleted: 'Deleted' }

export default function MyListings() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    api.get('/my-listings')
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const markSold = async (id) => {
    setActionId(id)
    try {
      await api.put(`/listings/${id}/sold`)
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: 'sold' } : l))
    } catch {}
    setActionId(null)
  }

  const deleteListing = async (id) => {
    if (!window.confirm('Delete this listing?')) return
    setActionId(id)
    try {
      await api.del(`/listings/${id}`)
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: 'deleted' } : l))
    } catch {}
    setActionId(null)
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#F5F3FF' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">My Listings</h1>
            <p className="text-gray-500 text-sm mt-0.5">{listings.length} listing{listings.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/post"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors">
            + Post New
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-600 font-medium">You haven't posted anything yet</p>
            <Link to="/post" className="text-purple-600 font-medium text-sm mt-2 inline-block hover:text-purple-700">
              Post your first listing →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((l) => (
              <div key={l.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-center">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-50">
                  {l.image_path
                    ? <img src={imgUrl(l.image_path)} alt={l.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">📦</div>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{l.title}</p>
                  <p className="text-purple-600 font-bold text-sm">{pkr(l.price)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[l.status] || l.status}
                    </span>
                    <span className="text-gray-400 text-xs">{timeAgo(l.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  {actionId === l.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      {l.status === 'approved' && (
                        <button onClick={() => markSold(l.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium border border-blue-200 transition-colors">
                          Mark Sold
                        </button>
                      )}
                      {!['deleted', 'sold'].includes(l.status) && (
                        <button onClick={() => deleteListing(l.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-medium border border-red-200 transition-colors">
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
