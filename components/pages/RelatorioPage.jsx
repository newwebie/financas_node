'use client'

import { useState, useEffect } from 'react'
import { StatCard, ListItem, SectionTitle, Skeleton, ProgressBar } from '@/components/ui/Cards'
import { fmt, formatDateFull, getCategoryDisplay, calcPeriodoFatura } from '@/lib/helpers'
import { ChevronDown } from 'lucide-react'

export default function RelatorioPage({ user, outro, colors, refreshKey, triggerRefresh }) {
  const [loading, setLoading] = useState(true)
  const [despesas, setDespesas] = useState([])
  const [contasFixas, setContasFixas] = useState([])
  const [config, setConfig] = useState([])
  const [periodo, setPeriodo] = useState({ dataInicio: null, dataFim: null })
  const [metricas, setMetricas] = useState({})
  const [expandParcelas, setExpandParcelas] = useState(false)
  const [expandContas, setExpandContas] = useState(false)
  const [expandDespesas, setExpandDespesas] = useState(false)

  useEffect(() => {
    loadData()
  }, [user, refreshKey])

  async function loadData() {
    setLoading(true)
    try {
      const [desp, cf, cfg] = await Promise.all([
        fetch(`/api/despesas?buyer=${user}`).then(r => r.json()),
        fetch('/api/contas-fixas').then(r => r.json()),
        fetch(`/api/config?user=${user}`).then(r => r.json()),
      ])

      // Usando mesesAtras = 1 para exibir fatura anterior
      const periodoCalc = calcPeriodoFatura(cfg, user, 1)
      setPeriodo(periodoCalc)
      setDespesas(desp)
      setContasFixas(cf.filter(c => c.buyer === user))
      setConfig(cfg)

      calcularMetricas(desp, cf, periodoCalc)
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
    } finally {
      setLoading(false)
    }
  }

  function calcularMetricas(despesas, contasFixas, periodo) {
    // Filtrar despesas do período
    const despesasPeriodo = despesas.filter(d => {
      const data = new Date(d.createdAt)
      return data >= periodo.dataInicio && data <= periodo.dataFim && d.label !== 'Cofrinho' && d.label !== 'Renda Variavel'
    })

    // Total variáveis
    let totalVariaveis = 0
    despesasPeriodo.forEach(d => {
      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      if (d.tem_pendencia && d.valor_pendente) valor -= d.valor_pendente
      totalVariaveis += valor
    })

    // Total fixas
    const totalFixas = contasFixas.filter(c => c.payment_method !== 'Credito').reduce((sum, c) => sum + (c.valor || 0), 0)
    const totalMes = totalVariaveis + totalFixas

    // Métricas
    const diasPeriodo = Math.ceil((periodo.dataFim - periodo.dataInicio) / (1000 * 60 * 60 * 24))
    const mediaDia = totalVariaveis / diasPeriodo
    const mediaCompra = despesasPeriodo.length > 0 ? totalVariaveis / despesasPeriodo.length : 0
    const qtdCompras = despesasPeriodo.length

    // Dia que mais gasta
    const gastosPorDia = {}
    despesasPeriodo.forEach(d => {
      const dia = new Date(d.createdAt).toLocaleDateString('pt-BR', { weekday: 'long' })
      let valor = d.total_value
      if (d.installment > 1) valor = valor / d.installment
      if (d.tem_pendencia && d.valor_pendente) valor -= d.valor_pendente
      gastosPorDia[dia] = (gastosPorDia[dia] || 0) + valor
    })
    const diaMaisGasta = Object.entries(gastosPorDia).sort((a, b) => b[1] - a[1])[0]

    // Controle cartão
    const faturaEstimada = despesasPeriodo.filter(d => d.payment_method === 'Credito' && d.installment <= 1).reduce((sum, d) => sum + d.total_value, 0)
    const parcelasAtivas = despesas.filter(d => d.installment > 1 && d.payment_method === 'Credito')
    const proximoMes = parcelasAtivas.reduce((sum, d) => sum + (d.total_value / d.installment), 0)
    const compromissoTotal = parcelasAtivas.reduce((sum, d) => sum + d.total_value, 0)

    // Top 3 gastos
    const top3 = despesasPeriodo.sort((a, b) => b.total_value - a.total_value).slice(0, 3)

    setMetricas({
      totalVariaveis,
      totalFixas,
      totalMes,
      mediaDia,
      mediaCompra,
      qtdCompras,
      diaMaisGasta,
      gastosPorDia,
      faturaEstimada,
      proximoMes,
      compromissoTotal,
      parcelasAtivas,
      top3,
      despesasPeriodo,
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

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold text-white">Relatório Mensal</h1>
      <p className="text-white/40 text-sm">
        {formatDateFull(periodo.dataInicio)} - {formatDateFull(periodo.dataFim)}
      </p>

      {/* Card Total do Mês */}
      <div className={`bg-gradient-to-br ${colors.gradient} bg-opacity-20 border border-white/10 rounded-3xl p-6`}>
        <p className="text-white/60 text-sm mb-2">Total do Mês</p>
        <h2 className="text-4xl font-bold text-white mb-4">{fmt(metricas.totalMes)}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-white/40">Variáveis</p>
            <p className="text-white font-semibold">{fmt(metricas.totalVariaveis)}</p>
          </div>
          <div>
            <p className="text-white/40">Fixas</p>
            <p className="text-white font-semibold">{fmt(metricas.totalFixas)}</p>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="📊" label="Média/Dia" value={fmt(metricas.mediaDia)} color="neutral" delay={0} />
        <StatCard icon="🛒" label="Média/Compra" value={fmt(metricas.mediaCompra)} color="neutral" delay={50} />
        <StatCard icon="📦" label="Compras" value={String(metricas.qtdCompras)} color="neutral" delay={100} />
        <StatCard
          icon="📅"
          label="Dia +"
          value={metricas.diaMaisGasta?.[0]?.slice(0, 3) || '-'}
          color="neutral"
          delay={150}
        />
      </div>

      {/* Gastos por Dia da Semana */}
      {metricas.gastosPorDia && Object.keys(metricas.gastosPorDia).length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <SectionTitle>Gastos por Dia da Semana</SectionTitle>
          <div className="space-y-3">
            {Object.entries(metricas.gastosPorDia)
              .sort((a, b) => b[1] - a[1])
              .map(([dia, valor]) => (
                <ProgressBar
                  key={dia}
                  label={dia.charAt(0).toUpperCase() + dia.slice(1)}
                  sublabel={fmt(valor)}
                  value={valor}
                  max={metricas.diaMaisGasta?.[1] || valor}
                  color={colors.hex}
                />
              ))}
          </div>
        </div>
      )}

      {/* Controle de Cartão */}
      <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
        <SectionTitle>Controle de Cartão</SectionTitle>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm">Fatura Estimada</span>
            <span className="text-white font-semibold">{fmt(metricas.faturaEstimada)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm">Próximo Mês (Parcelas)</span>
            <span className="text-white font-semibold">{fmt(metricas.proximoMes)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm">Compromisso Total</span>
            <span className="text-coral-400 font-semibold">{fmt(metricas.compromissoTotal)}</span>
          </div>
        </div>
      </div>

      {/* Parcelas Ativas */}
      {metricas.parcelasAtivas?.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
          <button
            onClick={() => setExpandParcelas(!expandParcelas)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <SectionTitle className="mb-0">Parcelas Ativas ({metricas.parcelasAtivas.length})</SectionTitle>
            <ChevronDown size={18} className={`text-white/40 transition-transform ${expandParcelas ? 'rotate-180' : ''}`} />
          </button>
          {expandParcelas && (
            <div className="px-5 pb-4 space-y-2">
              {metricas.parcelasAtivas.map((d) => (
                <ListItem key={d._id} borderColor={colors.hex}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {getCategoryDisplay(d.label)} - {d.item}
                      </p>
                      <p className="text-white/40 text-xs">{d.installment}x de {fmt(d.total_value / d.installment)}</p>
                    </div>
                    <p className="text-white text-sm font-semibold">{fmt(d.total_value)}</p>
                  </div>
                </ListItem>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top 3 Compras Quentes */}
      {metricas.top3?.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <SectionTitle>🔥 Compras Quentes (Top 3)</SectionTitle>
          <div className="space-y-2">
            {metricas.top3.map((d, idx) => (
              <ListItem key={d._id} borderColor={['#fca5a5', '#fdba74', '#fde68a'][idx]}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{['🥇', '🥈', '🥉'][idx]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {getCategoryDisplay(d.label)} - {d.item}
                      </p>
                      <p className="text-white/40 text-xs truncate">{d.description || 'Sem descrição'}</p>
                    </div>
                  </div>
                  <p className="text-white text-sm font-semibold">{fmt(d.total_value)}</p>
                </div>
              </ListItem>
            ))}
          </div>
        </div>
      )}

      {/* Contas Fixas */}
      {contasFixas.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
          <button
            onClick={() => setExpandContas(!expandContas)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <SectionTitle className="mb-0">Contas Fixas ({contasFixas.length})</SectionTitle>
            <ChevronDown size={18} className={`text-white/40 transition-transform ${expandContas ? 'rotate-180' : ''}`} />
          </button>
          {expandContas && (
            <div className="px-5 pb-4 space-y-2">
              {contasFixas.map((c) => (
                <ListItem key={c._id} borderColor="#93c5fd">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{c.nome}</p>
                      <p className="text-white/40 text-xs">Vencimento: dia {c.dia_vencimento}</p>
                    </div>
                    <p className="text-white text-sm font-semibold">{fmt(c.valor)}</p>
                  </div>
                </ListItem>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de Despesas */}
      {metricas.despesasPeriodo?.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
          <button
            onClick={() => setExpandDespesas(!expandDespesas)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <SectionTitle className="mb-0">Todas as Despesas ({metricas.despesasPeriodo.length})</SectionTitle>
            <ChevronDown size={18} className={`text-white/40 transition-transform ${expandDespesas ? 'rotate-180' : ''}`} />
          </button>
          {expandDespesas && (
            <div className="px-5 pb-4 space-y-2 max-h-96 overflow-y-auto">
              {metricas.despesasPeriodo.map((d) => (
                <ListItem key={d._id} borderColor={colors.hex}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {getCategoryDisplay(d.label)} - {d.item}
                      </p>
                      <p className="text-white/40 text-xs truncate">
                        {formatDateFull(d.createdAt)} • {d.payment_method}
                      </p>
                    </div>
                    <p className="text-white text-sm font-semibold">{fmt(d.total_value)}</p>
                  </div>
                </ListItem>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
