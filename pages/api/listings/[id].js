import prisma from '../../../lib/prisma'

export default async function handler(req, res){
  const { id } = req.query
  if(req.method === 'GET'){
    const listing = await prisma.listing.findUnique({ where: { id: Number(id) }, include: { applications: true, owner: true } })
    return res.json(listing)
  }
  res.status(405).end()
}
