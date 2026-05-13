import { useRef, useState } from 'react'

interface Props {
  onClose: () => void
  onUpload: (formData: FormData) => Promise<void>
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadModal({ onClose, onUpload }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(f: File) {
    if (!ALLOWED.includes(f.type)) {
      setError(`Unsupported type. Allowed: jpeg, png, webp, gif`)
      return
    }
    setError(null)
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) pickFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }

  async function handleSubmit() {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (title.trim()) fd.append('title', title.trim())
      if (description.trim()) fd.append('description', description.trim())
      tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => fd.append('tags', t))

      await onUpload(fd)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-head">
          <span className="modal-title">Upload image</span>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {!file ? (
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED.join(',')}
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              <div className="drop-icon">⬆</div>
              <div className="drop-primary">Drop image here</div>
              <div className="drop-secondary">or click to browse · jpeg, png, webp, gif</div>
            </div>
          ) : (
            <div className="upload-preview">
              {previewUrl && (
                <img src={previewUrl} alt="preview" className="upload-preview-thumb" />
              )}
              <div className="upload-preview-info">
                <div className="upload-preview-name">{file.name}</div>
                <div className="upload-preview-size">{formatBytes(file.size)} · {file.type}</div>
              </div>
              <button
                className="btn-icon"
                onClick={() => {
                  setFile(null)
                  if (previewUrl) URL.revokeObjectURL(previewUrl)
                  setPreviewUrl(null)
                }}
                aria-label="Remove file"
              >
                ✕
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tags</label>
            <input
              className="form-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="nature, landscape, 2026"
              style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
            />
            <span className="form-hint">Comma-separated</span>
          </div>

          {error && (
            <div className="confirm-bar">
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose} disabled={uploading}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
