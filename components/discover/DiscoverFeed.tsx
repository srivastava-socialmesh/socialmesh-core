import { useState, useEffect } from 'react';
import { NewsCard } from './NewsCard';
import { YoutubeCard } from './YoutubeCard';
import { YoutubePlayer } from './YoutubePlayer';

type VideoItem = {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium: { url: string };
    };
    channelTitle: string;
    publishedAt: string;
  };
};

export function DiscoverFeed() {
  const [news, setNews] = useState<any[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setNewsError(null);
      setYoutubeError(null);

      try {
        const [newsRes, youtubeRes] = await Promise.all([
          fetch('/api/news'),
          fetch('/api/youtube/trending'),
        ]);

        const newsData = await newsRes.json();
        const youtubeData = await youtubeRes.json();

        if (newsData.error) {
          setNewsError(newsData.error);
          setNews([]);
        } else {
          setNews(newsData.articles || []);
        }

        if (youtubeData.error) {
          setYoutubeError(youtubeData.error);
          setVideos([]);
        } else {
          setVideos(youtubeData.videos || []);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error';
        setNewsError(msg);
        setYoutubeError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Loading trending content...</div>;
  }

  const hasNews = news.length > 0;
  const hasVideos = videos.length > 0;

  if (!hasNews && !hasVideos && !newsError && !youtubeError) {
    return <div className="text-center text-gray-500 py-8">No content available.</div>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">📰 Top News</h2>
        {newsError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
            ⚠️ {newsError}
            {newsError.includes('API key') && (
              <div className="mt-2">
                <a
                  href="https://newsapi.org/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Get a free NewsAPI key →
                </a>
              </div>
            )}
          </div>
        ) : hasNews ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {news.map((article: any, idx) => (
              <NewsCard key={idx} {...article} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No news articles found.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">🎬 Trending YouTube</h2>
        {youtubeError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
            ⚠️ {youtubeError}
            {youtubeError.includes('API key') && (
              <div className="mt-2">
                <a
                  href="https://developers.google.com/youtube/v3/getting-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Get a free YouTube Data API key →
                </a>
              </div>
            )}
          </div>
        ) : hasVideos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((video) => (
              <YoutubeCard
                key={video.id}
                id={video.id}
                title={video.snippet.title}
                description={video.snippet.description}
                thumbnail={video.snippet.thumbnails.medium.url}
                channelTitle={video.snippet.channelTitle}
                publishedAt={video.snippet.publishedAt}
                onClick={(id: string) => {
                  console.log('📺 Setting selected video:', id);
                  setSelectedVideo(id);
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No trending videos found.</p>
        )}
      </section>

      {selectedVideo && (
        <YoutubePlayer
          videoId={selectedVideo}
          title={videos.find((v) => v.id === selectedVideo)?.snippet?.title || 'Video'}
          onClose={() => {
            console.log('❌ Closing video player');
            setSelectedVideo(null);
          }}
        />
      )}
    </div>
  );
}
