import { NextResponse } from 'next/server'
import { getCollections, getDb } from '@/lib/mongodb'

// Cron mensal: limpa transacoes_pendentes com status 'lancado' ou 'ignorado' com mais de 90 dias.
// Tambem garante que o TTL index existe (camada dupla de seguranca).
// Chamado via vercel.json ou manualmente: GET /api/limpeza-pendentes
export async function GET() {
  try {
    const colls = await getCollections()
    const db = await getDb()

    // 1. Garantir TTL index (idempotente — createIndex ignora se ja existe)
    // O TTL apaga documentos automaticamente 90 dias apos o campo 'resolvedAt'
    await db.collection('transacoes_pendentes').createIndex(
      { resolvedAt: 1 },
      { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { status: { $in: ['lancado', 'ignorado'] } } }
    )

    // 2. Marcar 'resolvedAt' em documentos lancado/ignorado que ainda nao tem
    // (necessario para o TTL funcionar em docs antigos)
    const backfill = await colls.transacoes_pendentes.updateMany(
      { status: { $in: ['lancado', 'ignorado'] }, resolvedAt: { $exists: false } },
      { $set: { resolvedAt: new Date() } }
    )

    // 3. Limpeza direta: deletar lancado/ignorado com mais de 90 dias (redundancia ao TTL)
    const limite = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const result = await colls.transacoes_pendentes.deleteMany({
      status: { $in: ['lancado', 'ignorado'] },
      createdAt: { $lt: limite },
    })

    return NextResponse.json({
      ok: true,
      ttl_index: 'ensured',
      backfilled: backfill.modifiedCount,
      deleted: result.deletedCount,
    })
  } catch (error) {
    console.error('Erro na limpeza:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
