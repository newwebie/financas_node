import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/mongodb'
import { enviarLembreteEmprestimo } from '@/lib/email'

export async function GET() {
  try {
    const colls = await getCollections()

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)

    // Busca emprestimos em aberto
    const emprestimos = await colls.emprestimos_terceiros
      .find({ status: 'em aberto' })
      .toArray()

    let enviados = 0

    for (const emp of emprestimos) {
      const dataDev = emp.data_devolucao ? new Date(emp.data_devolucao) : null
      if (!dataDev) continue

      dataDev.setHours(0, 0, 0, 0)

      // Verifica se venceu ontem (hoje é D+1 da data_devolucao) E ainda nao enviou lembrete
      if (dataDev.getTime() === ontem.getTime() && !emp.lembrete_enviado) {
        const sucesso = await enviarLembreteEmprestimo(
          emp.credor,
          emp.devedor,
          emp.valor || 0,
          emp.descricao || '',
          emp.data_devolucao
        )

        if (sucesso) {
          await colls.emprestimos_terceiros.updateOne(
            { _id: emp._id },
            { $set: { lembrete_enviado: true } }
          )
          enviados++
        }
      }
    }

    return NextResponse.json({
      success: true,
      verificados: emprestimos.length,
      enviados,
    })
  } catch (error) {
    console.error('Erro ao verificar lembretes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
