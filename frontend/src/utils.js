export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'Z')
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString()
}

export function pkr(amount) {
  return `PKR ${(+amount || 0).toLocaleString()}`
}

export const CONDITION_COLORS = {
  'New':       'bg-green-100 text-green-700',
  'Like New':  'bg-blue-100 text-blue-700',
  'Good':      'bg-yellow-100 text-yellow-700',
  'Fair':      'bg-orange-100 text-orange-700',
}

export const STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  sold:     'bg-blue-100 text-blue-700',
  deleted:  'bg-gray-100 text-gray-500',
}
