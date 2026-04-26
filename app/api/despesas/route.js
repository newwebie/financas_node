import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const buyer = searchParams.get('buyer')
    const colls = await getCollections()
    const query = {}
    if (buyer) query.buyer = buyer
    const despesas = await colls.despesas.find(query).sort({ createdAt: -1 }).limit(500).toArray()
    return NextResponse.json(despesas.map(d => ({ ...d, _id: d._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const colls = await getCollections()
    const doc = {
      label: body.label,
      buyer: body.buyer,
      item: body.item || '',
      description: body.description || '',
      quantity: body.quantity || 1,
      total_value: body.total_value,
      payment_method: body.payment_method,
      installment: body.installment || 0,
      createdAt: new Date(body.createdAt ? `${body.createdAt}T12:00:00` : Date.now()),
      pagamento_compartilhado: body.pagamento_compartilhado || 'Pra mim',
      tem_pendencia: body.tem_pendencia || false,
      devedor: body.devedor || null,
      valor_pendente: body.valor_pendente || null,
      status_pendencia: body.status_pendencia || null,
      uso_pessoal: body.uso_pessoal || false,
      lugar_nome: body.lugar_nome || null,
      auto_lancado: body.auto_lancado || false,
    }
    const result = await colls.despesas.insertOne(doc)
    if (doc.tem_pendencia && doc.devedor) {
      await colls.quitacoes.insertOne({
        tipo: 'despesa_compartilhada', despesa_id: result.insertedId,
        data: new Date(), credor: doc.buyer, devedor: doc.devedor,
        valor: doc.valor_pendente, descricao: `${doc.label} - ${doc.item}`.trim(),
        observacao: doc.description, status: 'em aberto',
      })
    }
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
    if (data.createdAt) data.createdAt = new Date(`${data.createdAt}T12:00:00`)

    const despesaObjId = new ObjectId(_id)
    const old = await colls.despesas.findOne({ _id: despesaObjId })

    // Garante consistência: "Pra mim" sempre zera pendência
    if (data.pagamento_compartilhado === 'Pra mim') {
      data.tem_pendencia = false
      data.devedor = null
      data.valor_pendente = null
      data.status_pendencia = null
    }

    const merged = { ...old, ...data }
    const hadPendencia = old?.tem_pendencia
    const hasPendencia = 'tem_pendencia' in data ? data.tem_pendencia : hadPendencia

    // Re-abrindo pendência que estava quitada: reseta status
    if (hasPendencia && merged.status_pendencia === 'quitado') {
      data.status_pendencia = 'em aberto'
      merged.status_pendencia = 'em aberto'
    }

    await colls.despesas.updateOne({ _id: despesaObjId }, { $set: data })

    // Cascade para quitacoes
    const parts = [merged.label, merged.item].filter(Boolean)

    if (hadPendencia && !hasPendencia) {
      // Perdeu pendência → remove quitacoes em aberto
      await colls.quitacoes.deleteMany({ despesa_id: despesaObjId, status: 'em aberto' })
    } else if (hasPendencia && merged.devedor) {
      // Tem pendência (nova ou contínua) → upsert na quitacao em aberto
      const jaTemAberta = await colls.quitacoes.findOne({ despesa_id: despesaObjId, status: 'em aberto' })
      if (jaTemAberta) {
        await colls.quitacoes.updateOne(
          { despesa_id: despesaObjId, status: 'em aberto' },
          { $set: { credor: merged.buyer, devedor: merged.devedor, valor: merged.valor_pendente, descricao: parts.join(' - '), observacao: merged.description || null } }
        )
      } else {
        // Nenhuma em aberto (nunca criada ou foi quitada) → cria nova
        await colls.quitacoes.insertOne({
          tipo: 'despesa_compartilhada',
          despesa_id: despesaObjId,
          data: new Date(),
          credor: merged.buyer,
          devedor: merged.devedor,
          valor: merged.valor_pendente,
          descricao: parts.join(' - '),
          observacao: merged.description || null,
          status: 'em aberto',
        })
      }
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
    await colls.quitacoes.deleteMany({ despesa_id: new ObjectId(id) })
    await colls.despesas.deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
