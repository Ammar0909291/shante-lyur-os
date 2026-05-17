import * as React from 'react';
import { cn, getInitials } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
  statusDot?: 'online' | 'busy' | 'away' | 'offline';
}

function Avatar({ name, src, size = 'md', className, statusDot }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const showImage = src && !imgError;
  const initials = getInitials(name);

  const statusColors: Record<string, string> = {
    online: 'bg-sage',
    busy: 'bg-red-400',
    away: 'bg-amber-400',
    offline: 'bg-zinc-500',
  };

  return (
    <div className={cn('relative inline-flex shrink-0', sizeClasses[size], className)}>
      <div
        className={cn(
          'w-full h-full rounded-full overflow-hidden',
          'flex items-center justify-center',
          'ring-1 ring-border-luxury',
          !showImage && 'bg-champagne-gradient',
        )}
        aria-label={name}
        title={name}
      >
        {showImage ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            className="font-semibold text-obsidian leading-none select-none"
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
      </div>
      {statusDot && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-onyx',
            'w-2.5 h-2.5',
            statusColors[statusDot],
          )}
          aria-label={`Status: ${statusDot}`}
        />
      )}
    </div>
  );
}

// Avatar Group
export interface AvatarGroupProps {
  avatars: Array<{ name: string; src?: string | null }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

function AvatarGroup({ avatars, max = 4, size = 'sm', className }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const remainder = avatars.length - max;

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((avatar, i) => (
        <div
          key={i}
          className={cn('-ml-2 first:ml-0 ring-2 ring-onyx rounded-full')}
        >
          <Avatar name={avatar.name} src={avatar.src} size={size} />
        </div>
      ))}
      {remainder > 0 && (
        <div
          className={cn(
            '-ml-2 rounded-full ring-2 ring-onyx',
            'bg-charcoal border border-border-luxury',
            'flex items-center justify-center',
            sizeClasses[size],
          )}
        >
          <span className="text-xs font-medium text-text-secondary">+{remainder}</span>
        </div>
      )}
    </div>
  );
}

export { Avatar, AvatarGroup };
