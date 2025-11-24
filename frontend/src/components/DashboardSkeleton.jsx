import React from 'react';

export const SkeletonCard = () => (
    <div className="animate-pulse">
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="h-3 bg-slate-300 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-slate-300 rounded w-16"></div>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-300 rounded-xl"></div>
            </div>
        </div>
    </div>
);

export const SkeletonTable = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 rounded w-full"></div>
        <div className="h-10 bg-slate-100 rounded w-full"></div>
        <div className="h-10 bg-slate-200 rounded w-full"></div>
        <div className="h-10 bg-slate-100 rounded w-full"></div>
        <div className="h-10 bg-slate-200 rounded w-full"></div>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="space-y-4 md:space-y-6">
        {/* Header Skeleton */}
        <div className="animate-pulse">
            <div className="h-8 md:h-10 bg-slate-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-slate-100 rounded w-32"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg p-4 md:p-6">
            <div className="h-6 bg-slate-200 rounded w-40 mb-4"></div>
            <SkeletonTable />
        </div>
    </div>
);

export default DashboardSkeleton;
