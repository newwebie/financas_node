'use client'

import { useState, useEffect } from 'react'
import { ListItem, SectionTitle, EmptyState, Skeleton } from '@/components/ui/Cards'
import { fmt, formatDateFull, getCategoryDisplay } from '@/lib/helpers'
import { Check, ChevronDown, X, Users, UserPlus, Wallet, Receipt, History, Calendar } from 'lucide-react'

export default function AcertoPage({ user, outro, colors, refreshKey, triggerRefresh }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    despesas: [],
    emprestimos: [],
    quitacoes: [],
    acertos: [],
  })
  const [emprestimosTerceiros, setEmprestimosTerceiros] = useState([])
  const [dividasTerceiros, setDividasTerceiros] = useState([])
  const [contasFixas, setContasFixas] = useState([])
  const [saldo, setSaldo] = useState({ userDeve: 0, outroDeve: 0, liquido: 0 })
  const [expandItens, setExpandItens] = useState(false)
  const [expandHistorico, setExpandHistorico] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [quitandoItem, setQuitandoItem] = useState(null) // { id, tipo, valor, nome }
  const [dataQuitacao, setDataQuitacao] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [user, refreshKey])

  async function loadData() {
    setLoading(true)
    try {
      const [acerto, empT, divT, cf] = await Promise.all([
        fetch('/api/acerto').then(r => r.json()),
        fetch(`/api/emprestimos-terceiros?user=${user}`).then(r => r.json()),
        fetch(`/api/dividas-terceiros?user=${user}`).then(r => r.json()),
        fetch('/api/contas-fixas').then(r => r.json()),
      ])

      setData(acerto)
      setEmprestimosTerceiros(empT.filter(e => e.status === 'em aberto'))
      setDividasTerceiros(divT.filter(d => d.status === 'em aberto'))
      setContasFixas(cf.filter(c => c.buyer === user && c.payment_method !== 'Credito'))

      calcularSaldo(acerto.despesas, acerto.emprestimos, acerto.quitacoes)
    } catch (error) {
      console.error('Erro ao carregar acerto:', error)
    } finally {
      setLoading(false)
    }
  }

  function calcularSaldo(despesas, emprestimos, quitacoes) {
    let userDeve = 0
    let outroDeve = 0

    // Despesas compartilhadas em aberto
    despesas.forEach(d => {
      if (d.devedor === user) {
        userDeve += d.valor_pendente || 0
      } else if (d.devedor === outro) {
        outroDeve += d.valor_pendente || 0
      }
    })

    // Empréstimos entre as duas em aberto
    emprestimos.forEach(e => {
      if (e.de === user) {
        outroDeve += e.valor // Eu emprestei
      } else if (e.de === outro) {
        userDeve += e.valor // Eu peguei emprestado
      }
    })

    // Quitações pendentes
    quitacoes.forEach(q => {
      if (q.devedor === user) {
        userDeve += q.valor
      } else if (q.devedor === outro) {
        outroDeve += q.valor
      }
    })

    const liquido = outroDeve - userDeve
    setSaldo({ userDeve, outroDeve, liquido })
  }

  function showFeedback(message, isError = false) {
    setFeedback({ message, isError })
    setTimeout(() => setFeedback(null), 3000)
  }

  function abrirModalQuitacao(id, tipo, valor, nome) {
    setQuitandoItem({ id, tipo, valor, nome })
    setDataQuitacao(new Date().toISOString().split('T')[0])
  }

  function fecharModalQuitacao() {
    setQuitandoItem(null)
  }

  async function confirmarQuitacao() {
    if (!quitandoItem) return

    try {
      const { id, tipo } = quitandoItem

      if (tipo === 'emprestimo') {
        const res = await fetch('/api/emprestimos-terceiros', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _id: id,
            status: 'quitado',
            data_quitacao: dataQuitacao
          }),
        })

        if (res.ok) {
          showFeedback('Empréstimo quitado!')
          fecharModalQuitacao()
          loadData()
        } else {
          showFeedback('Erro ao quitar', true)
        }
      } else if (tipo === 'divida') {
        const res = await fetch('/api/dividas-terceiros', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _id: id,
            status: 'quitado',
            data_quitacao: dataQuitacao
          }),
        })

        if (res.ok) {
          showFeedback('Dívida quitada!')
          fecharModalQuitacao()
          loadData()
        } else {
          showFeedback('Erro ao quitar', true)
        }
      }
    } catch (error) {
      showFeedback('Erro ao quitar', true)
    }
  }

  async function handleAcertar() {
    if (saldo.liquido === 0) {
      return showFeedback('Não há nada para acertar!', true)
    }

    const confirma = confirm(
      saldo.liquido > 0
        ? `${outro} vai te pagar ${fmt(Math.abs(saldo.liquido))}. Confirmar acerto?`
        : `Você vai pagar ${fmt(Math.abs(saldo.liquido))} para ${outro}. Confirmar acerto?`
    )

    if (!confirma) return

    setLoading(true)
    try {
      const de = saldo.liquido > 0 ? outro : user
      const para = saldo.liquido > 0 ? user : outro
      const itensQuitados = [
        ...data.despesas.map(d => ({ tipo: 'despesa', id: d._id, descricao: d.label })),
        ...data.emprestimos.map(e => ({ tipo: 'emprestimo', id: e._id, descricao: 'Empréstimo' })),
        ...data.quitacoes.map(q => ({ tipo: 'quitacao', id: q._id, descricao: q.descricao })),
      ]

      const res = await fetch('/api/acerto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          de,
          para,
          valor: Math.abs(saldo.liquido),
          itens_quitados: itensQuitados,
          data_pagamento: new Date().toISOString(),
        }),
      })

      if (res.ok) {
        showFeedback('Acerto realizado!')
        triggerRefresh()
        loadData()
      } else {
        showFeedback('Erro ao acertar', true)
      }
    } catch (error) {
      showFeedback('Erro ao acertar', true)
    } finally {
      setLoading(false)
    }
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

  const temPendenciasEntreVoces = data.despesas.length > 0 || data.emprestimos.length > 0 || data.quitacoes.length > 0
  const temPendenciasTerceiros = emprestimosTerceiros.length > 0 || dividasTerceiros.length > 0

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold text-white">Acerto de Contas</h1>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg animate-slide-up
                        ${feedback.isError ? 'bg-coral-500' : 'bg-mint-500'}`}>
          <p className="text-white font-medium text-sm flex items-center gap-2">
            {!feedback.isError && <Check size={16} />}
            {feedback.message}
          </p>
        </div>
      )}

      {/* Modal de Quitação */}
      {quitandoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-base-800 border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 animate-slide-up shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-semibold text-lg">Confirmar Quitação</h3>
                <p className="text-white/60 text-sm mt-1">{quitandoItem.nome}</p>
              </div>
              <button
                onClick={fecharModalQuitacao}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-white/60" />
              </button>
            </div>

            <div className="bg-base-700/50 rounded-2xl p-4 border border-white/5">
              <p className="text-white/40 text-xs mb-1">Valor</p>
              <p className="text-mint-400 text-2xl font-bold">{fmt(quitandoItem.valor)}</p>
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2 flex items-center gap-2">
                <Calendar size={14} />
                Data da Quitação
              </label>
              <input
                type="date"
                value={dataQuitacao}
                onChange={(e) => setDataQuitacao(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-700 border border-white/10 text-white focus:border-mint-500/50 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={fecharModalQuitacao}
                className="flex-1 py-3 rounded-2xl font-medium bg-white/5 text-white/80 hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarQuitacao}
                className="flex-1 py-3 rounded-2xl font-medium bg-mint-500 text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-mint-500/20"
              >
                Confirmar Quitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== SEÇÃO 1: ENTRE VOCÊS DOIS ========== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Users size={18} />
          <span className="font-medium">Entre vocês dois</span>
        </div>

        {/* Card de Saldo Principal */}
        <div
          className={`relative overflow-hidden rounded-3xl p-6 border animate-slide-up ${
            saldo.liquido === 0
              ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10'
              : saldo.liquido > 0
              ? 'bg-gradient-to-br from-mint-400/20 to-mint-600/10 border-mint-400/30'
              : 'bg-gradient-to-br from-coral-400/20 to-coral-600/10 border-coral-400/30'
          }`}
        >
          <div className="text-center">
            <p className="text-white/60 text-sm mb-2">Saldo Líquido</p>
            <h2 className={`text-4xl font-bold mb-4 ${
              saldo.liquido === 0
                ? 'text-white'
                : saldo.liquido > 0
                ? 'text-mint-400'
                : 'text-coral-400'
            }`}>
              {fmt(Math.abs(saldo.liquido))}
            </h2>
            <p className="text-white/80 text-sm mb-6">
              {saldo.liquido === 0
                ? '✨ Tudo em dia!'
                : saldo.liquido > 0
                ? `${outro} te deve`
                : `Você deve para ${outro}`}
            </p>

            {saldo.liquido !== 0 && (
              <button
                onClick={handleAcertar}
                disabled={loading}
                className={`px-8 py-3 rounded-2xl font-medium transition-all disabled:opacity-50
                           ${saldo.liquido > 0 ? 'bg-mint-500' : 'bg-coral-500'}
                           text-white hover:scale-105 active:scale-95 shadow-lg`}
              >
                Acertar Agora
              </button>
            )}
          </div>
        </div>

        {/* Cards Resumo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-base-700/50 border border-coral-400/20 rounded-2xl p-4">
            <p className="text-white/40 text-xs mb-1">Você deve</p>
            <p className="text-coral-400 text-xl font-semibold">{fmt(saldo.userDeve)}</p>
          </div>
          <div className="bg-base-700/50 border border-mint-400/20 rounded-2xl p-4">
            <p className="text-white/40 text-xs mb-1">{outro} deve</p>
            <p className="text-mint-400 text-xl font-semibold">{fmt(saldo.outroDeve)}</p>
          </div>
        </div>

        {/* Lista de Itens Pendentes */}
        {temPendenciasEntreVoces && (
          <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
            <button
              onClick={() => setExpandItens(!expandItens)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-white/40" />
                <span className="text-white font-medium text-sm">
                  Itens Pendentes ({data.despesas.length + data.emprestimos.length + data.quitacoes.length})
                </span>
              </div>
              <ChevronDown size={18} className={`text-white/40 transition-transform ${expandItens ? 'rotate-180' : ''}`} />
            </button>
            {expandItens && (
              <div className="px-5 pb-4 space-y-2 border-t border-white/5 pt-4">
                {data.despesas.map((d) => (
                  <ListItem
                    key={d._id}
                    borderColor={d.devedor === user ? '#fca5a5' : '#6ee7b7'}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {getCategoryDisplay(d.label)} - {d.item}
                        </p>
                        <p className="text-white/40 text-xs truncate">{d.description || 'Sem descrição'}</p>
                        <p className="text-white/60 text-xs mt-1">
                          {d.devedor === user ? 'Você deve' : `${outro} deve`}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold ${d.devedor === user ? 'text-coral-400' : 'text-mint-400'}`}>
                        {fmt(d.valor_pendente)}
                      </p>
                    </div>
                  </ListItem>
                ))}
                {data.emprestimos.map((e) => (
                  <ListItem
                    key={e._id}
                    borderColor={e.de === user ? '#6ee7b7' : '#fca5a5'}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">🤝 Empréstimo</p>
                        <p className="text-white/40 text-xs">{e.descricao || 'Sem descrição'}</p>
                        <p className="text-white/60 text-xs mt-1">
                          {e.de === user ? `${outro} deve` : 'Você deve'}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold ${e.de === user ? 'text-mint-400' : 'text-coral-400'}`}>
                        {fmt(e.valor)}
                      </p>
                    </div>
                  </ListItem>
                ))}
                {data.quitacoes.map((q) => (
                  <ListItem
                    key={q._id}
                    borderColor={q.devedor === user ? '#fca5a5' : '#6ee7b7'}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{q.descricao}</p>
                        <p className="text-white/40 text-xs truncate">{q.observacao || 'Sem observação'}</p>
                        <p className="text-white/60 text-xs mt-1">
                          {q.devedor === user ? 'Você deve' : `${outro} deve`}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold ${q.devedor === user ? 'text-coral-400' : 'text-mint-400'}`}>
                        {fmt(q.valor)}
                      </p>
                    </div>
                  </ListItem>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== SEÇÃO 2: COM TERCEIROS ========== */}
      {temPendenciasTerceiros && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/40 text-sm pt-4">
            <UserPlus size={18} />
            <span className="font-medium">Com terceiros</span>
          </div>

          {/* Empréstimos a Terceiros */}
          {emprestimosTerceiros.length > 0 && (
            <div className="bg-gradient-to-br from-lavender-500/10 to-lavender-600/5 backdrop-blur-sm border border-lavender-400/20 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-lavender-500/20 border border-lavender-400/30 flex items-center justify-center">
                  <Wallet size={18} className="text-lavender-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Emprestei para</h3>
                  <p className="text-white/40 text-xs">{emprestimosTerceiros.length} pessoa(s)</p>
                </div>
              </div>
              <div className="space-y-2">
                {emprestimosTerceiros.map((e) => (
                  <div key={e._id} className="bg-base-800/40 border border-lavender-400/10 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">Para: {e.devedor}</p>
                        <p className="text-white/40 text-xs truncate mt-1">{e.descricao}</p>
                        <p className="text-white/60 text-xs mt-1">
                          Devolução: {formatDateFull(e.data_devolucao)}
                        </p>
                      </div>
                      <p className="text-lavender-400 text-lg font-bold">{fmt(e.valor)}</p>
                    </div>
                    <button
                      onClick={() => abrirModalQuitacao(e._id, 'emprestimo', e.valor, `Empréstimo para ${e.devedor}`)}
                      className="w-full py-2.5 rounded-xl bg-mint-500/20 border border-mint-400/30 text-mint-400 text-sm font-medium hover:bg-mint-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      Marcar como Pago
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dívidas a Terceiros */}
          {dividasTerceiros.length > 0 && (
            <div className="bg-gradient-to-br from-peach-500/10 to-peach-600/5 backdrop-blur-sm border border-peach-400/20 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-peach-500/20 border border-peach-400/30 flex items-center justify-center">
                  <Receipt size={18} className="text-peach-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Devo para</h3>
                  <p className="text-white/40 text-xs">{dividasTerceiros.length} pessoa(s)</p>
                </div>
              </div>
              <div className="space-y-2">
                {dividasTerceiros.map((d) => (
                  <div key={d._id} className="bg-base-800/40 border border-peach-400/10 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">Para: {d.credor}</p>
                        <p className="text-white/40 text-xs truncate mt-1">{d.descricao}</p>
                        <p className="text-white/60 text-xs mt-1">
                          Pagamento: {formatDateFull(d.data_pagamento)}
                          {d.emprestimo_conta && ' • Empréstimo da conta'}
                        </p>
                      </div>
                      <p className="text-peach-400 text-lg font-bold">{fmt(d.valor)}</p>
                    </div>
                    <button
                      onClick={() => abrirModalQuitacao(d._id, 'divida', d.valor, `Dívida para ${d.credor}`)}
                      className="w-full py-2.5 rounded-xl bg-mint-500/20 border border-mint-400/30 text-mint-400 text-sm font-medium hover:bg-mint-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      Marcar como Pago
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== SEÇÃO 3: INFORMAÇÕES ========== */}
      {contasFixas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/40 text-sm pt-4">
            <Receipt size={18} />
            <span className="font-medium">Para não esquecer</span>
          </div>

          <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Contas Fixas do Mês</h3>
            <div className="space-y-2">
              {contasFixas.map((c) => (
                <div key={c._id} className="bg-base-800/40 border border-pi-400/10 rounded-2xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{c.nome}</p>
                      <p className="text-white/40 text-xs mt-1">
                        Vencimento: dia {c.dia_vencimento}
                        {c.debito_automatico && ' • Débito automático'}
                      </p>
                      {c.observacao && <p className="text-white/60 text-xs mt-1 truncate">{c.observacao}</p>}
                    </div>
                    <p className="text-pi-400 text-sm font-semibold">{fmt(c.valor)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== SEÇÃO 4: HISTÓRICO ========== */}
      {data.acertos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/40 text-sm pt-4">
            <History size={18} />
            <span className="font-medium">Histórico</span>
          </div>

          <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
            <button
              onClick={() => setExpandHistorico(!expandHistorico)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <span className="text-white font-medium text-sm">Acertos Anteriores</span>
              <ChevronDown size={18} className={`text-white/40 transition-transform ${expandHistorico ? 'rotate-180' : ''}`} />
            </button>
            {expandHistorico && (
              <div className="px-5 pb-4 space-y-2 border-t border-white/5 pt-4">
                {data.acertos.map((a) => (
                  <div key={a._id} className="bg-base-800/40 border border-mint-400/10 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">
                          {a.de} pagou {a.para}
                        </p>
                        <p className="text-white/40 text-xs mt-1">{formatDateFull(a.data)}</p>
                        <p className="text-white/60 text-xs mt-1">
                          {a.itens_quitados?.length || 0} itens quitados
                        </p>
                      </div>
                      <p className="text-mint-400 text-sm font-semibold">{fmt(a.valor)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {saldo.liquido === 0 &&
        !temPendenciasTerceiros &&
        data.acertos.length === 0 &&
        contasFixas.length === 0 && (
          <EmptyState
            icon="✨"
            message="Tudo em ordem!"
            sub="Nenhuma pendência ou acerto no momento"
          />
        )}
    </div>
  )
}
