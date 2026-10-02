# BCI-CRM 系统结构说明（本机落地版）

> **版本**：v1.1 | **日期**：2026-08-20  
> **用途**：在本地 Win10 VDI 上部署与对接 BCI-Brain、企业微信  
> **当前阶段**：数据库完成；API Phase 1 骨架已就绪，待本机启动验证

---

## 1. 一句话定位

**BCI-CRM** = 贝尔高林商务渗透用 CRM：

- **专业数据库**（客户 / 沟通 / 线索 / 权限 / 审计）
- **灵活但权限严格的展示与 API**
- **AI 问答**（经 BCI-Brain，且必须受同一套数据权限约束）
- **录入与问答入口**：优先企业微信自建应用
- **数据主权**：CRM 主库在本机，与 Brain 的 Hindsight 库隔离

---

## 2. 物理部署（当前推荐）

全部跑在 **同一台专用 Win10 Pro VDI**（`benswhe` / 内网约 `192.168.0.196`），BCI-Brain 已在同环境；腾讯云轻量仅作企微 HTTPS 入口（后续）。

```text
┌─────────────────────────────────────────────────────────────────┐
│  Win10 专用机（VDI）                                              │
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
│  │ BCI-Brain（已有，勿动）     │  │ BCI-CRM（新建）                │ │
│  │                          │  │                              │ │
│  │ IIS Brain 站             │  │ PostgreSQL 18 官方安装        │ │
│  │   192.168.0.129:8080     │  │   127.0.0.1:5433             │ │
│  │                          │  │   DB: beltcollins_crm        │ │
│  │ Hindsight API            │  │   User: crm_app              │ │
│  │   127.0.0.1:8888         │  │                              │ │
│  │                          │  │ CRM API (FastAPI)            │ │
│  │ PostgreSQL (.pg0 嵌入)   │  │   127.0.0.1:8100             │ │
│  │   127.0.0.1:5432         │  │   代码: D:\BCI-CRM\crm-api   │ │
│  │   DB: hindsight          │  │                              │ │
│  └──────────────────────────┘  └──────────────────────────────┘ │
│                                                                  │
│  企业微信桌面端 WXWork.exe（客户端，不是 CRM 服务）                 │
└─────────────────────────────────────────────────────────────────┘
         ▲
         │ 后续：HTTPS 回调（frp / WireGuard）
         │
┌────────┴────────┐
│ 腾讯云轻量（公网） │  ← 企微自建应用回调 URL 指向这里，再转发到本机 8100
└─────────────────┘
```

---

## 3. 端口与职责总表

| 端口 | 绑定 | 归属 | 职责 | CRM 是否可占用 |
|------|------|------|------|----------------|
| **5432** | 127.0.0.1 | BCI-Brain / Hindsight | 嵌入式 PG 18.1，库 `hindsight` | ❌ 禁止 |
| **5433** | 0.0.0.0 | CRM | 官方 PG 18，库 `beltcollins_crm` | ✅ CRM 专用 |
| **8100** | 127.0.0.1 | CRM API | FastAPI 业务与企微回调入口 | ✅ CRM 专用 |
| **8888** | 127.0.0.1 | Hindsight | Brain 记忆 / Reflect API | ❌ 禁止 |
| **8080** | 192.168.0.129 | Brain IIS | 内网静态站 / 发布站 | ❌ 禁止 |
| **3389** | 0.0.0.0 | Windows | RDP | 系统 |
| **9882/9883/5815** 等 | 本机 | 企业微信客户端 | 桌面端本地通信 | 勿占用 |

**出站（Brain，不监听）**：MiniMax、企微 WSS/Webhook、Zoom、ima、腾讯会议等，均为 **443 / WSS 出站**。

---

## 4. 软件目录结构（本机建议）

```text
D:\BCI-CRM\
├── crm-api\                    # FastAPI 项目（从仓库 bci-crm/crm-api 复制）
│   ├── app\
│   │   ├── __init__.py
│   │   ├── main.py             # 路由：/health /users /
│   │   ├── config.py           # 读 .env
│   │   └── db.py               # SQLAlchemy 引擎
│   ├── .env                    # 本地密钥（勿提交 Git）
│   ├── .env.example
│   ├── requirements.txt
│   ├── start-api.bat
│   └── README.md
├── backups\                    # pg_dump 备份目录
└── logs\                       # 可选：API / 企微回调日志

C:\Program Files\PostgreSQL\18\ # CRM 官方 PostgreSQL 程序
  （数据目录若安装时指定）D:\BCI-CRM\postgres\data\

C:\Users\bci_brain\.pg0\installation\18.1.0\   # Brain 嵌入 PG（勿改）
```

仓库中对应路径：

```text
仓库根/
├── docs/
│   ├── beltcollins-crm-ai-system-architecture.md
│   ├── beltcollins-crm-database-platform-aiqa.md
│   └── bci-crm-system-structure.md          ← 本文档
└── bci-crm/
    └── crm-api/                            ← 复制到 D:\BCI-CRM\crm-api
```

---

## 5. 逻辑架构（四层）

```text
① 触点层
   企业微信自建应用（录入 / 问答 / 提醒）
   Web 管理端（看板 / 权限 / 导出）——后续
   可选：Obsidian 仅作个人草稿，非主库

② API 层  →  CRM API :8100
   鉴权（企微 userid → CRM users）
   CRUD / 查询引擎 / 企微回调
   调 BCI-Brain（需要 AI 时）

③ AI 层  →  BCI-Brain
   Hindsight :8888（记忆）
   IIS :8080（发布站）
   出站大模型 / 企微 Bot
   ※ AI 问答必须带当前用户权限，禁止裸查全库

④ 数据层
   CRM 主库 PostgreSQL :5433 / beltcollins_crm
   Brain 库 PostgreSQL :5432 / hindsight（仅 Brain）
```

**铁律：**

1. 界面能看什么 → AI 只能基于什么  
2. CRM 与 Hindsight **两套库，永不混用**  
3. Brain 调 CRM 只走 `http://127.0.0.1:8100/internal/...`，不直连 5433（生产建议；Phase 1 可先本机直连再收紧）

---

## 6. 数据库结构（CRM @ 5433）

### 6.1 实例信息

| 项 | 值 |
|----|-----|
| 产品 | PostgreSQL 18（Windows 官方安装包） |
| 端口 | **5433** |
| 库名 | `beltcollins_crm` |
| 应用用户 | `crm_app` |
| 管理用户 | `postgres`（安装时密码） |
| 连接串示例 | `postgresql://crm_app:***@127.0.0.1:5433/beltcollins_crm` |
| API 用 URL | `postgresql+psycopg2://crm_app:***@127.0.0.1:5433/beltcollins_crm` |

### 6.2 与 Brain 库对比

| | Brain (.pg0) | CRM（官方） |
|--|--------------|-------------|
| 路径 | `C:\Users\bci_brain\.pg0\...` | `C:\Program Files\PostgreSQL\18\` |
| 端口 | 5432 | 5433 |
| 业务库 | `hindsight` | `beltcollins_crm` |
| 软件列表可见 | 否（嵌入） | 是 |

### 6.3 已建表（Phase 1）

| 表名 | 用途 |
|------|------|
| `users` | CRM 账号与角色（bd / team_lead / analyst / admin） |
| `clients` | 客户主数据（赛道、等级 L1–L4、负责人） |
| `contacts` | 决策人 / 联系人 |
| `interactions` | 拜访、电话、微信等沟通记录 |
| `project_leads` | 项目线索（招标/政策/手动） |
| `audit_logs` | 审计（读/写/导出/AI 问答） |

### 6.4 初始用户（已插入）

| id | name | role |
|----|------|------|
| 1 | Nancy | bd |
| 2 | Candy | bd |
| 3 | Genie | bd |
| 4 | Pipi | bd |
| 5 | Fraya | bd |
| 6 | Janice | team_lead |
| 7 | Celia | analyst |
| 8 | Ben | admin |

`wechat_work_id` 暂空，接企微后按 userid 回填。

### 6.5 本机检查命令（CMD）

```cmd
netstat -ano | findstr "5432 5433 8100"

"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5433 -U postgres -d beltcollins_crm -c "\dt"

"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5433 -U postgres -d beltcollins_crm -c "SELECT id,name,role FROM users;"
```

Brain 侧（勿改数据）：

```cmd
"C:\Users\bci_brain\.pg0\installation\18.1.0\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -c "\l"
```

---

## 7. CRM API 结构（Phase 1）

### 7.1 技术栈

- Python 3.x + **FastAPI** + **Uvicorn**
- **SQLAlchemy 2** + **psycopg2**
- 配置：`.env`（`pydantic-settings`）

### 7.2 已实现接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 服务信息 |
| GET | `/health` | 健康检查 + 确认连上 5433 |
| GET | `/users` | 列出 users 表 |
| GET | `/docs` | Swagger UI |

### 7.3 本机启动

```cmd
cd /d D:\BCI-CRM\crm-api
copy .env.example .env
notepad .env
```

`.env` 示例：

```env
DATABASE_URL=postgresql+psycopg2://crm_app:你的密码@127.0.0.1:5433/beltcollins_crm
CRM_API_HOST=127.0.0.1
CRM_API_PORT=8100
```

```cmd
py -3 -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8100
```

或双击 `start-api.bat`。

验证：

```text
http://127.0.0.1:8100/health
http://127.0.0.1:8100/users
http://127.0.0.1:8100/docs
```

### 7.4 后续接口规划（未实现）

| 路径 | 用途 |
|------|------|
| `POST /interactions` | 录入沟通 |
| `GET/POST /clients` | 客户 CRUD + 撞单检测 |
| `GET /leads` | 线索列表 |
| `POST /wecom/callback` | 企微消息回调 |
| `GET /internal/clients` | 供 Brain 调用（带 userid + 内网 Token） |
| `POST /ai/ask` | 问答入口（内部转 Brain） |

---

## 8. 与 BCI-Brain 的边界

| 能力 | 放哪 |
|------|------|
| 客户 / 沟通 / 线索 / 权限 | **CRM（5433 + 8100）** |
| 记忆 / Reflect / 知识发布站 | **Brain（5432 + 8888 + 8080）** |
| 大模型调用、企微 AI Bot 长连接 | **Brain 出站** |
| 商务 CRM 录入与权限内问答 | **CRM 编排 → 可选调用 Brain** |

推荐调用方向：

```text
企微消息 → CRM :8100 →（写库 / 鉴权）→ 需要 AI 时 → Hindsight :8888 / Brain 能力
Brain 需要客户事实 → CRM :8100/internal（带 wecom userid）
```

**禁止：** CRM 写 `hindsight` 库；Brain 用 admin 身份扫 CRM 全表。

---

## 9. 企业微信通道（规划，未落地）

| 方式 | 用途 | 状态 |
|------|------|------|
| **自建应用** | 主通道：录入、问答、个人提醒 | 待建 |
| **群机器人 Webhook** | 团队情报广播 | 可选 |
| **Leo 个人号** | 仅后台管理配置，不当通道 | — |
| **桌面 WXWork.exe** | 用户聊天客户端 | 已装，非服务端 |

回调链路（后续）：

```text
企微云 → https://你的域名/wecom/callback
       → 腾讯云 Nginx
       → 隧道到本机 127.0.0.1:8100/wecom/callback
```

---

## 10. 权限模型（设计要点）

| 角色 | 数据范围 |
|------|----------|
| bd | 自己的客户与沟通 |
| team_lead | 本组 |
| analyst | 全量只读 + 报表 |
| admin | 全部 + 配置 |

后续：API 层过滤 +（可选）PostgreSQL RLS。  
AI 问答 **继承当前企微用户角色**，禁止服务账号越权。

---

## 11. 当前完成度清单

| 项 | 状态 |
|----|------|
| 确认 Brain 端口 8080/8888/5432 | ✅ |
| CRM 独立 PG 5433 | ✅ |
| 库 beltcollins_crm + crm_app | ✅ |
| 6 张核心表 + 8 用户 | ✅ |
| 与 Brain 实例隔离（B 方案） | ✅ |
| CRM API 代码骨架（仓库） | ✅ |
| 本机启动 API 8100 并验证 | ⬜ 待你本机执行 |
| 企微自建应用 | ⬜ |
| 腾讯云回调转发 | ⬜ |
| 客户/沟通 CRUD | ⬜ |
| Brain internal 对接 | ⬜ |
| 权限 RLS / 字段级 | ⬜ |

---

## 12. 本机运维注意

1. Win10 设为专用机：不休眠、控制自动重启窗口  
2. PostgreSQL 18 服务（5433）开机自启  
3. Brain `.pg0`（5432）由 Brain 启停，勿卸载  
4. 每日备份 CRM：

```cmd
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h 127.0.0.1 -p 5433 -U crm_app -d beltcollins_crm -F c -f D:\BCI-CRM\backups\crm_backup.dump
```

5. 内存：本地大模型 + Cursor 同时开易顶满；CRM PG/API 占用很小  
6. `.env` 勿提交 Git；截图勿暴露密码  

---

## 13. 本地处理建议顺序

1. 复制 `bci-crm/crm-api` → `D:\BCI-CRM\crm-api`  
2. 配置 `.env`（crm_app 密码）  
3. `uvicorn` 起 8100，打开 `/health`、`/users`  
4. 确认 `netstat` 同时有 5432、5433、8100  
5. 再开发：clients / interactions API  
6. 再接企微自建应用 + 云入口  
7. 再接 Brain `:8888` / internal  

---

## 14. 关键联系人与账号（本机）

| 角色 | 说明 |
|------|------|
| Windows 用户 benswhe | 运维 / 开发 |
| Windows 用户 bci_brain | Brain 嵌入 PG 所在用户目录 |
| PG 5433 postgres / crm_app | CRM |
| PG 5432 postgres / hindsight 角色 | Brain |
| 企微管理员（如 Leo） | 创建自建应用，非消息通道 |

---

## 15. 文档索引

| 文件 | 内容 |
|------|------|
| `docs/bci-crm-system-structure.md` | **本文：本机结构总览** |
| `docs/beltcollins-crm-ai-system-architecture.md` | 完整技术架构、Docker 备选、爬虫与 AI Agent |
| `docs/beltcollins-crm-database-platform-aiqa.md` | 专业库 + 权限展示 + AI 问答细则 |
| `bci-crm/crm-api/README.md` | API 启动说明 |

---

**移交说明：** 数据库层已在目标 Win10 验证通过；将本仓库 `bci-crm/crm-api` 拷到 `D:\BCI-CRM\crm-api`，按第 7、13 节启动即可继续本地开发。
