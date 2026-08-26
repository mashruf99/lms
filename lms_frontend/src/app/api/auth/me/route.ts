import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  const jwt = request.cookies.get('jwt')?.value;

  if (!jwt) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const res = await fetch(`${STRAPI_URL}/api/my-profile`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
