import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

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

    if (body.itens_quitados?.length > 0) {
      const despesaIds = body.itens_quitados
        .filter(i => i.tipo === 'despesa')
        .map(i => new ObjectId(i.id))
      const emprestimoIds = body.itens_quitados
        .filter(i => i.tipo === 'emprestimo')
        .map(i => new ObjectId(i.id))

      if (despesaIds.length > 0) {
        await colls.despesas.updateMany(
          { _id: { $in: despesaIds } },
          { $set: { status_pendencia: 'quitado', data_quitacao: now } }
        )
        await colls.quitacoes.updateMany(
          { despesa_id: { $in: despesaIds }, status: 'em aberto', tipo: 'despesa_compartilhada' },
          { $set: { status: 'quitado', data_quitacao: now } }
        )
      }
      if (emprestimoIds.length > 0) {
        await colls.emprestimos.updateMany(
          { _id: { $in: emprestimoIds } },
          { $set: { status: 'quitado', data_quitacao: now } }
        )
      }
    } else {
      await colls.despesas.updateMany({ status_pendencia: 'em aberto' }, { $set: { status_pendencia: 'quitado', data_quitacao: now } })
      await colls.emprestimos.updateMany({ status: 'em aberto' }, { $set: { status: 'quitado', data_quitacao: now } })
      await colls.quitacoes.updateMany({ status: 'em aberto', tipo: 'despesa_compartilhada' }, { $set: { status: 'quitado', data_quitacao: now } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
