import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Pluggy removido' }, { status: 410 })
}
