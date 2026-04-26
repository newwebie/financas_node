'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Skeleton, EmptyState, Badge, CategoryIcon } from '@/components/ui/Cards'
import { fmt, formatDateFull, formatDate, getCategoryDisplay, CATEGORIES, CATEGORIAS, PAYMENT_METHODS, STATUS_TERCEIROS, toLocalDateString } from '@/lib/helpers'
import { ChevronDown, Save, Trash2, Ban, Check, CircleAlert, Search, X, ArrowDown, ArrowUp, CalendarDays } from 'lucide-react'

// Pseudo-categorias para tipos que nao sao despesas
const EXTRA_CATEGORIAS = [
  { id: '_emprestimo_pessoal', label: 'Empréstimo Pessoal' },
  { id: '_contas_fixas', label: 'Contas Fixas' },
  { id: '_metas', label: 'Metas' },
  { id: '_emprestimo_terceiros', label: 'Empréstimo (3os)' },
  { id: '_dividas_terceiros', label: 'Dívidas (3os)' },
]

const ALL_CATEGORIAS = [...CATEGORIAS, ...EXTRA_CATEGORIAS]

export default function EditarPage({ user, outro, colors, refreshKey, triggerRefresh, editItemId, clearEditItemId }) {
  const [loading, setLoading] = useState(true)
  const [allItems, setAllItems] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ categoria: null, pagamento: null, status: null, mes: null })
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [openFilter, setOpenFilter] = useState(null)

  // Date jump
  const dateRefs = useRef({})
  const dateInputRef = useRef(null)

  useEffect(() => { loadAllData() }, [user, refreshKey])

  useEffect(() => {
    if (editItemId && allItems.length > 0) {
      const item = allItems.find(i => i._id === editItemId)
      if (item) {
        setExpandedId(editItemId)
        setEditData({ ...item })
      }
      if (clearEditItemId) clearEditItemId()
    }
  }, [editItemId, allItems])

  useEffect(() => {
    if (!openFilter) return
    const handler = () => setOpenFilter(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openFilter])

  async function loadAllData() {
    setLoading(true)
    setExpandedId(null)
    try {
      const [despesas, emprestimos, contasFixas, metas, empTerceiros, divTerceiros] = await Promise.all([
        fetch(`/api/despesas?buyer=${user}`).then(r => r.json()).catch(() => []),
        fetch(`/api/emprestimos`).then(r => r.json()).catch(() => []),
        fetch(`/api/contas-fixas`).then(r => r.json()).catch(() => []),
        fetch(`/api/metas?user=${user}`).then(r => r.json()).catch(() => []),
        fetch(`/api/emprestimos-terceiros?user=${user}&status=all`).then(r => r.json()).catch(() => []),
        fetch(`/api/dividas-terceiros?user=${user}&status=all`).then(r => r.json()).catch(() => []),
      ])

      const items = []

      despesas.forEach(d => {
        items.push({ ...d, _tipo: 'despesas', _categoria: d.label, _endpoint: '/api/despesas', _date: d.createdAt, _value: d.total_value })
      })
      emprestimos.filter(e => e.de === user).forEach(e => {
        items.push({ ...e, _tipo: 'emprestimos', _categoria: '_emprestimo_pessoal', _endpoint: '/api/emprestimos', _date: e.createdAt, _value: e.valor })
      })
      emprestimos.filter(e => e.para === user).forEach(e => {
        items.push({ ...e, _tipo: 'dividas', _categoria: '_emprestimo_pessoal', _endpoint: '/api/emprestimos', _date: e.createdAt, _value: e.valor })
      })
      contasFixas.filter(c => c.buyer === user || c.responsavel === user).forEach(c => {
        items.push({ ...c, _tipo: 'contas-fixas', _categoria: '_contas_fixas', _endpoint: '/api/contas-fixas', _date: null, _value: c.valor })
      })
      metas.forEach(m => {
        items.push({ ...m, _tipo: 'metas', _categoria: '_metas', _endpoint: '/api/metas', _date: null, _value: m.limite })
      })
      empTerceiros.forEach(e => {
        items.push({ ...e, _tipo: 'emprestimos-terceiros', _categoria: '_emprestimo_terceiros', _endpoint: '/api/emprestimos-terceiros', _date: e.data_emprestimo, _value: e.valor })
      })
      divTerceiros.forEach(d => {
        items.push({ ...d, _tipo: 'dividas-terceiros', _categoria: '_dividas_terceiros', _endpoint: '/api/dividas-terceiros', _date: d.data_emprestimo, _value: d.valor })
      })

      setAllItems(items)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const displayedItems = useMemo(() => {
    let result = [...allItems]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(item => {
        const fields = [item.item, item.description, item.descricao, item.label, item.nome, item.para, item.de, item.devedor, item.credor, item.categoria]
        return fields.some(f => String(f || '').toLowerCase().includes(q))
      })
    }
    if (filters.categoria) result = result.filter(item => item._categoria === filters.categoria)
    if (filters.pagamento) result = result.filter(item => item.payment_method === filters.pagamento)
    if (filters.status) result = result.filter(item => item.status === filters.status)
    if (filters.mes) {
      result = result.filter(item => {
        if (!item._date) return false
        const d = new Date(item._date)
        const itemMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return itemMonth === filters.mes
      })
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'date') {
        cmp = new Date(a._date || 0) - new Date(b._date || 0)
      } else if (sortBy === 'value') {
        cmp = (a._value || 0) - (b._value || 0)
      } else if (sortBy === 'name') {
        const nameA = (a.item || a.nome || a.para || a.de || a.devedor || a.credor || a.categoria || '').toLowerCase()
        const nameB = (b.item || b.nome || b.para || b.de || b.devedor || b.credor || b.categoria || '').toLowerCase()
        cmp = nameA.localeCompare(nameB)
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return result
  }, [allItems, searchQuery, filters, sortBy, sortDir])

  // Agrupa por data (só quando ordenado por data)
  const groupedItems = useMemo(() => {
    if (sortBy !== 'date') return null
    const map = new Map()
    for (const item of displayedItems) {
      let dateKey = 'sem-data'
      let dateLabel = 'Sem data'
      if (item._date) {
        const d = new Date(item._date)
        const y = d.getFullYear()
        const mo = d.getMonth()
        const day = d.getDate()
        dateKey = `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        dateLabel = new Date(y, mo, day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      }
      if (!map.has(dateKey)) map.set(dateKey, { dateKey, dateLabel, items: [] })
      map.get(dateKey).items.push(item)
    }
    return [...map.values()]
  }, [displayedItems, sortBy])

  function handleDateJump(dateStr) {
    // garante que o sort está por data para os grupos existirem
    if (sortBy !== 'date') {
      setSortBy('date')
      setSortDir('desc')
    }
    setTimeout(() => {
      const el = dateRefs.current[dateStr]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else showToast('Nenhum registro nessa data', 'error')
    }, 50)
  }

  function handleExpand(item) {
    if (expandedId === item._id) {
      setExpandedId(null)
      setEditData({})
    } else {
      setExpandedId(item._id)
      setEditData({ ...item })
    }
  }

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  async function handleSave(item) {
    setSaving(true)
    try {
      const res = await fetch(item._endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editData, _id: item._id }),
      })
      if (res.ok) {
        showToast('Salvo com sucesso!', 'success')
        setExpandedId(null)
        await loadAllData()
        triggerRefresh()
      } else {
        showToast('Erro ao salvar', 'error')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      showToast('Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (!confirm('Tem certeza que deseja excluir?')) return
    try {
      const res = await fetch(`${item._endpoint}?id=${item._id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Excluído com sucesso!', 'success')
        setExpandedId(null)
        await loadAllData()
        triggerRefresh()
      } else {
        showToast('Erro ao excluir', 'error')
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      showToast('Erro ao excluir', 'error')
    }
  }

  async function handleCancelarContaFixa(item) {
    if (!confirm(`Cancelar "${item.nome}"? Ela não aparecerá mais nos próximos meses.`)) return
    try {
      const res = await fetch(item._endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: item._id, ativo: false, data_cancelamento: new Date().toISOString() }),
      })
      if (res.ok) {
        showToast('Conta fixa cancelada!', 'success')
        setExpandedId(null)
        await loadAllData()
        triggerRefresh()
      } else {
        showToast('Erro ao cancelar', 'error')
      }
    } catch (error) {
      console.error('Erro ao cancelar:', error)
      showToast('Erro ao cancelar', 'error')
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function getMonthOptions() {
    const months = []
    const now = new Date()
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      months.push({ value, label })
    }
    return months
  }

  function getItemDisplay(item) {
    const tipo = item._tipo
    switch (tipo) {
      case 'despesas':
        return {
          name: item.item || item.label || 'Item',
          catId: item.label,
          value: item.total_value,
          meta: [item.payment_method, item.createdAt ? formatDate(item.createdAt) : null, item.installment > 1 ? `${item.installment}x` : null].filter(Boolean).join(' · '),
        }
      case 'contas-fixas':
        return {
          name: item.nome || 'Conta',
          catId: '_contas_fixas',
          value: item.valor,
          meta: [item.payment_method, item.dia_vencimento ? `Dia ${item.dia_vencimento}` : null].filter(Boolean).join(' · '),
        }
      case 'metas':
        return {
          name: getCategoryDisplay(item.categoria) || 'Meta',
          catId: item.categoria,
          value: item.limite,
          meta: 'Limite mensal',
        }
      case 'emprestimos':
        return {
          name: `Emprestei p/ ${item.para || '?'}`,
          catId: '_emprestimo_pessoal',
          value: item.valor,
          meta: item.createdAt ? formatDate(item.createdAt) : '',
        }
      case 'dividas':
        return {
          name: `Devo p/ ${item.de || '?'}`,
          catId: '_emprestimo_pessoal',
          value: item.valor,
          meta: item.createdAt ? formatDate(item.createdAt) : '',
        }
      case 'emprestimos-terceiros':
        return {
          name: `Emprestei p/ ${item.devedor || '?'}`,
          catId: '_emprestimo_terceiros',
          value: item.valor,
          meta: item.data_emprestimo ? formatDate(item.data_emprestimo) : '',
          status: item.status,
        }
      case 'dividas-terceiros':
        return {
          name: `Devo p/ ${item.credor || '?'}`,
          catId: '_dividas_terceiros',
          value: item.valor,
          meta: item.data_emprestimo ? formatDate(item.data_emprestimo) : '',
          status: item.status,
        }
      default:
        return { name: 'Item', catId: 'Outros', value: 0, meta: '' }
    }
  }

  function renderItemCard(item) {
    const isExpanded = expandedId === item._id
    const display = getItemDisplay(item)
    return (
      <div key={`${item._tipo}-${item._id}`} className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={() => handleExpand(item)}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
        >
          <CategoryIcon category={display.catId} size={18} className="text-white/60 flex-shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <p className="text-white text-sm font-medium truncate">{display.name}</p>
            <div className="flex items-center gap-2">
              <p className="text-white/40 text-xs truncate">{display.meta}</p>
              {display.status && (
                <Badge color={display.status === 'em aberto' ? 'coral' : 'mint'}>
                  {display.status === 'em aberto' ? 'Aberto' : 'Quitado'}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-white font-semibold text-sm">{fmt(display.value)}</span>
            <ChevronDown size={14} className={`text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {renderEditForm(item)}
            <div className="flex gap-2">
              <button
                onClick={() => handleSave(item)}
                disabled={saving}
                className={`flex-1 bg-gradient-to-br ${colors.gradient} text-white rounded-xl py-2.5 px-4
                            flex items-center justify-center gap-2 font-medium
                            hover:opacity-90 transition-opacity disabled:opacity-50`}
              >
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              {item._tipo === 'contas-fixas' && (
                <button
                  onClick={() => handleCancelarContaFixa(item)}
                  className="px-4 py-2.5 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-colors flex items-center gap-2"
                >
                  <Ban size={16} />
                  Cancelar
                </button>
              )}
              <button
                onClick={() => handleDelete(item)}
                className="px-4 py-2.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderEditForm(item) {
    const tipo = item._tipo
    const inputClass = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/20 transition-colors'
    const labelClass = 'block text-white/60 text-xs mb-1'

    if (tipo === 'despesas') {
      return (
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoria</label>
              <select value={editData.label || ''} onChange={(e) => setEditData({ ...editData, label: e.target.value })} className={inputClass}>
                {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Item</label>
              <input type="text" value={editData.item || ''} onChange={(e) => setEditData({ ...editData, item: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Descricao</label>
            <input type="text" value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Valor Total</label>
              <input type="number" step="0.01" value={editData.total_value || ''} onChange={(e) => {
                const val = parseFloat(e.target.value) || 0
                const updates = { total_value: val }
                if (editData.pagamento_compartilhado === 'Dividido (me deve metade)') updates.valor_pendente = val / 2
                else if (editData.pagamento_compartilhado === 'Pra outra (me deve tudo)') updates.valor_pendente = val
                setEditData({ ...editData, ...updates })
              }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Parcelas</label>
              <input type="number" value={editData.installment || 1} onChange={(e) => setEditData({ ...editData, installment: parseInt(e.target.value) })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Pagamento</label>
            <select value={editData.payment_method || ''} onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })} className={inputClass}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tipo de compra</label>
            <select value={editData.pagamento_compartilhado || 'Pra mim'} onChange={(e) => {
              const val = e.target.value
              const updates = { pagamento_compartilhado: val }
              if (val === 'Pra mim') {
                updates.tem_pendencia = false
                updates.devedor = null
                updates.valor_pendente = null
                updates.status_pendencia = null
              } else if (val === 'Dividido (me deve metade)') {
                updates.tem_pendencia = true
                updates.devedor = outro
                updates.valor_pendente = (editData.total_value || 0) / 2
                updates.status_pendencia = editData.status_pendencia || 'em aberto'
              } else if (val === 'Pra outra (me deve tudo)') {
                updates.tem_pendencia = true
                updates.devedor = outro
                updates.valor_pendente = editData.total_value || 0
                updates.status_pendencia = editData.status_pendencia || 'em aberto'
              }
              setEditData({ ...editData, ...updates })
            }} className={inputClass}>
              <option value="Pra mim">Pra mim</option>
              <option value="Dividido (me deve metade)">Dividido (me deve metade)</option>
              <option value="Pra outra (me deve tudo)">Pra outra (me deve tudo)</option>
            </select>
          </div>
        </div>
      )
    }

    if (tipo === 'emprestimos' || tipo === 'dividas') {
      return (
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
          <div>
            <label className={labelClass}>Para quem</label>
            <input type="text" value={editData.para || ''} onChange={(e) => setEditData({ ...editData, para: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Descricao</label>
            <input type="text" value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Valor</label>
            <input type="number" step="0.01" value={editData.valor || ''} onChange={(e) => setEditData({ ...editData, valor: parseFloat(e.target.value) })} className={inputClass} />
          </div>
        </div>
      )
    }

    if (tipo === 'contas-fixas') {
      return (
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
          <div>
            <label className={labelClass}>Nome</label>
            <input type="text" value={editData.nome || ''} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Valor</label>
              <input type="number" step="0.01" value={editData.valor || ''} onChange={(e) => setEditData({ ...editData, valor: parseFloat(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Dia Vencimento</label>
              <input type="number" min="1" max="31" value={editData.dia_vencimento || ''} onChange={(e) => setEditData({ ...editData, dia_vencimento: parseInt(e.target.value) })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoria</label>
              <select value={editData.categoria || 'Contas'} onChange={(e) => setEditData({ ...editData, categoria: e.target.value })} className={inputClass}>
                {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Pagamento</label>
              <select value={editData.payment_method || ''} onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })} className={inputClass}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Responsável</label>
            <select value={editData.buyer || user} onChange={(e) => setEditData({ ...editData, buyer: e.target.value })} className={inputClass}>
              <option value={user}>{user}</option>
              <option value={outro}>{outro}</option>
            </select>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setEditData({ ...editData, cartao_credito: !editData.cartao_credito })}
                className={`w-9 h-5 rounded-full transition-colors ${editData.cartao_credito ? 'bg-su-500' : 'bg-white/10'} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${editData.cartao_credito ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-white/60 text-xs">Cartão de crédito</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setEditData({ ...editData, debito_automatico: !editData.debito_automatico })}
                className={`w-9 h-5 rounded-full transition-colors ${editData.debito_automatico ? 'bg-su-500' : 'bg-white/10'} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${editData.debito_automatico ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-white/60 text-xs">Débito automático</span>
            </label>
          </div>
        </div>
      )
    }

    if (tipo === 'metas') {
      return (
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
          <div>
            <label className={labelClass}>Categoria</label>
            <select value={editData.categoria || ''} onChange={(e) => setEditData({ ...editData, categoria: e.target.value })} className={inputClass}>
              {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Valor Limite</label>
            <input type="number" step="0.01" value={editData.limite || ''} onChange={(e) => setEditData({ ...editData, limite: parseFloat(e.target.value) })} className={inputClass} />
          </div>
        </div>
      )
    }

    if (tipo === 'emprestimos-terceiros') {
      return (
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
          <div>
            <label className={labelClass}>Para quem emprestei</label>
            <input type="text" value={editData.devedor || ''} onChange={(e) => setEditData({ ...editData, devedor: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Descricao</label>
            <input type="text" value={editData.descricao || ''} onChange={(e) => setEditData({ ...editData, descricao: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Valor</label>
              <input type="number" step="0.01" value={editData.valor || ''} onChange={(e) => setEditData({ ...editData, valor: parseFloat(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={editData.status || 'em aberto'} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className={inputClass}>
                {STATUS_TERCEIROS.map(s => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Data Emprestimo</label>
              <input type="date" value={toLocalDateString(editData.data_emprestimo)} onChange={(e) => setEditData({ ...editData, data_emprestimo: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Data Devolucao</label>
              <input type="date" value={toLocalDateString(editData.data_devolucao)} onChange={(e) => setEditData({ ...editData, data_devolucao: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>
      )
    }

    if (tipo === 'dividas-terceiros') {
      return (
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
          <div>
            <label className={labelClass}>Devo para</label>
            <input type="text" value={editData.credor || ''} onChange={(e) => setEditData({ ...editData, credor: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Descricao</label>
            <input type="text" value={editData.descricao || ''} onChange={(e) => setEditData({ ...editData, descricao: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Valor</label>
              <input type="number" step="0.01" value={editData.valor || ''} onChange={(e) => setEditData({ ...editData, valor: parseFloat(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={editData.status || 'em aberto'} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className={inputClass}>
                {STATUS_TERCEIROS.map(s => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Data Emprestimo</label>
              <input type="date" value={toLocalDateString(editData.data_emprestimo)} onChange={(e) => setEditData({ ...editData, data_emprestimo: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Data Pagamento</label>
              <input type="date" value={toLocalDateString(editData.data_pagamento)} onChange={(e) => setEditData({ ...editData, data_pagamento: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" checked={editData.emprestimo_conta || false} onChange={(e) => setEditData({ ...editData, emprestimo_conta: e.target.checked })} className="w-4 h-4 rounded bg-white/5 border-white/20" />
            <label className="text-white/60 text-xs">Emprestimo da minha conta</label>
          </div>
        </div>
      )
    }

    return null
  }

  const activeFilterCount = [filters.categoria, filters.pagamento, filters.status, filters.mes].filter(Boolean).length

  const categoriasPresentes = useMemo(() => {
    const ids = new Set(allItems.map(i => i._categoria))
    return ALL_CATEGORIAS.filter(c => ids.has(c.id))
  }, [allItems])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Editar Registros</h1>
        <div className="flex items-center gap-1.5">
          {/* Botão ir para data */}
          <div className="relative">
            <button
              onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
              title="Ir para data"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-white/5 text-white/40 border border-white/10 hover:text-white/70 hover:bg-white/10 transition-all"
            >
              <CalendarDays size={12} />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
              onChange={(e) => { if (e.target.value) handleDateJump(e.target.value) }}
            />
          </div>
          {/* Sort */}
          {[
            { id: 'date', label: 'Data' },
            { id: 'value', label: 'Valor' },
            { id: 'name', label: 'A-Z' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => toggleSort(s.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1
                ${sortBy === s.id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
            >
              {s.label}
              {sortBy === s.id && (sortDir === 'desc' ? <ArrowDown size={10} /> : <ArrowUp size={10} />)}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome, item, descricao..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {/* Categoria */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenFilter(openFilter === 'categoria' ? null : 'categoria')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1
              ${filters.categoria
                ? `bg-gradient-to-br ${colors.gradient}/20 ${colors.text} border border-current/20`
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'}`}
          >
            Categoria {filters.categoria && `· ${ALL_CATEGORIAS.find(c => c.id === filters.categoria)?.label || filters.categoria}`}
            <ChevronDown size={12} className={openFilter === 'categoria' ? 'rotate-180' : ''} />
          </button>
          {openFilter === 'categoria' && (
            <div className="absolute top-full mt-1 left-0 bg-base-700 border border-white/10 rounded-xl shadow-lg p-1.5 z-20 max-h-60 overflow-y-auto min-w-[180px]">
              <button onClick={() => { setFilters(f => ({ ...f, categoria: null })); setOpenFilter(null) }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/10">Todas</button>
              {categoriasPresentes.map(cat => (
                <button key={cat.id} onClick={() => { setFilters(f => ({ ...f, categoria: cat.id })); setOpenFilter(null) }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-white/10 flex items-center gap-2
                    ${filters.categoria === cat.id ? 'text-white bg-white/5' : 'text-white/70'}`}>
                  <CategoryIcon category={cat.id} size={12} className="flex-shrink-0" />
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagamento */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenFilter(openFilter === 'pagamento' ? null : 'pagamento')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1
              ${filters.pagamento
                ? `bg-gradient-to-br ${colors.gradient}/20 ${colors.text} border border-current/20`
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'}`}
          >
            Pagamento {filters.pagamento && `· ${filters.pagamento}`}
            <ChevronDown size={12} className={openFilter === 'pagamento' ? 'rotate-180' : ''} />
          </button>
          {openFilter === 'pagamento' && (
            <div className="absolute top-full mt-1 left-0 bg-base-700 border border-white/10 rounded-xl shadow-lg p-1.5 z-20 min-w-[120px]">
              <button onClick={() => { setFilters(f => ({ ...f, pagamento: null })); setOpenFilter(null) }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/10">Todos</button>
              {PAYMENT_METHODS.map(m => (
                <button key={m} onClick={() => { setFilters(f => ({ ...f, pagamento: m })); setOpenFilter(null) }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-white/10
                    ${filters.pagamento === m ? 'text-white bg-white/5' : 'text-white/70'}`}>{m}</button>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1
              ${filters.status
                ? `bg-gradient-to-br ${colors.gradient}/20 ${colors.text} border border-current/20`
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'}`}
          >
            Status {filters.status && `· ${filters.status}`}
            <ChevronDown size={12} className={openFilter === 'status' ? 'rotate-180' : ''} />
          </button>
          {openFilter === 'status' && (
            <div className="absolute top-full mt-1 left-0 bg-base-700 border border-white/10 rounded-xl shadow-lg p-1.5 z-20 min-w-[130px]">
              <button onClick={() => { setFilters(f => ({ ...f, status: null })); setOpenFilter(null) }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/10">Todos</button>
              {STATUS_TERCEIROS.map(s => (
                <button key={s.value} onClick={() => { setFilters(f => ({ ...f, status: s.value })); setOpenFilter(null) }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-white/10
                    ${filters.status === s.value ? 'text-white bg-white/5' : 'text-white/70'}`}>{s.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Mes */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenFilter(openFilter === 'mes' ? null : 'mes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1
              ${filters.mes
                ? `bg-gradient-to-br ${colors.gradient}/20 ${colors.text} border border-current/20`
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'}`}
          >
            Mes {filters.mes && `· ${getMonthOptions().find(m => m.value === filters.mes)?.label || filters.mes}`}
            <ChevronDown size={12} className={openFilter === 'mes' ? 'rotate-180' : ''} />
          </button>
          {openFilter === 'mes' && (
            <div className="absolute top-full mt-1 left-0 bg-base-700 border border-white/10 rounded-xl shadow-lg p-1.5 z-20 min-w-[130px]">
              <button onClick={() => { setFilters(f => ({ ...f, mes: null })); setOpenFilter(null) }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/10">Todos</button>
              {getMonthOptions().map(m => (
                <button key={m.value} onClick={() => { setFilters(f => ({ ...f, mes: m.value })); setOpenFilter(null) }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-white/10
                    ${filters.mes === m.value ? 'text-white bg-white/5' : 'text-white/70'}`}>{m.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Chip rápido: Contas Fixas */}
        <button
          onClick={() => setFilters(f => ({ ...f, categoria: f.categoria === '_contas_fixas' ? null : '_contas_fixas' }))}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
            ${filters.categoria === '_contas_fixas'
              ? `bg-gradient-to-br ${colors.gradient}/20 ${colors.text} border border-current/20`
              : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'}`}
        >
          Contas Fixas
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={() => setFilters({ categoria: null, pagamento: null, status: null, mes: null })}
            className="px-2 py-1.5 rounded-xl text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            Limpar filtros
          </button>
        )}
        <span className="ml-auto text-white/60 text-xs font-semibold tabular-nums">
          {fmt(displayedItems.reduce((sum, item) => sum + (item._value || 0), 0))}
        </span>
      </div>

      {/* Results count */}
      <p className="text-xs text-white/30">
        {loading ? '...' : (
          <>
            {displayedItems.length} registro{displayedItems.length !== 1 ? 's' : ''}
            {searchQuery && ` para "${searchQuery}"`}
            {activeFilterCount > 0 && ` (${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} ativo${activeFilterCount > 1 ? 's' : ''})`}
          </>
        )}
      </p>

      {/* Record List */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : displayedItems.length > 0 ? (
        <div className="space-y-2">
          {groupedItems ? (
            groupedItems.map(({ dateKey, dateLabel, items }) => (
              <div key={dateKey} ref={el => { dateRefs.current[dateKey] = el }}>
                <p className="text-white/30 text-[11px] font-medium px-1 pt-3 pb-1.5 capitalize tracking-wide">
                  {dateLabel}
                </p>
                <div className="space-y-2">
                  {items.map(item => renderItemCard(item))}
                </div>
              </div>
            ))
          ) : (
            displayedItems.map(item => renderItemCard(item))
          )}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          message="Nenhum registro encontrado"
          sub={searchQuery ? 'Tente outro termo de busca' : activeFilterCount > 0 ? 'Tente remover alguns filtros' : null}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-slide-up z-50
                         ${toast.type === 'success' ? 'bg-mint-500' : 'bg-coral-500'} text-white`}>
          {toast.type === 'success' ? <Check size={20} /> : <CircleAlert size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
