export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'

// GET ?user=susanna
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')
    const colls = await getCollections()
    const query = userId ? { userId } : {}
    const items = await colls.pluggy_items.find(query).sort({ createdAt: -1 }).toArray()
    return NextResponse.json(items.map(i => ({ ...i, _id: i._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST { itemId, userId, connectorName }
export async function POST(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()

    // Evitar duplicata do mesmo itemId
    const existing = await colls.pluggy_items.findOne({ itemId: body.itemId })
    if (existing) {
      // Atualizar lastSync
      await colls.pluggy_items.updateOne(
        { itemId: body.itemId },
        { $set: { lastSync: new Date(), status: 'UPDATED' } }
      )
      return NextResponse.json({ success: true, id: existing._id.toString(), updated: true })
    }

    const doc = {
      itemId: body.itemId,
      userId: body.userId,
      connectorName: body.connectorName || 'Banco',
      status: 'UPDATED',
      lastSync: new Date(),
      createdAt: new Date(),
    }
    const result = await colls.pluggy_items.insertOne(doc)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE ?itemId=xxx
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const colls = await getCollections()
    await colls.pluggy_items.deleteOne({ itemId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
