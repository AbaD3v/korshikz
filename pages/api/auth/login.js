import prisma from '../../../lib/prisma'
import { comparePassword, signToken } from '../../../lib/auth'
import cookie from 'cookie'

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end()
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if(!user) return res.status(401).json({ error: 'Invalid' })
  const ok = await comparePassword(password, user.password)
  if(!ok) return res.status(401).json({ error: 'Invalid' })
  const token = signToken({ id: user.id })
  res.setHeader('Set-Cookie', cookie.serialize('token', token, { httpOnly: true, path: '/', maxAge: 60*60*24*30 }))
  res.json({ user: { id: user.id, email: user.email, name: user.name } })
}
