/*
  Thin client for the Go service. Every call degrades gracefully: the portfolio
  must render fully with the API offline, so components treat these as
  best-effort enrichments rather than required data.
*/

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

export interface ChatReply {
  reply: string
  /** Set when the upstream model is unavailable and the server returns a canned answer. */
  degraded?: boolean
}

export interface Repo {
  name: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  url: string
  updatedAt: string
}

export interface GithubStats {
  user: string
  publicRepos: number
  followers: number
  contributionsLastYear: number | null
  repos: Repo[]
  cachedAt: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return (await res.json()) as T
}

export async function sendChat(message: string, signal?: AbortSignal): Promise<ChatReply> {
  return request<ChatReply>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
    signal,
  })
}

export async function getGithubStats(): Promise<GithubStats> {
  return request<GithubStats>('/github')
}
