// app/page.tsx
"use client";

import { useSocialMesh } from '@/hooks/useSocialMesh';
import { TopNavbar, LeftSidebar, RightSidebar } from '@/components/layout';
import { StoryCarousel, CreatePost, FeedList } from '@/components/feed';
import { ProfileCard } from '@/components/profile';
import { MessageLayout } from '@/components/messages';
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
    profileName,
    profileBio,
    myProfile,
    dmContacts,
    selectedContact,
    dmMessages,
    dmInput,
    setTargetId,
    setPostText,
    setProfileName,
    setProfileBio,
    setSelectedContact,
    setDmInput,
    registerIdentity,
    resetIdentity,
    saveProfile,
    createPost,
    followUser,
    sendDM,
    requestDMHistory,
    startAsInitiator,
    startAsListener,
    getLikeCount,
    loadFeed,
  } = useSocialMesh();

  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'messages'>('feed');

  // If not registered, show registration screen
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
                onEdit={() => {}} // future edit modal
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
              />
            )}
          </main>

          <RightSidebar feed={feed} followUser={followUser} />
        </div>
      </div>

      <FloatingButton />
    </div>
  );
}
