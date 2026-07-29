"use client";

import { useState, useEffect } from 'react';
import { generateIdentity, hashContent, signActivity } from '@/lib/crypto';
import { initiateConnection, waitForConnection } from '@/lib/webrtc';
import { saveContent, getContent, getAllContent } from '@/lib/storage';
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

  // Register identity
  const registerIdentity = async () => {
    const identity = await generateIdentity();
    setPublicKey(identity.publicKey);
    setPrivateKey(identity.privateKey);
    const res = await fetch('/api/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: identity.publicKey, handle: `user-${Date.now()}` })
    });
    const data = await res.json();
    setUserId(data.userId);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('publicKey', identity.publicKey);
    localStorage.setItem('privateKey', identity.privateKey);
    loadFeed();
  };

  // Load feed from Supabase (global recent activities)
  const loadFeed = async () => {
    const res = await fetch(`/api/feed`);
    const data = await res.json();
    setFeed(data.activities || []);
  };

  // Create a post
  const createPost = async () => {
    if (!userId || !privateKey) return alert('Register first');
    const content = { text: postText, timestamp: Date.now(), author: userId };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    
    // Save content locally
    saveContent(activityId, content);
    
    // Send skeleton to server
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'POST',
        parentId: null,
        rootId: null,
        contentHash,
        signature,
        userId
      })
    });
    setPostText('');
    loadFeed(); // refresh feed
  };

  // P2P connection handlers
  const startAsInitiator = async () => {
    if (!userId) return alert('Register first');
    const { sendData } = await initiateConnection(userId, targetId, (data) => {
      // Handle incoming P2P messages (content requests/responses)
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'request_content') {
          const content = getContent(msg.activityId);
          if (content) {
            sendData(JSON.stringify({ type: 'content_response', activityId: msg.activityId, content }));
          }
        } else if (msg.type === 'content_response') {
          // Save received content locally
          saveContent(msg.activityId, msg.content);
          loadFeed(); // refresh feed to show new content
        }
      } catch (e) {
        console.error('P2P message error:', e);
      }
    });
    setSendP2P(() => sendData);
    setConnected(true);
  };

  const startAsListener = async () => {
    if (!userId) return alert('Register first');
    const { sendData } = await waitForConnection(userId, (data) => {
      // Same handlers as above
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'request_content') {
          const content = getContent(msg.activityId);
          if (content) {
            sendData(JSON.stringify({ type: 'content_response', activityId: msg.activityId, content }));
          }
        } else if (msg.type === 'content_response') {
          saveContent(msg.activityId, msg.content);
          loadFeed();
        }
      } catch (e) {
        console.error('P2P message error:', e);
      }
    });
    setSendP2P(() => sendData);
    setConnected(true);
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) {
      setUserId(savedUserId);
      setPublicKey(localStorage.getItem('publicKey') || '');
      setPrivateKey(localStorage.getItem('privateKey') || '');
      loadFeed();
    }
  }, []);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const subscription = supabase
  .channel('activities-channel')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'activities' },
    (payload) => {
      // New activity received
      loadFeed(); // refresh feed
    }
  )
  .subscribe();

return () => {
  supabase.removeChannel(subscription);
};

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">SocialMesh P2P</h1>
      {!userId ? (
        <button onClick={registerIdentity} className="bg-blue-500 text-white px-4 py-2 rounded my-4">
          Register New Identity
        </button>
      ) : (
        <div className="my-4">User ID: {userId.slice(0,8)}...</div>
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
