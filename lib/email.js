import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

function getEmailDestinatario(nome) {
  const emails = {
    Susanna: process.env.EMAIL_SUSANNA,
    Pietrah: process.env.EMAIL_PIETRAH,
  }
  return emails[nome] || null
}

// ========================================
// 1. EMAIL DE ABASTECIMENTO
// ========================================
export async function enviarEmailAbastecimento(quemAbasteceu, veiculo, valor) {
  try {
    const transporter = getTransporter()

    // Destinatário é a OUTRA pessoa
    const destinatarioNome = quemAbasteceu === 'Susanna' ? 'Pietrah' : 'Susanna'
    const destinatarioEmail = getEmailDestinatario(destinatarioNome)

    if (!destinatarioEmail || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.log('Config de email incompleta')
      return false
    }

    const valorFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const artigo = veiculo === 'Moto' ? 'a' : 'o'
    const emojiVeiculo = veiculo === 'Moto' ? '🏍️' : '🚗'

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #0d0d14; padding: 20px;">
      <div style="max-width: 400px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #12121f 100%); border-radius: 16px; padding: 24px; border: 1px solid rgba(255,255,255,0.1);">

        <h2 style="color: #fdba74; margin: 0 0 16px 0; text-align: center; font-size: 20px;">
          ${emojiVeiculo} Abastecimento!
        </h2>

        <p style="font-size: 15px; color: rgba(255,255,255,0.6); text-align: center; margin: 0 0 12px 0;">
          Oi <strong style="color: ${destinatarioNome === 'Susanna' ? '#f472b6' : '#60a5fa'};">${destinatarioNome}</strong>! 👋
        </p>

        <p style="font-size: 14px; color: white; text-align: center; margin: 0 0 20px 0;">
          <strong>${quemAbasteceu}</strong> acabou de abastecer ${artigo} <strong>${veiculo}</strong>!
        </p>

        <div style="background: rgba(110, 231, 183, 0.1); padding: 16px; border-radius: 12px; text-align: center; margin: 0 0 16px 0; border: 1px solid rgba(110, 231, 183, 0.2);">
          <span style="font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px;">💵 Valor</span><br>
          <span style="font-size: 28px; color: #6ee7b7; font-weight: 700;">${valorFmt}</span>
        </div>

        <div style="background: rgba(244, 114, 182, 0.1); padding: 12px; border-radius: 12px; text-align: center;">
          <p style="font-size: 13px; color: #f472b6; margin: 0;">
            😜 Agora é sua vez de abastecer, hein!
          </p>
        </div>

        <p style="font-size: 10px; color: rgba(255,255,255,0.2); text-align: center; margin: 20px 0 0 0;">
          Enviado automaticamente pelo app Finanças
        </p>
      </div>
    </div>
    `

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: destinatarioEmail,
      subject: `${quemAbasteceu} abasteceu ${artigo} ${veiculo}!`,
      html,
    })

    return true
  } catch (error) {
    console.error('Erro ao enviar email de abastecimento:', error)
    return false
  }
}

// ========================================
// 2. EMAIL DE LEMBRETE DE EMPRÉSTIMO
// ========================================
export async function enviarLembreteEmprestimo(credor, devedor, valor, descricao, dataDevolucao) {
  try {
    const transporter = getTransporter()
    const destinatarioEmail = getEmailDestinatario(credor)

    if (!destinatarioEmail || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.log('Config de email incompleta')
      return false
    }

    const valorFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const dataFmt = dataDevolucao
      ? new Date(dataDevolucao).toLocaleDateString('pt-BR')
      : 'Não definida'

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #0d0d14; padding: 20px;">
      <div style="max-width: 400px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #12121f 100%); border-radius: 16px; padding: 24px; border: 1px solid rgba(255,255,255,0.1);">

        <h2 style="color: #fdba74; margin: 0 0 16px 0; text-align: center; font-size: 20px;">
          🔔 Lembrete de Empréstimo
        </h2>

        <p style="font-size: 15px; color: rgba(255,255,255,0.6); text-align: center; margin: 0 0 12px 0;">
          Oi <strong style="color: ${credor === 'Susanna' ? '#f472b6' : '#60a5fa'};">${credor}</strong>! 👋
        </p>

        <p style="font-size: 14px; color: white; text-align: center; margin: 0 0 20px 0;">
          O prazo de devolução do empréstimo para <strong style="color: #60a5fa;">${devedor}</strong> venceu ontem!
        </p>

        <div style="background: rgba(196, 181, 253, 0.1); padding: 16px; border-radius: 12px; margin: 0 0 16px 0; border: 1px solid rgba(196, 181, 253, 0.2);">
          <p style="font-size: 11px; color: #c4b5fd; margin: 0 0 4px 0;">📝 ${descricao || 'Empréstimo'}</p>
          <p style="font-size: 26px; color: #c4b5fd; font-weight: 700; margin: 4px 0; text-align: center;">${valorFmt}</p>
          <p style="font-size: 10px; color: rgba(255,255,255,0.3); margin: 4px 0 0 0; text-align: center;">Prazo: ${dataFmt}</p>
        </div>

        <div style="background: rgba(253, 186, 116, 0.1); padding: 12px; border-radius: 12px; text-align: center;">
          <p style="font-size: 13px; color: #fdba74; margin: 0;">
            🤔 Já recebeu? Marque como quitado no app!
          </p>
        </div>

        <p style="font-size: 10px; color: rgba(255,255,255,0.2); text-align: center; margin: 20px 0 0 0;">
          Enviado automaticamente pelo app Finanças
        </p>
      </div>
    </div>
    `

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: destinatarioEmail,
      subject: `🔔 Lembrete: Verificar empréstimo para ${devedor}`,
      html,
    })

    return true
  } catch (error) {
    console.error('Erro ao enviar lembrete:', error)
    return false
  }
}
