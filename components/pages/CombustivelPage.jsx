'use client'

import { useState, useEffect } from 'react'
import { StatCard, ListItem, SectionTitle, Skeleton } from '@/components/ui/Cards'
import { fmt, formatDateFull, getUserColors } from '@/lib/helpers'
import { Fuel } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

export default function CombustivelPage({ user, outro, colors, refreshKey, triggerRefresh }) {
  const [loading, setLoading] = useState(true)
  const [combustiveis, setCombustiveis] = useState({ moto: [], carro: [] })
  const [stats, setStats] = useState({})
  const [chartData, setChartData] = useState({ moto: [], carro: [] })

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

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null // Não mostrar label se menor que 5%
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-sm font-semibold">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Moto */}
        {ultimoMoto ? (
          <div className={`bg-gradient-to-br ${ultimoMoto.buyer === 'Susanna' ? coresSu.gradient : coresPi.gradient} bg-opacity-20 border border-white/10 rounded-3xl p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <Fuel size={20} className="text-white/60" />
              <p className="text-white/60 text-sm font-medium">Último - Moto</p>
            </div>
            <p className="text-white text-xs mb-1">{ultimoMoto.buyer}</p>
            <h3 className="text-3xl font-bold text-white mb-2">{fmt(ultimoMoto.total_value)}</h3>
            <p className="text-white/40 text-xs">{formatDateFull(ultimoMoto.createdAt)}</p>
            {ultimoMoto.description && (
              <p className="text-white/50 text-xs mt-2 truncate">{ultimoMoto.description}</p>
            )}
          </div>
        ) : (
          <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex items-center justify-center">
            <p className="text-white/30 text-sm">Nenhum abastecimento de moto</p>
          </div>
        )}

        {/* Carro */}
        {ultimoCarro ? (
          <div className={`bg-gradient-to-br ${ultimoCarro.buyer === 'Susanna' ? coresSu.gradient : coresPi.gradient} bg-opacity-20 border border-white/10 rounded-3xl p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <Fuel size={20} className="text-white/60" />
              <p className="text-white/60 text-sm font-medium">Último - Carro</p>
            </div>
            <p className="text-white text-xs mb-1">{ultimoCarro.buyer}</p>
            <h3 className="text-3xl font-bold text-white mb-2">{fmt(ultimoCarro.total_value)}</h3>
            <p className="text-white/40 text-xs">{formatDateFull(ultimoCarro.createdAt)}</p>
            {ultimoCarro.description && (
              <p className="text-white/50 text-xs mt-2 truncate">{ultimoCarro.description}</p>
            )}
          </div>
        ) : (
          <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex items-center justify-center">
            <p className="text-white/30 text-sm">Nenhum abastecimento de carro</p>
          </div>
        )}
      </div>

      {/* Gráficos de Rosca - Abastecimentos do Mês */}
      {(chartData.moto.length > 0 || chartData.carro.length > 0) && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <SectionTitle>Abastecimentos em {mesAtual}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Gráfico Moto */}
            <div>
              <h3 className="text-white/60 text-sm font-medium mb-4 text-center">🏍️ Moto</h3>
              {chartData.moto.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData.moto}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-white/30 text-sm">Nenhum abastecimento este mês</p>
                </div>
              )}
              {chartData.moto.length > 0 && (
                <div className="flex justify-center gap-4 mt-2">
                  {chartData.moto.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-white/60 text-xs">{item.name}: {item.value}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gráfico Carro */}
            <div>
              <h3 className="text-white/60 text-sm font-medium mb-4 text-center">🚗 Carro</h3>
              {chartData.carro.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData.carro}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-white/30 text-sm">Nenhum abastecimento este mês</p>
                </div>
              )}
              {chartData.carro.length > 0 && (
                <div className="flex justify-center gap-4 mt-2">
                  {chartData.carro.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-white/60 text-xs">{item.name}: {item.value}x</span>
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
      </div>

      {/* Últimos 5 Abastecimentos - Moto */}
      {combustiveis.moto.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <SectionTitle>🏍️ Últimos Abastecimentos - Moto</SectionTitle>
          <div className="space-y-2">
            {combustiveis.moto.slice(0, 5).map((d) => {
              const userColors = getUserColors(d.buyer)
              return (
                <ListItem key={d._id} borderColor={userColors.hex}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{d.buyer}</p>
                      <p className="text-white/40 text-xs">{formatDateFull(d.createdAt)}</p>
                      {d.description && (
                        <p className="text-white/30 text-xs truncate mt-1">{d.description}</p>
                      )}
                    </div>
                    <p className="text-white text-sm font-semibold">{fmt(d.total_value)}</p>
                  </div>
                </ListItem>
              )
            })}
          </div>
        </div>
      )}

      {/* Últimos 5 Abastecimentos - Carro */}
      {combustiveis.carro.length > 0 && (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
          <SectionTitle>🚗 Últimos Abastecimentos - Carro</SectionTitle>
          <div className="space-y-2">
            {combustiveis.carro.slice(0, 5).map((d) => {
              const userColors = getUserColors(d.buyer)
              return (
                <ListItem key={d._id} borderColor={userColors.hex}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{d.buyer}</p>
                      <p className="text-white/40 text-xs">{formatDateFull(d.createdAt)}</p>
                      {d.description && (
                        <p className="text-white/30 text-xs truncate mt-1">{d.description}</p>
                      )}
                    </div>
                    <p className="text-white text-sm font-semibold">{fmt(d.total_value)}</p>
                  </div>
                </ListItem>
              )
            })}
          </div>
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
