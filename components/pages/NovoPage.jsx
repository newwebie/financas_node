'use client'

import { useState } from 'react'
import { SectionTitle } from '@/components/ui/Cards'
import { CATEGORIAS, PAYMENT_METHODS } from '@/lib/helpers'
import { Plus, Handshake, CreditCard, Receipt, Bike, Car, Check, ArrowLeft } from 'lucide-react'

const TIPOS = [
  { id: 'moto', label: 'Moto', icon: Bike, emoji: '🏍️' },
  { id: 'carro', label: 'Carro', icon: Car, emoji: '🚗' },
  { id: 'gasto', label: 'Gasto', icon: Plus, emoji: '💰' },
  { id: 'emprestei', label: 'Empréstimos', icon: Handshake, emoji: '🤝' },
  { id: 'devo', label: 'Dívidas', icon: CreditCard, emoji: '💳' },
  { id: 'conta-fixa', label: 'Conta Fixa', icon: Receipt, emoji: '📄' },
]

function getLocalDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function NovoPage({ user, outro, colors, refreshKey, triggerRefresh }) {
  const [tipo, setTipo] = useState(null) // Começa null para mostrar seleção
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [expandMoto, setExpandMoto] = useState(false)
  const [expandCarro, setExpandCarro] = useState(false)

  // Form Abastecimento Moto
  const [valorMoto, setValorMoto] = useState('30.00')
  const [pagamentoMoto, setPagamentoMoto] = useState('Debito')
  const [dataMoto, setDataMoto] = useState(getLocalDate())

  // Form Abastecimento Carro
  const [valorCarro, setValorCarro] = useState('60.00')
  const [pagamentoCarro, setPagamentoCarro] = useState('Debito')
  const [dataCarro, setDataCarro] = useState(getLocalDate())

  // Form Gasto
  const [categoria, setCategoria] = useState('Comida')
  const [item, setItem] = useState('')
  const [descricao, setDescricao] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [preco, setPreco] = useState('')
  const [pagamento, setPagamento] = useState('Debito')
  const [tipoCompra, setTipoCompra] = useState('Pra mim')
  const [parcelas, setParcelas] = useState(0)
  const [dataGasto, setDataGasto] = useState(getLocalDate())

  // Form Emprestei
  const [pessoaEmprestei, setPessoaEmprestei] = useState('')
  const [valorEmprestei, setValorEmprestei] = useState('')
  const [descricaoEmprestei, setDescricaoEmprestei] = useState('')
  const [dataDevolucao, setDataDevolucao] = useState(getDefaultDate(30))

  // Form Devo
  const [pessoaDevo, setPessoaDevo] = useState('')
  const [valorDevo, setValorDevo] = useState('')
  const [descricaoDevo, setDescricaoDevo] = useState('')
  const [dataPagamento, setDataPagamento] = useState(getDefaultDate(30))
  const [emprestimoMinhaConta, setEmprestimoMinhaConta] = useState(false)

  // Form Conta Fixa
  const [nomeContaFixa, setNomeContaFixa] = useState('')
  const [valorContaFixa, setValorContaFixa] = useState('')
  const [diaVencimento, setDiaVencimento] = useState(7)
  const [responsavelContaFixa, setResponsavelContaFixa] = useState(user)
  const [categoriaContaFixa, setCategoriaContaFixa] = useState('Contas')
  const [cartaoCredito, setCartaoCredito] = useState(false)
  const [debitoAutomatico, setDebitoAutomatico] = useState(false)
  const [observacaoContaFixa, setObservacaoContaFixa] = useState('')

  function getDefaultDate(daysOffset = 0) {
    const date = new Date()
    date.setDate(date.getDate() + daysOffset)
    return date.toISOString().split('T')[0]
  }

  function showFeedback(message, isError = false) {
    setFeedback({ message, isError })
    setTimeout(() => setFeedback(null), 3000)
  }

  function resetForm() {
    setItem('')
    setDescricao('')
    setQuantidade(1)
    setPreco('')
    setParcelas(0)
    setDataGasto(getLocalDate())
    setPessoaEmprestei('')
    setValorEmprestei('')
    setDescricaoEmprestei('')
    setPessoaDevo('')
    setValorDevo('')
    setDescricaoDevo('')
    setNomeContaFixa('')
    setValorContaFixa('')
    setObservacaoContaFixa('')
  }

  async function handleSalvarGasto() {
    if (!preco) return showFeedback('Preencha o preço', true)

    setLoading(true)
    try {
      const totalValue = parseFloat(preco) * quantidade
      let temPendencia = false
      let devedor = null
      let valorPendente = null

      if (tipoCompra === 'Dividido (me deve metade)') {
        temPendencia = true
        devedor = outro
        valorPendente = totalValue / 2
      } else if (tipoCompra === 'Pra outra (me deve tudo)') {
        temPendencia = true
        devedor = outro
        valorPendente = totalValue
      }

      const body = {
        label: categoria,
        buyer: user,
        item,
        description: descricao,
        quantity: quantidade,
        total_value: totalValue,
        payment_method: pagamento,
        installment: parcelas,
        createdAt: dataGasto,
        pagamento_compartilhado: tipoCompra,
        tem_pendencia: temPendencia,
        devedor,
        valor_pendente: valorPendente,
        status_pendencia: temPendencia ? 'em aberto' : null,
      }

      const res = await fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        showFeedback('Gasto registrado!')
        resetForm()
        triggerRefresh()
      } else {
        showFeedback('Erro ao salvar', true)
      }
    } catch (error) {
      showFeedback('Erro ao salvar', true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSalvarEmprestei() {
    if (!pessoaEmprestei || !valorEmprestei) return showFeedback('Preencha todos os campos', true)

    setLoading(true)
    try {
      const res = await fetch('/api/emprestimos-terceiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credor: user,
          devedor: pessoaEmprestei,
          valor: parseFloat(valorEmprestei),
          descricao: descricaoEmprestei,
          data_devolucao: dataDevolucao,
        }),
      })

      if (res.ok) {
        showFeedback('Empréstimo registrado!')
        resetForm()
        triggerRefresh()
      } else {
        showFeedback('Erro ao salvar', true)
      }
    } catch (error) {
      showFeedback('Erro ao salvar', true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSalvarDevo() {
    if (!pessoaDevo || !valorDevo) return showFeedback('Preencha todos os campos', true)

    setLoading(true)
    try {
      const res = await fetch('/api/dividas-terceiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devedor: user,
          credor: pessoaDevo,
          valor: parseFloat(valorDevo),
          descricao: descricaoDevo,
          data_pagamento: dataPagamento,
          emprestimo_conta: emprestimoMinhaConta,
        }),
      })

      if (res.ok) {
        showFeedback('Dívida registrada!')
        resetForm()
        triggerRefresh()
      } else {
        showFeedback('Erro ao salvar', true)
      }
    } catch (error) {
      showFeedback('Erro ao salvar', true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSalvarContaFixa() {
    if (!nomeContaFixa || !valorContaFixa) return showFeedback('Preencha nome e valor', true)

    setLoading(true)
    try {
      const res = await fetch('/api/contas-fixas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeContaFixa,
          valor: parseFloat(valorContaFixa),
          dia_vencimento: diaVencimento,
          buyer: responsavelContaFixa,
          categoria: categoriaContaFixa,
          cartao_credito: cartaoCredito,
          debito_automatico: debitoAutomatico,
          observacao: observacaoContaFixa,
          payment_method: cartaoCredito ? 'Credito' : 'Debito',
        }),
      })

      if (res.ok) {
        showFeedback('Conta fixa criada!')
        resetForm()
        triggerRefresh()
      } else {
        showFeedback('Erro ao salvar', true)
      }
    } catch (error) {
      showFeedback('Erro ao salvar', true)
    } finally {
      setLoading(false)
    }
  }

  async function handleAbastecimentoMoto() {
    if (!valorMoto) return showFeedback('Preencha o valor', true)

    setLoading(true)
    try {
      const res = await fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Combustivel',
          buyer: user,
          item: 'Moto',
          description: '',
          quantity: 1,
          total_value: parseFloat(valorMoto),
          payment_method: pagamentoMoto,
          installment: 0,
          createdAt: dataMoto,
          pagamento_compartilhado: 'Pra mim',
          tem_pendencia: false,
        }),
      })

      if (res.ok) {
        let emailEnviado = false
        try {
          const emailRes = await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo: 'abastecimento',
              quemAbasteceu: user,
              veiculo: 'Moto',
              valor: parseFloat(valorMoto),
            }),
          })
          const emailData = await emailRes.json()
          emailEnviado = emailData.success
        } catch (emailError) {
          console.log('Email nao enviado:', emailError)
        }
        // Verifica lembretes de emprestimo (fire-and-forget)
        fetch('/api/verificar-lembretes').catch(() => {})

        showFeedback(emailEnviado ? 'Registrado! Email enviado' : 'Abastecimento Moto registrado!')
        setValorMoto('30.00')
        setExpandMoto(false)
        triggerRefresh()
      } else {
        showFeedback('Erro ao salvar', true)
      }
    } catch (error) {
      showFeedback('Erro ao salvar', true)
    } finally {
      setLoading(false)
    }
  }

  async function handleAbastecimentoCarro() {
    if (!valorCarro) return showFeedback('Preencha o valor', true)

    setLoading(true)
    try {
      const res = await fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Combustivel',
          buyer: user,
          item: 'Carro',
          description: '',
          quantity: 1,
          total_value: parseFloat(valorCarro),
          payment_method: pagamentoCarro,
          installment: 0,
          createdAt: dataCarro,
          pagamento_compartilhado: 'Pra mim',
          tem_pendencia: false,
        }),
      })

      if (res.ok) {
        let emailEnviado = false
        try {
          const emailRes = await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo: 'abastecimento',
              quemAbasteceu: user,
              veiculo: 'Carro',
              valor: parseFloat(valorCarro),
            }),
          })
          const emailData = await emailRes.json()
          emailEnviado = emailData.success
        } catch (emailError) {
          console.log('Email nao enviado:', emailError)
        }
        // Verifica lembretes de emprestimo (fire-and-forget)
        fetch('/api/verificar-lembretes').catch(() => {})

        showFeedback(emailEnviado ? 'Registrado! Email enviado' : 'Abastecimento Carro registrado!')
        setValorCarro('100.00')
        setExpandCarro(false)
        triggerRefresh()
      } else {
        showFeedback('Erro ao salvar', true)
      }
    } catch (error) {
      showFeedback('Erro ao salvar', true)
    } finally {
      setLoading(false)
    }
  }

  const getTituloAtual = () => {
    if (!tipo) return 'Novo Registro'
    const tipoObj = TIPOS.find(t => t.id === tipo)
    return `Novo ${tipoObj?.label}`
  }

  const tipoColors = {
    moto: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
    carro: 'from-sky-500/20 to-sky-600/10 border-sky-500/20 text-sky-400',
    gasto: 'from-mint-500/20 to-mint-600/10 border-mint-500/20 text-mint-400',
    emprestei: 'from-lavender-500/20 to-lavender-600/10 border-lavender-500/20 text-lavender-400',
    devo: 'from-peach-500/20 to-peach-600/10 border-peach-500/20 text-peach-400',
    'conta-fixa': 'from-slate-400/20 to-slate-500/10 border-slate-400/20 text-slate-300',
  }

  return (
    <div className="animate-fade-in">
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

      {/* Seletor de Tipo - Centralizado na tela */}
      {!tipo && (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-6">Novo Registro</p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {TIPOS.map((t) => {
              const Icon = t.icon
              const colorClass = tipoColors[t.id]
              return (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-gradient-to-b border backdrop-blur-sm transition-all duration-200 hover:scale-[1.04] active:scale-[0.96] ${colorClass}`}
                >
                  <Icon size={22} className="opacity-80" />
                  <span className="text-[11px] font-medium opacity-70">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Formulários - Só mostra quando um tipo está selecionado */}
      {tipo && (
        <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTipo(null)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
          >
            <ArrowLeft size={16} className="text-white/60" />
          </button>
          <h1 className="text-lg font-semibold text-white">{getTituloAtual()}</h1>
        </div>
        <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5 animate-slide-up">
        {tipo === 'moto' && (
          <div className="space-y-4">
            <SectionTitle>Registrar Abastecimento Moto</SectionTitle>

            <div>
              <label className="text-white/60 text-xs block mb-2">Valor (R$)</label>
              <input
                type="number"
                value={valorMoto}
                onChange={(e) => setValorMoto(e.target.value)}
                step="0.01"
                min="0.01"
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Pagamento</label>
              <select
                value={pagamentoMoto}
                onChange={(e) => setPagamentoMoto(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-mint-500/50 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.4)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[center_right_1rem] bg-no-repeat"
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Data</label>
              <input
                type="date"
                value={dataMoto}
                onChange={(e) => setDataMoto(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
              />
            </div>

            <button
              onClick={handleAbastecimentoMoto}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50 bg-gradient-to-r from-mint-500 to-mint-400 text-white shadow-lg shadow-mint-500/20 hover:shadow-mint-500/30 hover:brightness-110 active:scale-[0.98]"
            >
              {loading ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        )}

        {tipo === 'carro' && (
          <div className="space-y-4">
            <SectionTitle>Registrar Abastecimento Carro</SectionTitle>

            <div>
              <label className="text-white/60 text-xs block mb-2">Valor (R$)</label>
              <input
                type="number"
                value={valorCarro}
                onChange={(e) => setValorCarro(e.target.value)}
                step="0.01"
                min="0.01"
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Pagamento</label>
              <select
                value={pagamentoCarro}
                onChange={(e) => setPagamentoCarro(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-mint-500/50 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.4)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[center_right_1rem] bg-no-repeat"
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Data</label>
              <input
                type="date"
                value={dataCarro}
                onChange={(e) => setDataCarro(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
              />
            </div>

            <button
              onClick={handleAbastecimentoCarro}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50 bg-gradient-to-r from-mint-500 to-mint-400 text-white shadow-lg shadow-mint-500/20 hover:shadow-mint-500/30 hover:brightness-110 active:scale-[0.98]"
            >
              {loading ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        )}

        {tipo === 'gasto' && (
          <div className="space-y-4">
            <SectionTitle>Registrar Gasto</SectionTitle>

            <div>
              <label className="text-white/60 text-xs block mb-2">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-mint-500/50 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.4)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[center_right_1rem] bg-no-repeat"
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Item</label>
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                placeholder="Ex: Pizza"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Descrição</label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                placeholder="Opcional"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs block mb-2">Quantidade</label>
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  min="1"
                  className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs block mb-2">Preço (R$)</label>
                <input
                  type="number"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  step="0.01"
                  className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Pagamento</label>
              <select
                value={pagamento}
                onChange={(e) => setPagamento(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-mint-500/50 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.4)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[center_right_1rem] bg-no-repeat"
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Tipo de Compra</label>
              <select
                value={tipoCompra}
                onChange={(e) => setTipoCompra(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-mint-500/50 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.4)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[center_right_1rem] bg-no-repeat"
              >
                <option value="Pra mim">Pra mim</option>
                <option value="Dividido (me deve metade)">Dividido (me deve metade)</option>
                <option value="Pra outra (me deve tudo)">Pra outra (me deve tudo)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs block mb-2">Parcelas</label>
                <input
                  type="number"
                  value={parcelas}
                  onChange={(e) => setParcelas(Number(e.target.value))}
                  min="0"
                  className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs block mb-2">Data</label>
                <input
                  type="date"
                  value={dataGasto}
                  onChange={(e) => setDataGasto(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSalvarGasto}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50 bg-gradient-to-r from-mint-500 to-mint-400 text-white shadow-lg shadow-mint-500/20 hover:shadow-mint-500/30 hover:brightness-110 active:scale-[0.98]"
            >
              {loading ? 'Salvando...' : 'Salvar Gasto'}
            </button>
          </div>
        )}

        {tipo === 'emprestei' && (
          <div className="space-y-4">
            <SectionTitle>Registrar Empréstimo</SectionTitle>

            <div>
              <label className="text-white/60 text-xs block mb-2">Emprestei para</label>
              <input
                type="text"
                value={pessoaEmprestei}
                onChange={(e) => setPessoaEmprestei(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                placeholder="Nome da pessoa"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Valor (R$)</label>
              <input
                type="number"
                value={valorEmprestei}
                onChange={(e) => setValorEmprestei(e.target.value)}
                step="0.01"
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Descrição</label>
              <input
                type="text"
                value={descricaoEmprestei}
                onChange={(e) => setDescricaoEmprestei(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                placeholder="Motivo do empréstimo"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Data de Devolução</label>
              <input
                type="date"
                value={dataDevolucao}
                onChange={(e) => setDataDevolucao(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
              />
            </div>

            <button
              onClick={handleSalvarEmprestei}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50 bg-gradient-to-r from-lavender-500 to-lavender-400 text-white shadow-lg shadow-lavender-500/20 hover:shadow-lavender-500/30 hover:brightness-110 active:scale-[0.98]"
            >
              {loading ? 'Salvando...' : 'Salvar Empréstimo'}
            </button>
          </div>
        )}

        {tipo === 'devo' && (
          <div className="space-y-4">
            <SectionTitle>Registrar Dívida</SectionTitle>

            <div>
              <label className="text-white/60 text-xs block mb-2">Devo para</label>
              <input
                type="text"
                value={pessoaDevo}
                onChange={(e) => setPessoaDevo(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                placeholder="Nome da pessoa"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Valor (R$)</label>
              <input
                type="number"
                value={valorDevo}
                onChange={(e) => setValorDevo(e.target.value)}
                step="0.01"
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Descrição</label>
              <input
                type="text"
                value={descricaoDevo}
                onChange={(e) => setDescricaoDevo(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                placeholder="Motivo da dívida"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Data de Pagamento</label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
              />
            </div>

            <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-base-800 border border-white/10 cursor-pointer hover:bg-white/5">
              <input
                type="checkbox"
                checked={emprestimoMinhaConta}
                onChange={(e) => setEmprestimoMinhaConta(e.target.checked)}
                className="w-5 h-5 rounded accent-coral-500"
              />
              <span className="text-white text-sm">Empréstimo da minha conta</span>
            </label>

            <button
              onClick={handleSalvarDevo}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50 bg-gradient-to-r from-peach-500 to-peach-400 text-white shadow-lg shadow-peach-500/20 hover:shadow-peach-500/30 hover:brightness-110 active:scale-[0.98]"
            >
              {loading ? 'Salvando...' : 'Salvar Dívida'}
            </button>
          </div>
        )}

        {tipo === 'conta-fixa' && (
          <div className="space-y-4">
            <SectionTitle>Criar Conta Fixa</SectionTitle>

            <div>
              <label className="text-white/60 text-xs block mb-2">Nome da Conta</label>
              <input
                type="text"
                value={nomeContaFixa}
                onChange={(e) => setNomeContaFixa(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                placeholder="Ex: Internet"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs block mb-2">Valor (R$)</label>
                <input
                  type="number"
                  value={valorContaFixa}
                  onChange={(e) => setValorContaFixa(e.target.value)}
                  step="0.01"
                  className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs block mb-2">Dia Vencimento</label>
                <input
                  type="number"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(Number(e.target.value))}
                  min="1"
                  max="31"
                  className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Responsável</label>
              <select
                value={responsavelContaFixa}
                onChange={(e) => setResponsavelContaFixa(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-mint-500/50 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.4)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[center_right_1rem] bg-no-repeat"
              >
                <option value="Susanna">Susanna</option>
                <option value="Pietrah">Pietrah</option>
              </select>
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Categoria</label>
              <select
                value={categoriaContaFixa}
                onChange={(e) => setCategoriaContaFixa(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-mint-500/50 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.4)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[center_right_1rem] bg-no-repeat"
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-base-800 border border-white/10 cursor-pointer hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={cartaoCredito}
                  onChange={(e) => setCartaoCredito(e.target.checked)}
                  className="w-4 h-4 rounded accent-lavender-500"
                />
                <span className="text-white text-xs">Cartão</span>
              </label>
              <label className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-base-800 border border-white/10 cursor-pointer hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={debitoAutomatico}
                  onChange={(e) => setDebitoAutomatico(e.target.checked)}
                  className="w-4 h-4 rounded accent-lavender-500"
                />
                <span className="text-white text-xs">Débito Auto</span>
              </label>
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-2">Observação</label>
              <input
                type="text"
                value={observacaoContaFixa}
                onChange={(e) => setObservacaoContaFixa(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-base-800 border border-white/10 text-white focus:border-white/20 outline-none"
                placeholder="Opcional"
              />
            </div>

            <button
              onClick={handleSalvarContaFixa}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50 bg-gradient-to-r from-mint-500 to-mint-400 text-white shadow-lg shadow-mint-500/20 hover:shadow-mint-500/30 hover:brightness-110 active:scale-[0.98]"
            >
              {loading ? 'Salvando...' : 'Criar Conta Fixa'}
            </button>
          </div>
        )}
        </div>
        </div>
      )}
    </div>
  )
}
