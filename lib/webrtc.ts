// lib/webrtc.ts

export async function initiateConnection(
  localUserId: string,
  targetUserId: string,
  onDataReceived: (data: string) => void
): Promise<{ peerConnection: RTCPeerConnection; sendData: (msg: string) => void }> {
  console.log('Initiating connection to', targetUserId);
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  // Create data channel
  const dataChannel = pc.createDataChannel('socialmesh-channel');
  let sendData: (msg: string) => void = () => {};

  dataChannel.onopen = () => {
    console.log('✅ Data channel opened (initiator)');
    sendData = (msg) => {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(msg);
      } else {
        console.error('Data channel not open, cannot send');
      }
    };
  };

  dataChannel.onmessage = (event) => {
    console.log('📩 Received message via data channel (initiator):', event.data);
    onDataReceived(event.data);
  };

  dataChannel.onclose = () => {
    console.log('Data channel closed (initiator)');
  };

  dataChannel.onerror = (error) => {
    console.error('Data channel error (initiator):', error);
  };

  // Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  console.log('📤 Sending offer to', targetUserId);

  // Send offer to target via relay API
  const res = await fetch('/api/relay/offer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId, offerSdp: pc.localDescription?.sdp })
  });
  if (!res.ok) {
    console.error('Failed to send offer:', await res.text());
  } else {
    console.log('Offer sent successfully');
  }

  // Poll for answer
  const pollForAnswer = async () => {
    const res = await fetch(`/api/relay/poll?userId=${localUserId}`);
    const data = await res.json();
    if (data.answer && pc.remoteDescription === null) {
      console.log('📥 Received answer from', targetUserId);
      await pc.setRemoteDescription({ type: 'answer', sdp: data.answer });
      return;
    }
    if (pc.remoteDescription === null) {
      setTimeout(pollForAnswer, 1000);
    }
  };
  pollForAnswer();

  // ICE connection state logging
  pc.oniceconnectionstatechange = () => {
    console.log('ICE connection state (initiator):', pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    console.log('Connection state (initiator):', pc.connectionState);
    if (pc.connectionState === 'connected') {
      console.log('✅ P2P connection established!');
    }
  };

  return { peerConnection: pc, sendData: (msg) => sendData(msg) };
}

export async function waitForConnection(
  localUserId: string,
  onDataReceived: (data: string) => void
): Promise<{ sendData: (msg: string) => void }> {
  console.log('Waiting for incoming connection for', localUserId);
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  let sendData: (msg: string) => void = () => {};

  pc.ondatachannel = (event) => {
    const channel = event.channel;
    console.log('📥 Incoming data channel received');
    channel.onopen = () => {
      console.log('✅ Data channel opened (listener)');
      sendData = (msg) => {
        if (channel.readyState === 'open') {
          channel.send(msg);
        } else {
          console.error('Data channel not open, cannot send');
        }
      };
    };
    channel.onmessage = (event) => {
      console.log('📩 Received message via data channel (listener):', event.data);
      onDataReceived(event.data);
    };
    channel.onclose = () => {
      console.log('Data channel closed (listener)');
    };
    channel.onerror = (error) => {
      console.error('Data channel error (listener):', error);
    };
  };

  // Poll for offer
  const pollForOffer = async () => {
    const res = await fetch(`/api/relay/poll?userId=${localUserId}`);
    const data = await res.json();
    if (data.offer && pc.remoteDescription === null) {
      console.log('📥 Received offer from peer');
      await pc.setRemoteDescription({ type: 'offer', sdp: data.offer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer back
      await fetch('/api/relay/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: localUserId, answerSdp: pc.localDescription?.sdp })
      });
      console.log('📤 Answer sent');
      return;
    }
    if (pc.remoteDescription === null) {
      setTimeout(pollForOffer, 1000);
    }
  };
  pollForOffer();

  pc.oniceconnectionstatechange = () => {
    console.log('ICE connection state (listener):', pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    console.log('Connection state (listener):', pc.connectionState);
    if (pc.connectionState === 'connected') {
      console.log('✅ P2P connection established!');
    }
  };

  return { sendData: (msg) => sendData(msg) };
}
