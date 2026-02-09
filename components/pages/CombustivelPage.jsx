'use client'

import { useState, useEffect } from 'react'
import { StatCard, ListItem, SectionTitle, Skeleton } from '@/components/ui/Cards'
import { fmt, formatDateFull, getUserColors } from '@/lib/helpers'
import { Fuel, ChevronDown } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'

export default function CombustivelPage({ user, outro, colors, refreshKey, triggerRefresh }) {
  const [loading, setLoading] = useState(true)
  const [combustiveis, setCombustiveis] = useState({ moto: [], carro: [] })
  const [stats, setStats] = useState({})
  const [chartData, setChartData] = useState({ moto: [], carro: [] })
  const [showUltimos, setShowUltimos] = useState(false)

  useEffect(() => {
    loadData()
  }, [user, refreshKey])

  async function loadData() {
    setLoading(true)
    try {
      const despesas = await fetch('/api/despesas').then(r => r.json())

      // Filtrar apenas despesas de combustível
      const combustivel = despesas.filter(d => d.label === 'Combustivel')

      // Separar por veículo
      const moto = combustivel.filter(d => d.item === 'Moto').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      const carro = combustivel.filter(d => d.item === 'Carro').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      setCombustiveis({ moto, carro })
      calcularStats(moto, carro)
      calcularChartData(moto, carro)
    } catch (error) {
      console.error('Erro ao carregar combustíveis:', error)
    } finally {
      setLoading(false)
    }
  }

  function calcularChartData(moto, carro) {
    // Filtrar apenas do mês atual (dia 1 ao último dia)
    const hoje = new Date()
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()
    const inicioMes = new Date(anoAtual, mesAtual, 1)
    const fimMes = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59)

    const motoMes = moto.filter(d => {
      const data = new Date(d.createdAt)
      return data >= inicioMes && data <= fimMes
    })

    const carroMes = carro.filter(d => {
      const data = new Date(d.createdAt)
      return data >= inicioMes && data <= fimMes
    })

    // Contar por pessoa
    const motoSusanna = motoMes.filter(d => d.buyer === 'Susanna').length
    const motoPietrah = motoMes.filter(d => d.buyer === 'Pietrah').length

    const carroSusanna = carroMes.filter(d => d.buyer === 'Susanna').length
    const carroPietrah = carroMes.filter(d => d.buyer === 'Pietrah').length

    setChartData({
      moto: [
        { name: 'Susanna', value: motoSusanna, color: '#f472b6' },
        { name: 'Pietrah', value: motoPietrah, color: '#60a5fa' }
      ].filter(d => d.value > 0),
      carro: [
        { name: 'Susanna', value: carroSusanna, color: '#f472b6' },
        { name: 'Pietrah', value: carroPietrah, color: '#60a5fa' }
      ].filter(d => d.value > 0)
    })
  }

  function calcularStats(moto, carro) {
    const users = ['Susanna', 'Pietrah']

    // Contadores por pessoa e veículo
    const contadores = {
      Susanna: { moto: 0, carro: 0, total: 0 },
      Pietrah: { moto: 0, carro: 0, total: 0 }
    }

    moto.forEach(d => {
      if (contadores[d.buyer]) {
        contadores[d.buyer].moto++
        contadores[d.buyer].total++
      }
    })

    carro.forEach(d => {
      if (contadores[d.buyer]) {
        contadores[d.buyer].carro++
        contadores[d.buyer].total++
      }
    })

    // Valores totais por pessoa
    const gastosSusanna = [...moto, ...carro].filter(d => d.buyer === 'Susanna').reduce((sum, d) => sum + d.total_value, 0)
    const gastosPietrah = [...moto, ...carro].filter(d => d.buyer === 'Pietrah').reduce((sum, d) => sum + d.total_value, 0)

    setStats({
      contadores,
      gastosSusanna,
      gastosPietrah,
      totalGastos: gastosSusanna + gastosPietrah
    })
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-base-800 border border-white/10 rounded-xl p-3 shadow-lg">
          <p className="text-white text-sm font-medium">{payload[0].name}</p>
          <p className="text-white/60 text-xs">{payload[0].value} abastecimentos</p>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent }) => {
    if (percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = outerRadius + 20
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text x={x} y={y} fill="rgba(255,255,255,0.7)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-semibold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
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

  const ultimoMoto = combustiveis.moto[0]
  const ultimoCarro = combustiveis.carro[0]
  const coresSu = getUserColors('Susanna')
  const coresPi = getUserColors('Pietrah')

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold text-white">Combustível</h1>
      <p className="text-white/40 text-sm">Controle de abastecimentos</p>

      {/* Cards de Último Abastecimento */}
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {/* Moto */}
        {ultimoMoto ? (
          <div className={`border rounded-2xl md:rounded-3xl p-3 md:p-5 ${ultimoMoto.buyer === 'Susanna' ? 'bg-su-400/10 border-su-400/20' : 'bg-pi-400/10 border-pi-400/20'}`}>
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
              <Fuel size={14} className="text-white/60 md:hidden" />
              <Fuel size={20} className="text-white/60 hidden md:block" />
              <p className="text-white/60 text-[10px] md:text-sm font-medium">Último - Moto</p>
            </div>
            <p className="text-white text-[10px] md:text-xs mb-0.5 md:mb-1">{ultimoMoto.buyer}</p>
            <h3 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">{fmt(ultimoMoto.total_value)}</h3>
            <p className="text-white/40 text-[10px] md:text-xs">{formatDateFull(ultimoMoto.createdAt)}</p>
            {ultimoMoto.description && (
              <p className="text-white/50 text-[10px] md:text-xs mt-1 md:mt-2 truncate">{ultimoMoto.description}</p>
            )}
          </div>
        ) : (
          <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl md:rounded-3xl p-3 md:p-5 flex items-center justify-center">
            <p className="text-white/30 text-[10px] md:text-sm">Nenhum de moto</p>
          </div>
        )}

        {/* Carro */}
        {ultimoCarro ? (
          <div className={`border rounded-2xl md:rounded-3xl p-3 md:p-5 ${ultimoCarro.buyer === 'Susanna' ? 'bg-su-400/10 border-su-400/20' : 'bg-pi-400/10 border-pi-400/20'}`}>
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
              <Fuel size={14} className="text-white/60 md:hidden" />
              <Fuel size={20} className="text-white/60 hidden md:block" />
              <p className="text-white/60 text-[10px] md:text-sm font-medium">Último - Carro</p>
            </div>
            <p className="text-white text-[10px] md:text-xs mb-0.5 md:mb-1">{ultimoCarro.buyer}</p>
            <h3 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">{fmt(ultimoCarro.total_value)}</h3>
            <p className="text-white/40 text-[10px] md:text-xs">{formatDateFull(ultimoCarro.createdAt)}</p>
            {ultimoCarro.description && (
              <p className="text-white/50 text-[10px] md:text-xs mt-1 md:mt-2 truncate">{ultimoCarro.description}</p>
            )}
          </div>
        ) : (
          <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl md:rounded-3xl p-3 md:p-5 flex items-center justify-center">
            <p className="text-white/30 text-[10px] md:text-sm">Nenhum de carro</p>
          </div>
        )}
      </div>

      {/* Gráficos de Rosca - Abastecimentos do Mês */}
      {(chartData.moto.length > 0 || chartData.carro.length > 0) && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl md:rounded-3xl p-3 md:p-5">
          <SectionTitle>Abastecimentos em {mesAtual}</SectionTitle>
          <div className="grid grid-cols-2 gap-2 md:gap-6 mt-3 md:mt-4">
            {/* Gráfico Moto */}
            <div>
              <h3 className="text-white/60 text-[10px] md:text-sm font-medium mb-2 md:mb-4 text-center">🏍️ Moto</h3>
              {chartData.moto.length > 0 ? (
                <ResponsiveContainer width="100%" height={140} className="md:!h-[200px]">
                  <PieChart>
                    <Pie
                      data={chartData.moto}
                      cx="50%"
                      cy="50%"
                      innerRadius="35%"
                      outerRadius="55%"
                      paddingAngle={5}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={false}
                    >
                      {chartData.moto.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[140px] md:h-[200px] flex items-center justify-center">
                  <p className="text-white/30 text-[10px] md:text-sm">Nenhum este mês</p>
                </div>
              )}
              {chartData.moto.length > 0 && (
                <div className="flex flex-col items-center gap-1 mt-1 md:mt-2">
                  {chartData.moto.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-white/60 text-[10px] md:text-xs">{item.name}: {item.value}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gráfico Carro */}
            <div>
              <h3 className="text-white/60 text-[10px] md:text-sm font-medium mb-2 md:mb-4 text-center">🚗 Carro</h3>
              {chartData.carro.length > 0 ? (
                <ResponsiveContainer width="100%" height={140} className="md:!h-[200px]">
                  <PieChart>
                    <Pie
                      data={chartData.carro}
                      cx="50%"
                      cy="50%"
                      innerRadius="35%"
                      outerRadius="55%"
                      paddingAngle={5}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={false}
                    >
                      {chartData.carro.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[140px] md:h-[200px] flex items-center justify-center">
                  <p className="text-white/30 text-[10px] md:text-sm">Nenhum este mês</p>
                </div>
              )}
              {chartData.carro.length > 0 && (
                <div className="flex flex-col items-center gap-1 mt-1 md:mt-2">
                  {chartData.carro.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-white/60 text-[10px] md:text-xs">{item.name}: {item.value}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas por Pessoa */}
      <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
        <SectionTitle>Estatísticas</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          {/* Susanna */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-su-400" />
              <p className="text-white font-medium text-sm">Susanna</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-xs">Moto</span>
                <span className="text-white text-sm font-semibold">{stats.contadores?.Susanna?.moto || 0}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-xs">Carro</span>
                <span className="text-white text-sm font-semibold">{stats.contadores?.Susanna?.carro || 0}x</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-white/50 text-xs">Total gasto</span>
                <span className="text-white text-sm font-semibold">{fmt(stats.gastosSusanna || 0)}</span>
              </div>
            </div>
          </div>

          {/* Pietrah */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pi-400" />
              <p className="text-white font-medium text-sm">Pietrah</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-xs">Moto</span>
                <span className="text-white text-sm font-semibold">{stats.contadores?.Pietrah?.moto || 0}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-xs">Carro</span>
                <span className="text-white text-sm font-semibold">{stats.contadores?.Pietrah?.carro || 0}x</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-white/50 text-xs">Total gasto</span>
                <span className="text-white text-sm font-semibold">{fmt(stats.gastosPietrah || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Geral */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm">Total de abastecimentos</span>
            <span className="text-white font-bold text-lg">{fmt(stats.totalGastos || 0)}</span>
          </div>
        </div>

        {/* Gráfico de Gastos por Pessoa */}
        {(stats.gastosSusanna > 0 || stats.gastosPietrah > 0) && (() => {
          const dadosGasto = [
            { name: 'Susanna', valor: stats.gastosSusanna || 0, fill: coresSu.hex },
            { name: 'Pietrah', valor: stats.gastosPietrah || 0, fill: coresPi.hex },
          ]
          const diff = (stats.gastosSusanna || 0) - (stats.gastosPietrah || 0)
          const quemGastouMais = diff > 0 ? 'Susanna' : diff < 0 ? 'Pietrah' : null

          return (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/60 text-sm font-medium mb-3">Gastos por Pessoa</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={dadosGasto} layout="vertical" barCategoryGap="30%">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={65} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    formatter={(value) => [fmt(value), 'Gasto']}
                    labelStyle={{ color: 'white' }}
                  />
                  <Bar dataKey="valor" radius={[0, 8, 8, 0]}>
                    {dadosGasto.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Diferença */}
              <div className={`mt-3 p-3 rounded-xl border ${
                diff === 0
                  ? 'bg-white/5 border-white/10'
                  : diff > 0
                    ? `bg-su-400/10 border-su-400/20`
                    : `bg-pi-400/10 border-pi-400/20`
              }`}>
                {diff === 0 ? (
                  <p className="text-white/60 text-xs text-center">Gastos iguais!</p>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-white/60 text-xs">
                      <span className={quemGastouMais === 'Susanna' ? 'text-su-400' : 'text-pi-400'} style={{ fontWeight: 600 }}>
                        {quemGastouMais}
                      </span>
                      {' '}gastou mais
                    </p>
                    <p className={`text-sm font-bold ${quemGastouMais === 'Susanna' ? 'text-su-400' : 'text-pi-400'}`}>
                      +{fmt(Math.abs(diff))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Últimos Abastecimentos - Expander */}
      {(combustiveis.moto.length > 0 || combustiveis.carro.length > 0) && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
          <button
            onClick={() => setShowUltimos(!showUltimos)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Fuel size={16} className="text-white/40" />
              <span className="text-white font-medium text-sm">Últimos Abastecimentos</span>
              <span className="text-white/30 text-xs">({combustiveis.moto.length + combustiveis.carro.length})</span>
            </div>
            <ChevronDown size={16} className={`text-white/40 transition-transform ${showUltimos ? 'rotate-180' : ''}`} />
          </button>

          {showUltimos && (
            <div className="px-5 pb-5 grid grid-cols-2 gap-4">
              {/* Moto */}
              <div>
                <p className="text-white/50 text-xs font-medium mb-2">🏍️ Moto</p>
                {combustiveis.moto.length > 0 ? (
                  <div className="space-y-1.5">
                    {combustiveis.moto.slice(0, 5).map((d) => (
                      <div key={d._id} className={`p-2.5 rounded-xl bg-base-800/40 border-l-2`} style={{ borderLeftColor: getUserColors(d.buyer).hex }}>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-white text-xs font-medium truncate">{d.buyer}</p>
                          <p className="text-white text-xs font-semibold flex-shrink-0">{fmt(d.total_value)}</p>
                        </div>
                        <p className="text-white/30 text-[10px] mt-0.5">{formatDateFull(d.createdAt)}</p>
                        {d.description && <p className="text-white/20 text-[10px] truncate">{d.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/20 text-xs">Nenhum</p>
                )}
              </div>

              {/* Carro */}
              <div>
                <p className="text-white/50 text-xs font-medium mb-2">🚗 Carro</p>
                {combustiveis.carro.length > 0 ? (
                  <div className="space-y-1.5">
                    {combustiveis.carro.slice(0, 5).map((d) => (
                      <div key={d._id} className={`p-2.5 rounded-xl bg-base-800/40 border-l-2`} style={{ borderLeftColor: getUserColors(d.buyer).hex }}>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-white text-xs font-medium truncate">{d.buyer}</p>
                          <p className="text-white text-xs font-semibold flex-shrink-0">{fmt(d.total_value)}</p>
                        </div>
                        <p className="text-white/30 text-[10px] mt-0.5">{formatDateFull(d.createdAt)}</p>
                        {d.description && <p className="text-white/20 text-[10px] truncate">{d.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/20 text-xs">Nenhum</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {combustiveis.moto.length === 0 && combustiveis.carro.length === 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-8 text-center">
          <Fuel size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">Nenhum abastecimento registrado</p>
        </div>
      )}
    </div>
  )
}
