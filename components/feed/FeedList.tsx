import { FeedCard } from './FeedCard';
import { useSocialMesh } from '@/hooks/useSocialMesh';
import { getContent, saveContent } from '@/lib/storage';
import { useEffect, useState } from 'react';

export function FeedList() {
  const {
    userId,
    feed,
    following,
    getLikeCount,
    followUser,
    sendP2P,
    likePost,
    hasLiked,
    isFriendOrPending,
    sendFriendRequest,
    fetchUserProfile,
    profiles,
    connected,
    targetId,
  } = useSocialMesh();

  const [authorProfiles, setAuthorProfiles] = useState<Record<string, any>>({});
  const [loadingContent, setLoadingContent] = useState<Record<string, boolean>>({});

  // ---- Auto‑fetch content when P2P connects and targetId is set ----
  useEffect(() => {
    if (connected && sendP2P && targetId) {
      feed.forEach((activity) => {
        if (activity.author_id === targetId) {
          const content = getContent(activity.activity_id);
          if (!content) {
            sendP2P(JSON.stringify({ type: 'request_content', activityId: activity.activity_id }));
          }
        }
      });
    }
  }, [connected, targetId, feed, sendP2P]);

  // ---- Fetch missing content on feed load (P2P or API fallback) ----
  useEffect(() => {
    if (sendP2P) {
      feed.forEach((activity) => {
        const content = getContent(activity.activity_id);
        if (!content) {
          sendP2P(JSON.stringify({ type: 'request_content', activityId: activity.activity_id }));
        }
      });
    }
    // Fetch author profiles (cached via hook)
    feed.forEach(async (activity) => {
      if (!authorProfiles[activity.author_id]) {
        const profile = await fetchUserProfile(activity.author_id);
        if (profile) {
          setAuthorProfiles((prev) => ({ ...prev, [activity.author_id]: profile }));
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, sendP2P]);

  if (feed.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center text-gray-500 border border-gray-100">
        <span className="text-4xl">📭</span>
        <p className="mt-2 text-lg">No posts yet. Follow someone or create one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {feed.map((activity) => {
        const content = getContent(activity.activity_id);
        const isFollowing = following.includes(activity.author_id);
        const likes = getLikeCount(activity.activity_id);
        const liked = hasLiked(activity.activity_id);
        const friendStatus = isFriendOrPending(activity.author_id);
        const authorProfile = authorProfiles[activity.author_id] || profiles[activity.author_id] || null;
        const isLoading = loadingContent[activity.activity_id];
        const isOwnPost = activity.author_id === userId;

        return (
          <FeedCard
            key={activity.activity_id}
            activity={activity}
            content={content}
            isFollowing={isFollowing}
            likes={likes}
            hasLiked={liked}
            friendStatus={friendStatus}
            authorProfile={authorProfile}
            isOwnPost={isOwnPost}
            onFollow={() => followUser(activity.author_id)}
            onLike={() => likePost(activity.activity_id, activity.author_id)}
            onSendFriendRequest={() => sendFriendRequest(activity.author_id)}
            onFetchP2P={() => {
              if (sendP2P) {
                sendP2P(JSON.stringify({ type: 'request_content', activityId: activity.activity_id }));
              } else {
                // No P2P, show a message (or do nothing)
                console.warn('P2P not connected, cannot fetch content');
              }
            }}
            sendP2P={sendP2P}
            isLoading={isLoading}
          />
        );
      })}
    </div>
  );
}
