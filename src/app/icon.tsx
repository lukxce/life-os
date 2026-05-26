import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      borderRadius: '8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: '20px', fontWeight: 'bold',
    }}>
      ⚡
    </div>,
    { ...size }
  )
}
