import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function ListingPage(){
  const router = useRouter()
  const { id } = router.query
  const [listing, setListing] = useState(null)

  useEffect(()=>{
    if(!id) return
    fetch(`/api/listings/${id}`).then(r=>r.json()).then(setListing)
  },[id])

  if(!listing) return <div className="container py-8">Загрузка...</div>

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold">{listing.title}</h1>
      <p className="mt-2">{listing.city} · {listing.price} KZT</p>
      <p className="mt-4">{listing.description}</p>
    </main>
  )
}
