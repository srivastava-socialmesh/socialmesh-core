
export async function POST(req: Request) {
  const { targetUserId, offerSdp } = await req.json();

  const { error } = await supabase
    .from('device_relays')
    .update({
      pending_offer_sdp: offerSdp,
      signaling_updated_at: new Date().toISOString()
    })
    .eq('user_id', targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'offer stored' });
}
