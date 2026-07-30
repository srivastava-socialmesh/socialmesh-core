import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'YOUTUBE_API_KEY not set. Please add it to your environment variables.', videos: [] },
      { status: 200 }
    );
  }
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=US&maxResults=10&key=${apiKey}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    const data = await res.json();
    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || 'YouTube API error', videos: [] },
        { status: 200 }
      );
    }
    return NextResponse.json({ videos: data.items || [], error: null });
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to fetch YouTube videos', videos: [] },
      { status: 200 }
    );
  }
}
