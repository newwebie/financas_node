// Categorias do app - o usuario pode criar mais depois
export const CATEGORIAS = [
  { id: 'Comida', emoji: '🍔', label: 'Comida' },
  { id: 'Combustivel', emoji: '⛽', label: 'Combustível' },
  { id: 'Automoveis', emoji: '🚗', label: 'Automóveis' },
  { id: 'Bebidas', emoji: '🍺', label: 'Bebidas' },
  { id: 'Vestuario', emoji: '👗', label: 'Vestuário' },
  { id: 'Saude', emoji: '💊', label: 'Saúde' },
  { id: 'Lazer', emoji: '🎮', label: 'Lazer' },
  { id: 'Contas', emoji: '📄', label: 'Contas' },
  { id: 'Boa pra familia', emoji: '👨‍👩‍👧', label: 'Boa pra família' },
  { id: 'Cofrinho', emoji: '🐷', label: 'Cofrinho' },
  { id: 'Renda Variavel', emoji: '💵', label: 'Renda Variável' },
  { id: 'Trancas', emoji: '💇🏾‍♀️', label: 'Tranças' },
  { id: 'Taro', emoji: '🔮', label: 'Tarô' },
  { id: 'Outros', emoji: '📦', label: 'Outros' },
]

// Alias for consistency with English naming in components
export const CATEGORIES = CATEGORIAS.map(c => ({ value: c.id, emoji: c.emoji, label: c.label }))

export function getCategoryDisplay(catId) {
  const cat = CATEGORIAS.find(c => c.id === catId)
  if (cat) return cat.label
  if (catId === 'Emprestei') return 'Emprestei'
  return catId || 'Outros'
}

export function getCategoryEmoji(catId) {
  const cat = CATEGORIAS.find(c => c.id === catId)
  return cat?.emoji || '📦'
}

// Formata valor em reais
export function fmt(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00'
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

// Formata data DD/MM
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Formata data DD/MM/YYYY
export function formatDateFull(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// Retorna cores do usuario
export function getUserColors(user) {
  if (user === 'Susanna') {
    return {
      gradient: 'from-su-400 to-su-600',
      bg: 'bg-su-500',
      text: 'text-su-400',
      textLight: 'text-su-300',
      border: 'border-su-400/30',
      hex: '#f472b6',
      hexDark: '#ec4899',
      glow: 'rgba(244, 114, 182, 0.15)',
    }
  }
  return {
    gradient: 'from-pi-400 to-pi-600',
    bg: 'bg-pi-500',
    text: 'text-pi-400',
    textLight: 'text-pi-300',
    border: 'border-pi-400/30',
    hex: '#60a5fa',
    hexDark: '#3b82f6',
    glow: 'rgba(96, 165, 250, 0.15)',
  }
}

export function getOtherUser(user) {
  return user === 'Susanna' ? 'Pietrah' : 'Susanna'
}

export const PAYMENT_METHODS = ['Debito', 'Credito', 'Pix', 'Dinheiro', 'VR']

export const STATUS_TERCEIROS = [
  { value: 'em aberto', label: 'Em Aberto', emoji: '🟡' },
  { value: 'quitado', label: 'Quitado', emoji: '✅' },
]

export const CATEGORY_COLORS = [
  '#f472b6', '#60a5fa', '#6ee7b7', '#fdba74', '#c4b5fd',
  '#fca5a5', '#93c5fd', '#fde68a', '#a5b4fc', '#86efac',
]

// Calcula periodo da fatura baseado no fechamento configurado
// mesesAtras: 0 = mes atual, 1 = mes anterior, etc
export function calcPeriodoFatura(configFechamentos, user, mesesAtras = 0) {
  const hoje = new Date()
  // Subtrai os meses para calcular período anterior
  hoje.setMonth(hoje.getMonth() - mesesAtras)
  const mes = hoje.getMonth() + 1
  const ano = hoje.getFullYear()

  function getFechamento(ano, mes) {
    const mesAno = `${ano}-${String(mes).padStart(2, '0')}`
    const found = configFechamentos.find(c => c.mes_ano === mesAno && c.user === user)
    return found?.dia_fechamento || 7
  }

  const fechamentoAtual = getFechamento(ano, mes)
  const dataFechamento = new Date(ano, mes - 1, fechamentoAtual)

  let dataInicio, dataFim

  if (hoje >= dataFechamento) {
    dataInicio = dataFechamento
    const proxMes = mes === 12 ? 1 : mes + 1
    const proxAno = mes === 12 ? ano + 1 : ano
    const fechProx = getFechamento(proxAno, proxMes)
    dataFim = new Date(proxAno, proxMes - 1, fechProx - 1, 23, 59, 59)
  } else {
    const mesAnt = mes === 1 ? 12 : mes - 1
    const anoAnt = mes === 1 ? ano - 1 : ano
    const fechAnt = getFechamento(anoAnt, mesAnt)
    dataInicio = new Date(anoAnt, mesAnt - 1, fechAnt)
    dataFim = new Date(ano, mes - 1, fechamentoAtual - 1, 23, 59, 59)
  }

  return { dataInicio, dataFim }
}

// Retorna o periodo da fatura: usa periodo customizado se existir, senao calcula
export function getPeriodo(configs, user, mesesAtras = 0) {
  if (mesesAtras === 0) {
    const hoje = new Date()
    const mesAno = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const custom = configs.find(c => c.tipo === 'periodo' && c.mes === mesAno && c.user === user)
    if (custom?.data_inicio && custom?.data_fim) {
      return {
        dataInicio: new Date(custom.data_inicio),
        dataFim: new Date(custom.data_fim),
      }
    }
  }
  return calcPeriodoFatura(configs, user, mesesAtras)
}

// Extrai forma de pagamento da descrição bancária quando tx.paymentMethod é null
// Ex: "COMPRA CARTAO DEB MC 09/02 ..." → "Debito"
//     "COMPRA CARTAO CRED VISA 15/03 ..." → "Credito"
//     "PIX ENVIADO ..." → "Pix"
export function extrairPagamento(paymentMethod, description, type) {
  // Se o Pluggy já mandou, mapear para o padrão do app
  if (paymentMethod) {
    if (paymentMethod === 'PIX') return 'Pix'
    if (paymentMethod === 'DEBIT_CARD' || paymentMethod === 'DEBIT') return 'Debito'
    if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'CREDIT') return 'Credito'
    if (paymentMethod === 'TED' || paymentMethod === 'DOC') return 'Transferencia'
  }

  // Fallback: extrair da descrição
  const desc = (description || '').toUpperCase()
  if (/PIX (ENVIADO|RECEBIDO)/i.test(desc)) return 'Pix'
  if (/TED (ENVIADO|RECEBIDO)/i.test(desc)) return 'Transferencia'
  if (/DOC (ENVIADO|RECEBIDO)/i.test(desc)) return 'Transferencia'
  if (/COMPRA CART[AÃ]O\s*(DEB|DEBITO)/i.test(desc)) return 'Debito'
  if (/COMPRA CART[AÃ]O\s*(CRED|CREDITO)/i.test(desc)) return 'Credito'
  if (/COMPRA (NO\s+)?DEBITO/i.test(desc)) return 'Debito'
  if (/COMPRA (NO\s+)?CREDITO/i.test(desc)) return 'Credito'

  // Último fallback: pelo type da transação
  if (type === 'DEBIT') return 'Debito'
  if (type === 'CREDIT') return 'Credito'
  return 'Debito'
}

// Match de transação bancária com lugares cadastrados
// Remove prefixos fixos de descrições bancárias (PIX ENVIADO, TED RECEBIDO, etc.)
export function limparDescricao(desc) {
  if (!desc) return ''
  return desc
    // Prefixos simples (PIX, TED, DOC, etc.)
    .replace(/^(PIX ENVIADO|PIX RECEBIDO|TED ENVIADO|TED RECEBIDO|DOC ENVIADO|DOC RECEBIDO|TRANSFERENCIA ENVIADA|TRANSFERENCIA RECEBIDA|PAGAMENTO PIX|SAQUE|DEPOSITO)\s*/i, '')
    // "COMPRA CARTAO DEB MC 09/02", "COMPRA CARTAO CRED VISA 15/03", "COMPRA CARTAO 09/02", etc.
    // Remove: COMPRA CARTAO + (DEB|CRED opcional) + (bandeira opcional) + (data DD/MM opcional)
    .replace(/^COMPRA\s+CART[AÃ]O\s*(?:(?:DEB(?:ITO)?|CRED(?:ITO)?)\s*)?(?:(?:MC|VISA|ELO|MASTERCARD|HIPERCARD|AMEX)\s*)?(?:\d{1,2}\/\d{2}\s*)?/i, '')
    // "COMPRA DEBITO", "COMPRA CREDITO", "COMPRA NO DEBITO", etc.
    .replace(/^COMPRA\s+(?:NO\s+)?(?:DEBITO|CREDITO)\s*/i, '')
    // Remove datas soltas no início que sobrarem: "09/02 ", "15/03 "
    .replace(/^\d{1,2}\/\d{2}\s+/, '')
    .trim()
}

export function matchLugar(descricao, lugares) {
  if (!descricao || !lugares?.length) return null
  const desc = descricao.toLowerCase()
  const descLimpa = limparDescricao(descricao).toLowerCase()
  return lugares.find(lugar =>
    lugar.keywords?.some(kw => {
      if (!kw) return false
      const k = kw.toLowerCase()
      return desc.includes(k) || descLimpa.includes(k)
    })
  ) || null
}

// Retorna a data local como string YYYY-MM-DD (sem bug de timezone UTC)
export function getLocalDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Converte uma Date (ou string ISO) para string YYYY-MM-DD usando horário local
export function toLocalDateString(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Corrige data de transação para meio-dia (evita bug de timezone UTC-3)
export function corrigirDataTx(date) {
  if (!date) return new Date()
  if (date instanceof Date) {
    const s = date.toISOString()
    const datePart = s.split('T')[0]
    return new Date(`${datePart}T12:00:00`)
  }
  const s = typeof date === 'string' ? date : String(date)
  const datePart = s.split('T')[0]
  return new Date(`${datePart}T12:00:00`)
}

// Parseia data OFX "20260305120000" → Date
export function parseOFXDate(str) {
  if (!str) return new Date()
  const s = String(str)
  const year = s.substring(0, 4)
  const month = s.substring(4, 6)
  const day = s.substring(6, 8)
  return new Date(`${year}-${month}-${day}T12:00:00`)
}

// Sugere categoria baseado no lugar encontrado ou na descrição
export function sugerirCategoria(descricao, lugares) {
  const lugar = matchLugar(descricao, lugares)
  if (lugar) return lugar.categoria

  const desc = (descricao || '').toLowerCase()
  if (desc.includes('shell') || desc.includes('posto') || desc.includes('combustivel') || desc.includes('gasolina')) return 'Combustivel'
  if (desc.includes('ifood') || desc.includes('rappi') || desc.includes('restaurante') || desc.includes('lanche')) return 'Comida'
  if (desc.includes('uber') || desc.includes('99') || desc.includes('taxi')) return 'Automoveis'
  if (desc.includes('farmacia') || desc.includes('drogaria') || desc.includes('medico')) return 'Saude'
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('amazon prime')) return 'Lazer'
  if (desc.includes('agua') || desc.includes('luz') || desc.includes('internet') || desc.includes('energia')) return 'Contas'

  return 'Outros'
}
