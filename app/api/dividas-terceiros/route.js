import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    const status = searchParams.get('status') || 'em aberto'
    const colls = await getCollections()
    const query = { devedor: user }
    if (status !== 'all') query.status = status
    const items = await colls.dividas_terceiros.find(query).sort({ data_emprestimo: -1 }).toArray()
    return NextResponse.json(items.map(i => ({ ...i, _id: i._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()
    const result = await colls.dividas_terceiros.insertOne({
      devedor: body.devedor, credor: body.credor, valor: body.valor,
      descricao: body.descricao || '', data_emprestimo: new Date(body.data_emprestimo ? `${body.data_emprestimo}T12:00:00` : Date.now()),
      data_pagamento: new Date(`${body.data_pagamento}T12:00:00`), status: 'em aberto',
      emprestimo_conta: body.emprestimo_conta || false,
    })
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()
    const { _id, ...data } = body
    if (data.data_emprestimo) data.data_emprestimo = new Date(`${data.data_emprestimo}T12:00:00`)
    if (data.data_pagamento) data.data_pagamento = new Date(`${data.data_pagamento}T12:00:00`)
    if (data.status === 'quitado') data.data_quitacao = new Date()
    await colls.dividas_terceiros.updateOne({ _id: new ObjectId(_id) }, { $set: data })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const colls = await getCollections()
    await colls.dividas_terceiros.deleteOne({ _id: new ObjectId(searchParams.get('id')) })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
