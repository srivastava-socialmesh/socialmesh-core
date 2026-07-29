import { useState, useEffect } from 'react';
import { generateIdentity, hashContent, signActivity } from '@/lib/crypto';
import { initiateConnection, waitForConnection } from '@/lib/webrtc';
import { saveContent, getContent, getAllContent } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';

type Activity = { activity_id: string; author_id: string; activity_type: string; parent_id: string | null; root_id: string | null; content_hash: string; created_at: string; };
type Profile = { name: string; bio: string; avatarHash?: string };
type DM = { text: string; sender: string; receiver: string; timestamp: number };
type Media = { type: 'image' | 'video'; data: string }; // base64

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
  const [profileAvatar, setProfileAvatar] = useState<string>(''); // base64
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [dmContacts, setDmContacts] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<{ [contact: string]: DM[] }>({});
  const [dmInput, setDmInput] = useState('');
  const [tick, setTick] = useState(0);

  // ---- Core functions ----

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
        setProfileAvatar(content.avatarHash || '');
      }
    }
  };

  const saveProfile = async (name: string, bio: string, avatarBase64?: string) => {
    if (!userId || !privateKey) return alert('Register first');
    const content: Profile = { name, bio };
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
      console.log('Feed loaded:', activities.length, 'posts');
    } catch (e) {
      console.error('Failed to load feed:', e);
    }
  };

  const createPost = async (text: string, media?: Media) => {
    const storedUserId = localStorage.getItem('userId');
    const storedPrivateKey = localStorage.getItem('privateKey');
    if (!storedUserId || !storedPrivateKey) return alert('Register first');
    if (!text.trim() && !media) return;
    const content: any = { text, timestamp: Date.now(), author: storedUserId };
    if (media) {
      content.media = media; // { type: 'image'|'video', data: base64 }
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
  };

  // ---- Following / Follow / DM (unchanged) ----
  // ... (copy the existing loadFollowing, saveFollowing, followUser, sendDM, requestDMHistory, handleP2PMessage, startAsInitiator, startAsListener, likePost, hasLiked, getLikeCount)

  // ---- (We'll keep the rest of the functions identical) ----
  // For brevity, I'll include them in the final CAT output.

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
  };
}
