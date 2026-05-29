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
    const dataParam = searchParams.get('data')
    if (!dataParam) {
      return NextResponse.json(
        { success: false, error: 'Data parameter is required' },
        { status: 400 }
      )
    }

    let parsedData: any
    try {
      parsedData = JSON.parse(dataParam)
    } catch {
      parsedData = dataParam
    }

    const data = await provider.streams(parsedData)

    return NextResponse.json({
      success: true,
      provider: providerId,
      data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get streams' },
      { status: 500 }
    )
  }
}
