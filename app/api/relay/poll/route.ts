export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  const { data, error } = await supabase
    .from('device_relays')
    .select('pending_offer_sdp, pending_answer_sdp')
    .eq('user_id', userId)
    .single();

  if (error || !data) return NextResponse.json({ offer: null, answer: null });

  // Optionally clear the signals after fetching to prevent re-use
  // (We'll clear them client-side after the handshake completes)

  return NextResponse.json({
    offer: data.pending_offer_sdp,
    answer: data.pending_answer_sdp
  });
}
