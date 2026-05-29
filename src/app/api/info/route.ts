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

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch info' },
      { status: 500 }
    )
  }
}
