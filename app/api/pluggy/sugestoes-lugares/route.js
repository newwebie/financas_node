export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'

function normalizeDescription(str) {
  if (!str) return ''
  return str
    .replace(/\d{11,}/g, '')
    .replace(/\b\d{4,}\b/g, '')
    .replace(/[*]{4,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60)
}

function jaTemLugar(descNorm, lugares) {
  const desc = descNorm.toLowerCase()
  return lugares.some((l) =>
    (l.keywords || []).some((kw) => kw && desc.includes(kw.toLowerCase())),
  )
}

// GET ?user=susanna
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')
    if (!userId)
      return NextResponse.json({ error: 'user obrigatório' }, { status: 400 })

    const colls = await getCollections()

    // Buscar lugares existentes do usuário para exclusão
    const lugares = await colls.lugares.find({ userId }).toArray()

    // Buscar transações pendentes de saída sem lugar associado
    const transacoes = await colls.transacoes_pendentes
      .find({ userId, type: 'DEBIT', status: 'pendente', matchedLugar: null })
      .sort({ date: -1 })
      .limit(500)
      .toArray()

    if (transacoes.length === 0) {
      return NextResponse.json({ ultimas5: [], frequentes: [], total: 0 })
    }

    // Agrupar por descrição normalizada
    const grupos = {} // { descNorm: { descOriginal, count, ultimaData, previas[] } }

    for (const tx of transacoes) {
      const descNorm = normalizeDescription(tx.description)
      if (!descNorm || descNorm.length < 3) continue
      if (jaTemLugar(descNorm, lugares)) continue

      if (!grupos[descNorm]) {
        grupos[descNorm] = {
          descricao: tx.description,
          descNorm,
          count: 0,
          ultimaData: tx.date,
          previas: [],
        }
      }
      grupos[descNorm].count++
      // Guardar até 5 ocorrências para preview
      if (grupos[descNorm].previas.length < 5) {
        grupos[descNorm].previas.push({
          valor: Math.abs(tx.amount),
          data: tx.date,
        })
      }
      if (new Date(tx.date) > new Date(grupos[descNorm].ultimaData)) {
        grupos[descNorm].descricao = tx.description
        grupos[descNorm].ultimaData = tx.date
      }
    }

    const lista = Object.values(grupos)

    // Critério 1: últimas 5 únicas (por data da transação mais recente)
    const ultimas5 = lista
      .sort((a, b) => new Date(b.ultimaData) - new Date(a.ultimaData))
      .slice(0, 5)
      .map((g) => ({
        descricao: g.descricao,
        count: g.count,
        ultimaData: g.ultimaData,
      }))

    // Critério 2: aparecem >= 3 vezes, ordenado por frequência desc
    const frequentes = lista
      .filter((g) => g.count >= 3)
      .sort(
        (a, b) =>
          b.count - a.count ||
          new Date(b.ultimaData) - new Date(a.ultimaData),
      )
      .map((g) => ({
        descricao: g.descricao,
        count: g.count,
        ultimaData: g.ultimaData,
        previas: g.previas.sort((a, b) => new Date(b.data) - new Date(a.data)),
      }))

    return NextResponse.json({
      ultimas5,
      frequentes,
      total: ultimas5.length + frequentes.length,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
