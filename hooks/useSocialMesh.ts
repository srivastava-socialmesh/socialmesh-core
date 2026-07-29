"use client";


import { useState, useEffect } from 'react';
import { generateIdentity, hashContent, signActivity } from '@/lib/crypto';
import { initiateConnection, waitForConnection } from '@/lib/webrtc';
import { saveContent, getContent, getAllContent } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';

type Activity = { activity_id: string; author_id: string; activity_type: string; parent_id: string | null; root_id: string | null; content_hash: string; created_at: string; };
type Profile = { name: string; bio: string; avatarHash?: string };
type DM = { text: string; sender: string; receiver: string; timestamp: number };

export function useSocialMesh() {
  // ---- State ----
  const [userId, setUserId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [following, setFollowing] = useState<string[]>([]);
  const [targetId, setTargetId] = useState('');
  const [connected, setConnected] = useState(false);
  const [sendP2P, setSendP2P] = useState<((msg: string) => void) | null>(null);
  const [feed, setFeed] = useState<Activity[]>([]);
  const [postText, setPostText] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [dmContacts, setDmContacts] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<{ [contact: string]: DM[] }>({});
  const [dmInput, setDmInput] = useState('');

  // ---- Core functions (exactly as before) ----
  const registerIdentity = async () => {
    try {
      const identity = await generateIdentity();
      setPublicKey(identity.publicKey);
      setPrivateKey(identity.privateKey);
      const res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: identity.publicKey, handle: `user-${Date.now()}` })
      });
      const data = await res.json();
      if (!res.ok || !data.userId) throw new Error(data.error || 'Registration failed');
      setUserId(data.userId);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('publicKey', identity.publicKey);
      localStorage.setItem('privateKey', identity.privateKey);
      loadFollowing();
      loadFeed();
      loadMyProfile();
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Check console.');
    }
  };

  const resetIdentity = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('publicKey');
    localStorage.removeItem('privateKey');
    localStorage.removeItem('following');
    setUserId(null);
    setFollowing([]);
    setFeed([]);
    setConnected(false);
    setSendP2P(null);
    window.location.reload();
  };

  const loadMyProfile = async () => {
    if (!userId) return;
    const res = await fetch(`/api/feed?userId=${userId}`);
    const data = await res.json();
    const profileActivity = data.activities?.find((a: any) => a.activity_type === 'PROFILE' && a.author_id === userId);
    if (profileActivity) {
      const content = getContent(profileActivity.activity_id);
      if (content) {
        setMyProfile(content);
        setProfileName(content.name || '');
        setProfileBio(content.bio || '');
      }
    }
  };

  const saveProfile = async () => {
    if (!userId || !privateKey) return alert('Register first');
    const content: Profile = { name: profileName, bio: profileBio };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    saveContent(activityId, content);
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, type: 'PROFILE', parentId: null, rootId: null, contentHash, signature, userId })
    });
    setMyProfile(content);
    alert('Profile saved!');
  };

  const loadFeed = async () => {
    try {
      const res = await fetch(`/api/feed`);
      const data = await res.json();
      let activities = data.activities || [];
      activities = activities.filter((a: any) => a.activity_type === 'POST');
      if (following.length > 0) {
        activities = activities.filter((a: any) => following.includes(a.author_id));
      }
      setFeed(activities);
    } catch (e) {
      console.error('Failed to load feed:', e);
    }
  };

  const createPost = async () => {
    const storedUserId = localStorage.getItem('userId');
    const storedPrivateKey = localStorage.getItem('privateKey');
    if (!storedUserId || !storedPrivateKey) return alert('Register first');
    if (!postText.trim()) return;
    const content = { text: postText, timestamp: Date.now(), author: storedUserId };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: storedUserId, contentHash, nonce: Math.random() });
    const signature = await signActivity(storedPrivateKey, activityId, contentHash);
    saveContent(activityId, content);
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, type: 'POST', parentId: null, rootId: null, contentHash, signature, userId: storedUserId })
    });
    setPostText('');
    loadFeed();
  };

  const loadFollowing = () => {
    const saved = localStorage.getItem('following');
    if (saved) setFollowing(JSON.parse(saved));
  };

  const saveFollowing = (list: string[]) => {
    setFollowing(list);
    localStorage.setItem('following', JSON.stringify(list));
  };

  const followUser = async (targetUserId: string) => {
    if (!userId || !privateKey) return alert('Register first');
    if (following.includes(targetUserId)) {
      saveFollowing(following.filter(id => id !== targetUserId));
      loadFeed();
      return;
    }
    const content = { action: 'follow', target: targetUserId, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    saveContent(activityId, content);
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, type: 'FOLLOW', parentId: targetUserId, rootId: null, contentHash, signature, userId })
    });
    saveFollowing([...following, targetUserId]);
    loadFeed();
  };

  const sendDM = async (receiver: string, text: string) => {
    if (!userId || !privateKey) return alert('Register first');
    if (!text.trim()) return;
    if (!sendP2P) return alert('P2P not connected');
    const content: DM = { text, sender: userId, receiver, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    saveContent(activityId, content);
    sendP2P(JSON.stringify({ type: 'dm_message', activityId, content, signature }));
    setDmMessages(prev => ({ ...prev, [receiver]: [...(prev[receiver] || []), content] }));
    setDmInput('');
  };

  const requestDMHistory = async (contact: string) => {
    if (!sendP2P) return;
    sendP2P(JSON.stringify({ type: 'request_dm_history', contactId: contact }));
  };

  const handleP2PMessage = (data: string, sendFn: (msg: string) => void) => {
    try {
      const msg = JSON.parse(data);
      switch (msg.type) {
        case 'request_content': {
          const content = getContent(msg.activityId);
          if (content) sendFn(JSON.stringify({ type: 'content_response', activityId: msg.activityId, content }));
          break;
        }
        case 'content_response': {
          saveContent(msg.activityId, msg.content);
          loadFeed();
          break;
        }
        case 'request_profile': {
          if (myProfile) sendFn(JSON.stringify({ type: 'profile_response', profile: myProfile }));
          break;
        }
        case 'profile_response': {
          const profileId = `profile_${Date.now()}`;
          saveContent(profileId, { ...msg.profile, author: targetId });
          alert('Profile received!');
          break;
        }
        case 'dm_message': {
          saveContent(msg.activityId, msg.content);
          const contact = msg.content.sender;
          setDmMessages(prev => ({ ...prev, [contact]: [...(prev[contact] || []), msg.content] }));
          if (!dmContacts.includes(contact)) setDmContacts(prev => [...prev, contact]);
          break;
        }
        case 'request_dm_history': {
          const allContent = getAllContent();
          const dms = Object.keys(allContent)
            .filter(id => {
              const c = allContent[id];
              return c.sender && c.receiver && (c.sender === msg.contactId || c.receiver === msg.contactId);
            })
            .map(id => allContent[id]);
          sendFn(JSON.stringify({ type: 'dm_history_response', messages: dms }));
          break;
        }
        case 'dm_history_response': {
          msg.messages.forEach((dm: DM) => {
            const id = `dm_${dm.sender}_${dm.receiver}_${dm.timestamp}`;
            saveContent(id, dm);
            const contact = dm.sender === userId ? dm.receiver : dm.sender;
            setDmMessages(prev => ({ ...prev, [contact]: [...(prev[contact] || []), dm] }));
            if (!dmContacts.includes(contact)) setDmContacts(prev => [...prev, contact]);
          });
          break;
        }
        default: console.log('Unknown P2P message type:', msg.type);
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
    setTimeout(() => requestDMHistory(targetId), 1000);
  };

  const startAsListener = async () => {
    if (!userId) return alert('Register first');
    const { sendData } = await waitForConnection(userId, (data) => {
      handleP2PMessage(data, sendData);
    });
    setSendP2P(() => sendData);
    setConnected(true);
  };

  const getLikeCount = (activityId: string): number => {
    const allContent = getAllContent();
    return Object.keys(allContent).filter(id => {
      const c = allContent[id];
      return c.parentId === activityId && c.action === 'LIKE';
    }).length;
  };

  // ---- useEffect for initialization and realtime ----
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
      loadMyProfile();
    } else {
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => loadFeed())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ---- Return everything the UI needs ----
  return {
    // State
    userId,
    publicKey,
    privateKey,
    following,
    targetId,
    connected,
    sendP2P,
    feed,
    postText,
    profileName,
    profileBio,
    myProfile,
    dmContacts,
    selectedContact,
    dmMessages,
    dmInput,
    // Setters
    setTargetId,
    setPostText,
    setProfileName,
    setProfileBio,
    setSelectedContact,
    setDmInput,
    // Functions
    registerIdentity,
    resetIdentity,
    loadMyProfile,
    saveProfile,
    loadFeed,
    createPost,
    followUser,
    sendDM,
    requestDMHistory,
    startAsInitiator,
    startAsListener,
    getLikeCount,
    // Also expose for P2P message handler (if needed)
  };
}
