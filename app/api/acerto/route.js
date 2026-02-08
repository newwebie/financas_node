import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'

export async function GET() {
  try {
    const colls = await getCollections()
    const despesas = await colls.despesas.find({ status_pendencia: 'em aberto' }).toArray()
    const emprestimos = await colls.emprestimos.find({ status: 'em aberto' }).toArray()
    const quitacoes = await colls.quitacoes.find({ tipo: 'despesa_compartilhada', status: 'em aberto' }).toArray()
    const acertos = await colls.quitacoes.find({ tipo: 'acerto' }).sort({ data: -1 }).limit(10).toArray()
    return NextResponse.json({
      despesas: despesas.map(d => ({ ...d, _id: d._id.toString() })),
      emprestimos: emprestimos.map(e => ({ ...e, _id: e._id.toString() })),
      quitacoes: quitacoes.map(q => ({ ...q, _id: q._id.toString() })),
      acertos: acertos.map(a => ({ ...a, _id: a._id.toString() })),
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()
    await colls.quitacoes.insertOne({
      tipo: 'acerto', data: new Date(), de: body.de,
      para: body.para, valor: body.valor, itens_quitados: body.itens_quitados,
    })
    const now = new Date()
    await colls.despesas.updateMany({ status_pendencia: 'em aberto' }, { $set: { status_pendencia: 'quitado', data_quitacao: now } })
    await colls.emprestimos.updateMany({ status: 'em aberto' }, { $set: { status: 'quitado', data_quitacao: now } })
    await colls.quitacoes.updateMany({ status: 'em aberto', tipo: 'despesa_compartilhada' }, { $set: { status: 'quitado', data_quitacao: now } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
