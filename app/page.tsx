"use client";

import { useSocialMesh } from '@/hooks/useSocialMesh';
import { TopNavbar, LeftSidebar, RightSidebar } from '@/components/layout';
import { StoryCarousel, CreatePost, FeedList } from '@/components/feed';
import { ProfileCard } from '@/components/profile';
import { MessageLayout } from '@/components/messages';
import { FriendsList } from '@/components/friends/FriendsList';
import { DiscoverFeed } from '@/components/discover/DiscoverFeed';
import { FloatingButton } from '@/components/common';
import { useState } from 'react';

export default function Home() {
  const {
    userId,
    following,
    targetId,
    connected,
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
    friends,
    friendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    loadFriendRequests,
    defaultPeer,
    saveDefaultPeer,
  } = useSocialMesh();

  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'messages' | 'friends' | 'discover'>('feed');

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <span className="text-5xl">🌐</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">SocialMesh</h1>
          <p className="text-gray-500 mb-8">Decentralized social network</p>
          <button
            onClick={registerIdentity}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition shadow-md"
          >
            Get Started – Register Identity
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-16 md:pb-0">
      <TopNavbar userId={userId} resetIdentity={resetIdentity} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <LeftSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            connected={connected}
            targetId={targetId}
          />

          <main className="flex-1 min-w-0">
            {activeTab === 'feed' && (
              <>
                <StoryCarousel />
                <div className="mt-6 space-y-6">
                  <CreatePost
                    userId={userId}
                    postText={postText}
                    setPostText={setPostText}
                    postMedia={postMedia}
                    setPostMedia={setPostMedia}
                    createPost={createPost}
                  />
                  <FeedList />
                </div>
              </>
            )}

            {activeTab === 'profile' && (
              <ProfileCard
                userId={userId}
                profile={myProfile}
                onEdit={() => {}}
                onSave={saveProfile}
                followingCount={following.length}
                postsCount={feed.length}
                connectionsCount={dmContacts.length}
              />
            )}

            {activeTab === 'messages' && (
              <MessageLayout
                contacts={dmContacts}
                selectedContact={selectedContact}
                messages={dmMessages}
                userId={userId}
                dmInput={dmInput}
                setDmInput={setDmInput}
                sendDM={sendDM}
                requestDMHistory={requestDMHistory}
                setSelectedContact={setSelectedContact}
                startCall={startAsInitiator}
                startListen={startAsListener}
                targetId={targetId}
                setTargetId={setTargetId}
                connected={connected}
                defaultPeer={defaultPeer}
                saveDefaultPeer={saveDefaultPeer}
              />
            )}

            {activeTab === 'friends' && (
              <FriendsList />
            )}

            {activeTab === 'discover' && (
              <DiscoverFeed />
            )}
          </main>

          <RightSidebar feed={feed} followUser={followUser} />
        </div>
      </div>

      <FloatingButton />

      {/* Mobile Bottom Navigation - responsive */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-1 z-40 shadow-lg">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center text-xs px-2 py-1 rounded-lg transition ${
            activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-[10px]">Feed</span>
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center text-xs px-2 py-1 rounded-lg transition ${
            activeTab === 'discover' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">🔍</span>
          <span className="text-[10px]">Discover</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center text-xs px-2 py-1 rounded-lg transition ${
            activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">👤</span>
          <span className="text-[10px]">Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex flex-col items-center text-xs px-2 py-1 rounded-lg transition ${
            activeTab === 'messages' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">💬</span>
          <span className="text-[10px]">Messages</span>
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex flex-col items-center text-xs px-2 py-1 rounded-lg transition ${
            activeTab === 'friends' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">👥</span>
          <span className="text-[10px]">Friends</span>
        </button>
        <button
          onClick={resetIdentity}
          className="flex flex-col items-center text-xs px-2 py-1 rounded-lg text-red-500"
        >
          <span className="text-xl">🔄</span>
          <span className="text-[10px]">Reset</span>
        </button>
      </nav>
    </div>
  );
}
