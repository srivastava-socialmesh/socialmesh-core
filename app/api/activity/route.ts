
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verifySignature } from '@/lib/crypto'; // We'll implement this helper

export async function POST(req: Request) {
  const { activityId, type, parentId, rootId, contentHash, signature, userId } = await req.json();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // 1. Fetch the user's public key to verify the signature
  const { data: identity } = await supabase
    .from('identities')
    .select('public_key')
    .eq('user_id', userId)
    .single();

  if (!identity) return NextResponse.json({ error: 'Identity not found' }, { status: 404 });

  // 2. Verify the signature (crypto verification)
  const isValid = await verifySignature(identity.public_key, activityId + contentHash, signature);
  if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  // 3. Store the transaction (ONLY the metadata, no content)
  const { error } = await supabase.from('activities').insert({
    activity_id: activityId,
    author_id: userId,
    activity_type: type,
    parent_id: parentId,
    root_id: rootId,
    content_hash: contentHash,
    signature: signature,
    created_at: new Date().toISOString()
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
