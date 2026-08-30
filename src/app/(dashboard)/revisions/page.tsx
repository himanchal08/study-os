import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Revision Engine' };
export default function RevisionsPage() {
  return (
    <div className='animate-fade-in'>
      <h1 className='text-xl font-bold gradient-text mb-2'>Revision Engine</h1>
      <p className='text-sm' style={{ color: 'rgba(226,226,240,0.45)' }}>Coming in a future phase.</p>
    </div>
  );
}
