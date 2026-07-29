// components/layout/RightSidebar.tsx
export function RightSidebar({ feed, followUser }: { feed: any[]; followUser: (id: string) => void }) {
  return (
    <aside className="hidden lg:block w-72 flex-shrink-0">
      <div className="sticky top-20 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Who to follow</h3>
          {feed.slice(0, 4).map((activity) => (
            <div key={activity.author_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs">
                  {activity.author_id.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm">{activity.author_id.slice(0, 6)}</span>
              </div>
              <button
                onClick={() => followUser(activity.author_id)}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition"
              >
                Follow
              </button>
            </div>
          ))}
          {feed.length === 0 && <p className="text-gray-400 text-sm">No suggestions</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Today's news</h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-600">🔹 Ten questions you should answer truthfully</div>
            <div className="text-sm text-gray-600">🔹 Five unbelievable facts about money</div>
            <div className="text-sm text-gray-600">🔹 Best Pinterest Boards for learning about business</div>
            <div className="text-sm text-gray-600">🔹 Skills that you can learn from business</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
