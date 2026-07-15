// Downscale + JPEG-compress a photo client-side so uploads to Claude vision
// endpoints stay small — shared by receipt scanning and meal-photo logging.
export async function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' }
}
