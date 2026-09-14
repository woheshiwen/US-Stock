import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  askAgent,
  createGeneration,
  createProject,
  getGeneration,
  listAgentMessages,
  listGenerations,
  listProjects,
  mediaUrl,
  type Generation,
  type Project,
} from '../lib/api'
import './Studio.css'

const TOOLS = [
  { id: 'inspire', label: 'Inspire', hint: '文本生成景观概念' },
  { id: 'render', label: 'Render', hint: '强化材质与光影' },
  { id: 'atmosphere', label: 'Atmosphere', hint: '季相 / 昼夜 / 天气' },
  { id: 'video', label: 'Video', hint: '图转视频（占位）' },
] as const

export function StudioPage() {
  const { token, user, loading, logout } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [generations, setGenerations] = useState<Generation[]>([])
  const [tool, setTool] = useState<(typeof TOOLS)[number]['id']>('inspire')
  const [prompt, setPrompt] = useState(
    '华南滨水度假酒店归家大道，多层种植，砂岩铺装，黄昏暖光，人视角度',
  )
  const [styleHint, setStyleHint] = useState('Belt Collins resort landscape, refined tropical')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [agentInput, setAgentInput] = useState('')
  const [agentMessages, setAgentMessages] = useState<
    { id: string; role: string; content: string; created_at: number }[]
  >([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = useMemo(
    () => generations.find((g) => g.id === selectedId) || generations[0] || null,
    [generations, selectedId],
  )

  const refreshProjects = useCallback(async () => {
    if (!token) return
    const data = await listProjects(token)
    setProjects(data.projects)
    if (!projectId && data.projects[0]) setProjectId(data.projects[0].id)
  }, [token, projectId])

  const refreshGenerations = useCallback(async () => {
    if (!token || !projectId) return
    const data = await listGenerations(token, projectId)
    setGenerations(data.generations)
  }, [token, projectId])

  const refreshAgent = useCallback(async () => {
    if (!token || !projectId) return
    const data = await listAgentMessages(token, projectId)
    setAgentMessages(data.messages)
  }, [token, projectId])

  useEffect(() => {
    if (!token) return
    void refreshProjects().catch((err) => setError(String(err)))
  }, [token, refreshProjects])

  useEffect(() => {
    if (!projectId) return
    void Promise.all([refreshGenerations(), refreshAgent()]).catch((err) => setError(String(err)))
  }, [projectId, refreshGenerations, refreshAgent])

  // Poll running jobs
  useEffect(() => {
    if (!token) return
    const running = generations.filter((g) => g.status === 'running')
    if (!running.length) return
    const timer = window.setInterval(() => {
      void (async () => {
        for (const job of running) {
          const latest = await getGeneration(token, job.id)
          setGenerations((prev) => prev.map((g) => (g.id === latest.id ? { ...g, ...latest } : g)))
        }
      })()
    }, 2500)
    return () => window.clearInterval(timer)
  }, [generations, token])

  if (loading) return <div className="studio-loading">加载中…</div>
  if (!token || !user) return <Navigate to="/sign-in" replace />

  async function onCreateProject() {
    if (!token) return
    const title = window.prompt('新项目名称', '滨水度假景观概念')
    if (!title) return
    const project = await createProject(token, title, 'Belt Collins landscape study')
    setProjects((prev) => [project, ...prev])
    setProjectId(project.id)
  }

  async function onGenerate(e: FormEvent) {
    e.preventDefault()
    if (!token || !projectId) return
    if (tool === 'video') {
      setError('Video 为占位能力，下一阶段接入图转视频。')
      return
    }
    setBusy(true)
    setError('')
    try {
      const styledPrompt =
        tool === 'atmosphere'
          ? `${prompt}。调整氛围：${styleHint}`
          : tool === 'render'
            ? `${prompt}。高质量景观渲染，细腻材质与光影。${styleHint}`
            : prompt
      const job = await createGeneration(token, {
        project_id: projectId,
        prompt: styledPrompt,
        tool,
        style_hint: styleHint,
      })
      setSelectedId(job.id)
      await refreshGenerations()
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setBusy(false)
    }
  }

  async function onAskAgent(e: FormEvent) {
    e.preventDefault()
    if (!token || !projectId || !agentInput.trim()) return
    const message = agentInput.trim()
    setAgentInput('')
    setAgentMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: 'user', content: message, created_at: Date.now() / 1000 },
    ])
    try {
      const res = await askAgent(token, projectId, message)
      setAgentMessages((prev) => [
        ...prev,
        {
          id: `local-a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          created_at: Date.now() / 1000,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent 失败')
    }
  }

  return (
    <div className="studio">
      <header className="studio-top">
        <div className="studio-brand-wrap">
          <Link to="/" className="brand">
            Belt Collins
          </Link>
          <span className="studio-badge">Stdio</span>
        </div>
        <div className="studio-project">
          <select
            value={projectId || ''}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="当前项目"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" type="button" onClick={() => void onCreateProject()}>
            新建项目
          </button>
        </div>
        <div className="studio-user">
          <span>{user.name || user.email}</span>
          <button className="btn btn-ghost" type="button" onClick={logout}>
            退出
          </button>
        </div>
      </header>

      <div className="studio-body">
        <aside className="studio-tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tool === t.id ? 'tool active' : 'tool'}
              onClick={() => setTool(t.id)}
            >
              <strong>{t.label}</strong>
              <span>{t.hint}</span>
            </button>
          ))}
        </aside>

        <section className="studio-canvas">
          <div className="canvas-stage">
            {selected?.status === 'succeeded' && selected.image_url ? (
              <img src={mediaUrl(selected.image_url)} alt={selected.prompt} />
            ) : selected?.status === 'running' ? (
              <div className="canvas-empty">
                <div className="pulse" />
                <p>正在生成景观图像…</p>
              </div>
            ) : selected?.status === 'failed' ? (
              <div className="canvas-empty">
                <p>生成失败</p>
                <p className="muted">{selected.error}</p>
              </div>
            ) : (
              <div className="canvas-empty">
                <p className="brand">Belt Collins Stdio</p>
                <p className="muted">选择工具并输入场地描述，生成第一张景观概念图。</p>
              </div>
            )}
          </div>

          <div className="thumbs">
            {generations.map((g) => (
              <button
                key={g.id}
                type="button"
                className={selected?.id === g.id ? 'thumb active' : 'thumb'}
                onClick={() => setSelectedId(g.id)}
              >
                {g.image_url ? (
                  <img src={mediaUrl(g.image_url)} alt="" />
                ) : (
                  <span>{g.status}</span>
                )}
              </button>
            ))}
          </div>
        </section>

        <aside className="studio-side">
          <form className="side-panel" onSubmit={onGenerate}>
            <h2>{TOOLS.find((t) => t.id === tool)?.label}</h2>
            <div className="field">
              <label htmlFor="prompt">提示词</label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="style">风格方向</label>
              <input
                id="style"
                value={styleHint}
                onChange={(e) => setStyleHint(e.target.value)}
              />
            </div>
            <button className="btn" type="submit" disabled={busy || !projectId}>
              {busy ? '提交中…' : '生成'}
            </button>
            {error && <p className="error">{error}</p>}
          </form>

          <div className="side-panel agent">
            <h2>Landscape Agent</h2>
            <div className="agent-log">
              {agentMessages.length === 0 && (
                <p className="muted">问问归家动线、种植结构或夜景策略。</p>
              )}
              {agentMessages.map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'bubble user' : 'bubble bot'}>
                  {m.content}
                </div>
              ))}
            </div>
            <form onSubmit={onAskAgent} className="agent-form">
              <input
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
                placeholder="用自然语言描述你的设计问题"
              />
              <button className="btn" type="submit">
                发送
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  )
}
