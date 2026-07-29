"use client";

import { useState, useEffect } from 'react';
import { generateIdentity, hashContent, signActivity } from '@/lib/crypto';
import { initiateConnection, waitForConnection } from '@/lib/webrtc';
import { saveContent, getContent } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [targetId, setTargetId] = useState('');
  const [connected, setConnected] = useState(false);
  const [sendP2P, setSendP2P] = useState<((msg: string) => void) | null>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [postText, setPostText] = useState('');

  // Register identity with error handling
  const registerIdentity = async () => {
    try {
      const identity = await generateIdentity();
      setPublicKey(identity.publicKey);
      setPrivateKey(identity.privateKey);
      
      const res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          publicKey: identity.publicKey, 
          handle: `user-${Date.now()}` 
        })
      });
      
      const data = await res.json();
      console.log('Registration response:', data);
      
      if (!res.ok || !data.userId) {
        throw new Error(data.error || 'Registration failed');
      }
      
      setUserId(data.userId);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('publicKey', identity.publicKey);
      localStorage.setItem('privateKey', identity.privateKey);
      loadFeed();
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Check console for details.');
    }
  };

  // Reset identity (clear local storage)
  const resetIdentity = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('publicKey');
    localStorage.removeItem('privateKey');
    setUserId(null);
    setPublicKey('');
    setPrivateKey('');
    setFeed([]);
    setConnected(false);
    setSendP2P(null);
    window.location.reload(); // refresh to reset everything
  };

  // Load feed from Supabase
  const loadFeed = async () => {
    try {
      const res = await fetch(`/api/feed`);
      const data = await res.json();
      setFeed(data.activities || []);
    } catch (e) {
      console.error('Failed to load feed:', e);
    }
  };

  // Create a post
  const createPost = async () => {
    const storedUserId = localStorage.getItem('userId');
    const storedPrivateKey = localStorage.getItem('privateKey');
    
    if (!storedUserId || !storedPrivateKey) {
      alert('Please register first (click "Register New Identity")');
      return;
    }
    
    if (!postText.trim()) {
      alert('Please enter some text');
      return;
    }
    
    try {
      const content = { text: postText, timestamp: Date.now(), author: storedUserId };
      const contentHash = await hashContent(content);
      const activityId = await hashContent({ author: storedUserId, contentHash, nonce: Math.random() });
      const signature = await signActivity(storedPrivateKey, activityId, contentHash);
      
      saveContent(activityId, content);
      
      const res = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          type: 'POST',
          parentId: null,
          rootId: null,
          contentHash,
          signature,
          userId: storedUserId
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Server error');
      }
      
      setPostText('');
      loadFeed();
    } catch (error) {
      console.error('Create post error:', error);
      alert('Failed to create post. Check console.');
    }
  };

  // P2P message handler
  const handleP2PMessage = (data: string, sendFn: (msg: string) => void) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'request_content') {
        const content = getContent(msg.activityId);
        if (content) {
          sendFn(JSON.stringify({ type: 'content_response', activityId: msg.activityId, content }));
        }
      } else if (msg.type === 'content_response') {
        saveContent(msg.activityId, msg.content);
        loadFeed();
      }
    } catch (e) {
      console.error('P2P message error:', e);
    }
  };

  const startAsInitiator = async () => {
    if (!userId) return alert('Register first');
    const { sendData } = await initiateConnection(userId, targetId, (data) => {
      handleP2PMessage(data, sendData);
    });
    setSendP2P(() => sendData);
    setConnected(true);
  };

  const startAsListener = async () => {
    if (!userId) return alert('Register first');
    const { sendData } = await waitForConnection(userId, (data) => {
      handleP2PMessage(data, sendData);
    });
    setSendP2P(() => sendData);
    setConnected(true);
  };

  // Load user & set up Supabase Realtime
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedPubKey = localStorage.getItem('publicKey');
    const savedPrivKey = localStorage.getItem('privateKey');
    
    // Only treat as registered if all three exist
    if (savedUserId && savedPubKey && savedPrivKey) {
      setUserId(savedUserId);
      setPublicKey(savedPubKey);
      setPrivateKey(savedPrivKey);
      loadFeed();
    } else {
      // If any missing, clear all to show register button
      localStorage.removeItem('userId');
      localStorage.removeItem('publicKey');
      localStorage.removeItem('privateKey');
      setUserId(null);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('activities-channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activities' },
        () => {
          loadFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">SocialMesh P2P</h1>
      {!userId ? (
        <button onClick={registerIdentity} className="bg-blue-500 text-white px-4 py-2 rounded my-4">
          Register New Identity
        </button>
      ) : (
        <div className="my-4 flex items-center gap-4">
          <span>User ID: {userId.slice(0,8)}...</span>
          <button onClick={resetIdentity} className="bg-red-500 text-white px-3 py-1 rounded text-sm">
            Reset Identity
          </button>
        </div>
      )}

      <div className="border p-4 my-4">
        <h2 className="font-bold">Create Post</h2>
        <textarea
          className="border w-full p-2 text-black"
          rows={3}
          value={postText}
          onChange={e => setPostText(e.target.value)}
        />
        <button onClick={createPost} className="bg-green-500 text-white px-4 py-2 rounded">
          Post
        </button>
      </div>

      <div className="my-4">
        <h2 className="font-bold">Feed</h2>
        {feed.map((activity: any) => {
          const content = getContent(activity.activity_id);
          return (
            <div key={activity.activity_id} className="border p-2 my-2">
              <div className="text-sm text-gray-500">Author: {activity.author_id.slice(0,8)}</div>
              <div>{content ? content.text : 'Content not loaded. Request via P2P:'}</div>
              {!content && sendP2P && (
                <button
                  className="bg-blue-500 text-white px-2 py-1 text-sm rounded"
                  onClick={() => {
                    sendP2P(JSON.stringify({ type: 'request_content', activityId: activity.activity_id }));
                  }}
                >
                  Fetch via P2P
                </button>
              )}
              <div className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      <div className="border p-4 my-4">
        <h2 className="font-bold">P2P Debug</h2>
        <div className="flex gap-2">
          <input
            placeholder="Target User ID"
            className="border p-2 flex-1 text-black"
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
          />
          <button onClick={startAsInitiator} className="bg-green-500 text-white px-4 py-2 rounded">
            Call Peer
          </button>
          <button onClick={startAsListener} className="bg-orange-500 text-white px-4 py-2 rounded">
            Wait for Call
          </button>
        </div>
        {connected && <div className="text-green-600">P2P Connected</div>}
      </div>
    </main>
  );
}
