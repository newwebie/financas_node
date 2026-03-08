'use client'

import { useState, useEffect } from 'react'
import { SectionTitle, Skeleton, CategoryIcon } from '@/components/ui/Cards'
import { fmt, formatDateFull, calcPeriodoFatura, CATEGORIAS } from '@/lib/helpers'
import { ChevronDown, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, Shield, PiggyBank, CreditCard, ShoppingBag, Calendar, Flame, Landmark } from 'lucide-react'
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
  const [expandCartao, setExpandCartao] = useState(false)

  useEffect(() => {
    loadData()
  }, [user, refreshKey, mesesAtras])

  async function loadData() {
    setLoading(true)
    try {
      const [desp, cf, cfg, metasData, dividas] = await Promise.all([
        fetch(`/api/despesas?buyer=${user}`).then(r => r.json()),
        fetch('/api/contas-fixas?all=true').then(r => r.json()),
        fetch(`/api/config?user=${user}`).then(r => r.json()),
        fetch(`/api/metas?user=${user}`).then(r => r.json()),
        fetch(`/api/dividas-terceiros?user=${user}&status=all`).then(r => r.json()),
      ])

      const periodoAtual = calcPeriodoFatura(cfg, user, mesesAtras)
      const periodoAnterior = calcPeriodoFatura(cfg, user, mesesAtras + 1)
      const periodoDoisAtras = calcPeriodoFatura(cfg, user, mesesAtras + 2)

      const fixasDoUser = cf.filter(c => c.buyer === user || c.responsavel === user)
      // Filtrar contas fixas ativas no período atual para exibição
      const fixasVisiveis = fixasDoUser.filter(c => {
        if (c.ativo !== false) return true
        if (c.data_cancelamento) return new Date(c.data_cancelamento) > periodoAtual.dataInicio
        return false
      })

      setDespesas(desp)
      setContasFixas(fixasVisiveis)
      setConfig(cfg)
      setMetas(metasData)
      setDividasTerceiros(dividas)
      setPeriodos({ atual: periodoAtual, anterior: periodoAnterior, doisAtras: periodoDoisAtras })

      calcularMetricas(desp, fixasDoUser, metasData, dividas, periodoAtual, periodoAnterior, periodoDoisAtras)
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

  function getLimiteParaPeriodo(meta, periodoFim) {
    if (!meta.historico_limites || meta.historico_limites.length === 0) {
      return meta.limite // metas antigas sem histórico: usa limite atual
    }
    const entries = meta.historico_limites
      .filter(h => new Date(h.desde) <= periodoFim)
      .sort((a, b) => new Date(b.desde) - new Date(a.desde))
    return entries.length > 0 ? entries[0].limite : meta.limite
  }

  // Filtra contas fixas que estavam ativas no período
  // (ativa OU cancelada depois do início do período)
  function filtrarFixasPeriodo(fixas, periodo) {
    return fixas.filter(c => {
      if (c.ativo !== false) return true
      if (c.data_cancelamento) {
        return new Date(c.data_cancelamento) > periodo.dataInicio
      }
      return false
    })
  }

  function calcularMetricas(allDespesas, fixas, metasData, dividas, periodoAtual, periodoAnterior, periodoDoisAtras) {
    const fixasAtual = filtrarFixasPeriodo(fixas, periodoAtual)
    const fixasAnterior = filtrarFixasPeriodo(fixas, periodoAnterior)

    const despAtual = filtrarDespesasPeriodo(allDespesas, periodoAtual)
    const despAnterior = filtrarDespesasPeriodo(allDespesas, periodoAnterior)
    const despDoisAtras = filtrarDespesasPeriodo(allDespesas, periodoDoisAtras)

    const totalAtual = calcTotalPeriodo(despAtual)
    const totalAnterior = calcTotalPeriodo(despAnterior)
    const totalDoisAtras = calcTotalPeriodo(despDoisAtras)

    // Cofrinho no período (economia real)
    const cofrinhoItems = allDespesas.filter(d => {
      const data = new Date(d.createdAt)
      return data >= periodoAtual.dataInicio && data <= periodoAtual.dataFim && d.label === 'Cofrinho'
    })
    const totalCofrinho = cofrinhoItems.reduce((sum, d) => sum + d.total_value, 0)
    const metaCofrinho = metasData.find(m => m.categoria === 'Cofrinho')

    // Economia total (cofrinho + renda variavel) para exibição
    const economiaItems = allDespesas.filter(d => {
      const data = new Date(d.createdAt)
      return data >= periodoAtual.dataInicio && data <= periodoAtual.dataFim && (d.label === 'Cofrinho' || d.label === 'Renda Variavel')
    })
    const totalEconomia = economiaItems.reduce((sum, d) => sum + d.total_value, 0)

    // Total fixas (todas ativas no período, incluindo cartão)
    const totalFixas = fixasAtual.reduce((sum, c) => sum + (c.valor || 0), 0)
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
    // Incluir contas fixas ativas no período nas categorias
    const catIds = new Set(CATEGORIAS.map(c => c.id))
    fixasAtual.forEach(c => {
      const rawCat = c.categoria || 'Contas'
      const cat = catIds.has(rawCat) ? rawCat : 'Contas'
      gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + (c.valor || 0)
    })

    // Gastos por categoria - período anterior (para comparação)
    const gastosPorCategoriaAnterior = {}
    despAnterior.forEach(d => {
      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      if (d.tem_pendencia && d.valor_pendente) valor -= d.valor_pendente
      gastosPorCategoriaAnterior[d.label] = (gastosPorCategoriaAnterior[d.label] || 0) + valor
    })
    // Contas fixas ativas no período anterior
    fixasAnterior.forEach(c => {
      const rawCat = c.categoria || 'Contas'
      const cat = catIds.has(rawCat) ? rawCat : 'Contas'
      gastosPorCategoriaAnterior[cat] = (gastosPorCategoriaAnterior[cat] || 0) + (c.valor || 0)
    })

    // Comparação categorias (anterior vs atual)
    const todasCats = new Set([...Object.keys(gastosPorCategoria), ...Object.keys(gastosPorCategoriaAnterior)])
    const comparacaoCategorias = [...todasCats].map(cat => {
      const atual = gastosPorCategoria[cat] || 0
      const anterior = gastosPorCategoriaAnterior[cat] || 0
      const variacao = anterior > 0 ? ((atual - anterior) / anterior) * 100 : (atual > 0 ? 100 : 0)
      return { categoria: cat, atual, anterior, variacao }
    }).filter(c => c.atual > 0 || c.anterior > 0)
      .sort((a, b) => b.variacao - a.variacao)

    // Gastos vs Metas (Cofrinho usa totalCofrinho pois é excluído de despAtual)
    const metasComGasto = metasData.map(m => {
      const gasto = m.categoria === 'Cofrinho' ? totalCofrinho : (gastosPorCategoria[m.categoria] || 0)
      const limite = getLimiteParaPeriodo(m, periodoAtual.dataFim)
      return {
        ...m,
        gasto,
        limite,
        percent: limite > 0 ? (gasto / limite) * 100 : 0,
        isCofrinho: m.categoria === 'Cofrinho',
      }
    }).sort((a, b) => b.percent - a.percent)

    // Controle de cartão
    const comprasCreditoItems = despAtual.filter(d => d.payment_method === 'Credito' && d.installment <= 1)
    const comprasCredito = comprasCreditoItems.reduce((sum, d) => sum + d.total_value, 0)
    const fixasCreditoItems = fixasAtual.filter(c => c.cartao_credito)
    const refDate = periodoAtual.dataInicio
    const parcelasAtivas = allDespesas.filter(d => {
      if (d.installment <= 1 || d.payment_method !== 'Credito') return false
      const dc = new Date(d.createdAt)
      const meses = (refDate.getFullYear() - dc.getFullYear()) * 12 + (refDate.getMonth() - dc.getMonth())
      return meses < d.installment
    })
    const parcelasMes = parcelasAtivas.reduce((sum, d) => sum + (d.total_value / d.installment), 0)
    const fixasCredito = fixasAtual.filter(c => c.cartao_credito).reduce((sum, c) => sum + (c.valor || 0), 0)
    // Próximo mês: só parcelas que ainda estarão ativas (meses + 1 < installment)
    const parcelasProxMes = parcelasAtivas.filter(d => {
      const dc = new Date(d.createdAt)
      const meses = (refDate.getFullYear() - dc.getFullYear()) * 12 + (refDate.getMonth() - dc.getMonth())
      return meses + 1 < d.installment
    })
    const proximoMes = parcelasProxMes.reduce((sum, d) => sum + (d.total_value / d.installment), 0) + fixasCredito
    const faturaEstimada = comprasCredito + parcelasMes + fixasCredito
    const compromissoTotal = parcelasAtivas.reduce((sum, d) => sum + d.total_value, 0)

    // Gastos por método de pagamento
    const gastosPorPagamento = {}
    despAtual.forEach(d => {
      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      gastosPorPagamento[d.payment_method] = (gastosPorPagamento[d.payment_method] || 0) + valor
    })
    // Incluir contas fixas ativas no período nos pagamentos
    fixasAtual.forEach(c => {
      const metodo = c.cartao_credito ? 'Credito' : 'Debito'
      gastosPorPagamento[metodo] = (gastosPorPagamento[metodo] || 0) + (c.valor || 0)
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

    // 1. Economia (0-25 pts) - baseado na meta de Cofrinho
    const limiteCofrinho = metaCofrinho ? getLimiteParaPeriodo(metaCofrinho, periodoAtual.dataFim) : 0
    let percentCofrinho = 0
    if (metaCofrinho && limiteCofrinho > 0) {
      percentCofrinho = totalCofrinho / limiteCofrinho
      score += Math.min(25, Math.round(percentCofrinho * 25))
    } else {
      score += 12 // sem meta de cofrinho = neutro
    }

    // 2. Metas (0-25 pts)
    if (metasComGasto.length > 0) {
      const metasDentro = metasComGasto.filter(m =>
        m.isCofrinho ? m.percent >= 100 : m.percent <= 100
      ).length
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

    // Filtrar dívidas que estavam em aberto no período visualizado
    // (criada antes do fim do período E ainda em aberto OU quitada depois do fim do período)
    const dividasNoPeriodo = dividas.filter(d => {
      const dataCriacao = new Date(d.data_emprestimo)
      if (dataCriacao > periodoAtual.dataFim) return false
      if (d.status === 'em aberto') return true
      if (d.status === 'quitado' && d.data_quitacao) {
        return new Date(d.data_quitacao) > periodoAtual.dataFim
      }
      return false
    })

    // 4. Controle (0-25 pts)
    let controle = 25
    if (compromissoTotal > totalAtual * 0.5) controle -= 10
    else if (compromissoTotal > totalAtual * 0.3) controle -= 5
    if (dividasNoPeriodo.length > 3) controle -= 10
    else if (dividasNoPeriodo.length > 0) controle -= 5
    score += Math.max(0, controle)

    score = Math.min(100, Math.max(0, score))

    const scoreBreakdown = {
      economia: percentCofrinho,
      temMetaCofrinho: !!metaCofrinho,
      metasDentro: metasComGasto.length > 0 ? metasComGasto.filter(m => m.isCofrinho ? m.percent >= 100 : m.percent <= 100).length : 0,
      metasTotal: metasComGasto.length,
      variacao,
      dividas: dividasNoPeriodo.length,
    }

    setMetricas({
      totalAtual, totalAnterior, totalDoisAtras, totalEconomia,
      totalFixas, totalMes, mediaDia, mediaCompra, qtdCompras,
      diaMaisGasta, gastosPorDia, gastosPorCategoria, gastosPorPagamento,
      metasComGasto, faturaEstimada, proximoMes, compromissoTotal,
      comprasCredito, parcelasMes, fixasCredito, comprasCreditoItems, fixasCreditoItems, parcelasProxMes,
      parcelasAtivas, top3, despesasPeriodo: despAtual,
      tendencia, variacao, score, scoreBreakdown, comparacaoCategorias,
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

  const getMetaColor = (percent, isCofrinho = false) => {
    if (isCofrinho) {
      if (percent >= 100) return '#6ee7b7' // verde = bateu a meta
      if (percent >= 60) return '#fbbf24'   // amarelo = quase lá
      return '#f87171'                       // vermelho = longe da meta
    }
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
  const totalPagamentos = pagamentoData.reduce((sum, p) => sum + p.value, 0)

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
                  Cofrinho {metricas.scoreBreakdown?.temMetaCofrinho ? `${Math.min(100, ((metricas.scoreBreakdown?.economia || 0) * 100)).toFixed(0)}%` : 'Sem meta'}
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
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-base-700/50 border border-white/5 rounded-2xl p-3 text-center">
          <p className="text-white/40 text-[10px] mb-1">Total</p>
          <p className="text-white font-bold text-sm">{fmt(metricas.totalMes)}</p>
        </div>
        <div className="bg-base-700/50 border border-white/5 rounded-2xl p-3 text-center">
          <p className="text-white/40 text-[10px] mb-1">Média/Dia</p>
          <p className="text-white font-bold text-sm">{fmt(metricas.mediaDia)}</p>
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

      {/* Comparação Mensal por Categoria */}
      {metricas.comparacaoCategorias?.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-white/50">📈 vs Mês Anterior</span>
          </div>
          <div className="space-y-3">
            {metricas.comparacaoCategorias.map(c => {
              const catInfo = CATEGORIAS.find(cat => cat.id === c.categoria)
              const isUp = c.variacao > 0
              const isNew = c.anterior === 0 && c.atual > 0
              const isGone = c.anterior > 0 && c.atual === 0
              const varColor = isNew ? 'text-amber-400' : isGone ? 'text-mint-400' : isUp ? 'text-coral-400' : c.variacao < 0 ? 'text-mint-400' : 'text-white/40'
              return (
                <div key={c.categoria} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <CategoryIcon category={catInfo?.id || 'Outros'} size={16} className="text-white/60" />
                    <span className="text-white text-xs font-medium truncate">{catInfo?.label || c.categoria}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-white/40 text-[10px]">{fmt(c.anterior)}</span>
                    <span className={`text-[10px] ${varColor}`}>{isUp ? '↑' : '↓'}</span>
                    <span className="text-white text-[10px] font-medium">{fmt(c.atual)}</span>
                    <span className={`text-[10px] font-medium ${varColor}`}>
                      ({isNew ? 'Novo' : isGone ? '-100%' : `${c.variacao > 0 ? '+' : ''}${c.variacao.toFixed(0)}%`})
                    </span>
                  </div>
                </div>
              )
            })}
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
              const metaColor = getMetaColor(m.percent, m.isCofrinho)
              const catInfo = CATEGORIAS.find(c => c.id === m.categoria)
              const restante = Math.max(0, m.limite - m.gasto)
              return (
                <div key={m._id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryIcon category={catInfo?.id || 'Outros'} size={16} className="text-white/60" />
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
                  {m.isCofrinho ? (
                    m.percent >= 100
                      ? <p className="text-mint-400/60 text-[10px] mt-1">Meta batida! +{fmt(m.gasto - m.limite)}</p>
                      : <p className="text-white/30 text-[10px] mt-1">Faltam {fmt(restante)}</p>
                  ) : (
                    <>
                      {m.percent < 100 && (
                        <p className="text-white/30 text-[10px] mt-1">Restam {fmt(restante)}</p>
                      )}
                      {m.percent >= 100 && (
                        <p className="text-coral-400/60 text-[10px] mt-1">Estourou em {fmt(m.gasto - m.limite)}</p>
                      )}
                    </>
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
                const pct = totalPagamentos > 0 ? (value / totalPagamentos) * 100 : 0
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

      {/* Top Compras */}
      {metricas.top3?.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-amber-400 flex-shrink-0" />
            <span className="text-sm font-medium text-white/50">Maiores Gastos</span>
          </div>
          <div className="space-y-2">
            {metricas.top3.map((d, idx) => (
              <div key={d._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03]">
                <span className={`text-xs font-bold w-5 text-center ${
                  idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : 'text-orange-300'
                }`}>{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">
                    {d.item}
                  </p>
                  <p className="text-white/30 text-[10px] truncate">{formatDateFull(d.createdAt)} • {d.payment_method}</p>
                </div>
                <p className="text-white font-semibold text-xs flex-shrink-0">{fmt(d.total_value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controle de Cartão */}
      <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-white/40 flex-shrink-0" />
          <span className="text-sm font-medium text-white/50">Controle de Cartão</span>
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

        {/* Breakdown para debug */}
        <button
          onClick={() => setExpandCartao(!expandCartao)}
          className="w-full mt-3 pt-3 border-t border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors rounded-lg px-1 py-1"
        >
          <span className="text-white/30 text-[10px]">Ver composição da fatura</span>
          <ChevronDown size={14} className={`text-white/20 transition-transform ${expandCartao ? 'rotate-180' : ''}`} />
        </button>
        {expandCartao && (
          <div className="mt-2 space-y-3">
            {/* Compras à vista no crédito */}
            <div>
              <p className="text-white/50 text-[10px] font-medium mb-1">Compras à vista no crédito ({metricas.comprasCreditoItems?.length || 0}) — {fmt(metricas.comprasCredito)}</p>
              <div className="space-y-1 ml-2">
                {metricas.comprasCreditoItems?.map((d) => (
                  <div key={d._id} className="flex items-center justify-between">
                    <p className="text-white/30 text-[10px] truncate flex-1 min-w-0">{d.item}</p>
                    <p className="text-white/40 text-[10px] flex-shrink-0 ml-2">{fmt(d.total_value)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Parcelas ativas */}
            <div>
              <p className="text-white/50 text-[10px] font-medium mb-1">Parcelas no mês ({metricas.parcelasAtivas?.length || 0}) — {fmt(metricas.parcelasMes)}</p>
              <div className="space-y-1 ml-2">
                {metricas.parcelasAtivas?.map((d) => {
                  const ref = periodos.atual?.dataInicio || new Date()
                  const dc = new Date(d.createdAt)
                  const meses = (ref.getFullYear() - dc.getFullYear()) * 12 + (ref.getMonth() - dc.getMonth())
                  const parcelaAtual = Math.min(meses + 1, d.installment)
                  return (
                    <div key={d._id} className="flex items-center justify-between">
                      <p className="text-white/30 text-[10px] truncate flex-1 min-w-0">{d.item} ({parcelaAtual}/{d.installment})</p>
                      <p className="text-white/40 text-[10px] flex-shrink-0 ml-2">{fmt(d.total_value / d.installment)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Contas fixas no crédito */}
            <div>
              <p className="text-white/50 text-[10px] font-medium mb-1">Contas fixas no crédito ({metricas.fixasCreditoItems?.length || 0}) — {fmt(metricas.fixasCredito)}</p>
              <div className="space-y-1 ml-2">
                {metricas.fixasCreditoItems?.map((c) => (
                  <div key={c._id} className="flex items-center justify-between">
                    <p className="text-white/30 text-[10px] truncate flex-1 min-w-0">{c.nome}</p>
                    <p className="text-white/40 text-[10px] flex-shrink-0 ml-2">{fmt(c.valor)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Próximo mês breakdown */}
            <div className="pt-2 border-t border-white/5">
              <p className="text-white/50 text-[10px] font-medium mb-1">Próx. mês: parcelas que continuam ({metricas.parcelasProxMes?.length || 0}) + fixas crédito</p>
              <div className="space-y-1 ml-2">
                {metricas.parcelasProxMes?.map((d) => {
                  const ref = periodos.atual?.dataInicio || new Date()
                  const dc = new Date(d.createdAt)
                  const meses = (ref.getFullYear() - dc.getFullYear()) * 12 + (ref.getMonth() - dc.getMonth())
                  return (
                    <div key={d._id} className="flex items-center justify-between">
                      <p className="text-white/30 text-[10px] truncate flex-1 min-w-0">{d.item} ({meses + 2}/{d.installment})</p>
                      <p className="text-white/40 text-[10px] flex-shrink-0 ml-2">{fmt(d.total_value / d.installment)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

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
              {metricas.parcelasAtivas.map((d) => {
                const dc = new Date(d.createdAt)
                const ref = periodos.atual?.dataInicio || new Date()
                const meses = (ref.getFullYear() - dc.getFullYear()) * 12 + (ref.getMonth() - dc.getMonth())
                const parcelaAtual = Math.min(meses + 1, d.installment)
                return (
                  <div key={d._id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{d.item}</p>
                      <p className="text-white/30 text-[10px]">Total {fmt(d.total_value)} · {parcelaAtual}/{d.installment}</p>
                    </div>
                    <p className="text-white text-xs font-semibold flex-shrink-0">{fmt(d.total_value / d.installment)}/mês</p>
                  </div>
                )
              })}
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
                    <div className="flex items-center gap-2 text-white/30">
                      <div className="flex items-center gap-0.5">
                        <Calendar size={9} />
                        <span className="text-[10px]">{String(c.dia_vencimento).padStart(2, '0')}/{String((periodos.atual?.dataInicio || new Date()).getMonth() + 1).padStart(2, '0')}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {c.cartao_credito ? <CreditCard size={9} /> : <Landmark size={9} />}
                        <span className="text-[10px]">{c.cartao_credito ? 'Crédito' : 'Débito auto.'}</span>
                      </div>
                    </div>
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
                    <p className="text-white text-xs font-medium truncate">{d.item}</p>
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
