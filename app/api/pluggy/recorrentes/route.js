export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'

// Normaliza descrição para agrupamento: minúsculas, sem números, sem caracteres especiais
function normalizeDesc(str) {
  return (str || '')
    .toLowerCase()
    .replace(/\d+/g, '')           // remove números
    .replace(/[^a-záéíóúãõâêôüç\s]/gi, '') // remove especiais
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 40)              // primeiros 40 chars
}

// Verifica se dois valores são "próximos" (dentro de 15%)
function valoresSimilares(a, b) {
  const max = Math.max(Math.abs(a), Math.abs(b))
  if (max === 0) return true
  return Math.abs(Math.abs(a) - Math.abs(b)) / max <= 0.15
}

// GET ?user=susanna
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')
    if (!userId) return NextResponse.json({ error: 'user obrigatório' }, { status: 400 })

    const colls = await getCollections()

    // Últimos 4 meses de transações importadas (todas, não só pendentes)
    const quatroMesesAtras = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)

    const [transacoes, despesas] = await Promise.all([
      colls.transacoes_pendentes
        .find({ userId, date: { $gte: quatroMesesAtras }, type: 'DEBIT' })
        .toArray(),
      colls.despesas
        .find({ buyer: userId, createdAt: { $gte: quatroMesesAtras } })
        .toArray(),
    ])

    // Unificar: transações bancárias + despesas manuais
    const todos = [
      ...transacoes.map(t => ({
        desc: normalizeDesc(t.description),
        descOriginal: t.description,
        valor: Math.abs(t.amount),
        mes: `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, '0')}`,
        fonte: 'banco',
      })),
      ...despesas.map(d => ({
        desc: normalizeDesc(d.item || d.label),
        descOriginal: d.item || d.label,
        valor: d.total_value,
        mes: `${new Date(d.createdAt).getFullYear()}-${String(new Date(d.createdAt).getMonth() + 1).padStart(2, '0')}`,
        fonte: 'manual',
      })),
    ].filter(t => t.desc && t.valor > 0)

    // Agrupar por descrição normalizada
    const grupos = {}
    for (const t of todos) {
      // Procurar grupo existente com desc similar e valor similar
      let grupoKey = Object.keys(grupos).find(k => {
        const g = grupos[k]
        return (
          (k === t.desc || k.includes(t.desc.substring(0, 15)) || t.desc.includes(k.substring(0, 15))) &&
          valoresSimilares(g.valorMedio, t.valor)
        )
      })

      if (!grupoKey) {
        grupoKey = t.desc
        grupos[grupoKey] = {
          descNormalizada: t.desc,
          descOriginal: t.descOriginal,
          valorMedio: t.valor,
          meses: [],
          ocorrencias: 0,
        }
      }

      if (!grupos[grupoKey].meses.includes(t.mes)) {
        grupos[grupoKey].meses.push(t.mes)
      }
      grupos[grupoKey].ocorrencias++
      // Atualizar média do valor
      grupos[grupoKey].valorMedio =
        (grupos[grupoKey].valorMedio * (grupos[grupoKey].ocorrencias - 1) + t.valor) /
        grupos[grupoKey].ocorrencias
    }

    // Filtrar: só recorrentes (aparecem em 2+ meses diferentes)
    const recorrentes = Object.values(grupos)
      .filter(g => g.meses.length >= 2)
      .sort((a, b) => b.meses.length - a.meses.length || b.valorMedio - a.valorMedio)
      .map(g => ({
        descricao: g.descOriginal,
        valorMedio: Math.round(g.valorMedio * 100) / 100,
        meses: g.meses.sort(),
        totalMeses: g.meses.length,
        ultimoMes: g.meses.sort().pop(),
      }))

    return NextResponse.json({ recorrentes, total: recorrentes.length })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
