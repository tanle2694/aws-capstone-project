import { AuthImage } from './AuthImage'
import type { ImageResponse } from '../types'

interface Props {
  image: ImageResponse
  selected: boolean
  onClick: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImageCard({ image, selected, onClick }: Props) {
  const displayName = image.title ?? image.filename

  return (
    <div
      className={`image-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-pressed={selected}
    >
      <div className="card-thumb">
        <AuthImage imageId={image.id} alt={displayName} />
      </div>
      <div className="card-meta">
        <div className="card-title">{displayName}</div>
        <div className="card-filename">{image.filename}</div>
        <div className="card-footer">
          <span className="card-size">{formatBytes(image.size_bytes)}</span>
          <div className="card-tags">
            {image.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="card-tag">#{tag}</span>
            ))}
            {image.tags.length > 2 && (
              <span className="card-tag">+{image.tags.length - 2}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
