// lib/webrtc.ts

// 1. Establish a P2P connection as the "Initiator" (User A)
export async function initiateConnection(
  localUserId: string,
  targetUserId: string,
  onDataReceived: (data: string) => void
): Promise<{ peerConnection: RTCPeerConnection; sendData: (msg: string) => void }> {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Free STUN for NAT traversal
  });

  // Data channel for sending/receiving arbitrary messages (posts, likes, files)
  const dataChannel = pc.createDataChannel('socialmesh-channel');
  
  let sendData: (msg: string) => void = () => {};

  dataChannel.onopen = () => {
    console.log('P2P Data Channel Open');
    sendData = (msg) => dataChannel.send(msg);
  };

  dataChannel.onmessage = (event) => {
    onDataReceived(event.data);
  };

  // Create the SDP Offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Send offer to target user via your Relay API
  await fetch('/api/relay/offer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId, offerSdp: pc.localDescription?.sdp })
  });

  // Poll for the answer from the target user
  const pollForAnswer = async () => {
    const res = await fetch(`/api/relay/poll?userId=${localUserId}`);
    const { answer } = await res.json();
    if (answer && pc.remoteDescription === null) {
      await pc.setRemoteDescription({ type: 'answer', sdp: answer });
      return;
    }
    if (pc.remoteDescription === null) {
      setTimeout(pollForAnswer, 1000); // Poll every 1 second
    }
  };
  pollForAnswer();

  return { peerConnection: pc, sendData: (msg) => sendData(msg) };
}

// 2. Receive a connection as the "Listener" (User B)
export async function waitForConnection(
  localUserId: string,
  onDataReceived: (data: string) => void
): Promise<{ sendData: (msg: string) => void }> {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  let sendData: (msg: string) => void = () => {};

  // Listen for the remote data channel
  pc.ondatachannel = (event) => {
    const channel = event.channel;
    channel.onopen = () => {
      console.log('Incoming P2P Channel Open');
      sendData = (msg) => channel.send(msg);
    };
    channel.onmessage = (event) => {
      onDataReceived(event.data);
    };
  };

  // Poll for an incoming Offer from the initiator
  const pollForOffer = async () => {
    const res = await fetch(`/api/relay/poll?userId=${localUserId}`);
    const { offer } = await res.json();
    
    if (offer && pc.remoteDescription === null) {
      await pc.setRemoteDescription({ type: 'offer', sdp: offer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send the answer back to the initiator
      await fetch('/api/relay/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: localUserId, answerSdp: pc.localDescription?.sdp })
      });
      return;
    }
    if (pc.remoteDescription === null) {
      setTimeout(pollForOffer, 1000);
    }
  };
  pollForOffer();

  return { sendData: (msg) => sendData(msg) };
}
