import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          borderRadius: '100px',
          border: '20px solid #34d399',
        }}
      >
        <div style={{ fontSize: 200, color: '#ededed', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
          OS
        </div>
      </div>
    ),
    { ...size }
  );
}
