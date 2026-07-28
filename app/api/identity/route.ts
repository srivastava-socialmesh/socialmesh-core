
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role for inserting UUIDs
);

export async function POST(req: Request) {
  const { publicKey, handle } = await req.json();
  
  // Generate a UUID for the user on the server, linking it to the public key.
  const { data, error } = await supabase
    .from('identities')
    .insert({ public_key: publicKey, handle: handle })
    .select('user_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ userId: data.user_id });
}
