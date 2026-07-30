import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing NEWS_API_KEY' }, { status: 500 });
  }
  const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=10&apiKey=${apiKey}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    const data = await res.json();
    if (data.status === 'error') {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }
    return NextResponse.json(data.articles || []);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
