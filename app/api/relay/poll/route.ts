import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('device_relays')
    .select('pending_offer_sdp, pending_answer_sdp')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ offer: null, answer: null });
  }

  return NextResponse.json({
    offer: data.pending_offer_sdp,
    answer: data.pending_answer_sdp
  });
}
