import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Life OS',
    short_name: 'Life OS',
    description: 'Your unified life operating system',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#6366f1',
    icons: [
      { src: '/icon', sizes: '32x32',   type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Share Target: Safari "Share → Life OS" opens /finance/scan?url=<shared-url>
    share_target: {
      action: '/finance/scan',
      method: 'GET',
      params: { url: 'url', text: 'text', title: 'title' },
    },
    screenshots: [],
  } as any
}
