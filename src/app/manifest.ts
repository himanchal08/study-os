import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Study OS',
    short_name: 'Study OS',
    description: 'Your personal operating system for exam preparation.',
    start_url: '/calendar',
    display: 'standalone',
    background_color: '#0d0d14',
    theme_color: '#0d0d14',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '64x64 32x32 24x24 16x16',
        type: 'image/x-icon',
      },
      {
        src: '/icon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'any'
      },
    ],
  }
}
