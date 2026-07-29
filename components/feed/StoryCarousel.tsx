// components/feed/StoryCarousel.tsx
import { Avatar } from '@/components/common';

const stories = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Carol' },
  { id: '4', name: 'Dave' },
  { id: '5', name: 'Eve' },
];

export function StoryCarousel() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex gap-4 overflow-x-auto">
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center gap-1 flex-shrink-0">
          <Avatar name={story.name} size="lg" />
          <span className="text-xs text-gray-600">{story.name}</span>
        </div>
      ))}
    </div>
  );
}
