import { NextRequest, NextResponse } from 'next/server'
import { getWatch } from '@/lib/scraper/watch'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataParam = searchParams.get('data')

    if (!dataParam) {
      return NextResponse.json(
        { success: false, error: 'Parameter "data" (JSON-encoded stream data) is required' },
        { status: 400 }
      )
    }

    let parsedData: any
    try {
      parsedData = JSON.parse(decodeURIComponent(dataParam))
    } catch {
      parsedData = dataParam
    }

    const streams = await getWatch(parsedData)
    const stream = streams[0] || null

    return NextResponse.json({
      success: true,
      stream: stream?.url || null,
      referer: stream?.referer || null,
      headers: stream?.headers || null,
      sources: streams,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: true, stream: null, sources: [], error: error.message || 'Failed to get stream' },
      { status: 200 }
    )
  }
}
