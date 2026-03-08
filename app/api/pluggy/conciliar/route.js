export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'

// GET ?user=susanna
// Retorna transações pendentes com campo `possivel_duplicata` preenchido
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')
    if (!userId) return NextResponse.json({ error: 'user obrigatório' }, { status: 400 })

    const colls = await getCollections()

    // Buscar transações pendentes
    const pendentes = await colls.transacoes_pendentes
      .find({ userId, status: 'pendente' })
      .sort({ date: -1 })
      .limit(100)
      .toArray()

    // Buscar despesas dos últimos 60 dias para comparar
    const sessantaDiasAtras = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const despesas = await colls.despesas
      .find({ buyer: userId, createdAt: { $gte: sessantaDiasAtras } })
      .toArray()

    // Para cada transação pendente, procurar despesa similar
    const result = pendentes.map(tx => {
      const valorTx = Math.abs(tx.amount)
      const dataTx = new Date(tx.date)
      const toleranciaValor = Math.max(valorTx * 0.02, 0.10)
      const toleranciaDias = 3 * 24 * 60 * 60 * 1000 // 3 dias em ms

      const match = despesas.find(d => {
        const diferencaValor = Math.abs(d.total_value - valorTx)
        const diferencaData = Math.abs(new Date(d.createdAt) - dataTx)
        return diferencaValor <= toleranciaValor && diferencaData <= toleranciaDias
      })

      return {
        ...tx,
        _id: tx._id.toString(),
        matchedLugar: tx.matchedLugar?.toString() || null,
        possivel_duplicata: match
          ? {
              despesa_id: match._id.toString(),
              item: match.item || match.label,
              valor: match.total_value,
              data: match.createdAt,
              categoria: match.label,
            }
          : null,
      }
    })

    const duplicatas = result.filter(t => t.possivel_duplicata).length
    return NextResponse.json({ transacoes: result, total: result.length, duplicatas })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
