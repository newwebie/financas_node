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
  if (cat) return `${cat.emoji} ${cat.label}`
  if (catId === 'Emprestei') return '🤝 Emprestei'
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
