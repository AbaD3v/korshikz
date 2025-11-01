import prisma from '../../../lib/prisma'
import { verifyToken } from '../../../lib/auth'
import cookie from 'cookie'

export default async function handler(req, res){
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {}
  const token = cookies.token
  if(!token) return res.status(200).json({ user: null })
  try{
    const data = verifyToken(token)
    const user = await prisma.user.findUnique({ where: { id: data.id }, select: { id: true, email: true, name: true } })
    return res.json({ user })
  }catch(e){
    return res.status(200).json({ user: null })
  }
}
