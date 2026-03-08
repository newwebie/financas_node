export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { getPluggyClient } from '@/lib/pluggy'
import { processarTransacao } from '@/lib/import-transacao'

// GET ?user=susanna&status=pendente
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')
    const status = searchParams.get('status') || 'pendente'
    const colls = await getCollections()
    const query = {}
    if (userId) query.userId = userId
    if (status !== 'todos') query.status = status
    const txs = await colls.transacoes_pendentes
      .find(query)
      .sort({ date: -1 })
      .limit(200)
      .toArray()
    return NextResponse.json(txs.map(t => ({ ...t, _id: t._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST { userId, accountId, from, to } — importa do Pluggy
export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, accountId, from, to } = body

    const client = getPluggyClient()
    const colls = await getCollections()

    // Buscar lugares para auto-match
    const lugares = await colls.lugares.find({ userId }).toArray()

    const result = await client.fetchTransactions(accountId, {
      from,
      to,
      pageSize: 500,
      page: 1,
    })

    const transactions = result.results || result.transactions || []
    let imported = 0
    let skipped = 0

    for (const tx of transactions) {
      const resultado = await processarTransacao({
        source: 'pluggy',
        sourceId: tx.id,
        description: tx.description || tx.descriptionRaw || '',
        amount: tx.amount,
        date: tx.date,
        type: tx.type || (tx.amount < 0 ? 'DEBIT' : 'CREDIT'),
        paymentMethod: tx.paymentData?.paymentMethod || null,
        receiverName: tx.paymentData?.receiver?.name || null,
        receiverCnpj: tx.paymentData?.receiver?.documentNumber?.value || null,
        userId,
      }, colls, lugares)

      if (resultado.skipped) { skipped++; continue }
      imported++
    }

    return NextResponse.json({ imported, skipped, total: transactions.length })
  } catch (error) {
    console.error('Pluggy transacoes error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH { _id, status } — marcar como lancado ou ignorado
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { ObjectId } = await import('mongodb')
    const colls = await getCollections()
    const updateFields = { status: body.status, updatedAt: new Date() }
    if (body.status === 'lancado' || body.status === 'ignorado') {
      updateFields.resolvedAt = new Date()
    }
    await colls.transacoes_pendentes.updateOne(
      { _id: new ObjectId(body._id) },
      { $set: updateFields }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
