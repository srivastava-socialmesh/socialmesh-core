// lib/p2p.ts (add to existing webrtc.ts or create new)

import { getContent } from './storage';

// Handle incoming P2P messages
export function handleP2PMessage(data: string): void {
  try {
    const message = JSON.parse(data);
    if (message.type === 'request_content') {
      const content = getContent(message.activityId);
      // Send response via the data channel (we need a way to send)
      // We'll attach a global send function later.
      // For now, we'll store a callback.
      console.log('Content requested:', message.activityId, content);
    }
  } catch (e) {
    console.error('Invalid P2P message:', e);
  }
}

// Request content from a peer
export function requestContent(sendFn: (msg: string) => void, activityId: string): void {
  sendFn(JSON.stringify({ type: 'request_content', activityId }));
}
