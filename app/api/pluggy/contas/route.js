export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getPluggyClient } from '@/lib/pluggy'

// GET ?itemId=xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: 'itemId obrigatório' }, { status: 400 })
    }

    const client = getPluggyClient()
    const result = await client.fetchAccounts(itemId)
    const accounts = result.results || result.accounts || []

    return NextResponse.json(
      accounts.map(acc => ({
        id: acc.id,
        type: acc.type,
        subtype: acc.subtype,
        name: acc.name,
        balance: acc.balance,
        currencyCode: acc.currencyCode,
        number: acc.number,
        itemId: acc.itemId,
      }))
    )
  } catch (error) {
    console.error('Pluggy contas error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
