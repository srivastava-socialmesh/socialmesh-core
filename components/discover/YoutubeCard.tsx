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
      className="cursor-pointer bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition hover:shadow-xl group"
    >
      <div className="relative">
        <img src={thumbnail} alt={title} className="w-full h-56 object-cover" />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <span className="text-3xl text-red-600">▶</span>
          </div>
        </div>
        {/* Title overlay on thumbnail */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
          <h3 className="text-white font-bold text-lg line-clamp-2">{title}</h3>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-500 line-clamp-2">{description || 'No description'}</p>
        <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
          <span>{channelTitle}</span>
          <span>{new Date(publishedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
