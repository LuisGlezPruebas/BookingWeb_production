import React from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count <= 0) return null;
  
  return (
    <div className={cn(
      "absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-medium w-5 h-5 min-w-[1.25rem]",
      className
    )}>
      {count > 99 ? '99+' : count}
    </div>
  );
}