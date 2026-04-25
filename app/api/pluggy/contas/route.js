import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Pluggy removido' }, { status: 410 })
}
