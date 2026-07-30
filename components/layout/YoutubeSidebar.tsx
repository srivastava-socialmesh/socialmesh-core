import { useState, useEffect } from 'react';

export function YoutubeSidebar() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/youtube/trending');
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setVideos(data.videos || []);
        }
      } catch (e) {
        setError('Failed to load videos');
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading videos...</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-700">🎬 Trending YouTube</h3>
      {videos.map((video: any) => (
        <a
          key={video.id}
          href={`https://www.youtube.com/watch?v=${video.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition"
        >
          <div className="flex gap-3">
            <img src={video.snippet.thumbnails.default.url} alt="" className="w-24 h-16 object-cover rounded" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-800 line-clamp-2">{video.snippet.title}</h4>
              <p className="text-xs text-gray-500 mt-1">{video.snippet.channelTitle}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
