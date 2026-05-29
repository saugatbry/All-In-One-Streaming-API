import { NextRequest, NextResponse } from 'next/server'
import { getProviderManifest } from '@/providers/registry'
import { getProviderModule } from '@/providers/loader'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const page = parseInt(searchParams.get('page') || '1')

    if (!provider) return NextResponse.json({ success: false, error: '"provider" required' }, { status: 400 })
    if (!getProviderManifest(provider)) return NextResponse.json({ success: false, error: `Unknown provider: ${provider}` }, { status: 404 })

    const mod = getProviderModule(provider)
    if (!mod) return NextResponse.json({ success: false, error: 'Provider module not loaded' }, { status: 500 })

    const data = await mod.home(provider, page)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed' }, { status: 500 })
  }
}
