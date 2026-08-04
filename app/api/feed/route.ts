// app/api/feed/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const includeAll = searchParams.get('includeAll') === 'true'; // new param
  const activityId = searchParams.get('activityId'); // for single activity

  if (activityId) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('activity_id', activityId)
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ activity: data });
  }

  let query = supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false });

  // If includeAll is false (default), filter only POST activities
  if (!includeAll) {
    query = query.eq('activity_type', 'POST');
  }

  if (userId) {
    // Optionally filter by author or parent? Not strictly needed for feed.
    // We'll keep it for possible future use.
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ activities: data || [] });
}
