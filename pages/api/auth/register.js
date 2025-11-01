import prisma from '../../../lib/prisma'
import { hashPassword, signToken } from '../../../lib/auth'
import cookie from 'cookie'

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end()
  const { email, password, name } = req.body
  if(!email || !password) return res.status(400).json({ error: 'email/password required' })

  const existing = await prisma.user.findUnique({ where: { email } })
  if(existing) return res.status(400).json({ error: 'User exists' })

  const hashed = await hashPassword(password)
  const user = await prisma.user.create({ data: { email, password: hashed, name } })
  const token = signToken({ id: user.id })
  res.setHeader('Set-Cookie', cookie.serialize('token', token, { httpOnly: true, path: '/', maxAge: 60*60*24*30 }))
  res.json({ user: { id: user.id, email: user.email, name: user.name } })
}
