export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET ?user=susanna
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')
    const colls = await getCollections()
    const query = userId ? { userId } : {}
    const lugares = await colls.lugares.find(query).sort({ nome: 1 }).toArray()
    return NextResponse.json(lugares.map(l => ({ ...l, _id: l._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST { nome, keywords, categoria, subcategoria, userId, cnpj }
export async function POST(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()
    const doc = {
      nome: body.nome,
      keywords: (body.keywords || []).map(k => k.toLowerCase().trim()).filter(Boolean),
      categoria: body.categoria || 'Outros',
      subcategoria: body.subcategoria || null,
      userId: body.userId,
      cnpj: body.cnpj || null,
      tipo: body.tipo || 'manual',  // 'auto' | 'semi-auto' | 'manual'
      template: body.template || null, // { pedir_item, pedir_veiculo, pedir_uso_pessoal, pedir_compartilhado }
      gastoMedio: null,
      ultimaVisita: null,
      totalVisitas: 0,
      createdAt: new Date(),
    }
    const result = await colls.lugares.insertOne(doc)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT { _id, nome, keywords, categoria, subcategoria, cnpj }
export async function PUT(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()
    const { _id, ...data } = body
    if (data.keywords) {
      data.keywords = data.keywords.map(k => k.toLowerCase().trim()).filter(Boolean)
    }
    data.updatedAt = new Date()
    await colls.lugares.updateOne(
      { _id: new ObjectId(_id) },
      { $set: data }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE ?id=xxx
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
    const colls = await getCollections()
    await colls.lugares.deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
