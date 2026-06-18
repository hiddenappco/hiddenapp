import React from 'react';

const pulse = 'bg-overlay/10 animate-pulse rounded-xl';

interface SkeletonProps {
    className?: string;
}

/** Tall cards — Home / expedition department picker */
export const DepartmentCardSkeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`h-[140px] w-full ${pulse} ${className}`} />
);

export const DepartmentListSkeleton: React.FC<{ count?: number; className?: string }> = ({
    count = 4,
    className = '',
}) => (
    <div className={`flex flex-col gap-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <DepartmentCardSkeleton key={i} />
        ))}
    </div>
);

/** Horizontal list row — ManualSearch */
export const SearchResultSkeleton: React.FC = () => (
    <div className={`flex gap-4 p-3 h-[6.5rem] ${pulse}`} />
);

export const SearchListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
    <div className="flex flex-col gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <SearchResultSkeleton key={i} />
        ))}
    </div>
);

/** Vertical media card — Refugios / news */
export const MediaCardSkeleton: React.FC = () => (
    <div className={`overflow-hidden ${pulse}`}>
        <div className="aspect-[16/9] bg-overlay/5" />
        <div className="p-4 space-y-2">
            <div className="h-4 w-3/4 bg-overlay/10 rounded-lg animate-pulse" />
            <div className="h-3 w-1/2 bg-overlay/10 rounded-lg animate-pulse" />
        </div>
    </div>
);

export const MediaListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
    <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <MediaCardSkeleton key={i} />
        ))}
    </div>
);

/** Detail pages — destination, department, coupon, etc. */
export const PageDetailSkeleton: React.FC = () => (
    <div className="h-screen w-full bg-background-dark flex flex-col overflow-hidden">
        <div className="h-[42vh] min-h-[220px] bg-overlay/10 animate-pulse shrink-0" />
        <div className="flex-1 p-5 space-y-4">
            <div className="h-7 w-2/3 bg-overlay/10 rounded-lg animate-pulse" />
            <div className="h-4 w-full bg-overlay/10 rounded-lg animate-pulse" />
            <div className="h-4 w-5/6 bg-overlay/10 rounded-lg animate-pulse" />
            <div className="h-24 w-full bg-overlay/10 rounded-2xl animate-pulse mt-4" />
        </div>
    </div>
);
