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
    const query = searchParams.get('q')
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }
    const page = parseInt(searchParams.get('page') || '1')
    const data = await provider.search(query, page)

    return NextResponse.json({
      success: true,
      provider: providerId,
      query,
      data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Search failed' },
      { status: 500 }
    )
  }
}
