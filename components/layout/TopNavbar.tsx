import { Avatar, SearchBar, NotificationMenu } from '@/components/common';
import { Home, User, MessageCircle, Users } from 'lucide-react';

interface TopNavbarProps {
  userId: string;
  resetIdentity: () => void;
  activeTab: 'feed' | 'profile' | 'messages' | 'friends';
  setActiveTab: (tab: 'feed' | 'profile' | 'messages' | 'friends') => void;
}

export function TopNavbar({ userId, resetIdentity, activeTab, setActiveTab }: TopNavbarProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌐</span>
          <h1 className="text-xl font-bold text-blue-600">SocialMesh</h1>
        </div>

        <SearchBar />

        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('feed')}
            className={`p-2 rounded-full transition ${activeTab === 'feed' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            <Home className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`p-2 rounded-full transition ${activeTab === 'profile' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            <User className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`p-2 rounded-full transition ${activeTab === 'messages' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`p-2 rounded-full transition ${activeTab === 'friends' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            <Users className="w-5 h-5" />
          </button>
          <NotificationMenu />
          <Avatar name={userId.slice(0, 8)} size="sm" />
          <button
            onClick={resetIdentity}
            className="text-sm text-red-500 hover:text-red-700 transition"
            title="Reset identity"
          >
            🔄
          </button>
        </div>
      </div>
    </header>
  );
}
