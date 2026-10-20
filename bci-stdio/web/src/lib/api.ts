const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export type AuthUser = {
  id: string
  email: string
  name: string
  provider: string
}

export type Project = {
  id: string
  title: string
  brief: string
  created_at: number
  updated_at: number
  generation_count?: number
}

export type Generation = {
  id: string
  project_id: string
  tool: string
  prompt: string
  status: string
  provider?: string
  model?: string
  image_url?: string
  error?: string
  created_at: number
}

function authHeaders(token: string | null): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = (data as { detail?: string }).detail || res.statusText
    throw new Error(detail)
  }
  return data as T
}

export async function getAuthConfig() {
  const res = await fetch(`${API_BASE}/auth/config`)
  return parse<{
    azure_client_id_configured: boolean
    azure_tenant_id: string
    allow_dev_auth: boolean
    image_provider: string
    openai_configured: boolean
    fal_configured: boolean
  }>(res)
}

export async function loginMicrosoft(accessToken: string) {
  const res = await fetch(`${API_BASE}/auth/microsoft`, {
    method: 'POST',
    headers: authHeaders(null),
    body: JSON.stringify({ access_token: accessToken }),
  })
  return parse<{ access_token: string; token_type: string; user: AuthUser }>(res)
}

export async function loginDev(email: string, name: string) {
  const res = await fetch(`${API_BASE}/auth/dev`, {
    method: 'POST',
    headers: authHeaders(null),
    body: JSON.stringify({ email, name }),
  })
  return parse<{ access_token: string; token_type: string; user: AuthUser }>(res)
}

export async function fetchMe(token: string) {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders(token) })
  return parse<AuthUser>(res)
}

export async function listProjects(token: string) {
  const res = await fetch(`${API_BASE}/projects`, { headers: authHeaders(token) })
  return parse<{ projects: Project[] }>(res)
}

export async function createProject(token: string, title: string, brief = '') {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title, brief }),
  })
  return parse<Project>(res)
}

export async function listGenerations(token: string, projectId: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/generations`, {
    headers: authHeaders(token),
  })
  return parse<{ generations: Generation[] }>(res)
}

export async function createGeneration(
  token: string,
  body: { project_id: string; prompt: string; tool: string; style_hint?: string },
) {
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return parse<{ id: string; status: string }>(res)
}

export async function getGeneration(token: string, id: string) {
  const res = await fetch(`${API_BASE}/generate/${id}`, { headers: authHeaders(token) })
  return parse<Generation>(res)
}

export async function listAgentMessages(token: string, projectId: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/agent`, {
    headers: authHeaders(token),
  })
  return parse<{ messages: { id: string; role: string; content: string; created_at: number }[] }>(
    res,
  )
}

export async function askAgent(token: string, projectId: string, message: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/agent`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ message }),
  })
  return parse<{ reply: string }>(res)
}

export function mediaUrl(path?: string | null) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return path
}
