import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    const status = searchParams.get('status') || 'em aberto'
    const colls = await getCollections()
    const query = { credor: user }
    if (status !== 'all') query.status = status
    const items = await colls.emprestimos_terceiros.find(query).sort({ data_emprestimo: -1 }).toArray()
    return NextResponse.json(items.map(i => ({ ...i, _id: i._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()
    const result = await colls.emprestimos_terceiros.insertOne({
      credor: body.credor, devedor: body.devedor, valor: body.valor,
      descricao: body.descricao || '', data_emprestimo: new Date(body.data_emprestimo || Date.now()),
      data_devolucao: new Date(body.data_devolucao), status: 'em aberto',
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
    if (data.data_emprestimo) data.data_emprestimo = new Date(data.data_emprestimo)
    if (data.data_devolucao) data.data_devolucao = new Date(data.data_devolucao)
    if (data.status === 'quitado') data.data_quitacao = new Date()
    await colls.emprestimos_terceiros.updateOne({ _id: new ObjectId(_id) }, { $set: data })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const colls = await getCollections()
    await colls.emprestimos_terceiros.deleteOne({ _id: new ObjectId(searchParams.get('id')) })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
