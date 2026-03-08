export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { processarTransacao } from '@/lib/import-transacao'

function detectDelimiter(content) {
  const line1 = content.split('\n')[0] || ''
  return line1.includes(';') ? ';' : ','
}

function parseCSVLine(line, delimiter) {
  const result = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes }
    else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''))
  return result
}

function parseDate(dateStr) {
  if (!dateStr) return new Date()
  const s = dateStr.trim()
  // Formatos: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/')
    return new Date(`${y}-${m}-${d}T12:00:00`)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00`)
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date() : d
}

function parseAmount(amountStr) {
  if (!amountStr) return 0
  // Remove R$, espaços, pontos de milhar e substitui vírgula decimal
  const cleaned = amountStr
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  return parseFloat(cleaned) || 0
}

function generateSourceId(date, description, amount) {
  const str = `${date}-${description}-${amount}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return `csv-${Math.abs(hash)}`
}

// Detectar formato pelo cabeçalho
function detectFormat(headers) {
  const h = headers.map(h => h.toLowerCase())
  // Nubank: date, title, amount
  if (h.includes('date') && h.includes('title') && h.includes('amount')) return 'nubank'
  // Inter: Data, Descrição, Valor
  if (h.some(x => x.includes('data')) && h.some(x => x.includes('descri'))) return 'inter'
  // Genérico
  return 'generic'
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')

    if (!file || !userId) {
      return NextResponse.json({ error: 'file e userId são obrigatórios' }, { status: 400 })
    }

    const content = await file.text()
    const lines = content.split('\n').filter(l => l.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV sem dados suficientes' }, { status: 400 })
    }

    const delimiter = detectDelimiter(content)
    const headers = parseCSVLine(lines[0], delimiter)
    const format = detectFormat(headers)

    const colls = await getCollections()
    const lugares = await colls.lugares.find({ userId }).toArray()

    let imported = 0
    let skipped = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const cols = parseCSVLine(line, delimiter)
      let dateStr, description, amountStr

      if (format === 'nubank') {
        // date, title, amount
        dateStr = cols[0]; description = cols[1]; amountStr = cols[2]
      } else if (format === 'inter') {
        // Data;Histórico/Descrição;...;Valor (último campo ou coluna específica)
        dateStr = cols[0]; description = cols[1] || cols[2] || ''
        amountStr = cols[cols.length - 1]
      } else {
        // Genérico: assume data=0, descrição=1, valor=2
        dateStr = cols[0]; description = cols[1] || ''; amountStr = cols[2] || cols[cols.length - 1]
      }

      const date = parseDate(dateStr)
      const amount = parseAmount(amountStr)
      if (isNaN(amount) || !description) continue

      const sourceId = generateSourceId(dateStr, description, amountStr)

      const resultado = await processarTransacao({
        source: 'csv',
        sourceId,
        description,
        amount,
        date,
        type: amount < 0 ? 'DEBIT' : 'CREDIT',
        paymentMethod: null,
        receiverName: null,
        receiverCnpj: null,
        userId,
      }, colls, lugares)

      if (resultado.skipped) { skipped++; continue }
      imported++
    }

    return NextResponse.json({ imported, skipped, total: lines.length - 1 })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
