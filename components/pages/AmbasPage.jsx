'use client'

import { useState, useEffect } from 'react'
import { SectionTitle, ListItem, Skeleton, CategoryIcon } from '@/components/ui/Cards'
import { fmt, formatDateFull, getCategoryDisplay, getUserColors, calcPeriodoFatura } from '@/lib/helpers'
import { ChevronDown, ChevronLeft, ChevronRight, Users, TrendingUp, TrendingDown, ArrowRight, Flame, Scale } from 'lucide-react'

export default function AmbasPage({ user, outro, colors, refreshKey, triggerRefresh }) {
  const [loading, setLoading] = useState(true)
  const [mesesAtras, setMesesAtras] = useState(0)
  const [despesasCompartilhadas, setDespesasCompartilhadas] = useState([])
  const [periodo, setPeriodo] = useState({ dataInicio: null, dataFim: null })
  const [stats, setStats] = useState({})
  const [expandLista, setExpandLista] = useState(false)

  const coresSu = getUserColors('Susanna')
  const coresPi = getUserColors('Pietrah')

  useEffect(() => {
    loadData()
  }, [user, refreshKey, mesesAtras])

  async function loadData() {
    setLoading(true)
    try {
      const [despesas, config] = await Promise.all([
        fetch('/api/despesas').then(r => r.json()),
        fetch(`/api/config?user=${user}`).then(r => r.json()),
      ])

      const periodoAtual = calcPeriodoFatura(config, user, mesesAtras)
      const periodoAnterior = calcPeriodoFatura(config, user, mesesAtras + 1)
      setPeriodo(periodoAtual)

      // Filtrar despesas compartilhadas (50/50)
      const compartilhadas = despesas.filter(d =>
        d.tem_pendencia === true &&
        d.valor_pendente > 0 &&
        Math.abs(d.valor_pendente - (d.total_value / 2)) < 0.01
      )

      const compartilhadasAtual = compartilhadas.filter(d => {
        const data = new Date(d.createdAt)
        return data >= periodoAtual.dataInicio && data <= periodoAtual.dataFim
      })

      const compartilhadasAnterior = compartilhadas.filter(d => {
        const data = new Date(d.createdAt)
        return data >= periodoAnterior.dataInicio && data <= periodoAnterior.dataFim
      })

      setDespesasCompartilhadas(compartilhadasAtual)
      calcularStats(compartilhadasAtual, compartilhadasAnterior)
    } catch (error) {
      console.error('Erro ao carregar despesas compartilhadas:', error)
    } finally {
      setLoading(false)
    }
  }

  function calcularStats(despesas, despesasAnterior) {
    const totalJunto = despesas.reduce((sum, d) => sum + d.total_value, 0)
    const cadaUma = totalJunto / 2

    const despSu = despesas.filter(d => d.buyer === 'Susanna')
    const despPi = despesas.filter(d => d.buyer === 'Pietrah')
    const susannaPagou = despSu.reduce((sum, d) => sum + d.total_value, 0)
    const pietrahPagou = despPi.reduce((sum, d) => sum + d.total_value, 0)
    const diferenca = susannaPagou - pietrahPagou

    // Por categoria (total + por buyer)
    const porCategoria = {}
    const porCategoriaSu = {}
    const porCategoriaPi = {}
    despesas.forEach(d => {
      porCategoria[d.label] = (porCategoria[d.label] || 0) + d.total_value
      if (d.buyer === 'Susanna') {
        porCategoriaSu[d.label] = (porCategoriaSu[d.label] || 0) + d.total_value
      } else {
        porCategoriaPi[d.label] = (porCategoriaPi[d.label] || 0) + d.total_value
      }
    })

    // Top 3
    const top3 = [...despesas].sort((a, b) => b.total_value - a.total_value).slice(0, 3)

    // Comparação com anterior
    const totalAnterior = despesasAnterior.reduce((sum, d) => sum + d.total_value, 0)
    const qtdAnterior = despesasAnterior.length
    const variacao = totalAnterior > 0 ? ((totalJunto - totalAnterior) / totalAnterior) * 100 : 0

    setStats({
      totalJunto, cadaUma,
      susannaPagou, pietrahPagou, diferenca,
      qtdSusanna: despSu.length, qtdPietrah: despPi.length,
      porCategoria, porCategoriaSu, porCategoriaPi,
      top3,
      totalAnterior, qtdAnterior, variacao,
    })
  }

  // Helpers
  const getPeriodoLabel = () => {
    if (!periodo.dataInicio) return ''
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${meses[periodo.dataInicio.getMonth()]} ${periodo.dataInicio.getFullYear()}`
  }

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-8 w-28" /></div>
        <Skeleton className="h-[140px]" />
        <Skeleton className="h-10" />
        <div className="grid grid-cols-2 gap-3"><Skeleton className="h-[100px]" /><Skeleton className="h-[100px]" /></div>
        <Skeleton className="h-[160px]" />
      </div>
    )
  }

  const pctSu = stats.totalJunto > 0 ? (stats.susannaPagou / stats.totalJunto) * 100 : 50
  const pctPi = stats.totalJunto > 0 ? (stats.pietrahPagou / stats.totalJunto) * 100 : 50
  const maxCategoria = Math.max(...Object.values(stats.porCategoria || {}), 1)
  const categoriasOrdenadas = Object.entries(stats.porCategoria || {}).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-5 animate-fade-in">

      {/* 1. Header + Navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-white" />
          <div>
            <h1 className="text-2xl font-semibold text-white">Gastos Juntas</h1>
            <p className="text-white/40 text-[10px] md:text-xs">
              {formatDateFull(periodo.dataInicio)} - {formatDateFull(periodo.dataFim)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMesesAtras(m => m + 1)}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
          >
            <ChevronLeft size={16} className="text-white/60" />
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 min-w-[80px] text-center">
            <span className="text-white text-xs font-medium">{getPeriodoLabel()}</span>
          </div>
          <button
            onClick={() => setMesesAtras(m => Math.max(0, m - 1))}
            disabled={mesesAtras === 0}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} className="text-white/60" />
          </button>
          {mesesAtras > 0 && (
            <button
              onClick={() => setMesesAtras(0)}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] hover:bg-white/10 transition-all"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* 2. Hero Card */}
      <div className="bg-gradient-to-br from-mint-400/20 to-lavender-400/20 border border-white/10 rounded-3xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-white/50 text-xs mb-1">Total Gasto Juntas</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">{fmt(stats.totalJunto || 0)}</h2>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {stats.totalAnterior > 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium
                ${stats.variacao <= 0
                  ? 'bg-emerald-400/15 text-emerald-400'
                  : 'bg-red-400/15 text-red-400'}`}
              >
                {stats.variacao <= 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                {stats.variacao > 0 ? '+' : ''}{stats.variacao.toFixed(0)}% vs anterior
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/5 rounded-2xl p-3.5 mb-3">
          <span className="text-white/50 text-xs">Cada uma</span>
          <span className="text-white text-lg font-bold">{fmt(stats.cadaUma || 0)}</span>
        </div>

        {/* Insight de saldo */}
        {stats.diferenca !== 0 && stats.totalJunto > 0 && (
          <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-3.5">
            <Scale size={14} className="text-mint-400 flex-shrink-0" />
            <p className="text-white/70 text-xs">
              {stats.diferenca > 0
                ? <><span className="text-mint-400 font-semibold">Pietrah</span> deve {fmt(Math.abs(stats.diferenca) / 2)} para <span className="text-mint-400 font-semibold">Susanna</span></>
                : <><span className="text-mint-400 font-semibold">Susanna</span> deve {fmt(Math.abs(stats.diferenca) / 2)} para <span className="text-mint-400 font-semibold">Pietrah</span></>
              }
            </p>
          </div>
        )}
        {stats.diferenca === 0 && stats.totalJunto > 0 && (
          <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-3.5">
            <Scale size={14} className="text-mint-400 flex-shrink-0" />
            <p className="text-mint-400 text-xs font-medium">Tudo certo! Pagaram igual</p>
          </div>
        )}
      </div>

      {/* 3. Barra de Proporção */}
      {stats.totalJunto > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <SectionTitle>Quem Pagou Mais?</SectionTitle>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-su-400" />
              <span className="text-white/60 text-xs">Susanna</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-pi-400" />
              <span className="text-white/60 text-xs">Pietrah</span>
            </div>
          </div>
          <div className="w-full h-8 bg-white/5 rounded-full overflow-hidden flex">
            <div
              className="h-full flex items-center justify-center transition-all duration-700"
              style={{ width: `${pctSu}%`, backgroundColor: coresSu.hex }}
            >
              {pctSu >= 20 && <span className="text-white text-[10px] font-bold">{pctSu.toFixed(0)}%</span>}
            </div>
            <div
              className="h-full flex items-center justify-center transition-all duration-700"
              style={{ width: `${pctPi}%`, backgroundColor: coresPi.hex }}
            >
              {pctPi >= 20 && <span className="text-white text-[10px] font-bold">{pctPi.toFixed(0)}%</span>}
            </div>
          </div>
        </div>
      )}

      {/* 4. Cards Quem Pagou */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`bg-gradient-to-br ${coresSu.gradient} bg-opacity-20 border border-white/10 rounded-3xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-su-400" />
            <p className="text-white/60 text-[10px] font-medium">Susanna pagou</p>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{fmt(stats.susannaPagou || 0)}</h3>
          <p className="text-white/30 text-[10px]">
            {stats.qtdSusanna || 0} compras · Média {fmt(stats.qtdSusanna > 0 ? stats.susannaPagou / stats.qtdSusanna : 0)}
          </p>
        </div>
        <div className={`bg-gradient-to-br ${coresPi.gradient} bg-opacity-20 border border-white/10 rounded-3xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-pi-400" />
            <p className="text-white/60 text-[10px] font-medium">Pietrah pagou</p>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{fmt(stats.pietrahPagou || 0)}</h3>
          <p className="text-white/30 text-[10px]">
            {stats.qtdPietrah || 0} compras · Média {fmt(stats.qtdPietrah > 0 ? stats.pietrahPagou / stats.qtdPietrah : 0)}
          </p>
        </div>
      </div>

      {/* 5. Categorias com barras segmentadas */}
      {categoriasOrdenadas.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <SectionTitle>Por Categoria</SectionTitle>
          <div className="space-y-4">
            {categoriasOrdenadas.map(([categoria, total]) => {
              const valSu = (stats.porCategoriaSu || {})[categoria] || 0
              const valPi = (stats.porCategoriaPi || {})[categoria] || 0
              const pctTotal = maxCategoria > 0 ? (total / maxCategoria) * 100 : 0
              const pctSuCat = total > 0 ? (valSu / total) * 100 : 0
              return (
                <div key={categoria}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-white/80 truncate">{getCategoryDisplay(categoria)}</span>
                    <span className="text-xs text-white/40 font-mono flex-shrink-0 ml-2">{fmt(total)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden flex" style={{ width: `${pctTotal}%`, minWidth: '20%' }}>
                    <div
                      className="h-full rounded-l-full transition-all duration-700"
                      style={{ width: `${pctSuCat}%`, backgroundColor: coresSu.hex, boxShadow: `0 0 8px ${coresSu.hex}40` }}
                    />
                    <div
                      className="h-full rounded-r-full transition-all duration-700"
                      style={{ width: `${100 - pctSuCat}%`, backgroundColor: coresPi.hex, boxShadow: `0 0 8px ${coresPi.hex}40` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 6. Top 3 Maiores Gastos */}
      {stats.top3?.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-amber-400 flex-shrink-0" />
            <span className="text-sm font-medium text-white/50">Maiores Gastos Juntas</span>
          </div>
          <div className="space-y-2">
            {stats.top3.map((d, idx) => {
              const buyerColors = getUserColors(d.buyer)
              return (
                <div key={d._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03]">
                  <span className={`text-xs font-bold w-5 text-center ${
                    idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : 'text-orange-300'
                  }`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white text-xs font-medium truncate">
                        {d.item || d.label}
                      </p>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: buyerColors.hex }} />
                    </div>
                    <p className="text-white/30 text-[10px]">{formatDateFull(d.createdAt)} · {d.buyer} pagou</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-semibold text-xs">{fmt(d.total_value)}</p>
                    <p className="text-white/30 text-[10px]">{fmt(d.total_value / 2)} cada</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 7. Comparação com Mês Anterior */}
      {stats.totalAnterior > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <SectionTitle>vs Mês Anterior</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-white/40 text-[10px] mb-1">Total anterior</p>
              <p className="text-white font-bold text-sm">{fmt(stats.totalAnterior)}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] mb-1">Total atual</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-sm">{fmt(stats.totalJunto)}</p>
                <span className={`text-[10px] font-medium ${stats.variacao <= 0 ? 'text-mint-400' : 'text-coral-400'}`}>
                  {stats.variacao > 0 ? '+' : ''}{stats.variacao.toFixed(0)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-white/40 text-[10px] mb-1">Compras anterior</p>
              <p className="text-white font-bold text-sm">{stats.qtdAnterior}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] mb-1">Compras atual</p>
              <p className="text-white font-bold text-sm">{despesasCompartilhadas.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* 8. Lista Detalhada (Collapsible) */}
      {despesasCompartilhadas.length > 0 ? (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
          <button
            onClick={() => setExpandLista(!expandLista)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm">Todas as Despesas</span>
              <span className="text-white/30 text-xs">({despesasCompartilhadas.length})</span>
            </div>
            <ChevronDown size={16} className={`text-white/40 transition-transform ${expandLista ? 'rotate-180' : ''}`} />
          </button>
          {expandLista && (
            <div className="px-5 pb-4 space-y-2 max-h-96 overflow-y-auto">
              {despesasCompartilhadas
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((d) => {
                  const buyerColors = getUserColors(d.buyer)
                  return (
                    <ListItem key={d._id} borderColor={buyerColors.hex}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-white text-xs font-medium truncate">
                              {getCategoryDisplay(d.label)} - {d.item}
                            </p>
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: buyerColors.hex }} />
                          </div>
                          <p className="text-white/40 text-[10px] truncate">
                            {formatDateFull(d.createdAt)} · {d.buyer} pagou
                          </p>
                          {d.description && (
                            <p className="text-white/30 text-[10px] truncate mt-0.5">{d.description}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white text-xs font-semibold">{fmt(d.total_value)}</p>
                          <p className="text-white/30 text-[10px]">{fmt(d.total_value / 2)} cada</p>
                        </div>
                      </div>
                    </ListItem>
                  )
                })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-12 text-center">
          <Users size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm mb-1">Nenhuma despesa compartilhada</p>
          <p className="text-white/30 text-xs">Nenhum gasto dividido 50/50 neste período</p>
        </div>
      )}
    </div>
  )
}
