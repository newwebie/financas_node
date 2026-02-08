'use client'

import { useState, useEffect } from 'react'
import { SectionTitle, Skeleton } from '@/components/ui/Cards'
import { fmt, formatDateFull, getCategoryEmoji, calcPeriodoFatura, CATEGORIAS } from '@/lib/helpers'
import { ChevronDown, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, Shield, PiggyBank, CreditCard, ShoppingBag, Calendar, Flame } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function RelatorioPage({ user, outro, colors, refreshKey, triggerRefresh }) {
  const [loading, setLoading] = useState(true)
  const [mesesAtras, setMesesAtras] = useState(0)
  const [despesas, setDespesas] = useState([])
  const [contasFixas, setContasFixas] = useState([])
  const [metas, setMetas] = useState([])
  const [config, setConfig] = useState([])
  const [dividasTerceiros, setDividasTerceiros] = useState([])
  const [periodos, setPeriodos] = useState({})
  const [metricas, setMetricas] = useState({})
  const [expandParcelas, setExpandParcelas] = useState(false)
  const [expandContas, setExpandContas] = useState(false)
  const [expandDespesas, setExpandDespesas] = useState(false)

  useEffect(() => {
    loadData()
  }, [user, refreshKey, mesesAtras])

  async function loadData() {
    setLoading(true)
    try {
      const [desp, cf, cfg, metasData, dividas] = await Promise.all([
        fetch(`/api/despesas?buyer=${user}`).then(r => r.json()),
        fetch('/api/contas-fixas').then(r => r.json()),
        fetch(`/api/config?user=${user}`).then(r => r.json()),
        fetch(`/api/metas?user=${user}`).then(r => r.json()),
        fetch(`/api/dividas-terceiros?user=${user}&status=em aberto`).then(r => r.json()),
      ])

      const periodoAtual = calcPeriodoFatura(cfg, user, mesesAtras)
      const periodoAnterior = calcPeriodoFatura(cfg, user, mesesAtras + 1)
      const periodoDoisAtras = calcPeriodoFatura(cfg, user, mesesAtras + 2)

      setDespesas(desp)
      setContasFixas(cf.filter(c => c.buyer === user))
      setConfig(cfg)
      setMetas(metasData)
      setDividasTerceiros(dividas)
      setPeriodos({ atual: periodoAtual, anterior: periodoAnterior, doisAtras: periodoDoisAtras })

      calcularMetricas(desp, cf.filter(c => c.buyer === user), metasData, dividas, periodoAtual, periodoAnterior, periodoDoisAtras)
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
    } finally {
      setLoading(false)
    }
  }

  function filtrarDespesasPeriodo(allDespesas, periodo) {
    return allDespesas.filter(d => {
      const data = new Date(d.createdAt)
      return data >= periodo.dataInicio && data <= periodo.dataFim && d.label !== 'Cofrinho' && d.label !== 'Renda Variavel'
    })
  }

  function calcTotalPeriodo(despesasPeriodo) {
    let total = 0
    despesasPeriodo.forEach(d => {
      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      if (d.tem_pendencia && d.valor_pendente) valor -= d.valor_pendente
      total += valor
    })
    return total
  }

  function calcularMetricas(allDespesas, fixas, metasData, dividas, periodoAtual, periodoAnterior, periodoDoisAtras) {
    const despAtual = filtrarDespesasPeriodo(allDespesas, periodoAtual)
    const despAnterior = filtrarDespesasPeriodo(allDespesas, periodoAnterior)
    const despDoisAtras = filtrarDespesasPeriodo(allDespesas, periodoDoisAtras)

    const totalAtual = calcTotalPeriodo(despAtual)
    const totalAnterior = calcTotalPeriodo(despAnterior)
    const totalDoisAtras = calcTotalPeriodo(despDoisAtras)

    // Economia (cofrinho + renda variavel no período)
    const economiaItems = allDespesas.filter(d => {
      const data = new Date(d.createdAt)
      return data >= periodoAtual.dataInicio && data <= periodoAtual.dataFim && (d.label === 'Cofrinho' || d.label === 'Renda Variavel')
    })
    const totalEconomia = economiaItems.reduce((sum, d) => sum + d.total_value, 0)

    // Total fixas
    const totalFixas = fixas.filter(c => c.payment_method !== 'Credito').reduce((sum, c) => sum + (c.valor || 0), 0)
    const totalMes = totalAtual + totalFixas

    // Métricas básicas
    const diasPeriodo = Math.ceil((periodoAtual.dataFim - periodoAtual.dataInicio) / (1000 * 60 * 60 * 24))
    const mediaDia = totalAtual / (diasPeriodo || 1)
    const mediaCompra = despAtual.length > 0 ? totalAtual / despAtual.length : 0
    const qtdCompras = despAtual.length

    // Dia que mais gasta
    const gastosPorDia = {}
    despAtual.forEach(d => {
      const dia = new Date(d.createdAt).toLocaleDateString('pt-BR', { weekday: 'long' })
      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      if (d.tem_pendencia && d.valor_pendente) valor -= d.valor_pendente
      gastosPorDia[dia] = (gastosPorDia[dia] || 0) + valor
    })
    const diaMaisGasta = Object.entries(gastosPorDia).sort((a, b) => b[1] - a[1])[0]

    // Gastos por categoria
    const gastosPorCategoria = {}
    despAtual.forEach(d => {
      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      if (d.tem_pendencia && d.valor_pendente) valor -= d.valor_pendente
      gastosPorCategoria[d.label] = (gastosPorCategoria[d.label] || 0) + valor
    })

    // Gastos vs Metas
    const metasComGasto = metasData.map(m => ({
      ...m,
      gasto: gastosPorCategoria[m.categoria] || 0,
      percent: m.limite > 0 ? ((gastosPorCategoria[m.categoria] || 0) / m.limite) * 100 : 0,
    })).sort((a, b) => b.percent - a.percent)

    // Controle de cartão
    const faturaEstimada = despAtual.filter(d => d.payment_method === 'Credito' && d.installment <= 1).reduce((sum, d) => sum + d.total_value, 0)
    const parcelasAtivas = allDespesas.filter(d => d.installment > 1 && d.payment_method === 'Credito')
    const proximoMes = parcelasAtivas.reduce((sum, d) => sum + (d.total_value / d.installment), 0)
    const compromissoTotal = parcelasAtivas.reduce((sum, d) => sum + d.total_value, 0)

    // Gastos por método de pagamento
    const gastosPorPagamento = {}
    despAtual.forEach(d => {
      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      gastosPorPagamento[d.payment_method] = (gastosPorPagamento[d.payment_method] || 0) + valor
    })

    // Top 3 gastos
    const top3 = [...despAtual].sort((a, b) => b.total_value - a.total_value).slice(0, 3)

    // Tendência
    const tendencia = [
      { name: '2 meses', valor: totalDoisAtras },
      { name: 'Anterior', valor: totalAnterior },
      { name: 'Atual', valor: totalAtual },
    ]

    const variacao = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : 0

    // ===== SCORE FINANCEIRO =====
    let score = 0

    // 1. Economia (0-25 pts)
    const totalGeral = totalAtual + totalEconomia
    const taxaEconomia = totalGeral > 0 ? totalEconomia / totalGeral : 0
    if (taxaEconomia >= 0.20) score += 25
    else if (taxaEconomia >= 0.15) score += 20
    else if (taxaEconomia >= 0.10) score += 15
    else if (taxaEconomia >= 0.05) score += 10
    else score += Math.round(taxaEconomia * 125)

    // 2. Metas (0-25 pts)
    if (metasComGasto.length > 0) {
      const metasDentro = metasComGasto.filter(m => m.percent <= 100).length
      score += Math.round((metasDentro / metasComGasto.length) * 25)
    } else {
      score += 12
    }

    // 3. Tendência (0-25 pts)
    if (totalAnterior > 0) {
      if (totalAtual <= totalAnterior * 0.8) score += 25
      else if (totalAtual <= totalAnterior * 0.95) score += 20
      else if (totalAtual <= totalAnterior * 1.05) score += 15
      else if (totalAtual <= totalAnterior * 1.2) score += 8
      else score += 3
    } else {
      score += 12
    }

    // 4. Controle (0-25 pts)
    let controle = 25
    if (compromissoTotal > totalAtual * 0.5) controle -= 10
    else if (compromissoTotal > totalAtual * 0.3) controle -= 5
    if (dividas.length > 3) controle -= 10
    else if (dividas.length > 0) controle -= 5
    score += Math.max(0, controle)

    score = Math.min(100, Math.max(0, score))

    const scoreBreakdown = {
      economia: taxaEconomia,
      metasDentro: metasComGasto.length > 0 ? metasComGasto.filter(m => m.percent <= 100).length : 0,
      metasTotal: metasComGasto.length,
      variacao,
      dividas: dividas.length,
    }

    setMetricas({
      totalAtual, totalAnterior, totalDoisAtras, totalEconomia,
      totalFixas, totalMes, mediaDia, mediaCompra, qtdCompras,
      diaMaisGasta, gastosPorDia, gastosPorCategoria, gastosPorPagamento,
      metasComGasto, faturaEstimada, proximoMes, compromissoTotal,
      parcelasAtivas, top3, despesasPeriodo: despAtual,
      tendencia, variacao, score, scoreBreakdown,
    })
  }

  // ===== RENDER HELPERS =====

  const getScoreLabel = (s) => {
    if (s >= 80) return { label: 'Excelente', color: 'text-mint-400' }
    if (s >= 60) return { label: 'Bom', color: 'text-emerald-400' }
    if (s >= 40) return { label: 'Atenção', color: 'text-amber-400' }
    return { label: 'Crítico', color: 'text-coral-400' }
  }

  const getScoreRingColor = (s) => {
    if (s >= 80) return '#6ee7b7'
    if (s >= 60) return '#34d399'
    if (s >= 40) return '#fbbf24'
    return '#f87171'
  }

  const getPeriodoLabel = () => {
    if (!periodos.atual) return ''
    const inicio = periodos.atual.dataInicio
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${meses[inicio.getMonth()]} ${inicio.getFullYear()}`
  }

  const getMetaColor = (percent) => {
    if (percent >= 100) return '#f87171'
    if (percent >= 80) return '#fbbf24'
    return '#6ee7b7'
  }

  const ChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-base-800 border border-white/10 rounded-xl p-2.5 shadow-lg">
          <p className="text-white text-xs font-medium">{payload[0].payload.name}</p>
          <p className="text-white/60 text-xs">{fmt(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10" />
        <Skeleton className="h-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const scoreInfo = getScoreLabel(metricas.score || 0)
  const ringColor = getScoreRingColor(metricas.score || 0)
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (circumference * (metricas.score || 0)) / 100

  const pagamentoColors = {
    Credito: '#f472b6',
    Debito: '#60a5fa',
    Pix: '#6ee7b7',
    Dinheiro: '#fdba74',
    VR: '#c4b5fd',
  }

  const pagamentoData = Object.entries(metricas.gastosPorPagamento || {})
    .map(([name, value]) => ({ name, value, color: pagamentoColors[name] || '#94a3b8' }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header + Navegador de Meses */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Relatório</h1>
          <p className="text-white/40 text-[10px] md:text-xs mt-0.5">
            {formatDateFull(periodos.atual?.dataInicio)} - {formatDateFull(periodos.atual?.dataFim)}
          </p>
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
        </div>
      </div>

      {/* Score Financeiro - Hero */}
      <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
        <div className="flex items-center gap-5">
          {/* Ring gauge */}
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{metricas.score || 0}</span>
              <span className="text-[10px] text-white/40">de 100</span>
            </div>
          </div>

          {/* Score details */}
          <div className="flex-1 min-w-0">
            <p className={`text-lg font-semibold ${scoreInfo.color}`}>{scoreInfo.label}</p>
            <p className="text-white/40 text-xs mt-0.5 mb-3">Saúde Financeira</p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-3">
              <div className="flex items-center gap-1.5">
                <PiggyBank size={12} className="text-mint-400 flex-shrink-0" />
                <span className="text-white/50 text-[10px] truncate">
                  Economia {((metricas.scoreBreakdown?.economia || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target size={12} className="text-amber-400 flex-shrink-0" />
                <span className="text-white/50 text-[10px] truncate">
                  Metas {metricas.scoreBreakdown?.metasDentro || 0}/{metricas.scoreBreakdown?.metasTotal || 0}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {(metricas.variacao || 0) <= 0 ? (
                  <TrendingDown size={12} className="text-mint-400 flex-shrink-0" />
                ) : (
                  <TrendingUp size={12} className="text-coral-400 flex-shrink-0" />
                )}
                <span className="text-white/50 text-[10px] truncate">
                  {(metricas.variacao || 0) > 0 ? '+' : ''}{(metricas.variacao || 0).toFixed(0)}% vs anterior
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={12} className="text-lavender-400 flex-shrink-0" />
                <span className="text-white/50 text-[10px] truncate">
                  {metricas.scoreBreakdown?.dividas || 0} dívida(s)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-base-700/50 border border-white/5 rounded-2xl p-3 text-center">
          <p className="text-white/40 text-[10px] mb-1">Total</p>
          <p className="text-white font-bold text-sm">{fmt(metricas.totalAtual)}</p>
        </div>
        <div className="bg-base-700/50 border border-white/5 rounded-2xl p-3 text-center">
          <p className="text-white/40 text-[10px] mb-1">Média/Dia</p>
          <p className="text-white font-bold text-sm">{fmt(metricas.mediaDia)}</p>
        </div>
        <div className="bg-base-700/50 border border-white/5 rounded-2xl p-3 text-center">
          <p className="text-white/40 text-[10px] mb-1">Compras</p>
          <p className="text-white font-bold text-sm">{metricas.qtdCompras}</p>
        </div>
        <div className="bg-base-700/50 border border-white/5 rounded-2xl p-3 text-center">
          <p className="text-white/40 text-[10px] mb-1">Ticket Médio</p>
          <p className="text-white font-bold text-sm">{fmt(metricas.mediaCompra)}</p>
        </div>
      </div>

      {/* Tendência Mensal */}
      {metricas.tendencia && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle className="mb-0">Tendência Mensal</SectionTitle>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              (metricas.variacao || 0) <= 0 ? 'bg-mint-500/10' : 'bg-coral-500/10'
            }`}>
              {(metricas.variacao || 0) <= 0 ? (
                <TrendingDown size={12} className="text-mint-400" />
              ) : (
                <TrendingUp size={12} className="text-coral-400" />
              )}
              <span className={`text-xs font-medium ${
                (metricas.variacao || 0) <= 0 ? 'text-mint-400' : 'text-coral-400'
              }`}>
                {(metricas.variacao || 0) > 0 ? '+' : ''}{(metricas.variacao || 0).toFixed(1)}%
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={metricas.tendencia} barCategoryGap="25%">
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                {metricas.tendencia.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={i === 2 ? colors.hex : 'rgba(255,255,255,0.08)'}
                    fillOpacity={i === 2 ? 0.7 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
            {metricas.tendencia.map((item, i) => (
              <div key={i} className="text-center">
                <p className="text-white/30 text-[10px]">{item.name}</p>
                <p className={`text-xs font-semibold ${i === 2 ? 'text-white' : 'text-white/40'}`}>{fmt(item.valor)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gastos vs Metas */}
      {metricas.metasComGasto?.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-amber-400" />
            <SectionTitle className="mb-0">Gastos vs Metas</SectionTitle>
          </div>
          <div className="space-y-4">
            {metricas.metasComGasto.map((m) => {
              const metaColor = getMetaColor(m.percent)
              const catInfo = CATEGORIAS.find(c => c.id === m.categoria)
              const restante = Math.max(0, m.limite - m.gasto)
              return (
                <div key={m._id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{catInfo?.emoji || '📦'}</span>
                      <span className="text-white text-xs font-medium truncate">{catInfo?.label || m.categoria}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-white/40 text-[10px]">{fmt(m.gasto)} / {fmt(m.limite)}</span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ color: metaColor, backgroundColor: `${metaColor}20` }}
                      >
                        {m.percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(m.percent, 100)}%`,
                        backgroundColor: metaColor,
                        boxShadow: `0 0 8px ${metaColor}40`,
                      }}
                    />
                  </div>
                  {m.percent < 100 && (
                    <p className="text-white/30 text-[10px] mt-1">Restam {fmt(restante)}</p>
                  )}
                  {m.percent >= 100 && (
                    <p className="text-coral-400/60 text-[10px] mt-1">Estourou em {fmt(m.gasto - m.limite)}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Gastos por Dia + Forma de Pagamento */}
      <div className="grid grid-cols-2 gap-3">
        {/* Dia da Semana */}
        {metricas.gastosPorDia && Object.keys(metricas.gastosPorDia).length > 0 && (
          <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4">
            <p className="text-white/50 text-[10px] md:text-xs font-medium mb-3">Gastos por Dia</p>
            <div className="space-y-2">
              {Object.entries(metricas.gastosPorDia)
                .sort((a, b) => b[1] - a[1])
                .map(([dia, valor]) => {
                  const maxVal = metricas.diaMaisGasta?.[1] || valor
                  const pct = maxVal > 0 ? (valor / maxVal) * 100 : 0
                  return (
                    <div key={dia}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] text-white/60 capitalize">{dia.slice(0, 3)}</span>
                        <span className="text-[10px] text-white/40 font-mono">{fmt(valor)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: colors.hex, boxShadow: `0 0 6px ${colors.hex}40` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Forma de Pagamento */}
        {pagamentoData.length > 0 && (
          <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4">
            <p className="text-white/50 text-[10px] md:text-xs font-medium mb-3">Pagamentos</p>
            <div className="space-y-2">
              {pagamentoData.map(({ name, value, color }) => {
                const pct = metricas.totalAtual > 0 ? (value / metricas.totalAtual) * 100 : 0
                return (
                  <div key={name}>
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[10px] text-white/60">{name}</span>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Controle de Cartão */}
      <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-white/40" />
          <SectionTitle className="mb-0">Controle de Cartão</SectionTitle>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-xs">Fatura Estimada</span>
            <span className="text-white font-semibold text-sm">{fmt(metricas.faturaEstimada)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-xs">Próx. Mês (Parcelas)</span>
            <span className="text-white font-semibold text-sm">{fmt(metricas.proximoMes)}</span>
          </div>
          <div className="pt-2 border-t border-white/5 flex justify-between items-center">
            <span className="text-white/60 text-xs">Compromisso Total</span>
            <span className="text-coral-400 font-bold text-sm">{fmt(metricas.compromissoTotal)}</span>
          </div>
        </div>
      </div>

      {/* Top Compras */}
      {metricas.top3?.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-amber-400" />
            <SectionTitle className="mb-0">Maiores Gastos</SectionTitle>
          </div>
          <div className="space-y-2">
            {metricas.top3.map((d, idx) => (
              <div key={d._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03]">
                <span className={`text-xs font-bold w-5 text-center ${
                  idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : 'text-orange-300'
                }`}>{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">
                    {getCategoryEmoji(d.label)} {d.item}
                  </p>
                  <p className="text-white/30 text-[10px] truncate">{formatDateFull(d.createdAt)} • {d.payment_method}</p>
                </div>
                <p className="text-white font-semibold text-xs flex-shrink-0">{fmt(d.total_value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parcelas Ativas */}
      {metricas.parcelasAtivas?.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
          <button
            onClick={() => setExpandParcelas(!expandParcelas)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-white/40" />
              <span className="text-white font-medium text-sm">Parcelas Ativas</span>
              <span className="text-white/30 text-xs">({metricas.parcelasAtivas.length})</span>
            </div>
            <ChevronDown size={16} className={`text-white/40 transition-transform ${expandParcelas ? 'rotate-180' : ''}`} />
          </button>
          {expandParcelas && (
            <div className="px-5 pb-4 space-y-2">
              {metricas.parcelasAtivas.map((d) => (
                <div key={d._id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{getCategoryEmoji(d.label)} {d.item}</p>
                    <p className="text-white/30 text-[10px]">{d.installment}x de {fmt(d.total_value / d.installment)}</p>
                  </div>
                  <p className="text-white text-xs font-semibold flex-shrink-0">{fmt(d.total_value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contas Fixas */}
      {contasFixas.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
          <button
            onClick={() => setExpandContas(!expandContas)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-white/40" />
              <span className="text-white font-medium text-sm">Contas Fixas</span>
              <span className="text-white/30 text-xs">({contasFixas.length})</span>
              <span className="text-white/20 text-xs">{fmt(metricas.totalFixas)}</span>
            </div>
            <ChevronDown size={16} className={`text-white/40 transition-transform ${expandContas ? 'rotate-180' : ''}`} />
          </button>
          {expandContas && (
            <div className="px-5 pb-4 space-y-2">
              {contasFixas.map((c) => (
                <div key={c._id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium">{c.nome}</p>
                    <p className="text-white/30 text-[10px]">Vencimento: dia {c.dia_vencimento}</p>
                  </div>
                  <p className="text-white text-xs font-semibold flex-shrink-0">{fmt(c.valor)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Todas Despesas */}
      {metricas.despesasPeriodo?.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
          <button
            onClick={() => setExpandDespesas(!expandDespesas)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag size={14} className="text-white/40" />
              <span className="text-white font-medium text-sm">Todas as Despesas</span>
              <span className="text-white/30 text-xs">({metricas.despesasPeriodo.length})</span>
            </div>
            <ChevronDown size={16} className={`text-white/40 transition-transform ${expandDespesas ? 'rotate-180' : ''}`} />
          </button>
          {expandDespesas && (
            <div className="px-5 pb-4 space-y-2 max-h-96 overflow-y-auto">
              {metricas.despesasPeriodo.map((d) => (
                <div key={d._id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{getCategoryEmoji(d.label)} {d.item}</p>
                    <p className="text-white/30 text-[10px] truncate">{formatDateFull(d.createdAt)} • {d.payment_method}</p>
                  </div>
                  <p className="text-white text-xs font-semibold flex-shrink-0">{fmt(d.total_value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
