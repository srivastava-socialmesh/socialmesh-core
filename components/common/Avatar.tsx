// components/common/Avatar.tsx
import { cn } from '@/lib/utils'; // optional; create simple cn helper

interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-14 h-14 text-lg',
  };
  const initials = name ? name.slice(0, 2).toUpperCase() : '?';

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-blue-400 to-indigo-600 shadow-md',
        sizeClasses[size],
        className
      )}
    >
      {src ? <img src={src} alt={name} className="w-full h-full rounded-full object-cover" /> : initials}
    </div>
  );
}
