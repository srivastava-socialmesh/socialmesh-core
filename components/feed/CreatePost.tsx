// components/feed/CreatePost.tsx
import { Avatar } from '@/components/common';
import { Image, Video } from 'lucide-react';

interface CreatePostProps {
  userId: string;
  postText: string;
  setPostText: (text: string) => void;
  createPost: () => void;
}

export function CreatePost({ userId, postText, setPostText, createPost }: CreatePostProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 transition hover:shadow-xl">
      <div className="flex items-start gap-4">
        <Avatar name={userId} size="lg" />
        <div className="flex-1">
          <textarea
            className="w-full border-0 focus:ring-0 resize-none text-gray-700 placeholder-gray-400 bg-gray-100 rounded-2xl px-5 py-3 text-base"
            rows={2}
            placeholder="What's on your mind?"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            style={{ minHeight: '60px' }}
          />
          <div className="flex justify-between items-center mt-3">
            <div className="flex gap-3">
              <button className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition flex items-center gap-1 text-sm">
                <Image className="w-5 h-5" /> Photo
              </button>
              <button className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition flex items-center gap-1 text-sm">
                <Video className="w-5 h-5" /> Video
              </button>
            </div>
            <button
              onClick={createPost}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition shadow-md"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
