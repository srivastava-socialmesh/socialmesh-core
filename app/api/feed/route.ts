
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const cursor = searchParams.get('cursor'); // For pagination

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  let query = supabase
    .from('activities')
    .select('activity_id, author_id, activity_type, content_hash, created_at, identities!inner(handle)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (cursor) query = query.lt('created_at', new Date(parseInt(cursor)).toISOString());

  // In the future, filter by "following" list here. For MVP, just show global recent.
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ 
    activities: data, 
    nextCursor: data.length ? new Date(data[data.length-1].created_at).getTime() : null 
  });
}
