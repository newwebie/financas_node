'use client'

import { useState, useEffect } from 'react'
import { SectionTitle, Skeleton } from '@/components/ui/Cards'
import { fmt, formatDateFull, getCategoryDisplay, CATEGORIES } from '@/lib/helpers'
import { ChevronDown, Save, Trash2, Check, AlertCircle } from 'lucide-react'

const TIPOS = [
  { id: 'despesas', label: 'Despesas', endpoint: '/api/despesas' },
  { id: 'combustivel', label: 'Combustível', endpoint: '/api/despesas', filter: (d) => d.label === 'Combustivel' },
  { id: 'emprestimos', label: 'Emprestei', endpoint: '/api/emprestimos' },
  { id: 'dividas', label: 'Dívidas', endpoint: '/api/emprestimos', filter: (e) => e.de === 'user' },
  { id: 'contas-fixas', label: 'Contas Fixas', endpoint: '/api/contas-fixas' },
  { id: 'metas', label: 'Metas', endpoint: '/api/metas' },
]

export default function EditarPage({ user, outro, colors, refreshKey, triggerRefresh, editItemId, clearEditItemId }) {
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo] = useState('despesas')
  const [items, setItems] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadData()
  }, [tipo, user, refreshKey])

  useEffect(() => {
    if (editItemId && items.length > 0) {
      const item = items.find(i => i._id === editItemId)
      if (item) {
        setExpandedId(editItemId)
        setEditData({ ...item })
      }
      if (clearEditItemId) clearEditItemId()
    }
  }, [editItemId, items])

  async function loadData() {
    setLoading(true)
    setExpandedId(null)
    try {
      const tipoConfig = TIPOS.find(t => t.id === tipo)
      let url = tipoConfig.endpoint

      // Adicionar filtros de query
      if (tipo === 'despesas' || tipo === 'combustivel') {
        url += `?buyer=${user}`
      } else if (tipo === 'metas') {
        url += `?user=${user}`
      } else if (tipo === 'contas-fixas') {
        // Sem filtro, busca todas
      }

      const data = await fetch(url).then(r => r.json())

      // Aplicar filtros adicionais
      let filtered = data
      if (tipoConfig.filter) {
        filtered = data.filter(tipoConfig.filter)
      }

      // Filtrar por user em contas-fixas
      if (tipo === 'contas-fixas') {
        filtered = filtered.filter(c => c.buyer === user)
      }

      setItems(filtered)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
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

  async function handleSave(id) {
    setSaving(true)
    try {
      const tipoConfig = TIPOS.find(t => t.id === tipo)
      const res = await fetch(tipoConfig.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editData, _id: id }),
      })

      if (res.ok) {
        showToast('Salvo com sucesso!', 'success')
        setExpandedId(null)
        await loadData()
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

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir?')) return

    try {
      const tipoConfig = TIPOS.find(t => t.id === tipo)
      const res = await fetch(`${tipoConfig.endpoint}?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        showToast('Excluído com sucesso!', 'success')
        setExpandedId(null)
        await loadData()
        triggerRefresh()
      } else {
        showToast('Erro ao excluir', 'error')
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      showToast('Erro ao excluir', 'error')
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function renderEditForm(item) {
    if (tipo === 'despesas' || tipo === 'combustivel') {
      return (
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/60 text-xs mb-1">Categoria</label>
              <select
                value={editData.label || ''}
                onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/60 text-xs mb-1">Item</label>
              <input
                type="text"
                value={editData.item || ''}
                onChange={(e) => setEditData({ ...editData, item: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-white/60 text-xs mb-1">Descrição</label>
            <input
              type="text"
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/60 text-xs mb-1">Valor Total</label>
              <input
                type="number"
                step="0.01"
                value={editData.total_value || ''}
                onChange={(e) => setEditData({ ...editData, total_value: parseFloat(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs mb-1">Parcelas</label>
              <input
                type="number"
                value={editData.installment || 1}
                onChange={(e) => setEditData({ ...editData, installment: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-white/60 text-xs mb-1">Método de Pagamento</label>
            <select
              value={editData.payment_method || ''}
              onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="Debito">Débito</option>
              <option value="Credito">Crédito</option>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>
        </div>
      )
    }

    if (tipo === 'emprestimos' || tipo === 'dividas') {
      return (
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
          <div>
            <label className="block text-white/60 text-xs mb-1">Para quem</label>
            <input
              type="text"
              value={editData.para || ''}
              onChange={(e) => setEditData({ ...editData, para: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs mb-1">Descrição</label>
            <input
              type="text"
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs mb-1">Valor</label>
            <input
              type="number"
              step="0.01"
              value={editData.valor || ''}
              onChange={(e) => setEditData({ ...editData, valor: parseFloat(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
        </div>
      )
    }

    if (tipo === 'contas-fixas') {
      return (
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
          <div>
            <label className="block text-white/60 text-xs mb-1">Nome</label>
            <input
              type="text"
              value={editData.nome || ''}
              onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/60 text-xs mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                value={editData.valor || ''}
                onChange={(e) => setEditData({ ...editData, valor: parseFloat(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs mb-1">Dia Vencimento</label>
              <input
                type="number"
                value={editData.dia_vencimento || ''}
                onChange={(e) => setEditData({ ...editData, dia_vencimento: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-white/60 text-xs mb-1">Método de Pagamento</label>
            <select
              value={editData.payment_method || ''}
              onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="Debito">Débito</option>
              <option value="Credito">Crédito</option>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>
        </div>
      )
    }

    if (tipo === 'metas') {
      return (
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
          <div>
            <label className="block text-white/60 text-xs mb-1">Categoria</label>
            <select
              value={editData.categoria || ''}
              onChange={(e) => setEditData({ ...editData, categoria: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-white/60 text-xs mb-1">Valor Limite</label>
            <input
              type="number"
              step="0.01"
              value={editData.limite || ''}
              onChange={(e) => setEditData({ ...editData, limite: parseFloat(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
        </div>
      )
    }

    return null
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
      <h1 className="text-2xl font-semibold text-white">Editar Registros</h1>

      {/* Botões de Tipo */}
      <div className="flex gap-2 flex-wrap">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTipo(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                        ${tipo === t.id
                          ? `bg-gradient-to-br ${colors.gradient} text-white`
                          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista de Items */}
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => {
            const isExpanded = expandedId === item._id
            return (
              <div
                key={item._id}
                className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => handleExpand(item)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-medium">
                      {item.nome || item.item || item.para || getCategoryDisplay(item.categoria) || 'Item'}
                    </p>
                    <p className="text-white/40 text-xs">
                      {item.createdAt && formatDateFull(item.createdAt)}
                      {item.total_value && ` • ${fmt(item.total_value)}`}
                      {item.valor && ` • ${fmt(item.valor)}`}
                      {item.limite && ` • Limite: ${fmt(item.limite)}`}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {renderEditForm(item)}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(item._id)}
                        disabled={saving}
                        className={`flex-1 bg-gradient-to-br ${colors.gradient} text-white rounded-xl py-2.5 px-4
                                    flex items-center justify-center gap-2 font-medium
                                    hover:opacity-90 transition-opacity disabled:opacity-50`}
                      >
                        <Save size={16} />
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="px-4 py-2.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30
                                   transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-12 text-center">
          <p className="text-white/40 text-sm">Nenhum registro encontrado</p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-slide-up z-50
                         ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          {toast.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
