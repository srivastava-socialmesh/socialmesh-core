import { useState, useEffect } from 'react';
import { generateIdentity, hashContent, signActivity } from '@/lib/crypto';
import { initiateConnection, waitForConnection } from '@/lib/webrtc';
import { saveContent, getContent, getAllContent } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';

type Activity = { activity_id: string; author_id: string; activity_type: string; parent_id: string | null; root_id: string | null; content_hash: string; created_at: string; };
type Profile = { name: string; bio: string; avatarHash?: string };
type DM = { text: string; sender: string; receiver: string; timestamp: number };
type Media = { type: 'image' | 'video'; data: string };

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
  const [postMedia, setPostMedia] = useState<Media | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string>('');
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [dmContacts, setDmContacts] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<{ [contact: string]: DM[] }>({});
  const [dmInput, setDmInput] = useState('');
  const [tick, setTick] = useState(0);
  // Friends
  const [friends, setFriends] = useState<string[]>([]);
  const [friendRequests, setFriendRequests] = useState<Activity[]>([]);

  // ---- Helper functions (hoisted) ----

  function loadFollowing() {
    const saved = localStorage.getItem('following');
    if (saved) setFollowing(JSON.parse(saved));
  }

  function saveFollowing(list: string[]) {
    setFollowing(list);
    localStorage.setItem('following', JSON.stringify(list));
  }

  function loadFriends() {
    const saved = localStorage.getItem('friends');
    if (saved) setFriends(JSON.parse(saved));
  }

  function saveFriends(list: string[]) {
    setFriends(list);
    localStorage.setItem('friends', JSON.stringify(list));
  }

  async function loadMyProfile() {
    if (!userId) return;
    // 1. Try local storage first
    const allContent = getAllContent();
    const profileId = Object.keys(allContent).find(id => {
      const c = allContent[id];
      return c.name && c.bio && c.author === userId;
    });
    if (profileId) {
      const content = allContent[profileId];
      setMyProfile(content);
      setProfileName(content.name || '');
      setProfileBio(content.bio || '');
      setProfileAvatar(content.avatarHash || '');
      return;
    }
    // 2. Fallback to API
    const res = await fetch(`/api/feed?userId=${userId}`);
    const data = await res.json();
    const profileActivity = data.activities?.find((a: any) => a.activity_type === 'PROFILE' && a.author_id === userId);
    if (profileActivity) {
      const content = getContent(profileActivity.activity_id);
      if (content) {
        setMyProfile(content);
        setProfileName(content.name || '');
        setProfileBio(content.bio || '');
        setProfileAvatar(content.avatarHash || '');
        saveContent(`profile_${userId}`, content);
      }
    }
  }

  async function loadFeed() {
    try {
      const res = await fetch(`/api/feed`);
      const data = await res.json();
      let activities = data.activities || [];
      activities = activities.filter((a: any) => a.activity_type === 'POST');
      if (following.length > 0) {
        activities = activities.filter((a: any) => following.includes(a.author_id));
      }
      setFeed(activities);
      console.log('Feed loaded:', activities.length, 'posts');
    } catch (e) {
      console.error('Failed to load feed:', e);
    }
  }

  async function loadFriendRequests() {
    if (!userId) return;
    const res = await fetch(`/api/feed?userId=${userId}`);
    const data = await res.json();
    const requests = data.activities?.filter((a: any) => 
      a.activity_type === 'FRIEND_REQUEST' && a.parent_id === userId
    ) || [];
    setFriendRequests(requests);
  }

  // ---- Core functions ----

  async function registerIdentity() {
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
      loadFriends();
      loadFeed();
      loadMyProfile();
      loadFriendRequests();
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Check console.');
    }
  }

  function resetIdentity() {
    localStorage.removeItem('userId');
    localStorage.removeItem('publicKey');
    localStorage.removeItem('privateKey');
    localStorage.removeItem('following');
    localStorage.removeItem('friends');
    setUserId(null);
    setFollowing([]);
    setFriends([]);
    setFeed([]);
    setConnected(false);
    setSendP2P(null);
    window.location.reload();
  }

  async function saveProfile(name: string, bio: string, avatarBase64?: string) {
    if (!userId || !privateKey) return alert('Register first');
    const content: Profile = { name, bio, author: userId };
    if (avatarBase64) content.avatarHash = avatarBase64;
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
    if (avatarBase64) setProfileAvatar(avatarBase64);
    // Also save in local storage for quick retrieval
    saveContent(`profile_${userId}`, content);
    alert('Profile saved!');
  }

  async function createPost(text: string, media?: Media) {
    const storedUserId = localStorage.getItem('userId');
    const storedPrivateKey = localStorage.getItem('privateKey');
    if (!storedUserId || !storedPrivateKey) return alert('Register first');
    if (!text.trim() && !media) return;
    const content: any = { text, timestamp: Date.now(), author: storedUserId };
    if (media) {
      content.media = media;
    }
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
    setPostMedia(null);
    loadFeed();
  }

  async function followUser(targetUserId: string) {
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
  }

  async function sendDM(receiver: string, text: string) {
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
  }

  async function requestDMHistory(contact: string) {
    if (!sendP2P) return;
    sendP2P(JSON.stringify({ type: 'request_dm_history', contactId: contact }));
  }

  function handleP2PMessage(data: string, sendFn: (msg: string) => void) {
    console.log('P2P message received:', data);
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
        case 'new_like': {
          console.log('Received new_like via P2P:', msg);
          saveContent(msg.activityId, msg.content);
          loadFeed();
          break;
        }
        default: console.log('Unknown P2P message type:', msg.type);
      }
    } catch (e) {
      console.error('P2P message error:', e);
    }
  }

  async function startAsInitiator() {
    if (!userId) return alert('Register first');
    const { sendData } = await initiateConnection(userId, targetId, (data) => {
      handleP2PMessage(data, sendData);
    });
    setSendP2P(() => sendData);
    setConnected(true);
    setTimeout(() => requestDMHistory(targetId), 1000);
  }

  async function startAsListener() {
    if (!userId) return alert('Register first');
    const { sendData } = await waitForConnection(userId, (data) => {
      handleP2PMessage(data, sendData);
    });
    setSendP2P(() => sendData);
    setConnected(true);
  }

  // ---- Like functionality ----
  async function likePost(postId: string, authorId: string) {
    console.log('likePost called for post:', postId);
    if (!userId || !privateKey) {
      alert('Register first');
      return;
    }
    const allContent = getAllContent();
    const existingLike = Object.keys(allContent).find(id => {
      const c = allContent[id];
      return c.parentId === postId && c.action === 'LIKE' && c.sender === userId;
    });
    if (existingLike) {
      alert('You already liked this post');
      return;
    }
    const content = { action: 'LIKE', target: postId, sender: userId, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    console.log('Saving like locally:', activityId);
    saveContent(activityId, { ...content, parentId: postId });
    const res = await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'LIKE',
        parentId: postId,
        rootId: postId,
        contentHash,
        signature,
        userId
      })
    });
    const data = await res.json();
    console.log('Server response for like:', data);
    if (!res.ok) {
      console.error('Server error on like:', data);
      alert('Failed to like: ' + (data.error || 'Unknown error'));
      return;
    }
    if (sendP2P) {
      console.log('Broadcasting like via P2P');
      sendP2P(JSON.stringify({ type: 'new_like', activityId, content, signature }));
    }
    setTick(prev => prev + 1);
    loadFeed();
  }

  function hasLiked(postId: string): boolean {
    const allContent = getAllContent();
    return Object.keys(allContent).some(id => {
      const c = allContent[id];
      return c.parentId === postId && c.action === 'LIKE' && c.sender === userId;
    });
  }

  function getLikeCount(activityId: string): number {
    const allContent = getAllContent();
    return Object.keys(allContent).filter(id => {
      const c = allContent[id];
      return c.parentId === activityId && c.action === 'LIKE';
    }).length;
  }

  // ---- Friend functions ----
  async function sendFriendRequest(targetUserId: string) {
    if (!userId || !privateKey) return alert('Register first');
    if (friends.includes(targetUserId)) return alert('Already friends');
    const allContent = getAllContent();
    const existingReq = Object.keys(allContent).find(id => {
      const c = allContent[id];
      return c.type === 'FRIEND_REQUEST' && c.sender === userId && c.target === targetUserId;
    });
    if (existingReq) return alert('Request already sent');

    const content = { type: 'FRIEND_REQUEST', sender: userId, target: targetUserId, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    saveContent(activityId, content);
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'FRIEND_REQUEST',
        parentId: targetUserId,
        rootId: null,
        contentHash,
        signature,
        userId
      })
    });
    alert('Friend request sent!');
    loadFriendRequests();
  }

  async function acceptFriendRequest(requestId: string, senderId: string) {
    if (!userId || !privateKey) return alert('Register first');
    const content = { type: 'FRIEND_ACCEPT', sender: userId, target: senderId, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    saveContent(activityId, content);
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'FRIEND_ACCEPT',
        parentId: requestId,
        rootId: null,
        contentHash,
        signature,
        userId
      })
    });
    const newFriends = [...friends, senderId];
    saveFriends(newFriends);
    loadFriendRequests();
    alert('Friend request accepted!');
  }

  // ---- useEffect ----
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedPubKey = localStorage.getItem('publicKey');
    const savedPrivKey = localStorage.getItem('privateKey');
    if (savedUserId && savedPubKey && savedPrivKey) {
      setUserId(savedUserId);
      setPublicKey(savedPubKey);
      setPrivateKey(savedPrivKey);
      loadFollowing();
      loadFriends();
      loadFeed();
      loadMyProfile();
      loadFriendRequests();
    } else {
      localStorage.removeItem('userId');
      localStorage.removeItem('publicKey');
      localStorage.removeItem('privateKey');
      localStorage.removeItem('following');
      localStorage.removeItem('friends');
      setUserId(null);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase
      .channel('activities-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => {
        loadFeed();
        loadFriendRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ---- Return ----
  return {
    userId,
    publicKey,
    privateKey,
    following,
    targetId,
    connected,
    sendP2P,
    feed,
    postText,
    setPostText,
    postMedia,
    setPostMedia,
    profileName,
    setProfileName,
    profileBio,
    setProfileBio,
    profileAvatar,
    setProfileAvatar,
    myProfile,
    dmContacts,
    selectedContact,
    dmMessages,
    dmInput,
    setDmInput,
    setTargetId,
    setSelectedContact,
    friends,
    friendRequests,
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
    likePost,
    hasLiked,
    tick,
    sendFriendRequest,
    acceptFriendRequest,
    loadFriendRequests,
  };
}
