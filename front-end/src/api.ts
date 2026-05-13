import type { ImageListResponse, ImageResponse, ImageUpdateRequest } from './types'

let _apiBase = 'http://localhost:8000'
let _apiKey = ''

export function setApiConfig(apiBase: string, apiKey: string) {
  _apiBase = apiBase.replace(/\/$/, '')
  _apiKey = apiKey
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra }
  if (_apiKey) h['X-API-Key'] = _apiKey
  return h
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${_apiBase}${path}`, {
    ...init,
    headers: authHeaders(init.headers as Record<string, string>),
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body?.detail ?? detail
    } catch {
      // ignore
    }
    throw new Error(`${res.status}: ${detail}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${_apiBase}/healthz`)
    return res.ok
  } catch {
    return false
  }
}

export async function listImages(params: {
  limit?: number
  offset?: number
  tag?: string
}): Promise<ImageListResponse> {
  const q = new URLSearchParams()
  if (params.limit !== undefined) q.set('limit', String(params.limit))
  if (params.offset !== undefined) q.set('offset', String(params.offset))
  if (params.tag) q.set('tag', params.tag)
  return request<ImageListResponse>(`/images?${q}`)
}

export async function getImageContentUrl(id: string): Promise<string> {
  const res = await fetch(`${_apiBase}/images/${id}/content`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to load image content: ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export async function uploadImage(formData: FormData): Promise<ImageResponse> {
  return request<ImageResponse>('/images', { method: 'POST', body: formData })
}

export async function updateImage(
  id: string,
  data: ImageUpdateRequest,
): Promise<ImageResponse> {
  return request<ImageResponse>(`/images/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteImage(id: string): Promise<void> {
  return request<void>(`/images/${id}`, { method: 'DELETE' })
}
