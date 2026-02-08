import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const user = searchParams.get('user')
    const mesAno = searchParams.get('mes_ano')
    const colls = await getCollections()
    const query = {}
    if (tipo) query.tipo = tipo
    if (user) query.pagador = user
    if (mesAno) query.mes_ano = mesAno
    const quitacoes = await colls.quitacoes.find(query).sort({ data: -1 }).toArray()
    return NextResponse.json(quitacoes.map(q => ({ ...q, _id: q._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
