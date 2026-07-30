"use client";

import { useSocialMesh } from '@/hooks/useSocialMesh';
import { TopNavbar } from '@/components/layout';
import { StoryCarousel, CreatePost, FeedList } from '@/components/feed';
import { ProfileCard } from '@/components/profile';
import { MessageLayout } from '@/components/messages';
import { FriendsList } from '@/components/friends/FriendsList';
import { NewsSidebar } from '@/components/layout/NewsSidebar';
import { YoutubeSidebar } from '@/components/layout/YoutubeSidebar';
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

  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'messages' | 'friends'>('feed');

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
    <div className="min-h-screen bg-gray-100">
      <TopNavbar
        userId={userId}
        resetIdentity={resetIdentity}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Left: News Sidebar */}
            <aside className="hidden md:block md:col-span-1">
              <div className="sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto">
                <NewsSidebar />
              </div>
            </aside>

            {/* Center: Feed */}
            <main className="md:col-span-2">
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
            </main>

            {/* Right: YouTube Sidebar */}
            <aside className="hidden md:block md:col-span-1">
              <div className="sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto">
                <YoutubeSidebar />
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto">
            <ProfileCard
              userId={userId}
              profile={myProfile}
              onEdit={() => {}}
              onSave={saveProfile}
              followingCount={following.length}
              postsCount={feed.length}
              connectionsCount={dmContacts.length}
            />
          </div>
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
      </div>

      <FloatingButton />
    </div>
  );
}
