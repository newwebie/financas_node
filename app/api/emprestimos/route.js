import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET() {
  try {
    const colls = await getCollections()
    const items = await colls.emprestimos.find({}).sort({ createdAt: -1 }).toArray()
    return NextResponse.json(items.map(i => ({ ...i, _id: i._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()
    const { _id, ...data } = body
    await colls.emprestimos.updateOne({ _id: new ObjectId(_id) }, { $set: data })
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
    await colls.emprestimos.deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
