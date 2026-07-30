import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NEWS_API_KEY not set. Please add it to your environment variables.', articles: [] },
      { status: 200 }
    );
  }
  const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=10&apiKey=${apiKey}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    const data = await res.json();
    if (data.status === 'error') {
      return NextResponse.json(
        { error: data.message || 'NewsAPI error', articles: [] },
        { status: 200 }
      );
    }
    return NextResponse.json({ articles: data.articles || [], error: null });
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to fetch news', articles: [] },
      { status: 200 }
    );
  }
}
