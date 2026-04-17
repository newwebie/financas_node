export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { matchLugar, sugerirCategoria, extrairPagamento, corrigirDataTx } from '@/lib/helpers'

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

    // Carregar despesas recentes para checagem de duplicata antes de auto-lançar
    const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const despesasRecentes = await colls.despesas
      .find({ buyer: userId, createdAt: { $gte: trintaDiasAtras } })
      .toArray()

    let atualizadas = 0
    let autoLancadas = 0

    for (const tx of pendentes) {
      const lugar = matchLugar(tx.description, lugares)
      const novoMatchId = lugar ? lugar._id.toString() : null
      const atualMatchId = tx.matchedLugar ? tx.matchedLugar.toString() : null

      if (novoMatchId === atualMatchId && lugar?.tipo !== 'auto') continue

      const categoria = lugar ? lugar.categoria : sugerirCategoria(tx.description, lugares)

      // Auto-lançamento
      if (lugar?.tipo === 'auto') {
        const valorTx = Math.abs(tx.amount)
        const dataTx = new Date(tx.date)

        // Checar duplicata: mesma data (mesmo dia), mesmo valor (±2%), mesma categoria
        const duplicata = despesasRecentes.find(d => {
          const mesmoValor = Math.abs(d.total_value - valorTx) <= Math.max(valorTx * 0.02, 0.10)
          const mesmaCategoria = d.label === lugar.categoria
          const dataD = new Date(d.createdAt)
          const mesmoDia = dataD.getFullYear() === dataTx.getFullYear() &&
                           dataD.getMonth() === dataTx.getMonth() &&
                           dataD.getDate() === dataTx.getDate()
          return mesmoValor && mesmaCategoria && mesmoDia
        })

        if (duplicata) {
          // Deixa como pendente com match — conciliar vai exibir como duplicata
          await colls.transacoes_pendentes.updateOne(
            { _id: tx._id },
            { $set: { matchedLugar: lugar._id, lugar_tipo: 'auto', suggestedCategory: categoria } }
          )
          atualizadas++
          continue
        }

        // Sem duplicata — auto-lançar
        const dataCorrigida = corrigirDataTx(tx.date)
        await colls.despesas.insertOne({
          label: lugar.categoria,
          buyer: userId,
          item: lugar.nome,
          description: tx.description,
          quantity: 1,
          total_value: valorTx,
          payment_method: extrairPagamento(tx.paymentMethod, tx.description, tx.type),
          installment: 0,
          createdAt: dataCorrigida,
          pagamento_compartilhado: 'Pra mim',
          tem_pendencia: false,
          uso_pessoal: false,
          auto_lancado: true,
        })

        await colls.transacoes_pendentes.updateOne(
          { _id: tx._id },
          {
            $set: {
              status: 'lancado',
              matchedLugar: lugar._id,
              lugar_tipo: 'auto',
              suggestedCategory: categoria,
              auto_lancado: true,
              resolvedAt: new Date(),
              updatedAt: new Date(),
            }
          }
        )
        autoLancadas++
        atualizadas++
        continue
      }

      // Atualização simples de match (manual ou semi-auto)
      await colls.transacoes_pendentes.updateOne(
        { _id: tx._id },
        { $set: { matchedLugar: lugar ? lugar._id : null, lugar_tipo: lugar?.tipo || null, suggestedCategory: categoria } }
      )
      atualizadas++
    }

    return NextResponse.json({ ok: true, total: pendentes.length, atualizadas, autoLancadas })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
