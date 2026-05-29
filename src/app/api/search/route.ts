import { NextRequest, NextResponse } from 'next/server'
import { search } from '@/lib/scraper/search'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }

    const data = await search(query)

    return NextResponse.json({ success: true, query, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Search failed' },
      { status: 500 }
    )
  }
}
