export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'

// GET ?user=susanna
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')
    if (!userId) return NextResponse.json({ error: 'user obrigatorio' }, { status: 400 })

    const colls = await getCollections()
    const saldos = await colls.saldos_bancarios
      .find({ userId })
      .sort({ type: 1, accountName: 1 })
      .toArray()

    // Agrupar por tipo
    const contaTypes = ['BANK', 'CHECKING', 'SAVINGS']
    const contas = saldos.filter(s => contaTypes.includes(s.type))
    const cartoes = saldos.filter(s => s.type === 'CREDIT')

    const totalContas = contas.reduce((sum, s) => sum + (s.balance || 0), 0)
    const totalFatura = cartoes.reduce((sum, s) => sum + Math.abs(s.balance || 0), 0)

    return NextResponse.json({
      saldos: saldos.map(s => ({ ...s, _id: s._id.toString() })),
      contas,
      cartoes,
      totalContas,
      totalFatura,
      updatedAt: saldos[0]?.updatedAt || null,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
