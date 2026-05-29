import { NextRequest, NextResponse } from 'next/server'
import { getInfo } from '@/lib/scraper/info'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || searchParams.get('url')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Parameter "id" or "url" is required' },
        { status: 400 }
      )
    }

    const data = await getInfo(id)

    if (data.type === 'movie') {
      return NextResponse.json({
        success: true,
        data: [{
          name: 'Movie',
          season: 1,
          episode: 1,
          streamData: data.streamData,
        }],
      })
    }

    return NextResponse.json({ success: true, data: data.episodes || [] })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch episodes' },
      { status: 500 }
    )
  }
}
