// components/common/SearchBar.tsx
import { Search } from 'lucide-react';

export function SearchBar() {
  return (
    <div className="relative flex-1 max-w-md mx-4">
      <input
        type="text"
        placeholder="Search..."
        className="w-full bg-gray-100 rounded-full px-5 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
    </div>
  );
}
