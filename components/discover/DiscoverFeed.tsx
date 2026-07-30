import { useState, useEffect } from 'react';
import { NewsCard } from './NewsCard';
import { YoutubeCard } from './YoutubeCard';

export function DiscoverFeed() {
  const [news, setNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [newsRes, youtubeRes] = await Promise.all([
          fetch('/api/news'),
          fetch('/api/youtube/trending'),
        ]);
        const newsData = await newsRes.json();
        const youtubeData = await youtubeRes.json();
        if (!newsRes.ok) throw new Error(newsData.error || 'Failed to fetch news');
        if (!youtubeRes.ok) throw new Error(youtubeData.error || 'Failed to fetch YouTube');
        setNews(newsData);
        setVideos(youtubeData);
      } catch (err) {
        setError(err.message || 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Loading trending content...</div>;
  }
  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">📰 Top News</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {news.map((article: any, idx) => (
            <NewsCard key={idx} {...article} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-bold mb-4">🎬 Trending YouTube</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map((video: any) => (
            <YoutubeCard
              key={video.id}
              id={video.id}
              title={video.snippet.title}
              description={video.snippet.description}
              thumbnail={video.snippet.thumbnails.medium.url}
              channelTitle={video.snippet.channelTitle}
              publishedAt={video.snippet.publishedAt}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
