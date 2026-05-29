import { NextRequest, NextResponse } from 'next/server'
import { getProviderManifest } from '@/providers/registry'
import { getProviderModule } from '@/providers/loader'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const id = searchParams.get('id')
    const type = searchParams.get('type') || 'movie'

    if (!provider) return NextResponse.json({ success: false, error: '"provider" required' }, { status: 400 })
    if (!id) return NextResponse.json({ success: false, error: '"id" required' }, { status: 400 })
    if (!getProviderManifest(provider)) return NextResponse.json({ success: false, error: `Unknown provider: ${provider}` }, { status: 404 })

    const mod = getProviderModule(provider)
    if (!mod) return NextResponse.json({ success: false, error: 'Provider module not loaded' }, { status: 500 })

    const data = await mod.watch(provider, type, id)
    return NextResponse.json({ success: data.status === 'ok', data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed' }, { status: 500 })
  }
}
