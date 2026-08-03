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
  friendStatus: 'friend' | 'pending' | 'none';
  authorProfile?: { name: string; avatarHash?: string } | null;
  isOwnPost: boolean;
  onFollow: () => void;
  onLike: () => void;
  onSendFriendRequest: () => void;
  onFetchP2P?: () => void;
  sendP2P: ((msg: string) => void) | null;
  isLoading?: boolean;
}

export function FeedCard({
  activity,
  content,
  isFollowing,
  likes,
  hasLiked,
  friendStatus,
  authorProfile,
  isOwnPost,
  onFollow,
  onLike,
  onSendFriendRequest,
  onFetchP2P,
  sendP2P,
  isLoading,
}: FeedCardProps) {
  const displayName = authorProfile?.name || activity.author_id.slice(0, 8);
  const avatarSrc = authorProfile?.avatarHash || undefined;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition hover:shadow-xl">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={displayName} src={avatarSrc} size="lg" />
            <div>
              <p className="font-bold text-gray-800 text-lg">{displayName}</p>
              <p className="text-sm text-gray-400">{new Date(activity.created_at).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isOwnPost && (
              <>
                {friendStatus === 'none' && (
                  <button
                    onClick={onSendFriendRequest}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600"
                  >
                    Add Friend
                  </button>
                )}
                {friendStatus === 'pending' && (
                  <span className="text-xs text-yellow-500">Pending</span>
                )}
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
              </>
            )}
            {isOwnPost && (
              <span className="text-xs text-gray-400">You</span>
            )}
          </div>
        </div>

        {content && content.media && (
          <div className="mt-4">
            {content.media.type === 'image' && (
              <img src={content.media.data} alt="post" className="rounded-lg max-h-96 w-full object-contain" />
            )}
            {content.media.type === 'video' && (
              <video src={content.media.data} controls className="rounded-lg max-h-96 w-full" />
            )}
          </div>
        )}

        <div className="mt-4 text-gray-800 whitespace-pre-wrap text-base leading-relaxed">
          {isLoading ? (
            <span className="text-gray-400">Loading content...</span>
          ) : content ? (
            content.text
          ) : (
            <span className="text-gray-400">Content not available. </span>
          )}
          {!content && !isLoading && sendP2P && (
            <button
              className="ml-3 text-blue-500 text-sm font-medium hover:underline"
              onClick={onFetchP2P}
            >
              Fetch P2P
            </button>
          )}
          {!content && !isLoading && !sendP2P && (
            <button
              className="ml-3 text-blue-500 text-sm font-medium hover:underline"
              onClick={onFetchP2P}
            >
              Fetch from Server
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
