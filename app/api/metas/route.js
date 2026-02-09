import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    const colls = await getCollections()
    const metas = await colls.metas.find({ pessoa: user, ativo: true }).toArray()
    return NextResponse.json(metas.map(m => ({ ...m, _id: m._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()
    const limite = body.valor_limite || body.limite
    const result = await colls.metas.insertOne({
      categoria: body.categoria, pessoa: body.user || body.pessoa,
      limite, ativo: true, createdAt: new Date(),
      historico_limites: [{ limite, desde: new Date() }],
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
    if (data.limite !== undefined) {
      await colls.metas.updateOne({ _id: new ObjectId(_id) }, {
        $set: data,
        $push: { historico_limites: { limite: data.limite, desde: new Date() } },
      })
    } else {
      await colls.metas.updateOne({ _id: new ObjectId(_id) }, { $set: data })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const colls = await getCollections()
    await colls.metas.deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
