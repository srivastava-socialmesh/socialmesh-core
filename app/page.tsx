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

// Register identity – with error handling
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
    console.log('Registration response:', data); // 👈 Check browser console
    
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

// Create post – with better validation
const createPost = async () => {
  const storedUserId = localStorage.getItem('userId');
  const storedPrivateKey = localStorage.getItem('privateKey');
  
  if (!storedUserId || !storedPrivateKey) {
    alert('Please register first (click "Register New Identity")');
    return;
  }
  
  // Use stored values, not state, to avoid race conditions
  const uid = storedUserId;
  const privKey = storedPrivateKey;
  
  if (!postText.trim()) {
    alert('Please enter some text');
    return;
  }
  
  try {
    const content = { text: postText, timestamp: Date.now(), author: uid };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: uid, contentHash, nonce: Math.random() });
    const signature = await signActivity(privKey, activityId, contentHash);
    
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
        userId: uid
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
