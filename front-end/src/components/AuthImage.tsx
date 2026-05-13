import { useEffect, useState } from 'react'
import { getImageContentUrl } from '../api'

interface Props {
  imageId: string
  alt: string
  className?: string
}

export function AuthImage({ imageId, alt, className }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    setSrc(null)
    setError(false)

    getImageContentUrl(imageId)
      .then((url) => {
        objectUrl = url
        setSrc(url)
      })
      .catch(() => setError(true))

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageId])

  if (error) {
    return (
      <div className={`card-thumb-placeholder ${className ?? ''}`}>
        ⚠
      </div>
    )
  }

  if (!src) {
    return <div className={`card-thumb-loading ${className ?? ''}`} />
  }

  return <img src={src} alt={alt} className={className} />
}
