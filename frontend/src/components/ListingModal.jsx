import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, imgUrl } from '../api'
import { useAuth } from '../context/AuthContext'
import { pkr, CONDITION_COLORS, timeAgo } from '../utils'
import LoadingSpinner from './LoadingSpinner'

export default function ListingModal({ listingId, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)

  const [msgText, setMsgText] = useState('')
  const [msgSent, setMsgSent] = useState(false)
  const [msgError, setMsgError] = useState('')
  const [msgLoading, setMsgLoading] = useState(false)
  const [showMsg, setShowMsg] = useState(false)

  const [reportText, setReportText] = useState('')
  const [reportSent, setReportSent] = useState(false)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    api.get(`/listings/${listingId}`)
      .then(setListing)
      .catch(() => onClose())
      .finally(() => setLoading(false))
    // Lock body scroll
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [listingId])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!user) { onClose(); navigate('/login'); return }
    setMsgLoading(true)
    setMsgError('')
    try {
      await api.post('/messages', {
        listing_id: listing.id,
        receiver_id: listing.user_id,
        content: msgText,
      })
      setMsgSent(true)
    } catch (err) {
      setMsgError(err.message)
    }
    setMsgLoading(false)
  }

  const sendReport = async (e) => {
    e.preventDefault()
    if (!user) { onClose(); navigate('/login'); return }
    try {
      await api.post(`/listings/${listing.id}/report`, { reason: reportText })
      setReportSent(true)
    } catch {}
  }

  const isSeller = user && listing && user.id === listing.user_id

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Listing Detail</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : listing ? (
          <div className="md:grid md:grid-cols-2 gap-6 p-6 space-y-4 md:space-y-0">
            {/* Image */}
            <div className="rounded-xl overflow-hidden bg-gray-50 aspect-square">
              {listing.image_path ? (
                <img src={imgUrl(listing.image_path)} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl text-gray-300">📦</div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {listing.condition && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CONDITION_COLORS[listing.condition] || 'bg-gray-100 text-gray-600'}`}>
                      {listing.condition}
                    </span>
                  )}
                  {listing.category_name && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                      {listing.category_name}
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-gray-900">{listing.title}</h1>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">{pkr(listing.price)}</p>
              </div>

              {listing.description && (
                <p className="text-gray-600 text-sm leading-relaxed">{listing.description}</p>
              )}

              <div className="border-t border-gray-100 pt-3 text-sm space-y-1 text-gray-500">
                <p>Seller: <span className="text-gray-800 font-medium">@{listing.seller_username}</span></p>
                <p>Posted: <span className="text-gray-700">{timeAgo(listing.created_at)}</span></p>
              </div>

              {/* CTA buttons */}
              {!isSeller && (
                <div className="space-y-2 mt-auto">
                  {!showMsg ? (
                    <button
                      onClick={() => user ? setShowMsg(true) : (onClose(), navigate('/login'))}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
                    >
                      Message Seller
                    </button>
                  ) : msgSent ? (
                    <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm text-center font-medium">
                      ✓ Message sent to @{listing.seller_username}!
                    </div>
                  ) : (
                    <form onSubmit={sendMessage} className="space-y-2">
                      <textarea value={msgText} onChange={(e) => setMsgText(e.target.value)} required rows={3}
                        placeholder="Write your message to the seller..."
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:border-purple-500 focus:outline-none text-sm resize-none text-gray-800" />
                      {msgError && <p className="text-red-500 text-xs">{msgError}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={msgLoading}
                          className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1">
                          {msgLoading ? <LoadingSpinner size="sm" color="white" /> : 'Send'}
                        </button>
                        <button type="button" onClick={() => setShowMsg(false)}
                          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {!showReport ? (
                    <button onClick={() => user ? setShowReport(true) : (onClose(), navigate('/login'))}
                      className="w-full py-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-500 text-sm font-medium transition-colors">
                      Report Listing
                    </button>
                  ) : reportSent ? (
                    <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 text-sm text-center">
                      Report submitted. Thank you.
                    </div>
                  ) : (
                    <form onSubmit={sendReport} className="space-y-2">
                      <input value={reportText} onChange={(e) => setReportText(e.target.value)}
                        placeholder="Reason (optional)"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-red-400 focus:outline-none text-sm text-gray-800" />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">Submit Report</button>
                        <button type="button" onClick={() => setShowReport(false)}
                          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {!user && (
                <p className="text-gray-500 text-sm text-center">
                  <button onClick={() => { onClose(); navigate('/login') }} className="text-purple-600 font-medium hover:underline">Login</button> to contact the seller.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
