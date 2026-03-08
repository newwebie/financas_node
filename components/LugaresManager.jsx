'use client'

/**
 * Componente: LugaresManager
 * Descrição: CRUD de lugares frequentes com keywords como tags para auto-match de transações.
 * Props: { user, colors }
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Pencil, X, Check, MapPin, Loader2, RefreshCw, ChevronDown, ChevronUp, Lightbulb, Zap, Search } from 'lucide-react'
import { CATEGORIAS, limparDescricao, fmt, formatDateFull } from '@/lib/helpers'
import { Skeleton, EmptyState, CategoryIcon } from '@/components/ui/Cards'

const SELECT_CLASS = `w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white
  focus:border-white/20 outline-none transition-all cursor-pointer appearance-none
  bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.4)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')]
  bg-[length:20px] bg-[center_right_1rem] bg-no-repeat`

export default function LugaresManager({ user, colors }) {
  const [lugares, setLugares] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [activeTab, setActiveTab] = useState('cadastrados')

  // Form state
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('Outros')
  const [tipo, setTipo] = useState('manual')
  const [cnpj, setCnpj] = useState('')
  const [keywords, setKeywords] = useState([])
  const [kwInput, setKwInput] = useState('')
  const kwInputRef = useRef(null)
  const formRef = useRef(null)

  // Sugestões state
  const [sugestoes, setSugestoes] = useState(null)
  const [loadingSugestoes, setLoadingSugestoes] = useState(true)
  const [dismissedSugestoes, setDismissedSugestoes] = useState([])
  const [expandedFrequente, setExpandedFrequente] = useState(null)

  // Filtros da lista
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')

  const loadLugares = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch(`/api/lugares?user=${user}`).then(r => r.json())
      setLugares(Array.isArray(data) ? data : [])
    } catch {
      setLugares([])
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadSugestoes = useCallback(async () => {
    setLoadingSugestoes(true)
    try {
      const data = await fetch(`/api/pluggy/sugestoes-lugares?user=${user}`).then(r => r.json())
      setSugestoes(data && (data.ultimas5 || data.frequentes) ? data : null)
    } catch {
      setSugestoes(null)
    } finally {
      setLoadingSugestoes(false)
    }
  }, [user])

  useEffect(() => {
    loadLugares()
    loadSugestoes()
  }, [loadLugares, loadSugestoes])

  function showMsg(msg, isError = false) {
    setFeedback({ msg, isError })
    setTimeout(() => setFeedback(null), 3000)
  }

  function resetForm() {
    setNome('')
    setCategoria('Outros')
    setTipo('manual')
    setCnpj('')
    setKeywords([])
    setKwInput('')
    setEditingId(null)
    setShowForm(false)
  }

  function openNovoForm() {
    resetForm()
    setShowForm(true)
    setTimeout(() => kwInputRef.current?.focus(), 100)
  }

  function handleAddSugestao(item) {
    setDismissedSugestoes(prev => [...prev, item.descricao])
    setNome(item.descricao)
    setCategoria('Outros')
    setCnpj('')
    setKeywords([item.descricao.toLowerCase()])
    setKwInput('')
    setEditingId(null)
    setShowForm(true)
    setActiveTab('cadastrados')
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  function openEditForm(lugar) {
    setNome(lugar.nome || '')
    setCategoria(lugar.categoria || 'Outros')
    setTipo(lugar.tipo || 'manual')
    setCnpj(lugar.cnpj || '')
    setKeywords(lugar.keywords || [])
    setKwInput('')
    setEditingId(lugar._id)
    setShowForm(true)
  }

  function addKeyword(value) {
    const kw = value.trim().toLowerCase()
    if (!kw) return
    if (!keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw])
    }
    setKwInput('')
  }

  function handleKwKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword(kwInput)
    } else if (e.key === 'Backspace' && kwInput === '' && keywords.length > 0) {
      setKeywords(prev => prev.slice(0, -1))
    }
  }

  function removeKeyword(kw) {
    setKeywords(prev => prev.filter(k => k !== kw))
  }

  async function handleSalvar() {
    if (!nome.trim()) return showMsg('Informe o nome do lugar', true)

    setSaving(true)
    try {
      if (editingId) {
        await fetch('/api/lugares', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: editingId, nome: nome.trim(), keywords, categoria, cnpj: cnpj.trim() || null, tipo }),
        })
        showMsg('Lugar atualizado!')
      } else {
        await fetch('/api/lugares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: nome.trim(), keywords, categoria, cnpj: cnpj.trim() || null, tipo, userId: user }),
        })
        showMsg('Lugar criado!')
      }
      resetForm()
      loadLugares()
      loadSugestoes()
    } catch {
      showMsg('Erro ao salvar', true)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletar(id) {
    setDeletingId(id)
    try {
      await fetch(`/api/lugares?id=${id}`, { method: 'DELETE' })
      setLugares(prev => prev.filter(l => l._id !== id))
    } catch {
      showMsg('Erro ao excluir', true)
    } finally {
      setDeletingId(null)
    }
  }

  // Filtra sugestões já descartadas
  const ultimas5Visiveis = (sugestoes?.ultimas5 || []).filter(
    item => !dismissedSugestoes.includes(item.descricao)
  )
  const frequentesVisiveis = (sugestoes?.frequentes || []).filter(
    item => !dismissedSugestoes.includes(item.descricao)
  )
  const temSugestoes = ultimas5Visiveis.length > 0 || frequentesVisiveis.length > 0
  const sugestoesBadge = ultimas5Visiveis.length + frequentesVisiveis.length

  // Filtra lista de lugares
  const lugaresFiltrados = lugares.filter(l => {
    const buscaLower = busca.toLowerCase().trim()
    if (buscaLower) {
      const noNome = l.nome?.toLowerCase().includes(buscaLower)
      const naKeyword = (l.keywords || []).some(k => k.toLowerCase().includes(buscaLower))
      if (!noNome && !naKeyword) return false
    }
    if (filtroTipo !== 'todos' && l.tipo !== filtroTipo) return false
    if (filtroCategoria !== 'todas' && l.categoria !== filtroCategoria) return false
    return true
  })

  // Categorias presentes na lista para o filtro
  const categoriasPresentes = [...new Set(lugares.map(l => l.categoria).filter(Boolean))]

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  }

  const catLabel = (catId) => {
    const cat = CATEGORIAS.find(c => c.id === catId)
    return cat ? cat.label : catId
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {feedback && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg animate-slide-up
                        ${feedback.isError ? 'bg-coral-500' : 'bg-mint-500'}`}>
          <p className="text-white font-medium text-sm flex items-center gap-2">
            {!feedback.isError && <Check size={16} />}
            {feedback.msg}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-2xl p-1">
        <button
          onClick={() => setActiveTab('cadastrados')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
            ${activeTab === 'cadastrados'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-white/40 hover:text-white/60'
            }`}
        >
          <MapPin size={15} />
          Cadastrados
          {lugares.length > 0 && (
            <span className="text-[11px] opacity-60">{lugares.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sugestoes')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
            ${activeTab === 'sugestoes'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-white/40 hover:text-white/60'
            }`}
        >
          <Lightbulb size={15} />
          Sugestoes
          {sugestoesBadge > 0 && (
            <span className={`text-[11px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full
              ${activeTab === 'sugestoes' ? 'bg-white/15' : 'bg-white/10'}`}>
              {sugestoesBadge}
            </span>
          )}
        </button>
      </div>

      {/* ===== ABA CADASTRADOS ===== */}
      {activeTab === 'cadastrados' && (
        <div className="space-y-4">
          {/* Header com busca e filtros */}
          <div className="space-y-2.5">
            {/* Linha topo: contador + botão novo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-white/40" />
                <span className="text-white/60 text-sm">
                  {lugaresFiltrados.length === lugares.length
                    ? `${lugares.length} lugar${lugares.length !== 1 ? 'es' : ''}`
                    : `${lugaresFiltrados.length} de ${lugares.length}`}
                </span>
              </div>
              {!showForm && (
                <button
                  onClick={openNovoForm}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                              bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-colors active:scale-[0.97]"
                >
                  <Plus size={14} />
                  Novo Lugar
                </button>
              )}
            </div>

            {/* Só exibe busca e filtros quando há lugares */}
            {lugares.length > 0 && (
              <>
                {/* Campo de busca */}
                <div className="relative">
                  <input
                    type="text"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar por nome ou keyword..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                               focus:border-white/20 outline-none placeholder-white/25 transition-colors"
                  />
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  {busca && (
                    <button
                      onClick={() => setBusca('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Chips de tipo */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'todos', label: 'Todos', icon: null },
                    { id: 'manual', label: 'Manual', icon: <Pencil size={11} /> },
                    { id: 'semi-auto', label: 'Semi-auto', icon: <RefreshCw size={11} /> },
                    { id: 'auto', label: 'Auto', icon: <Zap size={11} /> },
                  ].map(op => (
                    <button
                      key={op.id}
                      onClick={() => setFiltroTipo(op.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1
                        ${filtroTipo === op.id
                          ? 'bg-white/15 border-white/25 text-white'
                          : 'bg-transparent border-white/10 text-white/40 hover:text-white/60'
                        }`}
                    >
                      {op.icon}
                      {op.label}
                    </button>
                  ))}

                  {/* Select de categoria (só exibe quando há mais de 1 categoria em uso) */}
                  {categoriasPresentes.length > 1 && (
                    <select
                      value={filtroCategoria}
                      onChange={e => setFiltroCategoria(e.target.value)}
                      className="ml-auto px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs
                                 outline-none cursor-pointer appearance-none focus:border-white/20 transition-colors"
                    >
                      <option value="todas">Todas categorias</option>
                      {categoriasPresentes.map(catId => {
                        const cat = CATEGORIAS.find(c => c.id === catId)
                        return cat
                          ? <option key={catId} value={catId}>{cat.emoji} {cat.label}</option>
                          : null
                      })}
                    </select>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Formulário */}
          {showForm && (
            <div ref={formRef} className="bg-base-800/60 border border-white/10 rounded-2xl p-4 space-y-3 animate-slide-up">
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
                {editingId ? 'Editar Lugar' : 'Novo Lugar'}
              </p>

              <div>
                <label className="text-white/50 text-xs block mb-1.5">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-base-800 border border-white/10 text-white text-sm
                             focus:border-white/20 outline-none"
                  placeholder="Ex: Posto Shell Av. Brasil"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs block mb-1.5">
                  Palavras-chave <span className="text-white/30">(Enter ou virgula para adicionar)</span>
                </label>
                <div
                  className="flex flex-wrap gap-1.5 min-h-[46px] px-3 py-2 rounded-xl bg-base-800 border border-white/10
                              focus-within:border-white/20 cursor-text"
                  onClick={() => kwInputRef.current?.focus()}
                >
                  {keywords.map(kw => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-xs"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeKeyword(kw) }}
                        className="text-white/40 hover:text-white/80 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={kwInputRef}
                    type="text"
                    value={kwInput}
                    onChange={e => setKwInput(e.target.value)}
                    onKeyDown={handleKwKeyDown}
                    onBlur={() => { if (kwInput.trim()) addKeyword(kwInput) }}
                    className="flex-1 min-w-[80px] bg-transparent text-white text-sm outline-none placeholder-white/20"
                    placeholder={keywords.length === 0 ? 'shell, posto, gasolina...' : ''}
                  />
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs block mb-1.5">Categoria</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className={SELECT_CLASS}
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Toggle Auto / Manual */}
              <div>
                <label className="text-white/50 text-xs mb-2 block">Lancamento</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo('manual')}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                      tipo === 'manual'
                        ? 'bg-white/15 border-white/30 text-white'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <Pencil size={13} /> Manual
                    </span>
                    <span className="block text-xs font-normal mt-0.5 opacity-70">
                      Vai pra Pendentes p/ revisar
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('auto')}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                      tipo === 'auto'
                        ? 'bg-green-500/20 border-green-500/40 text-green-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <Zap size={13} /> Automatico
                    </span>
                    <span className="block text-xs font-normal mt-0.5 opacity-70">
                      Lanca direto como despesa
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs block mb-1.5">CNPJ <span className="text-white/25">(opcional)</span></label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={e => setCnpj(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-base-800 border border-white/10 text-white text-sm
                             focus:border-white/20 outline-none"
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSalvar}
                  disabled={saving}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                              bg-gradient-to-r ${colors.gradient} text-white
                              hover:opacity-90 transition-opacity disabled:opacity-50`}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm
                             hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de lugares */}
          {lugares.length === 0 && !showForm ? (
            <EmptyState
              icon={MapPin}
              message="Nenhum lugar cadastrado"
              sub="Adicione lugares frequentes para identificar transacoes automaticamente"
            />
          ) : lugaresFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/30 text-sm">Nenhum lugar encontrado</p>
              <button
                onClick={() => { setBusca(''); setFiltroTipo('todos'); setFiltroCategoria('todas') }}
                className="text-white/40 text-xs mt-1 hover:text-white/60 transition-colors underline underline-offset-2"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {lugaresFiltrados.map(lugar => (
                <div
                  key={lugar._id}
                  className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CategoryIcon category={lugar.categoria} size={14} className="text-white/40 flex-shrink-0" />
                      <p className="text-white text-sm font-medium truncate">{lugar.nome}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1 ${
                        lugar.tipo === 'auto'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/10 text-white/40'
                      }`}>
                        {lugar.tipo === 'auto' ? <><Zap size={10} /> Auto</> : <><Pencil size={10} /> Manual</>}
                      </span>
                    </div>

                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditForm(lugar)}
                      className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center
                                 hover:bg-white/10 transition-colors active:scale-95"
                      title="Editar"
                    >
                      <Pencil size={13} className="text-white/40" />
                    </button>
                    <button
                      onClick={() => handleDeletar(lugar._id)}
                      disabled={deletingId === lugar._id}
                      className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center
                                 hover:bg-red-500/20 transition-colors active:scale-95 disabled:opacity-50"
                      title="Excluir"
                    >
                      {deletingId === lugar._id ? (
                        <Loader2 size={13} className="text-white/40 animate-spin" />
                      ) : (
                        <X size={13} className="text-white/40" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ABA SUGESTOES ===== */}
      {activeTab === 'sugestoes' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-white/80 text-sm font-medium flex items-center gap-1.5">
                <Lightbulb size={15} className="text-white/50" />
                Sugestoes para cadastrar
              </p>
              <p className="text-white/35 text-xs mt-0.5">Baseado no seu historico de transacoes</p>
            </div>
            <button
              onClick={() => {
                setDismissedSugestoes([])
                loadSugestoes()
              }}
              disabled={loadingSugestoes}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40 shrink-0"
              title="Atualizar sugestoes"
            >
              <RefreshCw size={13} className={`text-white/50 ${loadingSugestoes ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingSugestoes ? (
            <div className="space-y-2">
              <Skeleton className="h-9 rounded-xl" />
              <Skeleton className="h-9 rounded-xl" />
              <Skeleton className="h-9 rounded-xl" />
            </div>
          ) : !temSugestoes ? (
            <EmptyState
              icon={Lightbulb}
              message="Nenhuma sugestao no momento"
              sub="Novas sugestoes aparecerao conforme voce importar transacoes"
            />
          ) : (
            <div className="space-y-4">
              {/* Últimas transações */}
              {ultimas5Visiveis.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-white/35 text-[11px] font-medium uppercase tracking-wider">
                    Ultimas transacoes
                  </p>
                  {ultimas5Visiveis.map(item => (
                    <div
                      key={item.descricao}
                      className="flex items-center justify-between gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5"
                    >
                      <span className="text-white/80 text-sm truncate">{limparDescricao(item.descricao)}</span>
                      <button
                        onClick={() => handleAddSugestao(item)}
                        className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors flex items-center gap-1"
                      >
                        <Plus size={12} />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Frequentes */}
              {frequentesVisiveis.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-white/35 text-[11px] font-medium uppercase tracking-wider">
                    Aparecem 3+ vezes
                  </p>
                  {frequentesVisiveis.map(item => {
                    const isExpanded = expandedFrequente === item.descricao
                    return (
                      <div
                        key={item.descricao}
                        className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden"
                      >
                        {/* Header clicável */}
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <button
                            onClick={() => setExpandedFrequente(isExpanded ? null : item.descricao)}
                            className="flex-1 flex items-center gap-2 min-w-0 text-left"
                          >
                            {isExpanded
                              ? <ChevronUp size={13} className="text-white/30 shrink-0" />
                              : <ChevronDown size={13} className="text-white/30 shrink-0" />
                            }
                            <span className="text-white/80 text-sm truncate">{limparDescricao(item.descricao)}</span>
                            <span className="text-white/35 text-xs shrink-0">{item.count}x</span>
                          </button>
                          <button
                            onClick={() => handleAddSugestao(item)}
                            className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors flex items-center gap-1"
                          >
                            <Plus size={12} />
                            Add
                          </button>
                        </div>

                        {/* Prévia expandida */}
                        {isExpanded && item.previas?.length > 0 && (
                          <div className="border-t border-white/10 px-3 py-2 space-y-1.5">
                            {item.previas.map((p, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-white/35">{formatDateFull(new Date(p.data))}</span>
                                <span className="text-red-400/70 font-medium">-{fmt(p.valor)}</span>
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
      )}
    </div>
  )
}
