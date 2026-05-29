import { NextResponse } from 'next/server'
import { providerList } from '@/providers/registry'

export async function GET() {
  return NextResponse.json({ success: true, data: providerList })
}
