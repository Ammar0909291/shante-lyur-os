import * as React from 'react';

function SkeletonBox({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-charcoal rounded-lg ${className ?? ''}`} />;
}

function SkeletonCard() {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <SkeletonBox className="h-3 w-28" />
        <SkeletonBox className="h-9 w-9 rounded-xl" />
      </div>
      <SkeletonBox className="h-8 w-20 mb-3" />
      <div className="flex gap-2 mb-4">
        <SkeletonBox className="h-5 w-24 rounded-full" />
        <SkeletonBox className="h-5 w-20 rounded-full" />
      </div>
      <div className="pt-3 border-t border-border-luxury flex items-center justify-between">
        <SkeletonBox className="h-3 w-32" />
        <SkeletonBox className="h-3 w-12" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBox className="h-8 w-48" />
          <SkeletonBox className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-8 w-28 rounded-lg" />
          <SkeletonBox className="h-8 w-24 rounded-lg" />
          <SkeletonBox className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* KPI cards skeleton — 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Workload alert skeleton */}
      <SkeletonBox className="h-14 w-full rounded-2xl" />

      {/* Stat cards row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <SkeletonBox className="h-32 rounded-2xl" />
        <SkeletonBox className="h-32 rounded-2xl" />
        <SkeletonBox className="h-32 rounded-2xl sm:col-span-2 xl:col-span-1" />
      </div>

      {/* Schedule card skeleton */}
      <SkeletonBox className="h-48 rounded-2xl" />
    </div>
  );
}
