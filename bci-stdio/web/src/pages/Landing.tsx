import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Landing.css'

const HERO =
  'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=2400&q=80'

export function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="page-shell landing">
      <header className="landing-nav rise">
        <Link to="/" className="brand">
          Belt Collins
        </Link>
        <nav>
          <a href="#platform">Platform</a>
          <a href="#workflow">Workflow</a>
          <Link to={user ? '/stdio' : '/sign-in'} className="btn">
            {user ? 'Enter Stdio' : 'Sign in'}
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-media" aria-hidden>
          <img src={HERO} alt="" />
          <div className="hero-veil" />
        </div>
        <div className="hero-copy rise">
          <p className="brand hero-brand">Belt Collins</p>
          <h1>景观设计的 AI 中控台</h1>
          <p className="hero-sub">
            从场地气质到种植结构、硬质材质与夜景氛围——为贝尔高林团队加速概念探索与方案出图。
          </p>
          <div className="hero-cta">
            <Link to={user ? '/stdio' : '/sign-in'} className="btn">
              打开 Stdio
            </Link>
            <a href="#platform" className="btn btn-ghost">
              了解能力
            </a>
          </div>
        </div>
      </section>

      <section id="platform" className="section rise">
        <h2>为景观流程而生</h2>
        <p className="section-sub">不是通用绘图工具，而是项目制工作台：灵感、精修、氛围、汇报素材在同一中控台完成。</p>
        <div className="pillar-grid">
          <article>
            <h3>Inspire</h3>
            <p>文本生成景观概念图，强调场地层次、种植与硬质关系。</p>
          </article>
          <article>
            <h3>Smart Edit</h3>
            <p>基于提示继续迭代：季相、材质、水体、夜景一键换氛围。</p>
          </article>
          <article>
            <h3>Landscape Agent</h3>
            <p>用自然语言讨论归家动线、度假界面与滨水策略，再落到出图提示词。</p>
          </article>
        </div>
      </section>

      <section id="workflow" className="section section-alt rise">
        <h2>五步工作流</h2>
        <ol className="workflow">
          <li>
            <strong>Analyze</strong>
            <span>场地气质与约束</span>
          </li>
          <li>
            <strong>Brainstorm</strong>
            <span>概念与风格探索</span>
          </li>
          <li>
            <strong>Iterate</strong>
            <span>局部精修</span>
          </li>
          <li>
            <strong>Render</strong>
            <span>高清景观表现</span>
          </li>
          <li>
            <strong>Report</strong>
            <span>汇报素材沉淀</span>
          </li>
        </ol>
      </section>

      <footer className="landing-footer">
        <span className="brand">Belt Collins Stdio</span>
        <span>Built for landscape teams · Microsoft 企业登录</span>
      </footer>
    </div>
  )
}
