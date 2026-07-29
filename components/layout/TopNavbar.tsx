// components/layout/TopNavbar.tsx
import { Avatar, SearchBar, NotificationMenu } from '@/components/common';
import { useSocialMesh } from '@/hooks/useSocialMesh';

export function TopNavbar({ userId, resetIdentity }: { userId: string; resetIdentity: () => void }) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌐</span>
          <h1 className="text-xl font-bold text-blue-600">SocialMesh</h1>
        </div>
        <SearchBar />
        <div className="flex items-center gap-3">
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
