import { NextResponse } from 'next/server'
import { listProviders } from '@/lib/providers'

export async function GET() {
  const providers = listProviders()
  return NextResponse.json({
    success: true,
    data: providers,
    total: providers.length,
  })
}
