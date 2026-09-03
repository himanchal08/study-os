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
        src: '/globe.svg', 
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
