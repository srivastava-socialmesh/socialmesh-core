interface NewsCardProps {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  source: { name: string };
  publishedAt: string;
}

export function NewsCard({ title, description, url, urlToImage, source, publishedAt }: NewsCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition hover:shadow-xl"
    >
      {urlToImage && (
        <img src={urlToImage} alt={title} className="w-full h-56 object-cover" />
      )}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 text-lg line-clamp-2">{title}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description || 'No description'}</p>
        <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
          <span>{source.name}</span>
          <span>{new Date(publishedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </a>
  );
}
