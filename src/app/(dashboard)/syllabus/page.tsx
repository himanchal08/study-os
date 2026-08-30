import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Syllabus Coverage' };
export default function SyllabusPage() {
  return (
    <div className='animate-fade-in'>
      <h1 className='text-xl font-bold gradient-text mb-2'>Syllabus Coverage</h1>
      <p className='text-sm' style={{ color: 'rgba(226,226,240,0.45)' }}>Coming in a future phase.</p>
    </div>
  );
}
