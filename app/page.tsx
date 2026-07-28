// app/page.tsx
'use client';

import { useState } from 'react';
import { initiateConnection, waitForConnection } from '@/lib/webrtc';
import { generateIdentity } from '@/lib/crypto';

export default function Home() {
  const [userId, setUserId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sendFn, setSendFn] = useState<(msg: string) => void>(() => () => {});

  const handleRegister = async () => {
    const identity = await generateIdentity();
    const pubKey = identity.publicKey;
    
    // Register with our server
    const res = await fetch('/api/identity', {
      method: 'POST',
      body: JSON.stringify({ publicKey: pubKey, handle: `user-${Date.now()}` })
    });
    const data = await res.json();
    setUserId(data.userId);
    localStorage.setItem('userId', data.userId);
  };

  const handleConnect = async () => {
    if (!userId) return alert('Register first!');
    // Decide if we are initiator or listener based on a simple toggle (we'll just use two buttons)
  };

  const startAsInitiator = async () => {
    const { sendData } = await initiateConnection(userId, targetId, (data) => {
      setMessages(prev => [...prev, `Peer: ${data}`]);
    });
    setSendFn(() => sendData);
  };

  const startAsListener = async () => {
    const { sendData } = await waitForConnection(userId, (data) => {
      setMessages(prev => [...prev, `Peer: ${data}`]);
    });
    setSendFn(() => sendData);
  };

  return (
    <main className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">SocialMesh P2P Test</h1>
      
      <div className="my-4 flex gap-2">
        <button onClick={handleRegister} className="bg-blue-500 text-white px-4 py-2 rounded">
          Register New Identity
        </button>
        {userId && <span className="my-auto text-sm">User ID: {userId.slice(0,8)}...</span>}
      </div>

      <div className="flex gap-2 my-4">
        <input 
          placeholder="Target User ID" 
          className="border p-2 flex-1 text-black"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        />
        <button onClick={startAsInitiator} className="bg-green-500 text-white px-4 py-2 rounded">
          Call Peer
        </button>
        <button onClick={startAsListener} className="bg-orange-500 text-white px-4 py-2 rounded">
          Wait for Call
        </button>
      </div>

      <div className="border h-64 overflow-y-scroll p-4 mb-4 bg-gray-100 text-black">
        {messages.map((msg, i) => <div key={i}>{msg}</div>)}
      </div>

      <div className="flex gap-2">
        <input 
          placeholder="Send message via P2P" 
          className="border p-2 flex-1 text-black"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          onClick={() => { sendFn(input); setInput(''); }} 
          className="bg-purple-500 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </main>
  );
}
