import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    const colls = await getCollections()
    const query = {}
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

    if (body.tipo === 'periodo') {
      await colls.config.updateOne(
        { tipo: 'periodo', mes: body.mes, user: body.user },
        { $set: { data_inicio: body.data_inicio, data_fim: body.data_fim } },
        { upsert: true }
      )
    } else if (body.fechamentos) {
      for (const item of body.fechamentos) {
        await colls.config.updateOne(
          { tipo: 'fechamento_fatura', mes_ano: item.mes_ano, user: body.user },
          { $set: { dia_fechamento: item.dia } },
          { upsert: true }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
