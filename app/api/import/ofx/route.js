export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { parseOFXDate } from '@/lib/helpers'
import { processarTransacao } from '@/lib/import-transacao'
import { parse } from 'ofx-js'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')

    if (!file || !userId) {
      return NextResponse.json({ error: 'file e userId são obrigatórios' }, { status: 400 })
    }

    const content = await file.text()
    const data = await parse(content)

    // Navegar pela estrutura OFX (pode variar entre bancos)
    let rawTransactions = []
    try {
      const stmtrs =
        data?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS ||
        data?.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS ||
        null

      if (stmtrs) {
        const list = stmtrs.BANKTRANLIST?.STMTTRN
        rawTransactions = Array.isArray(list) ? list : list ? [list] : []
      }
    } catch (e) {
      console.error('OFX parse error:', e)
    }

    if (rawTransactions.length === 0) {
      return NextResponse.json({ error: 'Nenhuma transação encontrada no arquivo OFX' }, { status: 400 })
    }

    const colls = await getCollections()
    const lugares = await colls.lugares.find({ userId }).toArray()

    let imported = 0
    let skipped = 0

    for (const tx of rawTransactions) {
      const sourceId = tx.FITID || `ofx-${tx.DTPOSTED}-${tx.TRNAMT}`
      const amount = parseFloat(String(tx.TRNAMT || '0').replace(',', '.'))
      const description = tx.MEMO || tx.NAME || ''

      const resultado = await processarTransacao({
        source: 'ofx',
        sourceId,
        description,
        amount,
        date: parseOFXDate(tx.DTPOSTED),
        type: amount < 0 ? 'DEBIT' : 'CREDIT',
        paymentMethod: null,
        receiverName: null,
        receiverCnpj: null,
        userId,
      }, colls, lugares)

      if (resultado.skipped) { skipped++; continue }
      imported++
    }

    return NextResponse.json({ imported, skipped, total: rawTransactions.length })
  } catch (error) {
    console.error('OFX import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
