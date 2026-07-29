// components/layout/LeftSidebar.tsx
import { Home, User, MessageCircle, Users } from 'lucide-react';

interface LeftSidebarProps {
  activeTab: 'feed' | 'profile' | 'messages';
  setActiveTab: (tab: 'feed' | 'profile' | 'messages') => void;
  connected: boolean;
  targetId: string;
}

export function LeftSidebar({ activeTab, setActiveTab, connected, targetId }: LeftSidebarProps) {
  const navItems = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
  ];

  return (
    <aside className="md:w-52 flex-shrink-0">
      <nav className="sticky top-20 space-y-1 bg-white rounded-2xl shadow-sm p-2 border border-gray-200">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              activeTab === item.id ? 'bg-blue-50 text-blue-600 font-semibold' : 'hover:bg-gray-50'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
        <div className="border-t border-gray-200 my-2 pt-2 text-xs text-gray-400 px-4">
          <div>P2P: {connected ? '✅ Connected' : '❌ Disconnected'}</div>
          {connected && <div className="text-green-600">Peer: {targetId.slice(0, 6)}</div>}
        </div>
      </nav>
    </aside>
  );
}
