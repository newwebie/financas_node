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
        // Busca originais para criar espelhos antes de atualizar
        const originais = await colls.despesas.find({ _id: { $in: despesaIds } }).toArray()
        const espelhos = originais
          .filter(d => d.devedor && d.valor_pendente > 0)
          .map(d => ({
            label: d.label,
            buyer: d.devedor,
            item: d.item || '',
            description: d.description || '',
            quantity: 1,
            total_value: d.valor_pendente,
            payment_method: d.payment_method,
            installment: 0,
            createdAt: now,
            pagamento_compartilhado: 'Pra mim',
            tem_pendencia: false,
            devedor: null,
            valor_pendente: null,
            status_pendencia: null,
            uso_pessoal: d.uso_pessoal || false,
            lugar_nome: d.lugar_nome || null,
            auto_lancado: false,
            // rastreabilidade: quem comprou de fato
            acerto_ref: {
              comprado_por: d.buyer,
              despesa_id: d._id,
              valor_total_original: d.total_value,
            },
          }))
        if (espelhos.length > 0) await colls.despesas.insertMany(espelhos)

        // Pipeline update: marca quitado e desconta a parte acertada do total do comprador original
        await colls.despesas.updateMany(
          { _id: { $in: despesaIds } },
          [{
            $set: {
              status_pendencia: 'quitado',
              data_quitacao: now,
              total_value: {
                $cond: {
                  if: { $and: [{ $ne: ['$devedor', null] }, { $gt: ['$valor_pendente', 0] }] },
                  then: { $subtract: ['$total_value', '$valor_pendente'] },
                  else: '$total_value',
                },
              },
            },
          }]
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
