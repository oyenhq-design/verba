import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // MOCKED for UI testing: Do nothing, just pass through so we can view all pages
  return NextResponse.next({
    request,
  })
}
