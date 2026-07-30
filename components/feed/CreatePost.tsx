import { Avatar } from '@/components/common';
import { Image, Video, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface CreatePostProps {
  userId: string;
  postText: string;
  setPostText: (text: string) => void;
  postMedia: { type: 'image' | 'video'; data: string } | null;
  setPostMedia: (media: { type: 'image' | 'video'; data: string } | null) => void;
  createPost: (text: string, media: any) => void;
}

export function CreatePost({ userId, postText, setPostText, postMedia, setPostMedia, createPost }: CreatePostProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Check file size (max 2MB for images, 5MB for videos)
    const maxSize = mediaType === 'image' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Max ${maxSize / (1024 * 1024)}MB for ${mediaType}s.`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPostMedia({ type: mediaType, data: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setPostMedia(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
          {postMedia && (
            <div className="relative mt-2">
              {postMedia.type === 'image' && (
                <img src={postMedia.data} alt="attachment" className="max-h-60 rounded-lg" />
              )}
              {postMedia.type === 'video' && (
                <video src={postMedia.data} controls className="max-h-60 rounded-lg" />
              )}
              <button 
                onClick={removeMedia}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="flex justify-between items-center mt-3">
            <div className="flex gap-3">
              <button 
                onClick={() => { setMediaType('image'); fileInputRef.current?.click(); }}
                className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition flex items-center gap-1 text-sm"
              >
                <Image className="w-5 h-5" /> Photo
              </button>
              <button 
                onClick={() => { setMediaType('video'); fileInputRef.current?.click(); }}
                className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition flex items-center gap-1 text-sm"
              >
                <Video className="w-5 h-5" /> Video
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept={mediaType === 'image' ? 'image/*' : 'video/*'} 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
            <button
              onClick={() => createPost(postText, postMedia)}
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
