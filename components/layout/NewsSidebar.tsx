import { useState, useEffect } from 'react';

export function NewsSidebar() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setNews(data.articles || []);
        }
      } catch (e) {
        setError('Failed to load news');
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading news...</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-700">📰 Top News</h3>
      {news.map((article: any, idx) => (
        <a
          key={idx}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition"
        >
          <div className="flex gap-3">
            {article.urlToImage && (
              <img src={article.urlToImage} alt="" className="w-16 h-16 object-cover rounded" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-800 line-clamp-2">{article.title}</h4>
              <p className="text-xs text-gray-500 mt-1">{article.source.name}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
