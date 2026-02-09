'use client'

import { useState, useEffect } from 'react'
import { ProgressBar, SectionTitle, Skeleton, Badge } from '@/components/ui/Cards'
import { fmt, getCategoryDisplay, getPeriodo, CATEGORIES } from '@/lib/helpers'
import { ChevronDown, Plus, Target, TriangleAlert, Check } from 'lucide-react'

export default function MetasPage({ user, outro, colors, refreshKey, triggerRefresh }) {
  const [loading, setLoading] = useState(true)
  const [metas, setMetas] = useState([])
  const [gastosCategoria, setGastosCategoria] = useState({})
  const [expandNovaMeta, setExpandNovaMeta] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Form state
  const [categoria, setCategoria] = useState('')
  const [valor, setValor] = useState('')

  useEffect(() => {
    loadData()
  }, [user, refreshKey])

  async function loadData() {
    setLoading(true)
    try {
      const [metasData, despesas, config] = await Promise.all([
        fetch(`/api/metas?user=${user}`).then(r => r.json()),
        fetch('/api/despesas').then(r => r.json()),
        fetch(`/api/config?user=${user}`).then(r => r.json()),
      ])

      setMetas(metasData)

      // Calcular gastos por categoria no período da fatura atual
      const periodo = getPeriodo(config, user, 0)
      const despesasPeriodo = despesas.filter(d => {
        const data = new Date(d.createdAt)
        return data >= periodo.dataInicio && data <= periodo.dataFim && d.buyer === user
      })

      const gastos = {}
      despesasPeriodo.forEach(d => {
        let valor = d.total_value
        if (d.installment > 1) valor = valor / d.installment
        if (d.tem_pendencia && d.valor_pendente) valor -= d.valor_pendente

        if (!gastos[d.label]) gastos[d.label] = 0
        gastos[d.label] += valor
      })

      setGastosCategoria(gastos)
    } catch (error) {
      console.error('Erro ao carregar metas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!categoria || !valor) return

    setSaving(true)
    try {
      const res = await fetch('/api/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          categoria,
          valor_limite: parseFloat(valor),
          ativa: true,
        }),
      })

      if (res.ok) {
        showToast('Meta criada com sucesso!')
        setCategoria('')
        setValor('')
        setExpandNovaMeta(false)
        await loadData()
        triggerRefresh()
      }
    } catch (error) {
      console.error('Erro ao criar meta:', error)
    } finally {
      setSaving(false)
    }
  }

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  function getProgressColor(percentual) {
    if (percentual >= 100) return '#ef4444' // red
    if (percentual >= 80) return '#f59e0b' // yellow/amber
    return colors.hex // user color
  }

  function getStatusBadge(percentual) {
    if (percentual >= 100) {
      return <Badge color="red" icon={<TriangleAlert size={12} />}>Excedido</Badge>
    }
    if (percentual >= 80) {
      return <Badge color="yellow" icon={<TriangleAlert size={12} />}>Atenção</Badge>
    }
    return <Badge color="green" icon={<Check size={12} />}>No limite</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Metas de Gastos</h1>
          <p className="text-white/40 text-sm">Controle seus limites por categoria</p>
        </div>
        <button
          onClick={() => setExpandNovaMeta(!expandNovaMeta)}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all
                      ${expandNovaMeta
                        ? 'bg-white/10 text-white'
                        : `bg-gradient-to-br ${colors.gradient} text-white hover:opacity-90`}`}
        >
          <Plus size={16} />
          <span className="text-sm font-medium">Nova Meta</span>
        </button>
      </div>

      {/* Formulário de Nova Meta */}
      {expandNovaMeta && (
        <form onSubmit={handleSubmit} className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5 animate-slide-up">
          <SectionTitle>Criar Nova Meta</SectionTitle>
          <div className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20"
                required
              >
                <option value="">Selecione...</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Valor Limite (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 bg-gradient-to-br ${colors.gradient} text-white rounded-xl py-3 font-medium
                            hover:opacity-90 transition-opacity disabled:opacity-50`}
              >
                {saving ? 'Criando...' : 'Criar Meta'}
              </button>
              <button
                type="button"
                onClick={() => setExpandNovaMeta(false)}
                className="px-6 bg-white/5 text-white/60 rounded-xl hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista de Metas */}
      {metas.length > 0 ? (
        <div className="space-y-4">
          {metas.map((meta) => {
            const gasto = gastosCategoria[meta.categoria] || 0
            const percentual = (gasto / meta.limite) * 100
            const corBarra = getProgressColor(percentual)

            return (
              <div key={meta._id} className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium">{getCategoryDisplay(meta.categoria)}</h3>
                      {getStatusBadge(percentual)}
                    </div>
                    <p className="text-white/40 text-xs">Limite: {fmt(meta.limite)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${percentual >= 100 ? 'text-red-400' : percentual >= 80 ? 'text-amber-400' : 'text-white'}`}>
                      {fmt(gasto)}
                    </p>
                    <p className="text-white/40 text-xs">{percentual.toFixed(0)}%</p>
                  </div>
                </div>
                <ProgressBar
                  label=""
                  value={gasto}
                  max={meta.limite}
                  color={corBarra}
                  showPercentage={false}
                />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-12 text-center">
          <Target size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm mb-2">Nenhuma meta cadastrada</p>
          <p className="text-white/30 text-xs">Clique em "Nova Meta" para começar</p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <Check size={20} />
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  )
}
