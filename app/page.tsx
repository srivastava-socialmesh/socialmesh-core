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
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [following, setFollowing] = useState<string[]>([]);

  // Load feed with optional follow filter
  const loadFeed = async () => {
    try {
      // If we have a following list, fetch only those activities
      // For now, fetch global feed (we'll filter client-side)
      const res = await fetch(`/api/feed`);
      const data = await res.json();
      
      // Filter to show only posts (not likes/comments) and optionally filter by followed users
      let activities = data.activities || [];
      activities = activities.filter((a: any) => a.activity_type === 'POST');
      
      // If following list exists, filter by author
      if (following.length > 0) {
        activities = activities.filter((a: any) => following.includes(a.author_id));
      }
      
      setFeed(activities);
    } catch (e) {
      console.error('Failed to load feed:', e);
    }
  };

  // Load following list from localStorage
  const loadFollowing = () => {
    const saved = localStorage.getItem('following');
    if (saved) {
      setFollowing(JSON.parse(saved));
    }
  };

  // Save following list
  const saveFollowing = (list: string[]) => {
    setFollowing(list);
    localStorage.setItem('following', JSON.stringify(list));
  };

  // Follow a user
  const followUser = async (targetUserId: string) => {
    if (!userId || !privateKey) return alert('Register first');
    if (following.includes(targetUserId)) {
      // Unfollow
      const newList = following.filter(id => id !== targetUserId);
      saveFollowing(newList);
      loadFeed();
      return;
    }

    // Create FOLLOW activity
    const content = { action: 'follow', target: targetUserId, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    
    saveContent(activityId, content);
    
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'FOLLOW',
        parentId: targetUserId, // parent is the user being followed
        rootId: null,
        contentHash,
        signature,
        userId
      })
    });

    // Add to following list
    const newList = [...following, targetUserId];
    saveFollowing(newList);
    loadFeed();
  };

  // Like/Unlike a post
  const toggleLike = async (activityId: string, authorId: string) => {
    if (!userId || !privateKey) return alert('Register first');

    // Check if already liked (local check)
    const allContent = getAllContent();
    const liked = Object.keys(allContent).some(id => 
      id.startsWith('like_') && allContent[id].parentId === activityId
    );

    const type = liked ? 'UNLIKE' : 'LIKE';
    const content = { action: type, target: activityId, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const newActivityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, newActivityId, contentHash);
    
    saveContent(newActivityId, { ...content, parentId: activityId });
    
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId: newActivityId,
        type: type,
        parentId: activityId,
        rootId: activityId,
        contentHash,
        signature,
        userId
      })
    });

    loadFeed();
  };

  // Add a comment
  const addComment = async (postId: string, authorId: string) => {
    if (!userId || !privateKey) return alert('Register first');
    const text = commentText[postId];
    if (!text || !text.trim()) return;

    const content = { text, timestamp: Date.now(), author: userId, parent: postId };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    
    saveContent(activityId, content);
    
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'COMMENT',
        parentId: postId,
        rootId: postId,
        contentHash,
        signature,
        userId
      })
    });

    setCommentText({ ...commentText, [postId]: '' });
    loadFeed();
  };

  // Get likes count for a post
  const getLikes = (postId: string): number => {
    const allContent = getAllContent();
    return Object.keys(allContent).filter(id => 
      allContent[id].parentId === postId && allContent[id].action === 'LIKE'
    ).length;
  };

  // Get comments for a post
  const getComments = (postId: string) => {
    const allContent = getAllContent();
    return Object.keys(allContent)
      .filter(id => allContent[id].parentId === postId && allContent[id].text)
      .map(id => ({ id, ...allContent[id] }));
  };

  const toggleComments = (postId: string) => {
    setExpandedComments({ ...expandedComments, [postId]: !expandedComments[postId] });
  };

  // ... (rest of the functions remain similar: registerIdentity, resetIdentity, createPost, etc.)

  // Register identity
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
      loadFollowing();
      loadFeed();
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Check console for details.');
    }
  };

  const resetIdentity = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('publicKey');
    localStorage.removeItem('privateKey');
    localStorage.removeItem('following');
    setUserId(null);
    setPublicKey('');
    setPrivateKey('');
    setFeed([]);
    setFollowing([]);
    setConnected(false);
    setSendP2P(null);
    window.location.reload();
  };

  const createPost = async () => {
    const storedUserId = localStorage.getItem('userId');
    const storedPrivateKey = localStorage.getItem('privateKey');
    
    if (!storedUserId || !storedPrivateKey) {
      alert('Please register first');
      return;
    }
    
    if (!postText.trim()) return;
    
    try {
      const content = { text: postText, timestamp: Date.now(), author: storedUserId };
      const contentHash = await hashContent(content);
      const activityId = await hashContent({ author: storedUserId, contentHash, nonce: Math.random() });
      const signature = await signActivity(storedPrivateKey, activityId, contentHash);
      
      saveContent(activityId, content);
      
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
          userId: storedUserId
        })
      });
      
      setPostText('');
      loadFeed();
    } catch (error) {
      console.error('Create post error:', error);
    }
  };

  // P2P handlers (same as before)
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

  // Import getAllContent for local checks
  const getAllContent = () => {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem('socialmesh_content') || '{}');
  };

  // useEffect – load user, following, and setup realtime
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedPubKey = localStorage.getItem('publicKey');
    const savedPrivKey = localStorage.getItem('privateKey');
    
    if (savedUserId && savedPubKey && savedPrivKey) {
      setUserId(savedUserId);
      setPublicKey(savedPubKey);
      setPrivateKey(savedPrivKey);
      loadFollowing();
      loadFeed();
    } else {
      localStorage.removeItem('userId');
      localStorage.removeItem('publicKey');
      localStorage.removeItem('privateKey');
      setUserId(null);
    }

    // Supabase Realtime subscription
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
      <h1 className="text-2xl font-bold">SocialMesh</h1>
      
      {!userId ? (
        <button onClick={registerIdentity} className="bg-blue-500 text-white px-4 py-2 rounded my-4">
          Register New Identity
        </button>
      ) : (
        <div className="my-4 flex items-center gap-4">
          <span>👤 {userId.slice(0,8)}...</span>
          <button onClick={resetIdentity} className="bg-red-500 text-white px-3 py-1 rounded text-sm">
            Reset
          </button>
          <span className="text-sm text-gray-500">Following: {following.length}</span>
        </div>
      )}

      {/* Create Post */}
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

      {/* Feed */}
      <div className="my-4">
        <h2 className="font-bold">Feed</h2>
        {feed.length === 0 && <p className="text-gray-500">No posts yet. Follow someone or create one!</p>}
        {feed.map((activity: any) => {
          const content = getContent(activity.activity_id);
          const isFollowing = following.includes(activity.author_id);
          const likesCount = getLikes(activity.activity_id);
          const comments = getComments(activity.activity_id);

          return (
            <div key={activity.activity_id} className="border p-4 my-4">
              <div className="flex justify-between items-start">
                <div className="text-sm text-gray-500">
                  Author: {activity.author_id.slice(0,8)}
                  <button 
                    onClick={() => followUser(activity.author_id)}
                    className={`ml-2 text-xs px-2 py-1 rounded ${isFollowing ? 'bg-gray-300 text-black' : 'bg-blue-500 text-white'}`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>
              
              <div className="my-2">{content ? content.text : 'Loading...'}</div>
              {!content && sendP2P && (
                <button
                  className="bg-blue-500 text-white px-2 py-1 text-sm rounded"
                  onClick={() => {
                    sendP2P(JSON.stringify({ type: 'request_content', activityId: activity.activity_id }));
                  }}
                >
                  Fetch P2P
                </button>
              )}
              
              <div className="flex gap-4 mt-2 text-sm">
                <button 
                  onClick={() => toggleLike(activity.activity_id, activity.author_id)}
                  className="hover:underline"
                >
                  ❤️ {likesCount}
                </button>
                <button 
                  onClick={() => toggleComments(activity.activity_id)}
                  className="hover:underline"
                >
                  💬 {comments.length}
                </button>
              </div>

              {/* Comments Section */}
              {expandedComments[activity.activity_id] && (
                <div className="mt-2 pl-4 border-l-2">
                  {comments.map((c: any) => (
                    <div key={c.id} className="text-sm py-1">
                      <strong>{c.author?.slice(0,6)}:</strong> {c.text}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      className="border p-1 flex-1 text-black text-sm"
                      placeholder="Write a comment..."
                      value={commentText[activity.activity_id] || ''}
                      onChange={(e) => setCommentText({ ...commentText, [activity.activity_id]: e.target.value })}
                    />
                    <button 
                      onClick={() => addComment(activity.activity_id, activity.author_id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 mt-1">{new Date(activity.created_at).toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {/* P2P Debug */}
      <div className="border p-4 my-4">
        <h2 className="font-bold">P2P Connect</h2>
        <div className="flex gap-2">
          <input
            placeholder="Target User ID"
            className="border p-2 flex-1 text-black"
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
          />
          <button onClick={startAsInitiator} className="bg-green-500 text-white px-4 py-2 rounded">
            Call
          </button>
          <button onClick={startAsListener} className="bg-orange-500 text-white px-4 py-2 rounded">
            Listen
          </button>
        </div>
        {connected && <div className="text-green-600 mt-2">✅ P2P Connected</div>}
      </div>
    </main>
  );
}
