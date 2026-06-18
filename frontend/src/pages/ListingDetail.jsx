import { useParams } from 'react-router-dom'
import ListingModal from '../components/ListingModal'
import { useNavigate } from 'react-router-dom'

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3FF' }}>
      <ListingModal listingId={parseInt(id)} onClose={() => navigate(-1)} />
    </div>
  )
}
