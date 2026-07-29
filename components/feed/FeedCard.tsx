import { Avatar } from '@/components/common';
import { Heart, MessageCircle, Share2 } from 'lucide-react';

interface FeedCardProps {
  activity: {
    activity_id: string;
    author_id: string;
    created_at: string;
  };
  content: any;
  isFollowing: boolean;
  likes: number;
  hasLiked: boolean;
  onFollow: () => void;
  onLike: () => void;
  onFetchP2P?: () => void;
  sendP2P: ((msg: string) => void) | null;
}

export function FeedCard({
  activity,
  content,
  isFollowing,
  likes,
  hasLiked,
  onFollow,
  onLike,
  onFetchP2P,
  sendP2P,
}: FeedCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition hover:shadow-xl">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={activity.author_id} size="lg" />
            <div>
              <p className="font-bold text-gray-800 text-lg">{activity.author_id.slice(0, 8)}</p>
              <p className="text-sm text-gray-400">{new Date(activity.created_at).toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={onFollow}
            className={`text-sm px-4 py-1.5 rounded-full font-semibold transition ${
              isFollowing
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        <div className="mt-4 text-gray-800 whitespace-pre-wrap text-base leading-relaxed">
          {content ? content.text : (
            <span className="text-gray-400">Loading content...</span>
          )}
          {!content && sendP2P && (
            <button
              className="ml-3 text-blue-500 text-sm font-medium hover:underline"
              onClick={onFetchP2P}
            >
              Fetch P2P
            </button>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="flex gap-8">
            <button
              onClick={onLike}
              className={`flex items-center gap-2 text-sm font-medium transition ${
                hasLiked ? 'text-red-500' : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <Heart className={`w-5 h-5 ${hasLiked ? 'fill-red-500' : ''}`} />
              <span>{likes}</span>
            </button>
            <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition font-medium">
              <MessageCircle className="w-5 h-5" /> 0
            </button>
            <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition font-medium">
              <Share2 className="w-5 h-5" /> Share
            </button>
          </div>
          <span className="text-xs text-gray-400 font-mono">🌐 P2P</span>
        </div>
      </div>
    </div>
  );
}
