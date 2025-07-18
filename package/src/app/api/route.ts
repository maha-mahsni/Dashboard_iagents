import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: liste des agents
export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(agents)
  } catch (error) {
    console.error('Erreur GET API:', error)
    return new NextResponse('Erreur serveur', { status: 500 })
  }
}

// POST: ajouter un agent
export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { name, type, language, version, createdAt, status } = data

    if (!name || !type || !language || !version || !createdAt || !status) {
      return new NextResponse('Champs requis manquants', { status: 400 })
    }

    const parsedDate = new Date(createdAt)
    if (isNaN(parsedDate.getTime())) {
      return new NextResponse('Date invalide', { status: 400 })
    }

    const newAgent = await prisma.agent.create({
      data: {
        name,
        type,
        language,
        version,
        createdAt: parsedDate,
        status,
      },
    })

    return NextResponse.json(newAgent)
  } catch (error) {
    console.error('[POST] Erreur API:', error)
    return new NextResponse('Erreur serveur', { status: 500 })
  }
}

// DELETE: supprimer un agent
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()

    if (!id) {
      return new NextResponse('ID manquant', { status: 400 })
    }

    await prisma.agent.delete({
      where: { id: Number(id) },
    })

    return new NextResponse('Agent supprimé avec succès')
  } catch (error) {
    console.error('[DELETE] Erreur API:', error)
    return new NextResponse('Erreur serveur', { status: 500 })
  }
}

// ✅ PUT: mettre à jour un agent
export async function PUT(req: Request) {
  try {
    const data = await req.json()
    const { id, name, type, language, version, createdAt, status } = data

    if (!id || !name || !type || !language || !version || !createdAt || !status) {
      return new NextResponse('Champs requis manquants', { status: 400 })
    }

    const parsedDate = new Date(createdAt)
    if (isNaN(parsedDate.getTime())) {
      return new NextResponse('Date invalide', { status: 400 })
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: Number(id) },
      data: {
        name,
        type,
        language,
        version,
        createdAt: parsedDate,
        status,
      },
    })

    return NextResponse.json(updatedAgent)
  } catch (error) {
    console.error('[PUT] Erreur API:', error)
    return new NextResponse('Erreur serveur', { status: 500 })
  }
}
