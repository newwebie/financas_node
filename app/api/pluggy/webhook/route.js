import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { getPluggyClient } from '@/lib/pluggy'
import { processarTransacao } from '@/lib/import-transacao'

export async function POST(request) {
  try {
    // Verificar autenticação do webhook
    const webhookSecret = process.env.PLUGGY_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get('x-pluggy-signature')
      if (!signature || signature !== webhookSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const payload = await request.json()
    const { event, itemId } = payload

    switch (event) {
      case 'transactions/created': {
        // Buscar userId do item no banco
        const colls = await getCollections()
        const item = await colls.pluggy_items.findOne({ itemId })
        if (!item) break

        const { userId } = item
        const lugares = await colls.lugares.find({ userId }).toArray()
        const client = getPluggyClient()

        // Buscar contas do item
        const accountsResult = await client.fetchAccounts(itemId)
        const accounts = accountsResult.results || accountsResult.accounts || []

        let imported = 0
        for (const account of accounts) {
          // Ultimas 24h
          const to = new Date()
          const from = new Date(Date.now() - 24 * 60 * 60 * 1000)
          const fromStr = from.toISOString().split('T')[0]
          const toStr = to.toISOString().split('T')[0]

          const txResult = await client.fetchTransactions(account.id, {
            from: fromStr,
            to: toStr,
            pageSize: 100,
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

        // Atualizar lastSync do item
        await colls.pluggy_items.updateOne(
          { itemId },
          { $set: { lastSync: new Date(), status: 'UPDATED' } }
        )
        break
      }

      case 'item/updated': {
        const colls = await getCollections()
        await colls.pluggy_items.updateOne(
          { itemId },
          { $set: { lastSync: new Date(), status: 'UPDATED' } }
        )
        break
      }

      case 'item/error': {
        const colls = await getCollections()
        await colls.pluggy_items.updateOne(
          { itemId },
          { $set: { status: 'ERROR', updatedAt: new Date() } }
        )
        console.error('Pluggy item error:', payload)
        break
      }

      default:
        // outros eventos: logar e ignorar
        console.log('Pluggy webhook event:', event, itemId)
    }

    // DEVE retornar 2XX em ate 5 segundos (requisito do Pluggy)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    // Retornar 200 mesmo com erro para nao triggerar retries desnecessarios
    return NextResponse.json({ ok: true, error: error.message })
  }
}
