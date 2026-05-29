import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/providers'

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const providerId = params.provider.toLowerCase()
  const provider = getProvider(providerId)

  if (!provider) {
    return NextResponse.json(
      { success: false, error: `Provider '${providerId}' not found` },
      { status: 404 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      )
    }
    const data = await provider.info(url)

    return NextResponse.json({
      success: true,
      provider: providerId,
      data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load info' },
      { status: 500 }
    )
  }
}
