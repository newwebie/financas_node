'use client'

import { useState, useEffect } from 'react'
import { StatCard, ListItem, SectionTitle, Skeleton, ProgressBar } from '@/components/ui/Cards'
import { fmt, formatDateFull, getCategoryDisplay, getUserColors, calcPeriodoFatura } from '@/lib/helpers'
import { Users } from 'lucide-react'

export default function AmbasPage({ user, outro, colors, refreshKey, triggerRefresh }) {
  const [loading, setLoading] = useState(true)
  const [despesasCompartilhadas, setDespesasCompartilhadas] = useState([])
  const [periodo, setPeriodo] = useState({ dataInicio: null, dataFim: null })
  const [stats, setStats] = useState({})

  useEffect(() => {
    loadData()
  }, [user, refreshKey])

  async function loadData() {
    setLoading(true)
    try {
      const [despesas, config] = await Promise.all([
        fetch('/api/despesas').then(r => r.json()),
        fetch(`/api/config?user=${user}`).then(r => r.json()),
      ])

      // Usando mesesAtras = 1 para exibir fatura anterior
      const periodoCalc = calcPeriodoFatura(config, user, 1)
      setPeriodo(periodoCalc)

      // Filtrar despesas compartilhadas (tem_pendencia = true e valor_pendente é metade do total)
      const compartilhadas = despesas.filter(d =>
        d.tem_pendencia === true &&
        d.valor_pendente > 0 &&
        Math.abs(d.valor_pendente - (d.total_value / 2)) < 0.01 // tolerância para divisão
      )

      // Filtrar por período
      const compartilhadasPeriodo = compartilhadas.filter(d => {
        const data = new Date(d.createdAt)
        return data >= periodoCalc.dataInicio && data <= periodoCalc.dataFim
      })

      setDespesasCompartilhadas(compartilhadasPeriodo)
      calcularStats(compartilhadasPeriodo)
    } catch (error) {
      console.error('Erro ao carregar despesas compartilhadas:', error)
    } finally {
      setLoading(false)
    }
  }

  function calcularStats(despesas) {
    // Total gasto junto
    const totalJunto = despesas.reduce((sum, d) => sum + d.total_value, 0)
    const cadaUma = totalJunto / 2

    // Quanto cada uma pagou
    const susannaPagou = despesas.filter(d => d.buyer === 'Susanna').reduce((sum, d) => sum + d.total_value, 0)
    const pietrahPagou = despesas.filter(d => d.buyer === 'Pietrah').reduce((sum, d) => sum + d.total_value, 0)

    // Por categoria
    const porCategoria = {}
    despesas.forEach(d => {
      if (!porCategoria[d.label]) porCategoria[d.label] = 0
      porCategoria[d.label] += d.total_value
    })

    setStats({
      totalJunto,
      cadaUma,
      susannaPagou,
      pietrahPagou,
      porCategoria,
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const coresSu = getUserColors('Susanna')
  const coresPi = getUserColors('Pietrah')
  const maxCategoria = Math.max(...Object.values(stats.porCategoria || {}), 1)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Users size={28} className="text-white" />
        <div>
          <h1 className="text-2xl font-semibold text-white">Gastos Compartilhados</h1>
          <p className="text-white/40 text-sm">
            {formatDateFull(periodo.dataInicio)} - {formatDateFull(periodo.dataFim)}
          </p>
        </div>
      </div>

      {/* Card Total Junto */}
      <div className="bg-gradient-to-br from-mint-400/20 to-lavender-400/20 border border-white/10 rounded-3xl p-6">
        <p className="text-white/60 text-sm mb-2">Total Gasto Junto</p>
        <h2 className="text-4xl font-bold text-white mb-4">{fmt(stats.totalJunto || 0)}</h2>
        <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4">
          <span className="text-white/60 text-sm">Cada uma</span>
          <span className="text-white text-xl font-bold">{fmt(stats.cadaUma || 0)}</span>
        </div>
      </div>

      {/* Cards de Quanto Cada Uma Pagou */}
      <div className="grid grid-cols-2 gap-4">
        {/* Susanna */}
        <div className={`bg-gradient-to-br ${coresSu.gradient} bg-opacity-20 border border-white/10 rounded-3xl p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-su-400" />
            <p className="text-white/60 text-xs font-medium">Susanna pagou</p>
          </div>
          <h3 className="text-2xl font-bold text-white">{fmt(stats.susannaPagou || 0)}</h3>
        </div>

        {/* Pietrah */}
        <div className={`bg-gradient-to-br ${coresPi.gradient} bg-opacity-20 border border-white/10 rounded-3xl p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-pi-400" />
            <p className="text-white/60 text-xs font-medium">Pietrah pagou</p>
          </div>
          <h3 className="text-2xl font-bold text-white">{fmt(stats.pietrahPagou || 0)}</h3>
        </div>
      </div>

      {/* Barras por Categoria */}
      {stats.porCategoria && Object.keys(stats.porCategoria).length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <SectionTitle>Por Categoria</SectionTitle>
          <div className="space-y-3">
            {Object.entries(stats.porCategoria)
              .sort((a, b) => b[1] - a[1])
              .map(([categoria, valor]) => (
                <ProgressBar
                  key={categoria}
                  label={getCategoryDisplay(categoria)}
                  sublabel={fmt(valor)}
                  value={valor}
                  max={maxCategoria}
                  color="#a78bfa"
                />
              ))}
          </div>
        </div>
      )}

      {/* Lista Detalhada */}
      {despesasCompartilhadas.length > 0 ? (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <SectionTitle>Todas as Despesas Compartilhadas ({despesasCompartilhadas.length})</SectionTitle>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {despesasCompartilhadas.map((d) => {
              const userColors = getUserColors(d.buyer)
              return (
                <ListItem key={d._id} borderColor={userColors.hex}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white text-sm font-medium truncate">
                          {getCategoryDisplay(d.label)} - {d.item}
                        </p>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: userColors.hex }} />
                      </div>
                      <p className="text-white/40 text-xs truncate">
                        {formatDateFull(d.createdAt)} • {d.buyer} pagou
                      </p>
                      {d.description && (
                        <p className="text-white/30 text-xs truncate mt-1">{d.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-semibold">{fmt(d.total_value)}</p>
                      <p className="text-white/30 text-xs">{fmt(d.total_value / 2)} cada</p>
                    </div>
                  </div>
                </ListItem>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-12 text-center">
          <Users size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">Nenhuma despesa compartilhada no período</p>
        </div>
      )}
    </div>
  )
}
