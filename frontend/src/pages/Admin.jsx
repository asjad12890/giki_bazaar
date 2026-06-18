import { useState, useEffect } from 'react'
import { api, imgUrl } from '../api'
import { pkr, STATUS_COLORS, timeAgo } from '../utils'
import LoadingSpinner from '../components/LoadingSpinner'

const TABS = ['Stats', 'Listings', 'Users', 'Reports']
const STATUSES = ['pending', 'approved', 'rejected', 'sold', 'deleted']

export default function Admin() {
  const [tab, setTab] = useState('Stats')
  const [stats, setStats] = useState(null)
  const [listings, setListings] = useState([])
  const [users, setUsers] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')

  useEffect(() => {
    if (tab === 'Stats') load('/admin/stats', setStats)
    else if (tab === 'Users') load('/admin/users', setUsers)
    else if (tab === 'Reports') load('/admin/reports', setReports)
    else if (tab === 'Listings') loadListings()
  }, [tab])

  useEffect(() => {
    if (tab === 'Listings') loadListings()
  }, [statusFilter])

  const load = async (path, setter) => {
    setLoading(true)
    try { setter(await api.get(path)) } catch {}
    setLoading(false)
  }

  const loadListings = async () => {
    setLoading(true)
    try {
      const q = statusFilter ? `?status=${statusFilter}` : ''
      setListings(await api.get(`/admin/listings${q}`))
    } catch {}
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/listings/${id}/status`, { status })
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status } : l))
    } catch {}
  }

  const toggleBan = async (id) => {
    try {
      const res = await api.put(`/admin/users/${id}/ban`)
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_banned: res.is_banned ? 1 : 0 } : u))
    } catch {}
  }

  const dismissReport = async (reportId) => {
    try {
      await api.del(`/admin/reports/${reportId}`)
      setReports((prev) => prev.filter((r) => r.id !== reportId))
    } catch {}
  }

  const deleteListingFromReport = async (listingId, reportId) => {
    try {
      await api.put(`/admin/listings/${listingId}/status`, { status: 'deleted' })
      await api.del(`/admin/reports/${reportId}`)
      setReports((prev) => prev.filter((r) => r.id !== reportId))
    } catch {}
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#F5F3FF' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage listings, users, and reports</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200 mb-6 w-fit">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {/* Stats */}
            {tab === 'Stats' && stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users',    value: stats.users,    icon: '👤', color: 'text-blue-600',   bg: 'bg-blue-50' },
                  { label: 'Total Listings', value: stats.listings, icon: '📦', color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Total Reports',  value: stats.reports,  icon: '🚩', color: 'text-red-600',    bg: 'bg-red-50' },
                  { label: 'Messages Sent',  value: stats.messages, icon: '💬', color: 'text-green-600',  bg: 'bg-green-50' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
                    <p className="text-gray-500 text-sm">{s.label}</p>
                    <p className={`text-4xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Listings */}
            {tab === 'Listings' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {STATUSES.map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${statusFilter === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-600'}`}>
                      {s}
                    </button>
                  ))}
                  <button onClick={() => setStatusFilter('')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${!statusFilter ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-600'}`}>
                    All
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-left text-gray-600">
                        <th className="px-4 py-3 font-semibold">Listing</th>
                        <th className="px-4 py-3 font-semibold hidden md:table-cell">Seller</th>
                        <th className="px-4 py-3 font-semibold">Price</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {listings.map((l) => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                {l.image_path
                                  ? <img src={imgUrl(l.image_path)} alt="" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">📦</div>}
                              </div>
                              <span className="font-medium text-gray-800 line-clamp-1">{l.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden md:table-cell">@{l.seller_username}</td>
                          <td className="px-4 py-3 text-purple-600 font-semibold">{pkr(l.price)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-500'}`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {l.status !== 'approved' && (
                                <button onClick={() => updateStatus(l.id, 'approved')}
                                  className="px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 text-xs font-medium border border-green-200 transition-colors">
                                  Approve
                                </button>
                              )}
                              {l.status !== 'rejected' && (
                                <button onClick={() => updateStatus(l.id, 'rejected')}
                                  className="px-2.5 py-1 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-600 text-xs font-medium border border-yellow-200 transition-colors">
                                  Reject
                                </button>
                              )}
                              {l.status !== 'deleted' && (
                                <button onClick={() => updateStatus(l.id, 'deleted')}
                                  className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-medium border border-red-200 transition-colors">
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {listings.length === 0 && (
                    <p className="text-center text-gray-400 py-10 text-sm">No listings found for this filter.</p>
                  )}
                </div>
              </div>
            )}

            {/* Users */}
            {tab === 'Users' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-gray-600">
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{u.name}</p>
                          <p className="text-gray-400 text-xs">@{u.username}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.is_banned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {u.is_banned ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.role !== 'admin' && (
                            <button onClick={() => toggleBan(u.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${u.is_banned ? 'bg-green-50 hover:bg-green-100 text-green-600 border-green-200' : 'bg-red-50 hover:bg-red-100 text-red-500 border-red-200'}`}>
                              {u.is_banned ? 'Unban' : 'Ban'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No users found.</p>}
              </div>
            )}

            {/* Reports */}
            {tab === 'Reports' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-gray-600">
                      <th className="px-4 py-3 font-semibold">Listing</th>
                      <th className="px-4 py-3 font-semibold">Price</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">Reported By</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">Reason</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">Date</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reports.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800 line-clamp-1">{r.listing_title}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[r.listing_status] || 'bg-gray-100 text-gray-500'}`}>
                            {r.listing_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-purple-600 font-semibold whitespace-nowrap">
                          {pkr(r.listing_price)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                          @{r.reported_by_username}
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[200px]">
                          {r.reason || <span className="italic text-gray-400">No reason</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell whitespace-nowrap">
                          {timeAgo(r.reported_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => deleteListingFromReport(r.listing_id, r.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-medium border border-red-200 transition-colors whitespace-nowrap"
                            >
                              Delete Listing
                            </button>
                            <button
                              onClick={() => dismissReport(r.id)}
                              className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200 transition-colors whitespace-nowrap"
                            >
                              Dismiss
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reports.length === 0 && (
                  <p className="text-center text-gray-400 py-10 text-sm">No reports yet.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
