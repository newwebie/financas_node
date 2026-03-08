import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { getPluggyClient } from '@/lib/pluggy'
import { processarTransacao } from '@/lib/import-transacao'

// Chamado pelo cron job diario (vercel.json)
// Tambem pode ser chamado manualmente: GET /api/pluggy/sync
export async function GET(request) {
  try {
    // Verificar autenticação do cron job da Vercel
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const colls = await getCollections()
    const client = getPluggyClient()

    // Buscar itens ativos + itens com ERROR antigo (>12h) para retry automático
    const retryThreshold = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const items = await colls.pluggy_items.find({
      $or: [
        { status: { $ne: 'ERROR' } },
        { status: 'ERROR', updatedAt: { $lt: retryThreshold } },
        { status: 'ERROR', updatedAt: { $exists: false } },
      ]
    }).toArray()

    const results = []

    for (const item of items) {
      try {
        const { itemId, userId } = item

        // 1. Atualizar saldos das contas
        const accountsResult = await client.fetchAccounts(itemId)
        const accounts = accountsResult.results || accountsResult.accounts || []

        for (const account of accounts) {
          await colls.saldos_bancarios.updateOne(
            { accountId: account.id },
            {
              $set: {
                userId,
                itemId,
                accountId: account.id,
                accountName: account.name,
                type: account.type,
                subtype: account.subtype,
                balance: account.balance,
                number: account.number || null,
                updatedAt: new Date(),
              }
            },
            { upsert: true }
          )
        }

        // 2. Importar transacoes dos ultimos 7 dias
        const lugares = await colls.lugares.find({ userId }).toArray()
        const to = new Date()
        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const fromStr = from.toISOString().split('T')[0]
        const toStr = to.toISOString().split('T')[0]

        let imported = 0
        for (const account of accounts) {
          const txResult = await client.fetchTransactions(account.id, {
            from: fromStr,
            to: toStr,
            pageSize: 200,
          })
          const transactions = txResult.results || txResult.transactions || []

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

            if (!resultado.skipped) imported++
          }
        }

        // Atualizar lastSync
        await colls.pluggy_items.updateOne(
          { itemId },
          { $set: { lastSync: new Date(), status: 'UPDATED' } }
        )

        results.push({ itemId, userId, accounts: accounts.length, imported, status: 'ok' })
      } catch (itemError) {
        console.error(`Sync error for item ${item.itemId}:`, itemError)
        results.push({ itemId: item.itemId, status: 'error', error: itemError.message })
        await colls.pluggy_items.updateOne(
          { itemId: item.itemId },
          { $set: { status: 'ERROR', updatedAt: new Date() } }
        )
      }
    }

    return NextResponse.json({ ok: true, processed: items.length, results })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
