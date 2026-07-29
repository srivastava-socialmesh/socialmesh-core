// components/common/NotificationMenu.tsx
import { Bell } from 'lucide-react';

export function NotificationMenu() {
  return (
    <button className="relative p-2 rounded-full hover:bg-gray-100 transition">
      <Bell className="w-5 h-5 text-gray-600" />
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
    </button>
  );
}
