import { useState } from 'react'
import { useRouter } from 'next/router'

export default function Register(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const router = useRouter()

  async function submit(e){
    e.preventDefault()
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password, name })
    })
    if(res.ok) router.push('/')
    else alert('Ошибка')
  }

  return (
    <main className="container py-8">
      <h1 className="text-xl font-bold mb-4">Регистрация</h1>
      <form onSubmit={submit} className="grid gap-2 max-w-md">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Имя" className="p-2 border rounded" />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Пароль" className="p-2 border rounded" />
        <button className="p-2 bg-blue-600 text-white rounded">Зарегистрироваться</button>
      </form>
    </main>
  )
}
