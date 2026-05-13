import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  checkHealth,
  deleteImage,
  listImages,
  setApiConfig,
  updateImage,
  uploadImage,
} from './api'
import { ConfigDrawer } from './components/ConfigDrawer'
import { DetailPanel } from './components/DetailPanel'
import { ImageCard } from './components/ImageCard'
import { UploadModal } from './components/UploadModal'
import type { ImageResponse, ImageUpdateRequest, ToastItem } from './types'

const LIMIT = 20

type ApiStatus = 'checking' | 'ok' | 'error'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function App() {
  /* ── Config (persisted to localStorage) ─────────────────────────────── */
  const [apiBase, setApiBase] = useState(
    () =>
      localStorage.getItem('iv_api_base') ||
      import.meta.env.VITE_API_BASE ||
      'http://localhost:8000',
  )
  const [apiKey, setApiKey] = useState(
    () =>
      localStorage.getItem('iv_api_key') ||
      import.meta.env.VITE_API_KEY ||
      '',
  )

  useEffect(() => {
    setApiConfig(apiBase, apiKey)
    localStorage.setItem('iv_api_base', apiBase)
    localStorage.setItem('iv_api_key', apiKey)
  }, [apiBase, apiKey])

  /* ── Images ──────────────────────────────────────────────────────────── */
  const [images, setImages] = useState<ImageResponse[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  /* ── UI ──────────────────────────────────────────────────────────────── */
  const [selected, setSelected] = useState<ImageResponse | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')

  /* ── Toasts ──────────────────────────────────────────────────────────── */
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      toastTimers.current.delete(id)
    }, 4000)
    toastTimers.current.set(id, timer)
  }, [])

  useEffect(() => {
    const timers = toastTimers.current
    return () => timers.forEach((t) => clearTimeout(t))
  }, [])

  /* ── Load images ─────────────────────────────────────────────────────── */
  const loadImages = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listImages({
        limit: LIMIT,
        offset: page * LIMIT,
        tag: activeTag ?? undefined,
      })
      setImages(result.items)
      setTotal(result.total)
    } catch (e) {
      addToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }, [page, activeTag, addToast])

  useEffect(() => {
    void loadImages()
  }, [loadImages])

  /* ── Health check ────────────────────────────────────────────────────── */
  useEffect(() => {
    setApiStatus('checking')
    checkHealth().then((ok) => setApiStatus(ok ? 'ok' : 'error'))
  }, [apiBase])

  /* ── Unique tags across current page ─────────────────────────────────── */
  const allTags = useMemo(() => {
    const seen = new Set<string>()
    images.forEach((img) => img.tags.forEach((t) => seen.add(t)))
    return [...seen]
  }, [images])

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleUpload = useCallback(
    async (formData: FormData) => {
      const image = await uploadImage(formData)
      addToast(`Uploaded ${image.filename}`, 'success')
      setUploadOpen(false)
      void loadImages()
    },
    [addToast, loadImages],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteImage(id)
      addToast('Image deleted', 'success')
      if (selected?.id === id) setSelected(null)
      void loadImages()
    },
    [addToast, loadImages, selected],
  )

  const handleUpdate = useCallback(
    async (id: string, data: ImageUpdateRequest) => {
      const updated = await updateImage(id, data)
      addToast('Image updated', 'success')
      setSelected(updated)
      setImages((prev) => prev.map((img) => (img.id === id ? updated : img)))
    },
    [addToast],
  )

  const totalPages = Math.ceil(total / LIMIT)

  /* ── Total size helper ───────────────────────────────────────────────── */
  const totalSize = useMemo(
    () => images.reduce((acc, img) => acc + img.size_bytes, 0),
    [images],
  )

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-logo">
          IMGVAULT
          <span>Image Dashboard</span>
        </div>

        <div className="header-actions">
          <div className={`status-badge ${apiStatus}`}>
            <div className="status-dot" />
            {apiStatus === 'checking' ? 'connecting' : apiStatus === 'ok' ? 'online' : 'offline'}
          </div>

          <button
            className={`btn-ghost ${configOpen ? 'active' : ''}`}
            onClick={() => setConfigOpen((v) => !v)}
            title="API configuration"
          >
            ⚙ Config
          </button>

          <button className="btn-primary" onClick={() => setUploadOpen(true)}>
            ↑ Upload
          </button>
        </div>
      </header>

      {/* ── Config drawer ──────────────────────────────────────────────── */}
      <ConfigDrawer
        open={configOpen}
        apiBase={apiBase}
        apiKey={apiKey}
        onApiBaseChange={setApiBase}
        onApiKeyChange={setApiKey}
      />

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="main">
        {/* Filter bar */}
        <div className="filter-bar">
          <div className="tag-filters">
            <button
              className={`tag-pill ${!activeTag ? 'active' : ''}`}
              onClick={() => { setActiveTag(null); setPage(0) }}
            >
              ALL
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`tag-pill ${activeTag === tag ? 'active' : ''}`}
                onClick={() => { setActiveTag(tag); setPage(0) }}
              >
                #{tag}
              </button>
            ))}
          </div>

          <span className="total-count">
            {total} image{total !== 1 ? 's' : ''}
            {totalSize > 0 && ` · ${formatBytes(totalSize)}`}
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
          </div>
        ) : images.length === 0 ? (
          <div className="empty-state">
            <p>No images found</p>
            <button className="btn-primary" onClick={() => setUploadOpen(true)}>
              Upload your first image
            </button>
          </div>
        ) : (
          <div className="image-grid">
            {images.map((img) => (
              <ImageCard
                key={img.id}
                image={img}
                selected={selected?.id === img.id}
                onClick={() => setSelected(selected?.id === img.id ? null : img)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              ←
            </button>
            <span className="page-info">{page + 1} / {totalPages}</span>
            <button
              className="page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              →
            </button>
          </div>
        )}
      </main>

      {/* ── Detail panel ───────────────────────────────────────────────── */}
      <DetailPanel
        image={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />

      {/* ── Upload modal ────────────────────────────────────────────────── */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUpload={handleUpload}
        />
      )}

      {/* ── Toasts ─────────────────────────────────────────────────────── */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-dot" />
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
