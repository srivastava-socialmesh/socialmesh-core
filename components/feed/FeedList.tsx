import { FeedCard } from './FeedCard';
import { useSocialMesh } from '@/hooks/useSocialMesh';
import { getContent } from '@/lib/storage';
import { useEffect } from 'react';

export function FeedList() {
  const { feed, following, getLikeCount, followUser, sendP2P, likePost, hasLiked } = useSocialMesh();

  // Auto-fetch missing content when feed loads and P2P is connected
  useEffect(() => {
    if (sendP2P) {
      feed.forEach(activity => {
        const content = getContent(activity.activity_id);
        if (!content) {
          sendP2P(JSON.stringify({ type: 'request_content', activityId: activity.activity_id }));
        }
      });
    }
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
        return (
          <FeedCard
            key={activity.activity_id}
            activity={activity}
            content={content}
            isFollowing={isFollowing}
            likes={likes}
            hasLiked={liked}
            onFollow={() => followUser(activity.author_id)}
            onLike={() => likePost(activity.activity_id, activity.author_id)}
            onFetchP2P={() => {
              if (sendP2P) {
                sendP2P(JSON.stringify({ type: 'request_content', activityId: activity.activity_id }));
              }
            }}
            sendP2P={sendP2P}
          />
        );
      })}
    </div>
  );
}
