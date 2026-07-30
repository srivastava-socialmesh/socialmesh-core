import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resolveUserId(input: string): Promise<string | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) return input;
  const { data, error } = await supabase
    .from('identities')
    .select('user_id')
    .ilike('user_id', `${input}%`)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0].user_id;
}

export async function POST(req: Request) {
  const { targetUserId, answerSdp } = await req.json();

  const resolvedUserId = await resolveUserId(targetUserId);
  if (!resolvedUserId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('device_relays')
    .update({
      pending_answer_sdp: answerSdp,
      signaling_updated_at: new Date().toISOString()
    })
    .eq('user_id', resolvedUserId);

  if (error) {
    console.error('Error storing answer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ status: 'answer stored' });
}
