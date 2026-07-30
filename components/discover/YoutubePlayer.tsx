"use client";

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface YoutubePlayerProps {
  videoId: string;
  title: string;
  onClose: () => void;
}

export function YoutubePlayer({ videoId, title, onClose }: YoutubePlayerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="relative bg-black rounded-xl shadow-2xl max-w-4xl w-full">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
        >
          <X className="w-8 h-8" />
        </button>
        <div className="px-4 pt-3 pb-1 text-white text-lg font-semibold truncate">
          {title}
        </div>
        <div className="relative pb-[56.25%] h-0">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full rounded-b-xl"
          />
        </div>
      </div>
    </div>
  );
}
