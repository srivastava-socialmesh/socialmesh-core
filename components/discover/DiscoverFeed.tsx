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
        // Check for errors from the API
        if (newsData.error) {
          setError(`News: ${newsData.error}`);
        } else {
          setNews(newsData.articles || []);
        }
        if (youtubeData.error) {
          setError(prev => prev ? `${prev} | YouTube: ${youtubeData.error}` : `YouTube: ${youtubeData.error}`);
        } else {
          setVideos(youtubeData.videos || []);
        }
        // If both have errors, show combined message
        if (newsData.error && youtubeData.error) {
          setError('Content unavailable. Please check API keys.');
        } else if (newsData.error || youtubeData.error) {
          // One failed, but we still have data for the other
          // We'll clear the error if at least one succeeded
          if (newsData.error && !youtubeData.error) {
            setError(null); // only news failed, but we have videos
          } else if (!newsData.error && youtubeData.error) {
            setError(null); // only youtube failed, but we have news
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content');
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
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
        <p className="text-red-500">{error}</p>
        <p className="text-sm text-gray-500 mt-2">
          To enable this feature, add your API keys to Vercel environment variables:
          <br />
          <code className="bg-gray-100 px-2 py-1 rounded">NEWS_API_KEY</code> and{' '}
          <code className="bg-gray-100 px-2 py-1 rounded">YOUTUBE_API_KEY</code>
          <br />
          <a
            href="https://newsapi.org/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Get a free NewsAPI key →
          </a>
          {' | '}
          <a
            href="https://developers.google.com/youtube/v3/getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Get a free YouTube Data API key →
          </a>
        </p>
      </div>
    );
  }

  if (news.length === 0 && videos.length === 0) {
    return <div className="text-center text-gray-500 py-8">No content available at the moment.</div>;
  }

  return (
    <div className="space-y-8">
      {news.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">📰 Top News</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {news.map((article: any, idx) => (
              <NewsCard key={idx} {...article} />
            ))}
          </div>
        </section>
      )}
      {videos.length > 0 && (
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
      )}
    </div>
  );
}
