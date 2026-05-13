export interface ImageResponse {
  id: string
  owner_id: string | null
  filename: string
  content_type: string
  size_bytes: number
  storage_path: string
  title: string | null
  description: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ImageListResponse {
  items: ImageResponse[]
  total: number
  limit: number
  offset: number
}

export interface ImageUpdateRequest {
  title?: string | null
  description?: string | null
  tags?: string[]
}

export interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}
