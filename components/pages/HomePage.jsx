'use client'

import { useState, useEffect } from 'react'
import { fmt, formatDateFull, getCategoryDisplay, getPeriodo, CATEGORIAS } from '@/lib/helpers'
import { TrendingUp, TrendingDown, PiggyBank, Coins, CircleAlert, CircleCheck, ArrowUpRight, ArrowDownRight, Target, ChevronDown } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function HomePage({ user, outro, colors, refreshKey, triggerRefresh, openEditItem, openAcerto }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    despesas: [],
    contasFixas: [],
    emprestimosTerceiros: [],
    dividasTerceiros: [],
    emprestimos: [],
    config: [],
  })
  const [stats, setStats] = useState({ gastos: 0, cofrinho: 0, extra: 0, total: 0 })
  const [categorias, setCategorias] = useState([])
  const [chartData, setChartData] = useState([])
  const [outrosDetalhes, setOutrosDetalhes] = useState([])
  const [categoriasComItens, setCategoriasComItens] = useState({})
  const [showOutrosDetalhes, setShowOutrosDetalhes] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [situacao, setSituacao] = useState({ saldo: 0, dividasTerceiros: 0, emprestimosTerceiros: 0 })
  const [metasInfo, setMetasInfo] = useState({ total: 0, noLimite: 0, excedidas: 0 })
  const [scoreSaude, setScoreSaude] = useState(0)
  const [periodo, setPeriodo] = useState({ dataInicio: null, dataFim: null })
  const [recentTransactions, setRecentTransactions] = useState([])

  useEffect(() => {
    loadData()
  }, [user, refreshKey])

  async function loadData() {
    setLoading(true)
    try {
      const [despesas, contasFixas, emprestimosTerceiros, dividasTerceiros, emprestimos, config, metas] = await Promise.all([
        fetch(`/api/despesas?buyer=${user}`).then(r => r.json()),
        fetch('/api/contas-fixas').then(r => r.json()),
        fetch(`/api/emprestimos-terceiros?user=${user}`).then(r => r.json()),
        fetch(`/api/dividas-terceiros?user=${user}`).then(r => r.json()),
        fetch('/api/emprestimos').then(r => r.json()),
        fetch(`/api/config?user=${user}`).then(r => r.json()),
        fetch(`/api/metas?user=${user}`).then(r => r.json()),
      ])

      // Usando periodo customizado se existir, senao calcula
      const periodoCalc = getPeriodo(config, user, 0)
      setPeriodo(periodoCalc)

      setData({ despesas, contasFixas, emprestimosTerceiros, dividasTerceiros, emprestimos, config })
      calcularStats(despesas, contasFixas, emprestimosTerceiros, periodoCalc)
      calcularCategorias(despesas, contasFixas, periodoCalc)
      calcularSituacao(despesas, emprestimos, dividasTerceiros, emprestimosTerceiros)
      calcularMetas(metas, despesas, periodoCalc)
      calcScore(despesas, contasFixas, metas, dividasTerceiros, config, periodoCalc)
      getRecentTransactions(despesas, periodoCalc)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  function calcularStats(despesas, contasFixas, emprestimosTerceiros, periodo) {
    let cofrinho = 0
    let extra = 0
    let despesasTotal = 0
    let emprestimosTotal = 0

    const despesasPeriodo = despesas.filter(d => {
      const data = new Date(d.createdAt)
      return data >= periodo.dataInicio && data <= periodo.dataFim
    })

    despesasPeriodo.forEach(d => {
      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      if (d.tem_pendencia && d.valor_pendente) valor -= d.valor_pendente

      if (d.label === 'Cofrinho') {
        cofrinho += valor
      } else if (d.label === 'Renda Variavel') {
        extra += valor
      } else {
        despesasTotal += valor
      }
    })

    emprestimosTerceiros.forEach(e => {
      if (e.status === 'em aberto') {
        const dataEmprestimo = new Date(e.data_emprestimo)
        if (dataEmprestimo >= periodo.dataInicio && dataEmprestimo <= periodo.dataFim) {
          emprestimosTotal += e.valor
        }
      }
    })

    const gastos = despesasTotal + emprestimosTotal
    const total = gastos + cofrinho + extra
    setStats({ gastos, cofrinho, extra, total })
  }

  function calcularCategorias(despesas, contasFixas, periodo) {
    const catMap = {}
    const catItens = {}

    const despesasPeriodo = despesas.filter(d => {
      const data = new Date(d.createdAt)
      return data >= periodo.dataInicio && data <= periodo.dataFim
    })

    despesasPeriodo.forEach(d => {
      if (d.label === 'Cofrinho' || d.label === 'Renda Variavel') return

      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      if (d.tem_pendencia && d.valor_pendente) valor -= d.valor_pendente

      if (!catMap[d.label]) {
        catMap[d.label] = 0
        catItens[d.label] = []
      }
      catMap[d.label] += valor
      catItens[d.label].push({
        item: d.item,
        valor: valor,
        data: d.createdAt,
        description: d.description,
        payment_method: d.payment_method
      })
    })

    // Contas fixas removidas do total de gastos e categorias

    const categoriasList = Object.entries(catMap)
      .map(([cat, valor]) => ({ categoria: cat, valor }))
      .sort((a, b) => b.valor - a.valor)

    setCategorias(categoriasList)
    setCategoriasComItens(catItens)

    // Preparar dados para o gráfico (top 5 + outros)
    const top5 = categoriasList.slice(0, 5)
    const outrosCategories = categoriasList.slice(5)
    const outros = outrosCategories.reduce((sum, c) => sum + c.valor, 0)

    // Guardar detalhes das categorias "Outros"
    setOutrosDetalhes(outrosCategories)

    const chartColors = ['#f472b6', '#60a5fa', '#6ee7b7', '#fdba74', '#c4b5fd', '#94a3b8']

    const chartDataTemp = top5.map((cat, idx) => ({
      name: CATEGORIAS.find(c => c.id === cat.categoria)?.label || cat.categoria,
      value: cat.valor,
      color: chartColors[idx % chartColors.length]
    }))

    if (outros > 0) {
      chartDataTemp.push({
        name: 'Outros',
        value: outros,
        color: chartColors[5]
      })
    }

    setChartData(chartDataTemp)
  }

  function calcularSituacao(despesas, emprestimos, dividasTerceiros, emprestimosTerceiros) {
    let saldo = 0

    despesas.forEach(d => {
      if (d.status_pendencia === 'em aberto' && d.devedor === outro) {
        saldo += d.valor_pendente || 0
      }
      if (d.status_pendencia === 'em aberto' && d.devedor === user) {
        saldo -= d.valor_pendente || 0
      }
    })

    emprestimos.forEach(e => {
      if (e.status === 'em aberto') {
        if (e.de === user) {
          saldo += e.valor
        } else if (e.de === outro) {
          saldo -= e.valor
        }
      }
    })

    const dividasTerceirosTotal = dividasTerceiros
      .filter(d => d.status === 'em aberto')
      .reduce((sum, d) => sum + d.valor, 0)

    const dividasPessoais = emprestimos
      .filter(e => e.status === 'em aberto' && e.de === outro)
      .reduce((sum, e) => sum + e.valor, 0)

    const emprestimosTerceirosTotal = emprestimosTerceiros
      .filter(e => e.status === 'em aberto')
      .reduce((sum, e) => sum + e.valor, 0)

    setSituacao({
      saldo,
      dividasTerceiros: dividasTerceirosTotal + dividasPessoais,
      emprestimosTerceiros: emprestimosTerceirosTotal,
    })
  }

  function calcularMetas(metas, despesas, periodo) {
    if (!metas || metas.length === 0) {
      setMetasInfo({ total: 0, noLimite: 0, excedidas: 0 })
      return
    }

    const despesasPeriodo = despesas.filter(d => {
      const data = new Date(d.createdAt)
      return data >= periodo.dataInicio && data <= periodo.dataFim
    })

    const gastosPorCategoria = {}
    despesasPeriodo.forEach(d => {
      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      if (d.tem_pendencia && d.valor_pendente) valor -= d.valor_pendente
      if (!gastosPorCategoria[d.label]) gastosPorCategoria[d.label] = 0
      gastosPorCategoria[d.label] += valor
    })

    let noLimite = 0
    let excedidas = 0
    metas.forEach(meta => {
      const gasto = gastosPorCategoria[meta.categoria] || 0
      const percentual = (gasto / meta.limite) * 100
      if (percentual >= 100) excedidas++
      else noLimite++
    })

    setMetasInfo({ total: metas.length, noLimite, excedidas })
  }

  function getRecentTransactions(despesas, periodo) {
    const despesasPeriodo = despesas
      .filter(d => {
        const data = new Date(d.createdAt)
        return data >= periodo.dataInicio && data <= periodo.dataFim
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)

    setRecentTransactions(despesasPeriodo)
  }

  function calcScore(allDespesas, contasFixas, metasData, dividasTerceiros, config, periodoAtual) {
    function getLimiteParaPeriodo(meta, periodoFim) {
      if (!meta.historico_limites || meta.historico_limites.length === 0) return meta.limite
      const entries = meta.historico_limites
        .filter(h => new Date(h.desde) <= periodoFim)
        .sort((a, b) => new Date(b.desde) - new Date(a.desde))
      return entries.length > 0 ? entries[0].limite : meta.limite
    }

    const filtrar = (periodo) => allDespesas.filter(d => {
      const dt = new Date(d.createdAt)
      return dt >= periodo.dataInicio && dt <= periodo.dataFim && d.label !== 'Cofrinho' && d.label !== 'Renda Variavel'
    })

    const calcTotal = (desps) => desps.reduce((sum, d) => {
      let v = d.total_value
      if (d.installment > 1) v = v / d.installment
      if (d.tem_pendencia && d.valor_pendente) v -= d.valor_pendente
      return sum + v
    }, 0)

    const periodoAnterior = getPeriodo(config, user, 1)
    const despAtual = filtrar(periodoAtual)
    const totalAtual = calcTotal(despAtual)
    const totalAnterior = calcTotal(filtrar(periodoAnterior))

    // Cofrinho no período
    const totalCofrinho = allDespesas.filter(d => {
      const dt = new Date(d.createdAt)
      return dt >= periodoAtual.dataInicio && dt <= periodoAtual.dataFim && d.label === 'Cofrinho'
    }).reduce((sum, d) => sum + d.total_value, 0)
    const metaCofrinho = metasData.find(m => m.categoria === 'Cofrinho')

    // Gastos por categoria (incluindo contas fixas, igual RelatorioPage)
    const gastosPorCat = {}
    despAtual.forEach(d => {
      let v = d.total_value
      if (d.installment > 1) v = v / d.installment
      if (d.tem_pendencia && d.valor_pendente) v -= d.valor_pendente
      gastosPorCat[d.label] = (gastosPorCat[d.label] || 0) + v
    })
    const fixasUser = contasFixas.filter(c => c.buyer === user || c.responsavel === user)
    const catIds = new Set(CATEGORIAS.map(c => c.id))
    fixasUser.forEach(c => {
      const rawCat = c.categoria || 'Contas'
      const cat = catIds.has(rawCat) ? rawCat : 'Contas'
      gastosPorCat[cat] = (gastosPorCat[cat] || 0) + (c.valor || 0)
    })

    // Metas com gasto
    const metasComGasto = metasData.map(m => {
      const gasto = m.categoria === 'Cofrinho' ? totalCofrinho : (gastosPorCat[m.categoria] || 0)
      const limite = getLimiteParaPeriodo(m, periodoAtual.dataFim)
      return { percent: limite > 0 ? (gasto / limite) * 100 : 0, isCofrinho: m.categoria === 'Cofrinho' }
    })

    // Compromisso total (parcelas ativas)
    const refDate = periodoAtual.dataInicio
    const compromissoTotal = allDespesas.filter(d => {
      if (d.installment <= 1 || d.payment_method !== 'Credito') return false
      const dc = new Date(d.createdAt)
      const meses = (refDate.getFullYear() - dc.getFullYear()) * 12 + (refDate.getMonth() - dc.getMonth())
      return meses < d.installment
    }).reduce((sum, d) => sum + d.total_value, 0)

    const dividasAbertas = dividasTerceiros.filter(d => d.status === 'em aberto')

    let score = 0

    // 1. Economia (0-25) - meta de Cofrinho
    const limCofrinho = metaCofrinho ? getLimiteParaPeriodo(metaCofrinho, periodoAtual.dataFim) : 0
    if (metaCofrinho && limCofrinho > 0) {
      score += Math.min(25, Math.round((totalCofrinho / limCofrinho) * 25))
    } else {
      score += 12
    }

    // 2. Metas (0-25)
    if (metasComGasto.length > 0) {
      const dentro = metasComGasto.filter(m => m.isCofrinho ? m.percent >= 100 : m.percent <= 100).length
      score += Math.round((dentro / metasComGasto.length) * 25)
    } else {
      score += 12
    }

    // 3. Tendência (0-25)
    if (totalAnterior > 0) {
      if (totalAtual <= totalAnterior * 0.8) score += 25
      else if (totalAtual <= totalAnterior * 0.95) score += 20
      else if (totalAtual <= totalAnterior * 1.05) score += 15
      else if (totalAtual <= totalAnterior * 1.2) score += 8
      else score += 3
    } else {
      score += 12
    }

    // 4. Controle (0-25)
    let ctrl = 25
    if (compromissoTotal > totalAtual * 0.5) ctrl -= 10
    else if (compromissoTotal > totalAtual * 0.3) ctrl -= 5
    if (dividasAbertas.length > 3) ctrl -= 10
    else if (dividasAbertas.length > 0) ctrl -= 5
    score += Math.max(0, ctrl)

    setScoreSaude(Math.min(100, Math.max(0, score)))
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percent = stats.gastos > 0 ? (payload[0].value / stats.gastos) * 100 : 0
      return (
        <div className="bg-base-800/95 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-lg">
          <p className="text-white text-sm font-medium">{payload[0].name}</p>
          <p className="text-white/60 text-xs">{fmt(payload[0].value)}</p>
          <p className="text-white/40 text-xs">{percent.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-48 bg-white/5 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
          <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
          <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
        </div>
        <div className="h-96 bg-white/5 rounded-3xl animate-pulse" />
      </div>
    )
  }

  // Score helpers (matching RelatorioPage)
  const scoreLabel = scoreSaude >= 80 ? 'Excelente' : scoreSaude >= 60 ? 'Bom' : scoreSaude >= 40 ? 'Atenção' : 'Crítico'
  const scoreColor = scoreSaude >= 80 ? 'text-mint-400' : scoreSaude >= 60 ? 'text-emerald-400' : scoreSaude >= 40 ? 'text-amber-400' : 'text-coral-400'
  const ringColor = scoreSaude >= 80 ? '#6ee7b7' : scoreSaude >= 60 ? '#34d399' : scoreSaude >= 40 ? '#fbbf24' : '#f87171'
  const circumference = 2 * Math.PI * 34
  const strokeDashoffset = circumference - (circumference * scoreSaude) / 100

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Período da Fatura (desktop only) */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs font-medium">Período da Fatura</p>
          <p className="text-white/60 text-sm">
            {formatDateFull(periodo.dataInicio)} - {formatDateFull(periodo.dataFim)}
          </p>
        </div>
      </div>

      {/* Hero Card - Total de Gastos */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${colors.gradient} rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/10`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <p className="text-white/70 text-[10px] md:text-sm font-medium mb-1">Total de Gastos</p>
            {/* Mini-stats */}
            <div className="flex items-center gap-1.5">
              <Target size={12} className="text-white/50" />
              <span className={`text-[10px] md:text-xs font-medium ${metasInfo.excedidas > 0 ? 'text-red-300' : 'text-white/70'}`}>
                {metasInfo.total === 0 ? 'N/A' : `${metasInfo.noLimite}/${metasInfo.total}`}
              </span>
            </div>
          </div>
          <p className="text-white text-3xl md:text-5xl font-bold tracking-tight">{fmt(stats.gastos)}</p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {/* Cofrinho */}
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl p-3 md:p-5 hover:border-mint-400/30 transition-all">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-mint-500/20 flex items-center justify-center">
              <PiggyBank size={16} className="text-mint-400 md:hidden" />
              <PiggyBank size={20} className="text-mint-400 hidden md:block" />
            </div>
            <span className="text-mint-400 text-[10px] md:text-xs font-medium px-1.5 py-0.5 md:px-2 md:py-1 bg-mint-500/10 rounded-lg">
              Economia
            </span>
          </div>
          <p className="text-white/50 text-[10px] md:text-xs mb-0.5 md:mb-1">Cofrinho</p>
          <p className="text-white text-base md:text-2xl font-bold">{fmt(stats.cofrinho)}</p>
        </div>

        {/* Renda Variável */}
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl p-3 md:p-5 hover:border-peach-400/30 transition-all">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-peach-500/20 flex items-center justify-center">
              <Coins size={16} className="text-peach-400 md:hidden" />
              <Coins size={20} className="text-peach-400 hidden md:block" />
            </div>
            <span className="text-peach-400 text-[10px] md:text-xs font-medium px-1.5 py-0.5 md:px-2 md:py-1 bg-peach-500/10 rounded-lg">
              Extras
            </span>
          </div>
          <p className="text-white/50 text-[10px] md:text-xs mb-0.5 md:mb-1">Renda Variável</p>
          <p className="text-white text-base md:text-2xl font-bold">{fmt(stats.extra)}</p>
        </div>

        {/* Saúde Financeira */}
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl p-3 md:p-5 transition-all flex items-center justify-center">
          <div className="relative">
            <svg className="w-[90px] h-[90px] md:w-[120px] md:h-[120px]" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke={ringColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl md:text-3xl font-bold text-white">{scoreSaude}</span>
              <span className={`text-[8px] md:text-[10px] font-medium ${scoreColor}`}>{scoreLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Visualization Row */}
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {/* Donut Chart - Distribuição por Categoria */}
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl md:rounded-3xl p-3 md:p-6">
          <h3 className="text-white font-semibold text-xs md:text-base mb-3 md:mb-6">Distribuição de Gastos</h3>
          {chartData.length > 0 ? (
            <div>
              <div className="flex justify-center">
                <div className="w-[160px] h-[160px] md:w-[280px] md:h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="35%"
                        outerRadius="80%"
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 md:gap-2 mt-2 md:mt-4">
                {chartData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 md:gap-2">
                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-white/60 text-[8px] md:text-xs truncate">{item.name}</span>
                  </div>
                ))}
              </div>

              {/* Detalhes da Categoria "Outros" */}
              {outrosDetalhes.length > 0 && (
                <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-white/10">
                  <button
                    onClick={() => setShowOutrosDetalhes(!showOutrosDetalhes)}
                    className="w-full flex items-center justify-between px-1 md:px-3 py-1.5 md:py-2 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#94a3b8] flex-shrink-0" />
                      <span className="text-white text-[10px] md:text-sm font-medium truncate">Outros</span>
                      <span className="text-white/40 text-[10px] md:text-xs hidden md:inline">({outrosDetalhes.length} categorias)</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-white/60 transition-transform ${showOutrosDetalhes ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showOutrosDetalhes && (
                    <div className="mt-3 space-y-2 px-3">
                      {outrosDetalhes.map((cat, idx) => {
                        const percent = stats.gastos > 0 ? (cat.valor / stats.gastos) * 100 : 0
                        const isExpanded = expandedCategory === cat.categoria
                        const itens = categoriasComItens[cat.categoria] || []
                        return (
                          <div key={idx} className="border-b border-white/5 last:border-0">
                            <button
                              onClick={() => setExpandedCategory(isExpanded ? null : cat.categoria)}
                              className="w-full flex items-center justify-between py-2 hover:bg-white/5 rounded-lg px-2 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <ChevronDown
                                    size={14}
                                    className={`text-white/40 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                  <p className="text-white/80 text-sm truncate">{getCategoryDisplay(cat.categoria)}</p>
                                  <span className="text-white/30 text-xs">({itens.length} itens)</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 ml-5">
                                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[100px]">
                                    <div
                                      className="h-full bg-[#94a3b8]"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <span className="text-white/40 text-xs">{percent.toFixed(1)}%</span>
                                </div>
                              </div>
                              <p className="text-white/60 text-sm font-semibold ml-3">{fmt(cat.valor)}</p>
                            </button>

                            {isExpanded && (
                              <div className="ml-5 mb-2 space-y-1 bg-white/5 rounded-lg p-2">
                                {itens.map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex items-start justify-between py-1.5 text-xs">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white/70 truncate">{item.item}</p>
                                      <p className="text-white/30 text-[10px]">
                                        {formatDateFull(item.data)} • {item.payment_method}
                                      </p>
                                      {item.description && (
                                        <p className="text-white/40 text-[10px] truncate mt-0.5">{item.description}</p>
                                      )}
                                    </div>
                                    <p className="text-white/50 font-medium ml-2 flex-shrink-0">{fmt(item.valor)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-[160px] md:h-[280px] flex items-center justify-center">
              <p className="text-white/30 text-[10px] md:text-sm">Nenhuma despesa no período</p>
            </div>
          )}
        </div>

        {/* Top 3 Categorias */}
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl md:rounded-3xl p-3 md:p-6">
          <h3 className="text-white font-semibold text-xs md:text-base mb-3 md:mb-6">Top Categorias</h3>
          <div className="space-y-3 md:space-y-4">
            {categorias.slice(0, 5).map((cat, idx) => {
              const percent = stats.gastos > 0 ? (cat.valor / stats.gastos) * 100 : 0
              const rankColors = [
                'bg-amber-500/20 text-amber-400 border-amber-500/30',
                'bg-slate-400/20 text-slate-300 border-slate-400/30',
                'bg-orange-400/20 text-orange-300 border-orange-400/30',
                'text-white/40 border-white/10',
                'text-white/40 border-white/10',
              ]
              return (
                <div key={cat.categoria} className="flex items-center gap-2 md:gap-4">
                  <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl border flex items-center justify-center text-[10px] md:text-sm font-bold flex-shrink-0 ${rankColors[idx]}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <p className="text-white text-[10px] md:text-sm font-medium truncate">
                        {CATEGORIAS.find(c => c.id === cat.categoria)?.label || cat.categoria}
                      </p>
                      <p className="text-white/60 text-[10px] md:text-xs ml-1 md:ml-2">{percent.toFixed(0)}%</p>
                    </div>
                    <div className="w-full h-1.5 md:h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors.gradient}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-white/40 text-[10px] md:text-xs mt-0.5 md:mt-1">{fmt(cat.valor)}</p>
                  </div>
                </div>
              )
            })}
            {categorias.length > 5 && (() => {
              const menorCat = categorias[categorias.length - 1]
              const menorPercent = stats.gastos > 0 ? (menorCat.valor / stats.gastos) * 100 : 0
              return (
                <div className="flex items-center gap-2 md:gap-4 pt-2 md:pt-3 border-t border-white/5">
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl border border-white/10 flex items-center justify-center text-[10px] md:text-sm font-bold flex-shrink-0 text-white/30">
                    -1
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <p className="text-white/50 text-[10px] md:text-sm font-medium truncate">
                        {CATEGORIAS.find(c => c.id === menorCat.categoria)?.label || menorCat.categoria}
                      </p>
                      <p className="text-white/40 text-[10px] md:text-xs ml-1 md:ml-2">{menorPercent.toFixed(0)}%</p>
                    </div>
                    <div className="w-full h-1.5 md:h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors.gradient} opacity-30`}
                        style={{ width: `${menorPercent}%` }}
                      />
                    </div>
                    <p className="text-white/30 text-[10px] md:text-xs mt-0.5 md:mt-1">{fmt(menorCat.valor)}</p>
                  </div>
                </div>
              )
            })()}
            {categorias.length === 0 && (
              <div className="text-center py-4 md:py-8">
                <p className="text-white/30 text-[10px] md:text-sm">Nenhuma categoria registrada</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Health Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {/* Saldo com outra pessoa */}
        <div
          onClick={() => openAcerto && openAcerto('pendentes')}
          className={`bg-base-700/50 backdrop-blur-sm rounded-2xl p-3 md:p-5 border-2 cursor-pointer hover:bg-base-700/70 transition-all ${
          situacao.saldo > 0 ? 'border-mint-500/30' : situacao.saldo < 0 ? 'border-coral-500/30' : 'border-white/5'
        }`}>
          <div className="flex items-center gap-1.5 md:gap-3 mb-2 md:mb-3">
            {situacao.saldo > 0 ? (
              <>
                <ArrowUpRight className="text-mint-400 md:hidden" size={16} />
                <ArrowUpRight className="text-mint-400 hidden md:block" size={20} />
              </>
            ) : situacao.saldo < 0 ? (
              <>
                <ArrowDownRight className="text-coral-400 md:hidden" size={16} />
                <ArrowDownRight className="text-coral-400 hidden md:block" size={20} />
              </>
            ) : (
              <>
                <CircleCheck className="text-white/40 md:hidden" size={16} />
                <CircleCheck className="text-white/40 hidden md:block" size={20} />
              </>
            )}
            <p className="text-white/60 text-[10px] md:text-xs font-medium truncate">
              {situacao.saldo > 0 ? `${outro} te deve` : situacao.saldo < 0 ? `Você deve` : 'Acertos'}
            </p>
          </div>
          <p className={`text-base md:text-2xl font-bold ${
            situacao.saldo > 0 ? 'text-mint-400' : situacao.saldo < 0 ? 'text-coral-400' : 'text-white/40'
          }`}>
            {situacao.saldo === 0 ? 'Em dia' : fmt(Math.abs(situacao.saldo))}
          </p>
        </div>

        {/* Dívidas */}
        <div
          onClick={() => openAcerto && openAcerto('dividas')}
          className={`bg-base-700/50 backdrop-blur-sm rounded-2xl p-3 md:p-5 border-2 cursor-pointer hover:bg-base-700/70 transition-all ${
          situacao.dividasTerceiros > 0 ? 'border-peach-500/30' : 'border-white/5'
        }`}>
          <div className="flex items-center gap-1.5 md:gap-3 mb-2 md:mb-3">
            <CircleAlert className={`${situacao.dividasTerceiros > 0 ? 'text-peach-400' : 'text-white/40'} md:hidden`} size={16} />
            <CircleAlert className={`${situacao.dividasTerceiros > 0 ? 'text-peach-400' : 'text-white/40'} hidden md:block`} size={20} />
            <p className="text-white/60 text-[10px] md:text-xs font-medium">Dívidas</p>
          </div>
          <p className={`text-base md:text-2xl font-bold ${situacao.dividasTerceiros > 0 ? 'text-peach-400' : 'text-white/40'}`}>
            {situacao.dividasTerceiros > 0 ? fmt(situacao.dividasTerceiros) : 'Nenhuma'}
          </p>
        </div>

        {/* Empréstimos a Terceiros */}
        <div
          onClick={() => openAcerto && openAcerto('emprestimos')}
          className={`bg-base-700/50 backdrop-blur-sm rounded-2xl p-3 md:p-5 border-2 cursor-pointer hover:bg-base-700/70 transition-all ${
          situacao.emprestimosTerceiros > 0 ? 'border-lavender-500/30' : 'border-white/5'
        }`}>
          <div className="flex items-center gap-1.5 md:gap-3 mb-2 md:mb-3">
            <TrendingUp className={`${situacao.emprestimosTerceiros > 0 ? 'text-lavender-400' : 'text-white/40'} md:hidden`} size={16} />
            <TrendingUp className={`${situacao.emprestimosTerceiros > 0 ? 'text-lavender-400' : 'text-white/40'} hidden md:block`} size={20} />
            <p className="text-white/60 text-[10px] md:text-xs font-medium">A Receber</p>
          </div>
          <p className={`text-base md:text-2xl font-bold ${situacao.emprestimosTerceiros > 0 ? 'text-lavender-400' : 'text-white/40'}`}>
            {situacao.emprestimosTerceiros > 0 ? fmt(situacao.emprestimosTerceiros) : 'Nenhum'}
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-6">
          <h3 className="text-white font-semibold mb-4">Atividades Recentes</h3>
          <div className="space-y-3">
            {recentTransactions.map((txn) => (
              <button
                key={txn._id}
                onClick={() => openEditItem && openEditItem(txn._id)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} bg-opacity-20 flex items-center justify-center flex-shrink-0`}>
                    <span className="text-lg">
                      {CATEGORIAS.find(c => c.id === txn.label)?.emoji || '📦'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white text-sm font-medium truncate">{txn.item}</p>
                    <p className="text-white/40 text-xs">
                      {formatDateFull(txn.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="text-white font-semibold ml-3">{fmt(txn.total_value)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
