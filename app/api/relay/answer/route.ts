export async function POST(req: Request) {
  const { targetUserId, answerSdp } = await req.json();

  const { error } = await supabase
    .from('device_relays')
    .update({
      pending_answer_sdp: answerSdp,
      signaling_updated_at: new Date().toISOString()
    })
    .eq('user_id', targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'answer stored' });
}
