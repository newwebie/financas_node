import { NextResponse } from 'next/server'
import { enviarEmailAbastecimento, enviarLembreteEmprestimo } from '@/lib/email'

export async function POST(request) {
  try {
    const body = await request.json()

    if (body.tipo === 'abastecimento') {
      const sucesso = await enviarEmailAbastecimento(
        body.quemAbasteceu,
        body.veiculo,
        body.valor
      )
      return NextResponse.json({ success: sucesso })
    }

    if (body.tipo === 'lembrete_emprestimo') {
      const sucesso = await enviarLembreteEmprestimo(
        body.credor,
        body.devedor,
        body.valor,
        body.descricao,
        body.dataDevolucao
      )
      return NextResponse.json({ success: sucesso })
    }

    return NextResponse.json({ error: 'Tipo de email invalido' }, { status: 400 })
  } catch (error) {
    console.error('Erro na API de email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
