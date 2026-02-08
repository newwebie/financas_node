import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    const colls = await getCollections()
    const query = { tipo: 'fechamento_fatura' }
    if (user) query.user = user
    const configs = await colls.config.find(query).toArray()
    return NextResponse.json(configs.map(c => ({ ...c, _id: c._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()
    for (const item of body.fechamentos) {
      await colls.config.updateOne(
        { tipo: 'fechamento_fatura', mes_ano: item.mes_ano, user: body.user },
        { $set: { dia_fechamento: item.dia } },
        { upsert: true }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
