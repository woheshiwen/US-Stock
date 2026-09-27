import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { loginWithMicrosoftPopup, msalConfigured } from '../auth/msal'
import { getAuthConfig, loginDev, loginMicrosoft } from '../lib/api'
import './SignIn.css'

export function SignInPage() {
  const navigate = useNavigate()
  const { setSession, user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [allowDev, setAllowDev] = useState(false)
  const [azureReady, setAzureReady] = useState(msalConfigured)

  useEffect(() => {
    if (user) navigate('/stdio', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    void getAuthConfig()
      .then((cfg) => {
        setAllowDev(cfg.allow_dev_auth)
        setAzureReady(msalConfigured && cfg.azure_client_id_configured)
      })
      .catch(() => {
        setAllowDev(true)
      })
  }, [])

  async function onMicrosoft() {
    setBusy(true)
    setError('')
    try {
      const accessToken = await loginWithMicrosoftPopup()
      const session = await loginMicrosoft(accessToken)
      setSession(session.access_token, session.user)
      navigate('/stdio')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microsoft 登录失败')
    } finally {
      setBusy(false)
    }
  }

  async function onDev() {
    setBusy(true)
    setError('')
    try {
      const session = await loginDev('designer@beltcollins.local', 'BCI Designer')
      setSession(session.access_token, session.user)
      navigate('/stdio')
    } catch (err) {
      setError(err instanceof Error ? err.message : '开发登录失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-shell signin">
      <header className="signin-top rise">
        <Link to="/" className="brand">
          Belt Collins
        </Link>
        <div className="signin-meta">
          <span>简体中文</span>
          <span>Global server</span>
        </div>
      </header>

      <main className="signin-card rise rise-delay">
        <p className="brand signin-brand">Belt Collins</p>
        <h1>Welcome to Stdio</h1>
        <p className="signin-sub">景观设计 AI 中控台 · 使用 Microsoft 企业账号进入</p>

        <button className="btn btn-ms" type="button" disabled={busy || !msalConfigured} onClick={onMicrosoft}>
          <MsIcon />
          使用 Microsoft 登录
        </button>

        {!msalConfigured && (
          <p className="hint">
            请配置前端 <code>VITE_AZURE_CLIENT_ID</code> 与 API <code>AZURE_CLIENT_ID</code> 后启用正式登录。
          </p>
        )}
        {msalConfigured && !azureReady && (
          <p className="hint">前端已配置 Client ID，请同步配置 API 的 <code>AZURE_CLIENT_ID</code>。</p>
        )}

        {allowDev && (
          <button className="btn btn-ghost" type="button" disabled={busy} onClick={onDev}>
            开发预览登录（本地）
          </button>
        )}

        {error && <p className="error">{error}</p>}
      </main>
    </div>
  )
}

function MsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <rect x="1" y="1" width="7" height="7" fill="#f25022" />
      <rect x="10" y="1" width="7" height="7" fill="#7fba00" />
      <rect x="1" y="10" width="7" height="7" fill="#00a4ef" />
      <rect x="10" y="10" width="7" height="7" fill="#ffb900" />
    </svg>
  )
}
