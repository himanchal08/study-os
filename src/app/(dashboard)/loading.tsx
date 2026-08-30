export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-800 border-t-neutral-400 animate-spin" />
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    </div>
  );
}
