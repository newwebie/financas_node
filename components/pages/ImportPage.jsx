'use client'

/**
 * Página: Importar Transações
 * Descrição: 3 abas — Pendentes, Conexões (Pluggy) e Upload (OFX/CSV).
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Download, RefreshCw, Trash2, X, Check,
  ChevronDown, ChevronUp, Building2, Calendar, Loader2, ArrowRight, AlertTriangle,
  CheckCircle2, Pencil, Zap, Bike, Car
} from 'lucide-react'
import { CATEGORIAS, PAYMENT_METHODS, fmt, formatDateFull, limparDescricao, extrairPagamento } from '@/lib/helpers'
import { Skeleton, EmptyState } from '@/components/ui/Cards'
import OFXUploader from '@/components/OFXUploader'
import PluggyConnect from '@/components/PluggyConnect'

const SELECT_CLASS = `w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white text-sm
  focus:border-white/20 outline-none transition-all cursor-pointer appearance-none
  bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.4)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')]
  bg-[length:20px] bg-[center_right_1rem] bg-no-repeat`

function getLocalDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getDateDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ----- Subcomponente: Card de transação pendente -----
function TransacaoCard({ tx, isDuplicate, lugarNome, onLancar, onIgnorar }) {
  const isDebit = tx.type === 'DEBIT'
  const valor = Math.abs(tx.amount)
  const cat = CATEGORIAS.find(c => c.id === tx.suggestedCategory)

  return (
    <div className={`rounded-xl border ${isDuplicate ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-transparent'}`}>
      <div className="py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors group">
        <div className="flex items-center gap-3">
          {/* Borda colorida lateral */}
          <div className={`w-1 h-8 rounded-full shrink-0 ${isDebit ? 'bg-red-500/60' : 'bg-green-500/60'}`} />

          {/* Descrição + categoria */}
          <div className="flex-1 min-w-0">
            <p className="text-white/90 text-sm truncate">{lugarNome || tx.receiverName || limparDescricao(tx.description) || 'Sem descricao'}</p>
            <p className="text-white/35 text-xs truncate">
              {cat?.label || tx.suggestedCategory || '—'}
              {` · ${extrairPagamento(tx.paymentMethod, tx.description, tx.type)}`}
              {tx.date && (() => {
                const d = new Date(tx.date)
                const day = String(d.getDate()).padStart(2, '0')
                const mon = String(d.getMonth() + 1).padStart(2, '0')
                const h = String(d.getHours()).padStart(2, '0')
                const m = String(d.getMinutes()).padStart(2, '0')
                return ` · ${day}/${mon} ${h}:${m}`
              })()}
            </p>
          </div>

          {/* Valor */}
          <span className={`text-sm font-semibold shrink-0 ${isDebit ? 'text-red-400' : 'text-green-400'}`}>
            {isDebit ? '-' : '+'}{fmt(valor)}
          </span>

          {/* Ações - visíveis no desktop inline */}
          <div className="hidden sm:flex gap-1 shrink-0">
            <button
              onClick={() => onLancar(tx)}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs font-medium transition-colors"
            >
              Lancar
            </button>
            <button
              onClick={() => onIgnorar(tx)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center transition-colors"
            >
              <X size={12} className="text-white/40" />
            </button>
          </div>
        </div>

        {/* Ações - linha separada só no mobile */}
        <div className="flex sm:hidden items-center gap-2 mt-2 ml-4 pl-3">
          <button
            onClick={() => onLancar(tx)}
            className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20
                       text-white/70 text-xs font-medium transition-colors text-center"
          >
            Lancar
          </button>
          <button
            onClick={() => onIgnorar(tx)}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center
                       transition-colors shrink-0"
          >
            <X size={13} className="text-white/40" />
          </button>
        </div>
      </div>

      {/* Info de match para duplicatas */}
      {isDuplicate && tx.possivel_duplicata && (
        <p className="text-amber-400/70 text-xs px-3 pb-2">
          ↳ similar a{tx.possivel_duplicata.item ? <> <strong>{tx.possivel_duplicata.item}</strong></> : ''}
          {tx.possivel_duplicata.valor != null ? ` · ${fmt(tx.possivel_duplicata.valor)}` : ''}
          {tx.possivel_duplicata.data ? ` · ${formatDateFull(new Date(tx.possivel_duplicata.data.includes('T') ? tx.possivel_duplicata.data : tx.possivel_duplicata.data + 'T12:00:00'))}` : ''}
        </p>
      )}
    </div>
  )
}

// ----- Subcomponente: Form de lançamento (campos internos — usado dentro do modal) -----
function LancarForm({ tx, user, outro, colors, nomeDefault, lugarMatch, onSuccess, onCancel }) {
  const valor = Math.abs(tx?.amount || 0)
  const tpl = lugarMatch?.template || {}
  const isSemiAuto = lugarMatch?.tipo === 'semi-auto'

  const [nome, setNome] = useState(nomeDefault || '')
  const [itemNome, setItemNome] = useState('')
  const [categoria, setCategoria] = useState(tx?.suggestedCategory || 'Outros')
  const [veiculo, setVeiculo] = useState('Moto')
  const [usoPessoal, setUsoPessoal] = useState(false)
  const [tipoCompra, setTipoCompra] = useState('Pra mim')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const pagamento = extrairPagamento(tx?.paymentMethod, tx?.description, tx?.type)
  const dataLancamento = tx?.date ? tx.date.split('T')[0] : getLocalDate()

  // Campos dinâmicos baseados no template do lugar
  const mostrarItem = tpl.pedir_item !== false // por padrão mostra (campo nome)
  const mostrarVeiculo = !!tpl.pedir_veiculo
  const mostrarUsoPessoal = !!tpl.pedir_uso_pessoal
  const mostrarCompartilhado = !!tpl.pedir_compartilhado

  // É combustível se tem pedir_veiculo no template OU se a categoria é Combustivel
  const isCombustivel = mostrarVeiculo || categoria === 'Combustivel' || lugarMatch?.categoria === 'Combustivel'

  async function handleSalvar() {
    const itemFinal = isCombustivel
      ? veiculo
      : (tpl.pedir_item ? itemNome.trim() : nome.trim())

    if (!itemFinal) {
      setError(tpl.pedir_item ? 'Preencha o que foi comprado' : 'Preencha o nome da despesa')
      return
    }

    setSaving(true)
    setError(null)
    try {
      // Calcula pendência se compartilhado
      let temPendencia = false
      let devedor = null
      let valorPendente = null

      if (tipoCompra === 'Dividido (me deve metade)') {
        temPendencia = true
        devedor = outro
        valorPendente = valor / 2
      } else if (tipoCompra === 'Pra outra (me deve tudo)') {
        temPendencia = true
        devedor = outro
        valorPendente = valor
      }

      const despesaRes = await fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: isCombustivel ? 'Combustivel' : categoria,
          buyer: user,
          item: itemFinal,
          description: tx?.description || '',
          quantity: 1,
          total_value: valor,
          payment_method: pagamento,
          installment: 0,
          createdAt: dataLancamento,
          pagamento_compartilhado: tipoCompra,
          tem_pendencia: temPendencia,
          devedor,
          valor_pendente: valorPendente,
          status_pendencia: temPendencia ? 'em aberto' : null,
          uso_pessoal: usoPessoal,
          lugar_nome: lugarMatch?.nome || null,
        }),
      })

      if (!despesaRes.ok) throw new Error('Erro ao criar despesa')

      await fetch('/api/pluggy/transacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: tx._id, status: 'lancado' }),
      })

      onSuccess()
    } catch (err) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Badge semi-auto */}
      {isSemiAuto && lugarMatch && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-amber-400 text-xs font-medium">Semi-auto</span>
          <span className="text-white/50 text-xs">Lugar reconhecido, confira os dados</span>
        </div>
      )}

      {/* Nome da despesa (campo padrão — quando NÃO tem pedir_item separado) */}
      {mostrarItem && !tpl.pedir_item && (
        <div>
          <label className="text-white/50 text-xs block mb-1.5">Nome da despesa</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-base-800 border border-white/10 text-white text-base
                       focus:border-white/30 outline-none placeholder-white/25 font-medium"
            placeholder="Ex: Almoco, Combustivel, Tenis..."
          />
        </div>
      )}

      {/* Campo "O que comprou?" — para marketplaces tipo Shopee */}
      {tpl.pedir_item && (
        <div>
          <label className="text-white/50 text-xs block mb-1.5">
            O que foi comprado? <span className="text-white/25">(em {lugarMatch?.nome || 'loja'})</span>
          </label>
          <input
            type="text"
            value={itemNome}
            onChange={e => setItemNome(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-base-800 border border-white/10 text-white text-base
                       focus:border-white/30 outline-none placeholder-white/25 font-medium"
            placeholder="Ex: Capa celular, Fone bluetooth..."
          />
        </div>
      )}

      {/* Veículo — para combustível */}
      {isCombustivel && (
        <div>
          <label className="text-white/50 text-xs block mb-1.5">Veiculo</label>
          <div className="flex gap-2">
            {[
              { id: 'Moto', icon: <Bike size={14} /> },
              { id: 'Carro', icon: <Car size={14} /> },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setVeiculo(v.id)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors flex items-center justify-center gap-1.5
                  ${veiculo === v.id
                    ? 'bg-white/15 border-white/20 text-white'
                    : 'bg-transparent border-white/10 text-white/40 hover:text-white/60'
                  }`}
              >
                {v.icon} {v.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Uso pessoal — para combustível */}
      {(isCombustivel || mostrarUsoPessoal) && (
        <button
          onClick={() => setUsoPessoal(!usoPessoal)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
            ${usoPessoal
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-transparent border-white/10 text-white/40 hover:text-white/60'
            }`}
        >
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
            ${usoPessoal ? 'bg-amber-500 border-amber-500' : 'border-white/20'}`}>
            {usoPessoal && <Check size={12} className="text-white" />}
          </div>
          <span className="text-sm font-medium">Uso pessoal (nao entra no relatorio)</span>
        </button>
      )}

      {/* Categoria — só mostra se NÃO for combustível (que já tem categoria fixa) */}
      {!isCombustivel && (
        <div>
          <label className="text-white/50 text-xs block mb-1.5">Categoria</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className={SELECT_CLASS}>
            {CATEGORIAS.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tipo de compra — sempre visível */}
      <div>
        <label className="text-white/50 text-xs block mb-1.5">Tipo de compra</label>
        <select value={tipoCompra} onChange={e => setTipoCompra(e.target.value)} className={SELECT_CLASS}>
          <option value="Pra mim">Pra mim</option>
          <option value="Dividido (me deve metade)">Dividido (me deve metade)</option>
          <option value="Pra outra (me deve tudo)">Pra outra (me deve tudo)</option>
        </select>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSalvar}
          disabled={saving}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                      bg-gradient-to-r ${colors.gradient} text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm
                     hover:bg-white/10 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ----- Helper: agrupa transações por data -----
function groupByDate(transacoes) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const groups = {}
  transacoes.forEach(tx => {
    const d = new Date(tx.date ? tx.date + (tx.date.includes('T') ? '' : 'T12:00:00') : Date.now())
    const key = d.toDateString()

    let label
    if (d.toDateString() === today.toDateString()) label = 'Hoje'
    else if (d.toDateString() === yesterday.toDateString()) label = 'Ontem'
    else {
      label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    }

    if (!groups[key]) groups[key] = { label, items: [], date: d }
    groups[key].items.push(tx)
  })

  return Object.values(groups).sort((a, b) => b.date - a.date)
}

// ----- Subcomponente: Aba Pendentes -----
function TabPendentes({ user, outro, colors, onRefresh }) {
  const [transacoes, setTransacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [lancarTx, setLancarTx] = useState(null)
  const [ignorandoId, setIgnorandoId] = useState(null)
  const [toast, setToast] = useState(null)
  const [secao, setSecao] = useState('novas')
  const [criarLugar, setCriarLugar] = useState(false)
  const [lugarForm, setLugarForm] = useState({ nome: '', categoria: '', tipo: 'manual', template: {} })
  const [salvandoLugar, setSalvandoLugar] = useState(false)
  const [lugarSalvo, setLugarSalvo] = useState(false)
  const [lugares, setLugares] = useState([])
  const [lugarExistente, setLugarExistente] = useState(null)
  const [rematchLoading, setRematchLoading] = useState(false)

  function handleAbrirLancar(tx) {
    const lugarMatch = tx.matchedLugar
      ? lugares.find(l => l._id === tx.matchedLugar)
      : null

    setLancarTx(tx)
    setLugarExistente(lugarMatch || null)
    setLugarForm({
      nome: lugarMatch?.nome || tx.receiverName || limparDescricao(tx.description) || '',
      categoria: lugarMatch?.categoria || tx.suggestedCategory || 'Outros',
      tipo: lugarMatch?.tipo || 'manual',
      template: lugarMatch?.template || {},
    })
    setCriarLugar(false)
    setLugarSalvo(false)
  }

  const loadTransacoes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch(`/api/pluggy/conciliar?user=${user}`).then(r => r.json())
      setTransacoes(Array.isArray(data) ? data : (data.transacoes || []))
      const lugaresData = await fetch(`/api/lugares?user=${user}`).then(r => r.json()).catch(() => [])
      setLugares(Array.isArray(lugaresData) ? lugaresData : [])
    } catch {
      setTransacoes([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadTransacoes() }, [loadTransacoes])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleRematch() {
    setRematchLoading(true)
    try {
      const res = await fetch('/api/pluggy/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user }),
      })
      const data = await res.json()
      if (data.ok) {
        const msg = data.atualizadas > 0
          ? `${data.atualizadas} transac${data.atualizadas === 1 ? 'ao atualizada' : 'oes atualizadas'}`
          : 'Nada a atualizar'
        showToast(msg)
        if (data.atualizadas > 0) loadTransacoes()
      }
    } catch {
      showToast('Erro ao re-processar')
    } finally {
      setRematchLoading(false)
    }
  }

  async function handleIgnorar(tx) {
    setIgnorandoId(tx._id)
    try {
      await fetch('/api/pluggy/transacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: tx._id, status: 'ignorado' }),
      })
      setTransacoes(prev => prev.filter(t => t._id !== tx._id))
    } catch {
      showToast('Erro ao ignorar transacao')
    } finally {
      setIgnorandoId(null)
    }
  }

  function handleFecharModal() {
    setLancarTx(null)
    setCriarLugar(false)
    setLugarSalvo(false)
    setLugarExistente(null)
  }

  function handleLancarSuccess() {
    handleFecharModal()
    loadTransacoes()
    onRefresh && onRefresh()
    showToast('Despesa lancada!')
  }

  const duplicatasAll = transacoes.filter(tx => tx.possivel_duplicata !== null && tx.possivel_duplicata !== undefined)

  // Se estava na aba duplicatas e todas foram resolvidas, volta para novas
  useEffect(() => {
    if (secao === 'duplicatas' && duplicatasAll.length === 0) {
      setSecao('novas')
    }
  }, [duplicatasAll.length, secao])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    )
  }

  if (transacoes.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        message="Nenhuma transacao pendente"
        sub="Conecte seu banco pela aba Conexoes ou importe extratos pela aba Upload"
      />
    )
  }

  const duplicatas = duplicatasAll
  const novas = transacoes.filter(tx => tx.possivel_duplicata === null || tx.possivel_duplicata === undefined)
  const grupos = groupByDate(novas)

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 px-4 py-3 rounded-2xl bg-mint-500 shadow-lg animate-slide-up">
          <p className="text-white font-medium text-sm flex items-center gap-2">
            <Check size={16} />{toast}
          </p>
        </div>
      )}

      {/* Modal de lançamento */}
      {lancarTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleFecharModal}
          />
          {/* Sheet - bottom sheet no mobile, centered modal no desktop */}
          <div className="relative w-full sm:max-w-md bg-base-900 border border-white/10
                          rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 space-y-4 animate-slide-up
                          overflow-y-auto max-h-[92dvh] sm:max-h-[90dvh]">
            {/* Header do modal */}
            <div className="flex items-start justify-between gap-3">
              <p className="text-white font-semibold text-sm">Lancar despesa</p>
              <button
                onClick={handleFecharModal}
                className="text-white/30 hover:text-white/60 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Bloco da transação original */}
            <div className="bg-white/5 rounded-xl px-3 py-2.5">
              <p className="text-white/40 text-xs mb-0.5">Transacao original</p>
              <p className="text-white/80 text-sm truncate">{lancarTx.description || 'Sem descricao'}</p>
              <p className={`text-base font-bold ${lancarTx.type === 'DEBIT' ? 'text-red-400' : 'text-green-400'}`}>
                {lancarTx.type === 'DEBIT' ? '-' : '+'}{fmt(Math.abs(lancarTx.amount))}
              </p>
            </div>

            <LancarForm
              tx={lancarTx}
              user={user}
              outro={outro}
              colors={colors}
              nomeDefault={lugarExistente?.nome || ''}
              lugarMatch={lugarExistente}
              onSuccess={handleLancarSuccess}
              onCancel={handleFecharModal}
            />

            {/* Criar Lugar a partir desta transação */}
            <div className="border-t border-white/10 pt-3">
              {lugarSalvo ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-green-400 text-xs flex items-center gap-1.5">
                    <Check size={12} /> Lugar salvo!
                  </p>
                  <button
                    onClick={handleFecharModal}
                    className="text-white/40 text-xs hover:text-white/70 transition-colors underline underline-offset-2"
                  >
                    Fechar sem lancar
                  </button>
                </div>
              ) : !criarLugar ? (
                <button
                  onClick={() => setCriarLugar(true)}
                  className="text-white/40 text-xs hover:text-white/70 transition-colors flex items-center gap-1.5 py-1"
                >
                  {lugarExistente
                    ? <><Pencil size={11} /> Editar lugar &quot;{lugarExistente.nome}&quot;</>
                    : <><span className="text-base leading-none">+</span> Salvar como Lugar</>
                  }
                </button>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-white/50 text-xs font-medium">
                    {lugarExistente ? `Atualizar "${lugarExistente.nome}"` : 'Novo Lugar'}
                  </p>

                  {/* Nome do lugar */}
                  <input
                    type="text"
                    value={lugarForm.nome}
                    onChange={e => setLugarForm(p => ({ ...p, nome: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-base-800 border border-white/10 text-white text-sm focus:border-white/20 outline-none"
                    placeholder="Nome do lugar"
                  />

                  {/* Categoria */}
                  <select
                    value={lugarForm.categoria}
                    onChange={e => setLugarForm(p => ({ ...p, categoria: e.target.value }))}
                    className={SELECT_CLASS}
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>
                    ))}
                  </select>

                  {/* Tipo: manual / semi-auto / auto */}
                  <div className="flex gap-1.5">
                    {[
                      { id: 'manual', label: 'Manual', icon: <Pencil size={11} /> },
                      { id: 'semi-auto', label: 'Semi', icon: <RefreshCw size={11} /> },
                      { id: 'auto', label: 'Auto', icon: <Zap size={11} /> },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setLugarForm(p => ({ ...p, tipo: t.id }))}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors flex items-center justify-center gap-1
                          ${lugarForm.tipo === t.id
                            ? 'bg-white/15 border-white/20 text-white'
                            : 'bg-transparent border-white/10 text-white/40 hover:text-white/60'
                          }`}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Dica de comportamento */}
                  <p className="text-white/25 text-[10px] px-1">
                    {lugarForm.tipo === 'auto' && 'Lanca sozinho, sem perguntar nada'}
                    {lugarForm.tipo === 'semi-auto' && 'Reconhece e pre-preenche, mas pede confirmacao'}
                    {lugarForm.tipo === 'manual' && 'Vai pra fila sem sugestao'}
                  </p>

                  {/* Template — só aparece pra semi-auto */}
                  {lugarForm.tipo === 'semi-auto' && (
                    <div className="space-y-1.5">
                      <p className="text-white/40 text-xs font-medium">Campos extras ao lancar:</p>
                      {[
                        { key: 'pedir_item', label: 'Pedir nome do item (ex: Shopee)' },
                        { key: 'pedir_veiculo', label: 'Pedir veiculo (Moto/Carro)' },
                        { key: 'pedir_uso_pessoal', label: 'Pedir uso pessoal' },
                        { key: 'pedir_compartilhado', label: 'Pedir tipo de compra' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setLugarForm(p => ({
                            ...p,
                            template: { ...p.template, [opt.key]: !p.template[opt.key] }
                          }))}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors text-left
                            ${lugarForm.template[opt.key]
                              ? 'bg-white/[0.08] border-white/15'
                              : 'bg-transparent border-white/5'
                            }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                            ${lugarForm.template[opt.key] ? 'bg-white/80 border-white/80' : 'border-white/20'}`}>
                            {lugarForm.template[opt.key] && <Check size={10} className="text-base-900" />}
                          </div>
                          <span className={`text-xs ${lugarForm.template[opt.key] ? 'text-white/70' : 'text-white/35'}`}>
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Salvar */}
                  <button
                    onClick={async () => {
                      if (!lugarForm.nome.trim()) return
                      setSalvandoLugar(true)
                      try {
                        const keywords = [
                          lancarTx.receiverName,
                          limparDescricao(lancarTx.description),
                          lancarTx.description,
                        ].filter(Boolean).map(k => k.toLowerCase().trim())

                        const templateToSave = lugarForm.tipo === 'semi-auto'
                          ? lugarForm.template
                          : null

                        if (lugarExistente) {
                          await fetch('/api/lugares', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              _id: lugarExistente._id,
                              nome: lugarForm.nome.trim(),
                              categoria: lugarForm.categoria,
                              tipo: lugarForm.tipo,
                              template: templateToSave,
                              keywords: [...new Set([...keywords, ...(lugarExistente.keywords || [])])],
                            }),
                          })
                        } else {
                          await fetch('/api/lugares', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              nome: lugarForm.nome.trim(),
                              keywords,
                              categoria: lugarForm.categoria,
                              tipo: lugarForm.tipo,
                              template: templateToSave,
                              userId: user,
                              cnpj: lancarTx.receiverCnpj || null,
                            }),
                          })
                        }
                        setLugarSalvo(true)
                        setCriarLugar(false)
                        loadTransacoes()
                      } catch {
                        // silencioso
                      } finally {
                        setSalvandoLugar(false)
                      }
                    }}
                    disabled={salvandoLugar || !lugarForm.nome.trim()}
                    className="w-full py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/70 text-xs
                               font-medium hover:bg-white/15 transition-colors disabled:opacity-50"
                  >
                    {salvandoLugar ? 'Salvando...' : 'Salvar Lugar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header com chips de filtro e botão atualizar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Chip Novas */}
          <button
            onClick={() => setSecao('novas')}
            className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full text-xs font-medium transition-all
              ${secao === 'novas'
                ? 'bg-green-500/25 text-green-300 border border-green-500/40'
                : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
              }`}
          >
            <CheckCircle2 size={12} /> {novas.length} nova{novas.length !== 1 ? 's' : ''}
          </button>

          {/* Chip Duplicatas */}
          {duplicatas.length > 0 && (
            <button
              onClick={() => setSecao('duplicatas')}
              className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full text-xs font-medium transition-all
                ${secao === 'duplicatas'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
                }`}
            >
              <AlertTriangle size={12} /> {duplicatas.length} duplicata{duplicatas.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRematch}
            disabled={rematchLoading}
            className="flex items-center gap-1.5 text-white/40 text-xs hover:text-white/70 transition-colors disabled:opacity-50"
            title="Re-processar nomes dos lugares nas pendentes"
          >
            {rematchLoading
              ? <Loader2 size={12} className="animate-spin" />
              : <ArrowRight size={12} />
            }
            {rematchLoading ? 'Processando...' : 'Re-match'}
          </button>
          <button
            onClick={loadTransacoes}
            className="flex items-center gap-1.5 text-white/40 text-xs hover:text-white/70 transition-colors"
          >
            <RefreshCw size={12} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Seção Duplicatas */}
      {secao === 'duplicatas' && duplicatas.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-amber-400/70 text-xs font-medium px-1 pb-1 flex items-center gap-1.5">
            <AlertTriangle size={11} className="shrink-0" />
            Possiveis duplicatas — confira antes de lancar
          </p>
          <div className="rounded-xl border border-amber-500/25 overflow-hidden bg-amber-500/[0.04] px-2 py-1 space-y-0.5">
            {duplicatas.map(tx => (
              <div
                key={tx._id}
                className={ignorandoId === tx._id ? 'opacity-50 pointer-events-none' : ''}
              >
                <TransacaoCard
                  tx={tx}
                  isDuplicate
                  lugarNome={tx.matchedLugar ? lugares.find(l => l._id === tx.matchedLugar)?.nome : null}
                  onLancar={() => handleAbrirLancar(tx)}
                  onIgnorar={() => handleIgnorar(tx)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção Novas — transações agrupadas por data */}
      {secao === 'novas' && grupos.length > 0 && (
        <div className="space-y-4">
          {grupos.map(grupo => (
            <div key={grupo.label} className="space-y-0.5">
              {/* Label do grupo */}
              <p className="text-white/30 text-xs font-medium px-1 pb-1">{grupo.label}</p>

              {/* Cards do grupo */}
              <div className="bg-white/[0.02] rounded-xl overflow-hidden">
                {grupo.items.map((tx, idx) => (
                  <div
                    key={tx._id}
                    className={[
                      ignorandoId === tx._id ? 'opacity-50 pointer-events-none' : '',
                      idx < grupo.items.length - 1 ? 'border-b border-white/5' : '',
                    ].join(' ')}
                  >
                    <TransacaoCard
                      tx={tx}
                      isDuplicate={false}
                      lugarNome={tx.matchedLugar ? lugares.find(l => l._id === tx.matchedLugar)?.nome : null}
                      onLancar={() => handleAbrirLancar(tx)}
                      onIgnorar={() => handleIgnorar(tx)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado vazio para a seção ativa */}
      {secao === 'novas' && grupos.length === 0 && novas.length === 0 && (
        <p className="text-white/30 text-xs text-center py-4">Nenhuma transacao nova.</p>
      )}
    </div>
  )
}

// ----- Subcomponente: Card de conexão (item Pluggy) -----
function ItemCard({ item, user, colors, onRemove }) {
  const [contas, setContas] = useState([])
  const [loadingContas, setLoadingContas] = useState(false)
  const [contaExpanded, setContaExpanded] = useState(false)
  const [selectedConta, setSelectedConta] = useState('')
  const [from, setFrom] = useState(getDateDaysAgo(30))
  const [to, setTo] = useState(getLocalDate())
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [removendo, setRemovendo] = useState(false)

  async function toggleContas() {
    if (contaExpanded) { setContaExpanded(false); return }

    setContaExpanded(true)
    if (contas.length > 0) return

    setLoadingContas(true)
    try {
      const data = await fetch(`/api/pluggy/contas?itemId=${item.itemId}`).then(r => r.json())
      const lista = Array.isArray(data) ? data : []
      setContas(lista)
      if (lista.length > 0) setSelectedConta(lista[0].id)
    } catch {
      setContas([])
    } finally {
      setLoadingContas(false)
    }
  }

  async function handleImportar() {
    if (!selectedConta) return
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/pluggy/transacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user, accountId: selectedConta, from, to }),
      })
      const data = await res.json()
      setImportResult(data)
    } catch {
      setImportResult({ error: 'Erro ao importar' })
    } finally {
      setImporting(false)
    }
  }

  async function handleRemove() {
    setRemovendo(true)
    try {
      await fetch(`/api/pluggy/items?itemId=${item.itemId}`, { method: 'DELETE' })
      onRemove(item.itemId)
    } catch {
      setRemovendo(false)
    }
  }

  const lastSync = item.lastSync ? formatDateFull(new Date(item.lastSync)) : 'nunca'

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-white/60" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{item.connectorName || 'Banco'}</p>
            <p className="text-white/30 text-xs">Sync: {lastSync}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleContas}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center
                       hover:bg-white/10 transition-colors"
          >
            {contaExpanded
              ? <ChevronUp size={14} className="text-white/40" />
              : <ChevronDown size={14} className="text-white/40" />
            }
          </button>
          <button
            onClick={handleRemove}
            disabled={removendo}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center
                       hover:bg-red-500/20 transition-colors disabled:opacity-50"
            title="Remover conexao"
          >
            {removendo ? <Loader2 size={13} className="text-white/40 animate-spin" /> : <Trash2 size={13} className="text-white/40" />}
          </button>
        </div>
      </div>

      {contaExpanded && (
        <div className="border-t border-white/5 p-4 space-y-3">
          {loadingContas ? (
            <Skeleton className="h-12" />
          ) : contas.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-2">Nenhuma conta encontrada</p>
          ) : (
            <>
              <div>
                <label className="text-white/50 text-xs block mb-1.5">Conta</label>
                <select value={selectedConta} onChange={e => setSelectedConta(e.target.value)} className={SELECT_CLASS}>
                  {contas.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.number ? `(${c.number})` : ''} — {fmt(c.balance || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/50 text-xs block mb-1.5 flex items-center gap-1">
                    <Calendar size={11} /> De
                  </label>
                  <input
                    type="date"
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-base-800 border border-white/10 text-white text-sm
                               focus:border-white/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1.5 flex items-center gap-1">
                    <Calendar size={11} /> Ate
                  </label>
                  <input
                    type="date"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-base-800 border border-white/10 text-white text-sm
                               focus:border-white/20 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleImportar}
                disabled={importing}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                            bg-gradient-to-r ${colors.gradient} text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {importing ? 'Importando...' : 'Importar transacoes'}
              </button>

              {importResult && !importResult.error && (
                <p className="text-green-400 text-xs text-center">
                  {importResult.imported} importadas · {importResult.skipped} ja existiam
                </p>
              )}
              {importResult?.error && (
                <p className="text-red-400 text-xs text-center">{importResult.error}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ----- Subcomponente: Aba Conexões -----
function TabConexoes({ user, colors }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch(`/api/pluggy/items?user=${user}`).then(r => r.json())
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadItems() }, [loadItems])

  function handleRemove(itemId) {
    setItems(prev => prev.filter(i => i.itemId !== itemId))
  }

  function handleConnectSuccess() {
    loadItems()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PluggyConnect user={user} onSuccess={handleConnectSuccess} />

      {items.length === 0 ? (
        <EmptyState
          icon={Building2}
          message="Nenhum banco conectado"
          sub="Conecte seu banco para importar transacoes automaticamente"
        />
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <ItemCard
              key={item.itemId}
              item={item}
              user={user}
              colors={colors}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ----- Subcomponente: Aba Upload -----
function TabUpload({ user, onImported }) {
  return (
    <div>
      <OFXUploader user={user} onImported={onImported} />
    </div>
  )
}


// ----- Componente principal -----
export default function ImportPage({ user, outro, colors, triggerRefresh }) {
  const [activeTab, setActiveTab] = useState('pendentes')
  const [pendentesCount, setPendentesCount] = useState(null)

  useEffect(() => {
    fetch(`/api/pluggy/transacoes?user=${user}&status=pendente`)
      .then(r => r.json())
      .then(data => setPendentesCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setPendentesCount(0))
  }, [user])

  function handleUploadSuccess() {
    fetch(`/api/pluggy/transacoes?user=${user}&status=pendente`)
      .then(r => r.json())
      .then(data => setPendentesCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
    setActiveTab('pendentes')
  }

  function handlePendentesRefresh() {
    triggerRefresh && triggerRefresh()
    fetch(`/api/pluggy/transacoes?user=${user}&status=pendente`)
      .then(r => r.json())
      .then(data => setPendentesCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }

  const tabs = [
    {
      id: 'pendentes',
      label: 'Pendentes',
      badge: pendentesCount > 0 ? pendentesCount : null,
    },
    { id: 'conexoes', label: 'Conexoes' },
    { id: 'upload', label: 'Upload' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} bg-opacity-20
                         flex items-center justify-center shrink-0`}>
          <Download size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            Importar Transacoes
            {pendentesCount > 0 && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                bg-gradient-to-r ${colors.gradient} text-white`}>
                {pendentesCount}
              </span>
            )}
          </h1>
          <p className="text-white/40 text-sm">Conecte seus bancos gratuitamente via Open Finance</p>
        </div>
      </div>

      {/* Tabs - scroll horizontal no mobile */}
      <div className="flex gap-1 bg-white/5 rounded-2xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium
                        transition-all duration-200
                        ${activeTab === tab.id
                          ? `bg-gradient-to-r ${colors.gradient} text-white shadow-sm`
                          : 'text-white/50 hover:text-white/70'
                        }`}
          >
            {tab.label}
            {tab.badge && (
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold
                                ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div className="min-h-[300px]">
        {activeTab === 'pendentes' && (
          <TabPendentes user={user} outro={outro} colors={colors} onRefresh={handlePendentesRefresh} />
        )}
        {activeTab === 'conexoes' && (
          <TabConexoes user={user} colors={colors} />
        )}
        {activeTab === 'upload' && (
          <TabUpload user={user} onImported={handleUploadSuccess} />
        )}
      </div>
    </div>
  )
}
