import { ImageResponse } from 'next/og'

export async function GET() {
  return new ImageResponse(
    <div style={{
      width: '512px', height: '512px',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      borderRadius: '120px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: '280px',
    }}>
      ⚡
    </div>,
    { width: 512, height: 512 }
  )
}
