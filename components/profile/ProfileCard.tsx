// components/profile/ProfileCard.tsx
import { Avatar } from '@/components/common';
import { Edit3 } from 'lucide-react';

interface ProfileCardProps {
  userId: string;
  profile: { name: string; bio: string } | null;
  onEdit: () => void;
  followingCount: number;
  postsCount: number;
  connectionsCount: number;
}

export function ProfileCard({ userId, profile, onEdit, followingCount, postsCount, connectionsCount }: ProfileCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="h-48 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 relative">
        <div className="absolute -bottom-16 left-8">
          <Avatar name={userId} size="xl" className="w-32 h-32 border-4 border-white shadow-xl" />
        </div>
      </div>
      <div className="pt-20 pb-8 px-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{profile?.name || 'Your Name'}</h2>
            <p className="text-base text-gray-500 mt-1">{profile?.bio || 'Add a bio...'}</p>
            <p className="text-sm text-gray-400 mt-2 font-mono">ID: {userId.slice(0, 12)}</p>
          </div>
          <button
            onClick={onEdit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition shadow-md flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" /> Edit
          </button>
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
