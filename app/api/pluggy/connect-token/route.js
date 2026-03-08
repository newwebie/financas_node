import { NextResponse } from 'next/server'
import { getPluggyClient } from '@/lib/pluggy'

export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, webhookUrl } = body

    const client = getPluggyClient()
    // webhookUrl: usa a env var NEXT_PUBLIC_APP_URL ou o que vier no body
    const resolvedWebhookUrl =
      webhookUrl ||
      (process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/pluggy/webhook`
        : null)

    // SDK v0.83+: createConnectToken(itemId?, options?)
    // itemId = undefined para nova conexão, UUID para reconectar item existente
    const connectToken = await client.createConnectToken(undefined, {
      clientUserId: userId,
      ...(resolvedWebhookUrl && { webhookUrl: resolvedWebhookUrl }),
    })

    return NextResponse.json({ accessToken: connectToken.accessToken })
  } catch (error) {
    console.error('Pluggy connect-token error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
