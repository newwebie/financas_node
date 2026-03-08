import { matchLugar, sugerirCategoria, extrairPagamento, corrigirDataTx } from './helpers.js'

/**
 * Processa uma transação normalizada e decide se lança automaticamente
 * ou salva como pendente.
 *
 * @param {object} tx - transação normalizada:
 *   { source, sourceId, description, amount, date, type, paymentMethod, receiverName, receiverCnpj, userId }
 * @param {object} colls - resultado de getCollections()
 * @param {array}  lugares - lugares do usuário (já carregados)
 * @returns {{ skipped: boolean, imported: boolean, auto: boolean }}
 */
export async function processarTransacao(tx, colls, lugares) {
  // Idempotência
  const exists = await colls.transacoes_pendentes.findOne({
    sourceId: tx.sourceId,
    source: tx.source,
  })
  if (exists) return { skipped: true, imported: false, auto: false }

  const lugar = matchLugar(tx.description, lugares)

  // AUTO: lança direto como despesa
  if (lugar?.tipo === 'auto') {
    const dataCorrigida = corrigirDataTx(tx.date)

    await colls.despesas.insertOne({
      label: lugar.categoria,
      buyer: tx.userId,
      item: lugar.nome,
      description: tx.description,
      quantity: 1,
      total_value: Math.abs(tx.amount),
      payment_method: extrairPagamento(tx.paymentMethod, tx.description, tx.type),
      installment: 0,
      createdAt: dataCorrigida,
      pagamento_compartilhado: 'Pra mim',
      tem_pendencia: false,
      uso_pessoal: false,
      auto_lancado: true,
    })

    // Salva em transacoes_pendentes com status 'lancado' para auditoria
    await colls.transacoes_pendentes.insertOne({
      ...tx,
      date: dataCorrigida,
      status: 'lancado',
      matchedLugar: lugar._id,
      suggestedCategory: lugar.categoria,
      auto_lancado: true,
      createdAt: new Date(),
      resolvedAt: new Date(),
    })

    return { skipped: false, imported: true, auto: true }
  }

  // MANUAL (ou sem lugar): vai para pendentes
  const dataCorrigida = corrigirDataTx(tx.date)

  const suggestedCategory = lugar
    ? lugar.categoria
    : sugerirCategoria(tx.description, lugares)

  await colls.transacoes_pendentes.insertOne({
    source: tx.source,
    sourceId: tx.sourceId,
    description: tx.description,
    amount: tx.amount,
    date: dataCorrigida,
    type: tx.type,
    paymentMethod: tx.paymentMethod || null,
    receiverName: tx.receiverName || null,
    receiverCnpj: tx.receiverCnpj || null,
    userId: tx.userId,
    status: 'pendente',
    matchedLugar: lugar ? lugar._id : null,
    lugar_tipo: lugar?.tipo || null,   // 'manual' ou null
    suggestedCategory,
    createdAt: new Date(),
  })

  return { skipped: false, imported: true, auto: false }
}
