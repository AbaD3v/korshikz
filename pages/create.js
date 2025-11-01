import { useState } from 'react'
import { supabase } from '/lib/supabaseClient'

export default function CreateListing() {
  const [form, setForm] = useState({ title: '', description: '', city: '', price: '', totalSpots: 1 })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('listings').insert([{
      title: form.title,
      description: form.description,
      city: form.city,
      price: parseInt(form.price),
      totalSpots: parseInt(form.totalSpots),
      filledSpots: 0,
    }])
    setLoading(false)
    if (error) alert(error.message)
    else alert('Объявление добавлено!')
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Добавить объявление</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {['title', 'description', 'city', 'price', 'totalSpots'].map((key) => (
          <input
            key={key}
            required
            type={key === 'price' || key === 'totalSpots' ? 'number' : 'text'}
            placeholder={key}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            className="w-full p-3 border rounded-lg"
          />
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
        >
          {loading ? 'Сохраняем...' : 'Добавить'}
        </button>
      </form>
    </div>
  )
}
