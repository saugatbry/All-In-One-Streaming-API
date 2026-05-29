import { NextRequest, NextResponse } from 'next/server'
import { getHome } from '@/lib/scraper/home'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')

    const data = await getHome(page)

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch home page' },
      { status: 500 }
    )
  }
}
