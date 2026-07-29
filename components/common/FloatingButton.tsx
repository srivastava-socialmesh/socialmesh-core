// components/common/FloatingButton.tsx
import { Plus } from 'lucide-react';

export function FloatingButton() {
  return (
    <button className="fixed bottom-20 right-4 md:hidden bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition">
      <Plus className="w-6 h-6" />
    </button>
  );
}
