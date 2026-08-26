import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL;

async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const jwt = request.cookies.get('jwt')?.value;

  const strapiPath = '/' + path.join('/');
  const search = request.nextUrl.search;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  const strapiRes = await fetch(`${STRAPI_URL}/api${strapiPath}${search}`, {
    method: request.method,
    headers,
    body,
  });

  const data = await strapiRes.json();

  return NextResponse.json(data, { status: strapiRes.status });
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
