// components/feed/FeedList.tsx
import { FeedCard } from './FeedCard';
import { useSocialMesh } from '@/hooks/useSocialMesh';
import { getContent } from '@/lib/storage';  // 👈 Add this import

export function FeedList() {
  const { feed, following, getLikeCount, followUser, sendP2P } = useSocialMesh();

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
        const content = getContent(activity.activity_id);  // ✅ Now works
        const isFollowing = following.includes(activity.author_id);
        const likes = getLikeCount(activity.activity_id);
        return (
          <FeedCard
            key={activity.activity_id}
            activity={activity}
            content={content}
            isFollowing={isFollowing}
            likes={likes}
            onFollow={() => followUser(activity.author_id)}
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
