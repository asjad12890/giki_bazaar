import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const active = (path) =>
    location.pathname === path
      ? 'text-purple-600 font-semibold'
      : 'text-gray-600 hover:text-purple-600'

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">

        {/* Logo */}
        <Link to="/" className="shrink-0 mr-2">
          <span className="text-xl font-extrabold text-purple-600 tracking-tight">
            GIKI Bazaar
          </span>
        </Link>

        {/* Nav links — always visible */}
        {user && (
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            <Link to="/" className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${active('/')}`}>
              Browse
            </Link>
            <Link to="/post" className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${active('/post')}`}>
              Post Listing
            </Link>
            <Link to="/my-listings" className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${active('/my-listings')}`}>
              My Listings
            </Link>
            <Link to="/messages" className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${active('/messages')}`}>
              Messages
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin" className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${active('/admin')}`}>
                Admin
              </Link>
            )}
          </div>
        )}

        {/* Right side — username + logout or login/register */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {user ? (
            <>
              <span className="text-sm text-gray-700 font-medium whitespace-nowrap">
                @{user.username || user.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 text-sm transition-colors whitespace-nowrap"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg border border-gray-300 hover:border-purple-400 text-gray-700 hover:text-purple-600 text-sm transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  )
}
