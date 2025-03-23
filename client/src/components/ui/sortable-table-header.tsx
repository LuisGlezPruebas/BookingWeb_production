import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortableColumn {
  key: string;
  label: string;
}

interface SortableTableHeaderProps {
  column: SortableColumn;
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHeader({
  column,
  sortKey,
  sortDirection,
  onSort,
  className
}: SortableTableHeaderProps) {
  const isSorted = sortKey === column.key;
  
  return (
    <th 
      className={cn(
        "text-left py-3 px-4 font-medium text-sm text-muted-foreground cursor-pointer select-none",
        className
      )}
      onClick={() => onSort(column.key)}
    >
      <div className="flex items-center gap-1 group">
        {column.label}
        <span className="ml-1">
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />
          )}
        </span>
      </div>
    </th>
  );
}