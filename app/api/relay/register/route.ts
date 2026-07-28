
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { userId, deviceId, signalEndpoint } = await req.json();

  const { error } = await supabase
    .from('device_relays')
    .upsert({
      user_id: userId,
      device_id: deviceId,
      signal_endpoint: signalEndpoint, // Could be a temporary IP or WebSocket URL
      last_heartbeat: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'online' });
}
