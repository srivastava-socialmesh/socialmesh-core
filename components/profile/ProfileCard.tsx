import { Avatar } from '@/components/common';
import { Edit3, Camera } from 'lucide-react';
import { useState, useRef } from 'react';

interface ProfileCardProps {
  userId: string;
  profile: { name: string; bio: string; avatarHash?: string } | null;
  onEdit: () => void;
  onSave: (name: string, bio: string, avatarBase64?: string) => void;
  followingCount: number;
  postsCount: number;
  connectionsCount: number;
}

export function ProfileCard({ 
  userId, profile, onEdit, onSave, 
  followingCount, postsCount, connectionsCount 
}: ProfileCardProps) {
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatarHash || '');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave(name, bio, avatarPreview || undefined);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="h-48 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 relative">
        <div className="absolute -bottom-16 left-8">
          <div className="relative">
            <Avatar 
              name={userId} 
              src={avatarPreview || profile?.avatarHash} 
              size="xl" 
              className="w-32 h-32 border-4 border-white shadow-xl"
            />
            {isEditing && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 shadow-lg hover:bg-blue-700 transition"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      </div>
      <div className="pt-20 pb-8 px-8">
        <div className="flex justify-between items-start">
          <div>
            {isEditing ? (
              <input 
                className="text-3xl font-bold text-gray-800 border-b border-gray-300 bg-transparent focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : (
              <h2 className="text-3xl font-bold text-gray-800">{profile?.name || 'Your Name'}</h2>
            )}
            {isEditing ? (
              <textarea 
                className="text-base text-gray-500 mt-1 border-b border-gray-300 bg-transparent focus:outline-none w-full"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            ) : (
              <p className="text-base text-gray-500 mt-1">{profile?.bio || 'Add a bio...'}</p>
            )}
            <p className="text-sm text-gray-400 mt-2 font-mono">ID: {userId.slice(0, 12)}</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave} 
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition shadow-md"
                >
                  Save
                </button>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-full text-sm font-semibold transition"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition shadow-md flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-800">{followingCount}</div>
            <div className="text-sm text-gray-500">Following</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-800">{postsCount}</div>
            <div className="text-sm text-gray-500">Posts</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-800">{connectionsCount}</div>
            <div className="text-sm text-gray-500">Connections</div>
          </div>
        </div>
      </div>
    </div>
  );
}
