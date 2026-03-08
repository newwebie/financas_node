export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { matchLugar, sugerirCategoria } from '@/lib/helpers'
import { ObjectId } from 'mongodb'

// POST { userId } — re-processa transações pendentes contra lugares atuais
export async function POST(request) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

    const colls = await getCollections()

    const [pendentes, lugares] = await Promise.all([
      colls.transacoes_pendentes.find({ userId, status: 'pendente' }).toArray(),
      colls.lugares.find({ userId }).toArray(),
    ])

    let atualizadas = 0

    for (const tx of pendentes) {
      const lugar = matchLugar(tx.description, lugares)
      const novoMatchId = lugar ? lugar._id.toString() : null
      const atualMatchId = tx.matchedLugar ? tx.matchedLugar.toString() : null

      // Só atualiza se o match mudou
      if (novoMatchId === atualMatchId) continue

      const categoria = lugar ? lugar.categoria : sugerirCategoria(tx.description, lugares)

      await colls.transacoes_pendentes.updateOne(
        { _id: tx._id },
        {
          $set: {
            matchedLugar: lugar ? lugar._id : null,
            lugar_tipo: lugar?.tipo || null,
            suggestedCategory: categoria,
          },
        }
      )
      atualizadas++
    }

    return NextResponse.json({ ok: true, total: pendentes.length, atualizadas })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
