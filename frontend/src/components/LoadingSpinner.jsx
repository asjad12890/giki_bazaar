export default function LoadingSpinner({ size = 'md', color = 'purple' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
  const c = color === 'white' ? 'border-white border-t-transparent' : 'border-purple-600 border-t-transparent'
  return <div className={`${s} border-2 ${c} rounded-full animate-spin`} />
}
