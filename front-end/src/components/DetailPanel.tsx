import { useState } from 'react'
import { AuthImage } from './AuthImage'
import type { ImageResponse, ImageUpdateRequest } from '../types'

interface Props {
  image: ImageResponse | null
  isOpen: boolean
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate: (id: string, data: ImageUpdateRequest) => Promise<void>
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DetailPanel({ image, isOpen, onClose, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editTags, setEditTags] = useState('')

  function startEdit() {
    if (!image) return
    setEditTitle(image.title ?? '')
    setEditDesc(image.description ?? '')
    setEditTags(image.tags.join(', '))
    setEditing(true)
    setConfirmDelete(false)
  }

  function cancelEdit() {
    setEditing(false)
  }

  async function saveEdit() {
    if (!image) return
    setSaving(true)
    try {
      await onUpdate(image.id, {
        title: editTitle.trim() || null,
        description: editDesc.trim() || null,
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (!image) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete(image.id)
    setConfirmDelete(false)
  }

  return (
    <aside className={`detail-panel ${isOpen ? 'open' : ''}`}>
      {image && (
        <>
          <div className="detail-header">
            <span className="detail-header-title">Image detail</span>
            <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
          </div>

          <div className="detail-image-wrap">
            <AuthImage imageId={image.id} alt={image.title ?? image.filename} />
          </div>

          <div className="detail-body">
            {/* Metadata */}
            {!editing && (
              <>
                <div className="detail-section">
                  <div className="section-label">Metadata</div>
                  <div className="meta-table">
                    <div className="meta-row">
                      <span className="meta-key">Title</span>
                      <span className="meta-val">{image.title ?? '—'}</span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-key">Filename</span>
                      <span className="meta-val">{image.filename}</span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-key">Type</span>
                      <span className="meta-val">{image.content_type}</span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-key">Size</span>
                      <span className="meta-val">{formatBytes(image.size_bytes)}</span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-key">Uploaded</span>
                      <span className="meta-val">{formatDate(image.created_at)}</span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-key">Updated</span>
                      <span className="meta-val">{formatDate(image.updated_at)}</span>
                    </div>
                    {image.owner_id && (
                      <div className="meta-row">
                        <span className="meta-key">Owner</span>
                        <span className="meta-val">{image.owner_id}</span>
                      </div>
                    )}
                    <div className="meta-row">
                      <span className="meta-key">ID</span>
                      <span className="meta-val">{image.id}</span>
                    </div>
                  </div>
                </div>

                {image.description && (
                  <div className="detail-section">
                    <div className="section-label">Description</div>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                      {image.description}
                    </p>
                  </div>
                )}

                {image.tags.length > 0 && (
                  <div className="detail-section">
                    <div className="section-label">Tags</div>
                    <div className="detail-tags">
                      {image.tags.map((tag) => (
                        <span key={tag} className="detail-tag">#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {confirmDelete && (
                  <div className="confirm-bar">
                    <span>Permanently delete this image?</span>
                    <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Edit form */}
            {editing && (
              <div className="edit-form">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    className="form-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Optional title"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tags</label>
                  <input
                    className="form-input"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
                  />
                  <span className="form-hint">Comma-separated</span>
                </div>
              </div>
            )}
          </div>

          <div className="detail-actions">
            {!editing ? (
              <>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={startEdit}>
                  Edit
                </button>
                <button className="btn-danger" onClick={handleDelete}>
                  {confirmDelete ? 'Confirm delete' : 'Delete'}
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  onClick={saveEdit}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
