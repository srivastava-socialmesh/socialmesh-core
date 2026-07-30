interface YoutubeCardProps {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  onClick: (id: string) => void;
}

export function YoutubeCard({ id, title, description, thumbnail, channelTitle, publishedAt, onClick }: YoutubeCardProps) {
  return (
    <div
      onClick={() => onClick(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(id)}
      className="cursor-pointer bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition hover:shadow-xl"
    >
      <div className="relative">
        <img src={thumbnail} alt={title} className="w-full h-48 object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <span className="text-3xl text-red-600">▶</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-800 text-lg line-clamp-2">{title}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description || 'No description'}</p>
        <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
          <span>{channelTitle}</span>
          <span>{new Date(publishedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
