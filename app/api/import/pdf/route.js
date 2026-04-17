export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { processarTransacao } from '@/lib/import-transacao'

function parseBRAmount(str) {
  return parseFloat(str.replace(/\./g, '').replace(',', '.'))
}

function parseLine(line) {
  line = line.trim()

  // Precisa começar com data DD/MM/YYYY
  const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+/)
  if (!dateMatch) return null

  // Precisa terminar com dois valores no formato brasileiro (valor + saldo)
  const numericSuffix = line.match(/\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})$/)
  if (!numericSuffix) return null

  const amountStr = numericSuffix[1]
  const middle = line.slice(dateMatch[0].length, line.length - numericSuffix[0].length)
    .replace(/\s+/g, ' ').trim()

  // Docto é o último número de 6 dígitos isolado antes dos valores
  const doctoMatch = middle.match(/\b(\d{6})\b\s*$/)
  let description = middle
  let docto = '000000'
  if (doctoMatch) {
    docto = doctoMatch[1]
    description = middle.slice(0, doctoMatch.index).replace(/\s+/g, ' ').trim()
  }

  const amount = parseBRAmount(amountStr)
  if (amount === 0) return null

  const [day, month, year] = dateMatch[1].split('/')

  return {
    date: `${year}-${month}-${day}T12:00:00`,
    description,
    docto,
    amount,
    amountRaw: amountStr.replace(/[^0-9-]/g, ''),
    dateRaw: `${year}${month}${day}`,
  }
}

function detectPaymentMethod(description) {
  const d = description.toUpperCase()
  if (d.includes('PIX')) return 'PIX'
  if (d.includes('COMPRA CARTAO DEB') || d.includes('CARTAO DEB')) return 'DEBIT_CARD'
  if (d.includes('PAGAMENTO CARTAO CREDITO')) return 'CREDIT_CARD'
  if (d.includes('DEBITO AUT')) return 'DIRECT_DEBIT'
  return null
}

function extractReceiverName(description) {
  const prefixes = ['PIX ENVIADO ', 'PIX RECEBIDO ', 'PIX DEVOLVIDO ']
  for (const prefix of prefixes) {
    if (description.toUpperCase().startsWith(prefix)) {
      return description.substring(prefix.length).trim()
    }
  }
  const cardMatch = description.match(/COMPRA CARTAO DEB MC \d{2}\/\d{2} (.+)/i)
  if (cardMatch) return cardMatch[1].trim()
  return null
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')

    if (!file || !userId) {
      return NextResponse.json({ error: 'file e userId são obrigatórios' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const pdfData = await parser.getText()

    const lines = pdfData.text.split('\n')
    const transactions = lines.map(parseLine).filter(Boolean)

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma transação encontrada. Verifique se o PDF é um extrato Santander válido.' },
        { status: 400 }
      )
    }

    const colls = await getCollections()
    const lugares = await colls.lugares.find({ userId }).toArray()

    let imported = 0
    let skipped = 0

    for (const tx of transactions) {
      const descKey = tx.description.substring(0, 15).replace(/\s+/g, '_')
      const sourceId = `pdf_${tx.dateRaw}_${tx.docto}_${tx.amountRaw}_${descKey}`

      const resultado = await processarTransacao({
        source: 'pdf',
        sourceId,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        type: tx.amount < 0 ? 'DEBIT' : 'CREDIT',
        paymentMethod: detectPaymentMethod(tx.description),
        receiverName: extractReceiverName(tx.description),
        receiverCnpj: null,
        userId,
      }, colls, lugares)

      if (resultado.skipped) skipped++
      else imported++
    }

    return NextResponse.json({ imported, skipped, total: transactions.length })
  } catch (error) {
    console.error('PDF import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
