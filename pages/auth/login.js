import { useState } from 'react'
import { useRouter } from 'next/router'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  async function submit(e){
    e.preventDefault()
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    })
    if(res.ok) router.push('/')
    else alert('Ошибка входа')
  }

  return (
    <main className="container py-8">
      <h1 className="text-xl font-bold mb-4">Вход</h1>
      <form onSubmit={submit} className="grid gap-2 max-w-md">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Пароль" className="p-2 border rounded" />
        <button className="p-2 bg-blue-600 text-white rounded">Войти</button>
      </form>
    </main>
  )
}
