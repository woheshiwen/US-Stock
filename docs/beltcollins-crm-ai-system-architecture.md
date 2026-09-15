# 贝尔高林 CRM-AI 系统架构设计指南

> **版本**：v1.0 | **日期**：2026年8月19日  
> **编制**：IT/AI 技术部 | **适用**：商务与市场部 CRM-AI 平台

---

## 目录

1. [系统总览](#1-系统总览)
2. [基础设施与部署架构](#2-基础设施与部署架构)
3. [数据库设计](#3-数据库设计)
4. [信息传输平台与通道](#4-信息传输平台与通道)
5. [AI 引擎架构](#5-ai-引擎架构)
6. [四大功能模块详解](#6-四大功能模块详解)
7. [安全与权限体系](#7-安全与权限体系)
8. [分阶段落地计划](#8-分阶段落地计划)
9. [技术选型对照表](#9-技术选型对照表)
10. [运维与监控](#10-运维与监控)

---

## 1. 系统总览

### 1.1 设计原则

| 原则 | 说明 |
|------|------|
| **移动优先** | 商务人员 90% 时间在外拜访，所有操作必须手机完成 |
| **零学习成本** | 嵌入企业微信/飞书，不单独装 App |
| **AI 原生** | 不是给旧系统贴 AI，而是 AI 驱动每个环节 |
| **渐进交付** | 先能用、再好用、后智能，3 个月内 Phase 1 上线 |
| **数据主权** | 客户数据全部存公司自有服务器/私有云，不上公有 SaaS |

### 1.2 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户触点层 (Frontend)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ 企业微信   │  │ 飞书机器人 │  │ Web 仪表盘│  │ 移动端 H5/小程序  │ │
│  │ (主通道)   │  │ (备用)    │  │ (管理后台)│  │ (外出录入)       │ │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └───────┬──────────┘ │
│        │             │             │               │            │
├────────┴─────────────┴─────────────┴───────────────┴────────────┤
│                      API 网关层 (Gateway)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Nginx / Traefik  →  认证鉴权  →  限流  →  路由分发        │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      业务服务层 (Backend)                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────┐  │
│  │ 情报雷达    │ │ 客户管理    │ │ 协同引擎    │ │ 报告生成     │  │
│  │ Service    │ │ Service    │ │ Service    │ │ Service     │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬──────┘  │
│        │              │              │               │         │
├────────┴──────────────┴──────────────┴───────────────┴─────────┤
│                       AI 引擎层 (AI Core)                       │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ 政策解读   │ │ 智能分类    │ │ 话术生成  │ │ 数据分析/洞察     │  │
│  │ Agent    │ │ Agent     │ │ Agent    │ │ Agent           │  │
│  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      数据层 (Data)                               │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │PostgreSQL│ │ Redis     │ │ MinIO    │ │ Elasticsearch    │  │
│  │(主数据库) │ │(缓存/队列) │ │(文件存储) │ │(全文检索)        │  │
│  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      采集层 (Crawler)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  定时爬虫集群：政府网站 / 招标平台 / 行业媒体 / 竞品公告    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 基础设施与部署架构

### 2.1 部署方案选择

考虑贝尔高林的规模（7 人商务团队 + IT 部门），建议 **轻量私有化部署**：

```
推荐方案：公司内网 Linux 服务器 + 云端 AI API

┌─────────────────────────────────────────────┐
│  公司内网 (192.168.x.x)                       │
│                                              │
│  ┌──────────────────────────────┐            │
│  │  Linux Server (推荐 Ubuntu)   │            │
│  │  ├─ Docker Compose 编排       │            │
│  │  │  ├─ PostgreSQL 16          │            │
│  │  │  ├─ Redis 7                │            │
│  │  │  ├─ FastAPI Backend ×2     │            │
│  │  │  ├─ Nginx (反向代理+SSL)   │            │
│  │  │  ├─ Crawler Workers ×3    │            │
│  │  │  ├─ Celery (异步任务)      │            │
│  │  │  ├─ MinIO (对象存储)       │            │
│  │  │  └─ Metabase (BI 可视化)   │            │
│  │  └─ 定时任务 (Cron)           │            │
│  └──────────────────────────────┘            │
│       │                                      │
│       │ VPN / 内网穿透                        │
│       ▼                                      │
│  ┌──────────┐    ┌───────────────┐           │
│  │ 企业微信   │    │ 飞书开放平台    │           │
│  │ Webhook  │    │ Webhook       │           │
│  └──────────┘    └───────────────┘           │
└─────────────────────────────────────────────┘
         │
         │ HTTPS (加密)
         ▼
┌─────────────────────┐
│  外部 AI API          │
│  ├─ Claude API       │
│  ├─ OpenAI API       │
│  └─ 或国内: 通义/文心  │
└─────────────────────┘
```

### 2.2 服务器配置建议

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 4 核 | 8 核 |
| 内存 | 16 GB | 32 GB |
| 硬盘 | 500 GB SSD | 1 TB SSD |
| 网络 | 100 Mbps 对外 | 有固定公网 IP 或域名 |
| 系统 | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

可以跑在现有 Hyper-V 虚拟机上（类似 BCISZ-DC01/DC02 的环境），新建一台 VM 即可。

### 2.3 Docker Compose 服务编排

```yaml
# docker-compose.yml 核心结构
version: "3.9"
services:

  # ---- 数据层 ----
  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: beltcollins_crm
      POSTGRES_USER: crm_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  # ---- 业务层 ----
  api:
    build: ./backend
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql+asyncpg://crm_admin:${DB_PASSWORD}@postgres/beltcollins_crm
      REDIS_URL: redis://redis:6379/0
      AI_API_KEY: ${AI_API_KEY}
      AI_BASE_URL: ${AI_BASE_URL}
      WECHAT_WORK_CORP_ID: ${WECHAT_WORK_CORP_ID}
      WECHAT_WORK_SECRET: ${WECHAT_WORK_SECRET}
    ports:
      - "8000:8000"

  # ---- 异步任务 ----
  celery-worker:
    build: ./backend
    command: celery -A tasks worker -l info -c 4
    depends_on:
      - redis
      - postgres

  celery-beat:
    build: ./backend
    command: celery -A tasks beat -l info
    depends_on:
      - redis

  # ---- 爬虫 ----
  crawler:
    build: ./crawler
    command: scrapy crawl gov_projects
    depends_on:
      - postgres
      - redis

  # ---- 前端/BI ----
  metabase:
    image: metabase/metabase:latest
    ports:
      - "3000:3000"
    environment:
      MB_DB_TYPE: postgres
      MB_DB_HOST: postgres
      MB_DB_PORT: 5432
      MB_DB_DBNAME: beltcollins_crm
      MB_DB_USER: crm_admin
      MB_DB_PASS: ${DB_PASSWORD}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - api
      - metabase

volumes:
  pgdata:
  minio_data:
```

---

## 3. 数据库设计

### 3.1 为什么选 PostgreSQL

| 对比 | PostgreSQL | MySQL | MongoDB |
|------|-----------|-------|---------|
| JSON 支持 | 原生 JSONB，可建索引 | JSON 列但索引弱 | 原生但缺事务 |
| 全文检索 | 内置中文分词(zhparser) | 需外挂 | 一般 |
| 地理信息 | PostGIS 扩展，项目定位 | 弱 | 有但不如 PG |
| 事务/一致性 | ACID 严格 | 可以 | 弱 |
| 扩展性 | 插件生态丰富 | 一般 | 灵活但杂 |

PostgreSQL + JSONB 既能做关系型的客户/项目管理，也能灵活存储爬虫抓来的非结构化政策数据。

### 3.2 核心数据表结构

```sql
-- ============================================================
-- 1. 用户与权限
-- ============================================================

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,         -- Nancy, Candy, Genie...
    role            VARCHAR(30) NOT NULL,          -- admin / bd / analyst / leader
    wechat_work_id  VARCHAR(100),                  -- 企业微信 userid
    phone           VARCHAR(20),
    email           VARCHAR(100),
    responsible_tracks TEXT[],                      -- {'产业园区','文旅酒店'}
    responsible_regions TEXT[],                     -- {'华南','华东'}
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. 客户管理（渗透管道核心）
-- ============================================================

CREATE TABLE clients (
    id              SERIAL PRIMARY KEY,
    company_name    VARCHAR(200) NOT NULL,          -- 万科、华润置地...
    industry        VARCHAR(50),                    -- 房企/酒店集团/政府/产业园区
    track           VARCHAR(50),                    -- 第四代住宅/文旅酒店/产业园区/城市更新
    level           VARCHAR(5) DEFAULT 'L1',        -- L1→L2→L3→L4→签约
    city            VARCHAR(50),
    province        VARCHAR(50),
    address         TEXT,
    geo_location    GEOGRAPHY(POINT, 4326),         -- PostGIS 定位
    website         VARCHAR(500),
    tags            TEXT[],                          -- {'十五五','专项债','生态修复'}
    source          VARCHAR(50),                    -- 爬虫/手动/转介绍/行业活动
    assigned_to     INTEGER REFERENCES users(id),   -- 主负责人
    co_owners       INTEGER[],                      -- 协同负责人（防撞单）
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_track ON clients(track);
CREATE INDEX idx_clients_level ON clients(level);
CREATE INDEX idx_clients_assigned ON clients(assigned_to);

-- ============================================================
-- 3. 决策人（客户下的关键联系人）
-- ============================================================

CREATE TABLE contacts (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER REFERENCES clients(id),
    name            VARCHAR(100) NOT NULL,
    title           VARCHAR(100),                   -- 设计总监/副总裁/科长
    phone           VARCHAR(20),
    wechat          VARCHAR(100),
    email           VARCHAR(100),
    decision_power  VARCHAR(20),                    -- 决策者/影响者/执行者
    preferences     JSONB,                          -- {"爱好":"高尔夫","关注":"碳汇"}
    last_contact_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. 沟通记录（每次触点）
-- ============================================================

CREATE TABLE interactions (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER REFERENCES clients(id),
    contact_id      INTEGER REFERENCES contacts(id),
    user_id         INTEGER REFERENCES users(id),   -- 谁做的沟通
    interaction_type VARCHAR(30),                    -- 电话/微信/面访/邮件/线上会议
    summary         TEXT NOT NULL,                   -- AI 自动摘要或手动输入
    raw_content     TEXT,                            -- 原始语音转文字/聊天记录
    sentiment       VARCHAR(20),                     -- positive/neutral/negative (AI)
    next_action     TEXT,                            -- AI 建议的下一步
    next_action_date DATE,
    attachments     JSONB,                           -- [{"name":"方案.pdf","url":"..."}]
    ai_tags         TEXT[],                          -- AI 自动打标：{'有预算','Q4决策'}
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_client ON interactions(client_id);
CREATE INDEX idx_interactions_user ON interactions(user_id);
CREATE INDEX idx_interactions_date ON interactions(created_at);

-- ============================================================
-- 5. 项目线索（情报雷达抓取 + 手动录入）
-- ============================================================

CREATE TABLE project_leads (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(500) NOT NULL,
    source_url      VARCHAR(1000),                   -- 原始网页
    source_type     VARCHAR(50),                     -- 政府采购网/住建局/发改委/手动
    province        VARCHAR(50),
    city            VARCHAR(50),
    track           VARCHAR(50),                     -- 城市更新/生态修复/第四代住宅/文旅
    stage           VARCHAR(30),                     -- 可研/立项/招标/已开标/已定标
    estimated_amount DECIMAL(15,2),                  -- 投资金额（万元）
    publish_date    DATE,
    deadline        DATE,
    owner_company   VARCHAR(200),                    -- 建设单位/业主
    key_contacts    JSONB,                           -- 从公告中提取的联系人
    content_raw     TEXT,                            -- 原始公告全文
    ai_summary      TEXT,                            -- AI 摘要
    ai_match_score  DECIMAL(3,2),                    -- AI 匹配度 0-1
    ai_tags         TEXT[],                          -- {'可申报专项债','生态修复专项'}
    status          VARCHAR(20) DEFAULT 'new',       -- new/assigned/tracking/won/lost
    assigned_to     INTEGER REFERENCES users(id),
    linked_client   INTEGER REFERENCES clients(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_track ON project_leads(track);
CREATE INDEX idx_leads_stage ON project_leads(stage);
CREATE INDEX idx_leads_score ON project_leads(ai_match_score DESC);

-- ============================================================
-- 6. 竞品情报
-- ============================================================

CREATE TABLE competitor_intel (
    id              SERIAL PRIMARY KEY,
    competitor_name VARCHAR(200) NOT NULL,            -- 奥雅/土人/现工...
    event_type      VARCHAR(50),                      -- 中标/签约/新闻/人事变动
    content         TEXT,
    source_url      VARCHAR(1000),
    project_name    VARCHAR(500),
    bid_amount      DECIMAL(15,2),
    city            VARCHAR(50),
    ai_analysis     TEXT,                             -- AI 简析
    published_at    DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. 周报/月报（自动生成 + 人工修改）
-- ============================================================

CREATE TABLE reports (
    id              SERIAL PRIMARY KEY,
    report_type     VARCHAR(20) NOT NULL,              -- weekly/monthly/quarterly
    period_start    DATE,
    period_end      DATE,
    user_id         INTEGER REFERENCES users(id),      -- NULL 表示团队报告
    content_json    JSONB NOT NULL,                    -- 结构化报告数据
    content_md      TEXT,                              -- Markdown 渲染版
    ai_insights     TEXT,                              -- AI 洞察
    status          VARCHAR(20) DEFAULT 'draft',       -- draft/submitted/approved
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. AI 任务日志（可审计）
-- ============================================================

CREATE TABLE ai_task_logs (
    id              SERIAL PRIMARY KEY,
    task_type       VARCHAR(50),                       -- classify/summarize/generate_talk/analyze
    input_text      TEXT,
    output_text     TEXT,
    model_used      VARCHAR(50),                       -- claude-sonnet/gpt-4o/qwen
    tokens_used     INTEGER,
    cost_usd        DECIMAL(8,4),
    latency_ms      INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 数据关系图 (ER)

```
users ─────────┐
               │ 1:N
               ▼
           interactions ◄──── contacts
               ▲                  ▲
               │                  │ N:1
               │ N:1              │
           clients ──────────── (has many)
               ▲
               │ link
           project_leads

competitor_intel (独立表)
reports ◄──── 自动从 interactions + project_leads 聚合
ai_task_logs (独立审计表)
```

---

## 4. 信息传输平台与通道

### 4.1 通道总览

```
┌──────────────────────────────────────────────────────────┐
│                   信息流向全景                              │
│                                                          │
│  外部数据源                    系统内部              用户触点  │
│  ───────                    ────────            ──────── │
│                                                          │
│  政府网站 ──┐                                             │
│  招标平台 ──┤  爬虫   ┌──────────┐  推送   ┌───────────┐  │
│  行业媒体 ──┤ ──────► │ 后端 API  │ ─────► │ 企业微信    │  │
│  竞品公告 ──┘         │ + AI     │        │ 机器人     │  │
│                      │ 引擎     │        └───────────┘  │
│  语音输入 ──┐         │          │                       │
│  微信消息 ──┤ ──────► │          │  查看   ┌───────────┐  │
│  手动录入 ──┘ Webhook │          │ ─────► │ Web 仪表盘  │  │
│                      └──────────┘        └───────────┘  │
│                           │                              │
│                           ▼                              │
│                      ┌──────────┐                        │
│                      │ 数据库    │                        │
│                      │ PG+Redis │                        │
│                      └──────────┘                        │
└──────────────────────────────────────────────────────────┘
```

### 4.2 企业微信集成（主通道）

公司既然已有域环境，企业微信是最自然的选择。

#### 4.2.1 企业微信机器人（群推送）

```python
# 企业微信群机器人 Webhook — 最简单的推送方式
import httpx

WECHAT_WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY"

async def push_to_group(title: str, content: str, mentioned_list: list = None):
    """推送消息到企业微信群"""
    payload = {
        "msgtype": "markdown",
        "markdown": {
            "content": f"## 🎯 {title}\n\n{content}"
        }
    }
    if mentioned_list:
        payload["markdown"]["content"] += f'\n\n<@{"  @".join(mentioned_list)}>'

    async with httpx.AsyncClient() as client:
        await client.post(WECHAT_WEBHOOK_URL, json=payload)
```

#### 4.2.2 企业微信自建应用（双向交互）

```
┌─────────────────────────────────────────────────┐
│  企业微信自建应用                                   │
│                                                  │
│  功能 1: 消息推送（服务端 → 用户）                    │
│  ├─ 新项目线索通知                                  │
│  ├─ 客户跟进提醒                                   │
│  ├─ 周报生成完成通知                                │
│  └─ 竞品动态速报                                   │
│                                                  │
│  功能 2: 消息接收（用户 → 服务端）                    │
│  ├─ 用户发送语音 → 转文字 → AI 提取客户/沟通要点      │
│  ├─ 用户发送名片照片 → OCR → 自动建联系人             │
│  ├─ 用户发送指令 → 查询客户/项目信息                  │
│  └─ 用户转发聊天记录 → AI 摘要入库                   │
│                                                  │
│  功能 3: H5 应用页（嵌入企微）                       │
│  ├─ 客户列表/详情页                                 │
│  ├─ 沟通记录快速录入                                │
│  ├─ 渗透地图可视化                                  │
│  └─ 个人/团队仪表盘                                │
└─────────────────────────────────────────────────┘
```

配置步骤：

1. **企业微信管理后台** → 应用管理 → 自建应用
2. 获取 `CorpID`、`AgentID`、`Secret`
3. 设置 **接收消息** 的回调 URL（你的服务器 API 地址）
4. 设置 **可信域名**（用于 H5 页面 OAuth）
5. 后端处理回调消息 → 调 AI → 回复

#### 4.2.3 消息处理流水线

```python
# 企业微信消息回调处理
from fastapi import APIRouter, Request
from app.services.ai_engine import AIEngine
from app.services.crm import CRMService

router = APIRouter()

@router.post("/wechat/callback")
async def wechat_callback(request: Request):
    """接收企业微信消息并处理"""
    msg = await parse_wechat_message(request)

    if msg.type == "voice":
        text = await speech_to_text(msg.media_id)
        result = await AIEngine.extract_interaction(text)
        await CRMService.save_interaction(
            user_id=msg.from_user,
            summary=result.summary,
            client_name=result.client_name,
            next_action=result.next_action,
            raw_content=text
        )
        return reply_text(msg, f"已记录与 {result.client_name} 的沟通。\n下一步：{result.next_action}")

    elif msg.type == "image":
        card_info = await ocr_business_card(msg.media_id)
        contact = await CRMService.create_contact(card_info)
        return reply_text(msg, f"已创建联系人：{contact.name} - {contact.title}")

    elif msg.type == "text":
        if msg.content.startswith("/查"):
            keyword = msg.content[2:].strip()
            results = await CRMService.search(keyword)
            return reply_text(msg, format_search_results(results))

        elif msg.content.startswith("/线索"):
            leads = await CRMService.get_today_leads(msg.from_user)
            return reply_text(msg, format_leads(leads))
```

### 4.3 通知与提醒策略

| 场景 | 触发条件 | 通知谁 | 通知方式 |
|------|---------|--------|---------|
| 新项目线索 | 爬虫发现匹配度 >0.7 的项目 | 对应赛道负责人 | 企微应用消息 |
| 客户 7 天未跟进 | 最后沟通 >7 天 | 负责人 | 企微提醒 |
| L2 客户 30 天未升级 | L2 状态 >30 天 | 负责人 + 组长 | 企微 + 标红看板 |
| 撞单预警 | 两人录入同一客户 | 双方 + 管理者 | 企微弹窗 |
| 周报待提交 | 周五 16:00 未提交 | 本人 | 企微提醒 |
| 竞品中标 | 爬虫发现竞品中标 | 全组 | 群机器人 |
| 招标截止 D-3 | 距截止 3 天 | 负责人 | 企微紧急提醒 |

---

## 5. AI 引擎架构

### 5.1 AI 在系统中的角色

AI 不是一个独立模块，而是**贯穿所有环节的连接器**：

```
 数据进入            AI 处理                    结果输出
 ────────          ─────────                 ─────────

 政府公告  ──────►  分类 + 匹配度打分  ──────►  推送给对应BD
 
 语音消息  ──────►  转文字 + 提取要点   ──────►  写入沟通记录

 客户数据  ──────►  分析 + 预测       ──────►  升级建议/预警

 沟通记录  ──────►  汇总 + 生成       ──────►  自动周报

 竞品公告  ──────►  解析 + 对比       ──────►  情报简报

 客户画像  ──────►  理解 + 生成       ──────►  定制话术
```

### 5.2 AI Agent 设计

```python
# AI 引擎核心 — 基于 Function Calling 的 Agent 架构

from anthropic import AsyncAnthropic

class AIEngine:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.AI_API_KEY)

    # ── Agent 1: 项目线索分类与匹配 ──
    async def classify_project_lead(self, raw_text: str) -> dict:
        """将爬取的项目公告分类、打分、匹配负责人"""
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system="""你是贝尔高林的市场分析AI。根据项目公告内容：
1. 判断赛道：城市更新/生态修复/第四代住宅/文旅酒店/产业园区/其他
2. 判断阶段：可研/立项/招标/已开标
3. 匹配度评分(0-1)：基于贝尔高林的业务优势
4. 提取关键信息：项目名、投资额、建设单位、联系方式
5. 生成50字内摘要
6. 标注是否可申报专项债/中央预算

输出严格JSON格式。""",
            messages=[{"role": "user", "content": raw_text}]
        )
        return parse_json(response.content[0].text)

    # ── Agent 2: 沟通记录智能提取 ──
    async def extract_interaction(self, raw_text: str) -> dict:
        """从语音转文字/聊天记录中提取结构化沟通信息"""
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            system="""你是贝尔高林的CRM助手。从沟通记录中提取：
1. 客户公司名称
2. 联系人姓名和职务
3. 沟通要点摘要（100字内）
4. 客户痛点/需求
5. 发现的项目机会
6. 建议的下一步行动
7. 建议的下一步日期
8. 情绪判断：positive/neutral/negative
9. 自动标签

输出严格JSON格式。""",
            messages=[{"role": "user", "content": raw_text}]
        )
        return parse_json(response.content[0].text)

    # ── Agent 3: 话术生成 ──
    async def generate_talk_script(
        self, client_info: dict, contact_info: dict, scenario: str
    ) -> str:
        """根据客户画像和场景生成定制话术"""
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system="""你是贝尔高林的商务话术顾问。根据客户信息和场景，
生成专业、自信、不卑不亢的沟通话术。
要求：
- 体现贝尔高林20年国际经验
- 针对客户具体痛点
- 自然、不生硬
- 包含开场白、价值陈述、收尾约下次""",
            messages=[{"role": "user", "content": f"""
客户信息：{json.dumps(client_info, ensure_ascii=False)}
联系人：{json.dumps(contact_info, ensure_ascii=False)}
场景：{scenario}
"""}]
        )
        return response.content[0].text

    # ── Agent 4: 周报自动生成 ──
    async def generate_weekly_report(
        self, user_name: str, interactions: list, leads: list, period: str
    ) -> dict:
        """自动生成个人周报"""
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            system="""你是贝尔高林的报告生成AI。根据本周沟通记录和项目线索，
生成周报，格式严格按照：
1. 本周最有价值的一次互动（见了谁、聊了什么、发现了什么机会）
2. 渗透地图更新（新增触点、升级客户、评级变化）
3. 需要的支持

语气专业简洁，突出数据和事实。输出 JSON + Markdown 双格式。""",
            messages=[{"role": "user", "content": f"""
负责人：{user_name}
周期：{period}
本周沟通记录：{json.dumps(interactions, ensure_ascii=False)}
本周项目线索：{json.dumps(leads, ensure_ascii=False)}
"""}]
        )
        return parse_json(response.content[0].text)

    # ── Agent 5: 数据洞察 ──
    async def generate_insights(self, metrics: dict) -> str:
        """基于数据生成业务洞察"""
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            system="""你是贝尔高林的数据分析AI。基于业务指标数据，
给出 3-5 条可行动的洞察，每条包含：
- 发现了什么
- 为什么重要
- 建议怎么做
用中文，简洁有力。""",
            messages=[{"role": "user", "content": json.dumps(metrics, ensure_ascii=False)}]
        )
        return response.content[0].text
```

### 5.3 AI 调用成本控制

| 模型 | 用途 | 预估日调用量 | 日成本 |
|------|------|------------|--------|
| Claude Sonnet | 分类/摘要/提取 | ~200 次 | ~$2 |
| Claude Sonnet | 话术/报告生成 | ~20 次 | ~$1 |
| 语音转文字 (Whisper/讯飞) | 语音消息转文字 | ~30 次 | ~$0.5 |
| OCR (百度/腾讯) | 名片识别 | ~5 次 | ~$0.1 |
| **月度总计** | | | **~$100-150** |

建议：高频低复杂度任务（分类打标）可用更便宜的模型或本地小模型；复杂任务（报告生成、洞察分析）用 Claude/GPT-4。

### 5.4 AI 串联全流程图

```
 ┌─────── 早上 8:00 ──────────────────────────────────────────┐
 │                                                            │
 │  定时爬虫运行                                                │
 │     │                                                      │
 │     ▼                                                      │
 │  抓取 50 条政府/招标公告                                      │
 │     │                                                      │
 │     ▼                                                      │
 │  AI Agent 1: 逐条分类 → 打分 → 匹配负责人                     │
 │     │                                                      │
 │     ▼                                                      │
 │  筛出 5 条高匹配度线索                                        │
 │     │                                                      │
 │     ▼                                                      │
 │  企业微信推送给 Candy/Genie/Pipi/Fraya                       │
 │  "🎯 新线索：XX市生态修复项目，投资3.2亿，匹配度0.92"           │
 │                                                            │
 ├─────── 工作日全天 ─────────────────────────────────────────┤
 │                                                            │
 │  Pipi 拜访客户后，发一段语音到企微                              │
 │     │                                                      │
 │     ▼                                                      │
 │  语音转文字                                                  │
 │     │                                                      │
 │     ▼                                                      │
 │  AI Agent 2: 提取客户名/联系人/痛点/下一步                     │
 │     │                                                      │
 │     ▼                                                      │
 │  自动写入 interactions 表 + 更新 clients 表                   │
 │     │                                                      │
 │     ▼                                                      │
 │  回复 Pipi："已记录与XX的沟通。建议3天内发送方案。"              │
 │                                                            │
 │  Nancy 需要拜访一位副总                                       │
 │     │                                                      │
 │     ▼                                                      │
 │  在企微输入 "/话术 万科 张副总 初次接触"                        │
 │     │                                                      │
 │     ▼                                                      │
 │  AI Agent 3: 生成定制话术                                    │
 │     │                                                      │
 │     ▼                                                      │
 │  返回话术到 Nancy 企微                                        │
 │                                                            │
 ├─────── 下午 17:00 ─────────────────────────────────────────┤
 │                                                            │
 │  AI 自动抓取竞品中标信息                                      │
 │     │                                                      │
 │     ▼                                                      │
 │  AI Agent 5: 生成 300 字竞品简报                              │
 │     │                                                      │
 │     ▼                                                      │
 │  Celia 审核 → 发到团队群                                     │
 │                                                            │
 ├─────── 周五 15:00 ─────────────────────────────────────────┤
 │                                                            │
 │  系统自动聚合本周数据                                         │
 │     │                                                      │
 │     ▼                                                      │
 │  AI Agent 4: 为每人生成周报草稿                               │
 │     │                                                      │
 │     ▼                                                      │
 │  推送到每人企微："您的周报草稿已生成，请确认或修改后提交"          │
 │     │                                                      │
 │     ▼                                                      │
 │  Celia 汇总 → AI 生成渗透地图全景视图                          │
 │                                                            │
 └────────────────────────────────────────────────────────────┘
```

---

## 6. 四大功能模块详解

### 6.1 情报雷达模块

```python
# 爬虫架构示例 — Scrapy + Celery 定时

# crawler/spiders/gov_procurement.py
import scrapy

class GovProcurementSpider(scrapy.Spider):
    """中国政府采购网爬虫"""
    name = "gov_procurement"
    start_urls = ["http://www.ccgp.gov.cn/"]

    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "CONCURRENT_REQUESTS": 3,
        "ROBOTSTXT_OBEY": True,
    }

    def parse(self, response):
        for item in response.css(".vT-srch-result-list-bid li"):
            yield {
                "title": item.css("a::text").get(),
                "url": item.css("a::attr(href)").get(),
                "date": item.css("span::text").get(),
                "source": "ccgp",
            }

# tasks/crawler_tasks.py
from celery import shared_task

@shared_task
def run_daily_crawl():
    """每日 7:00 自动执行"""
    sources = [
        "gov_procurement",      # 政府采购网
        "provincial_exchange",   # 各省公共资源交易中心
        "housing_bureau",        # 住建局
        "industry_media",        # 迈点/执惠/环球旅讯
        "competitor_bids",       # 竞品中标公告
    ]
    for source in sources:
        crawl_source.delay(source)

@shared_task
def process_crawled_items():
    """爬取完成后 AI 处理"""
    raw_items = get_unprocessed_items()
    for item in raw_items:
        result = ai_engine.classify_project_lead(item.content_raw)
        save_classified_lead(item, result)
        if result["match_score"] > 0.7:
            notify_assigned_user(result)
```

### 6.2 客户管理模块

```python
# backend/api/clients.py
from fastapi import APIRouter, Depends

router = APIRouter(prefix="/api/clients", tags=["clients"])

@router.get("/")
async def list_clients(
    track: str = None,
    level: str = None,
    assigned_to: int = None,
    search: str = None,
    page: int = 1,
    size: int = 20,
):
    """客户列表（支持筛选/搜索/分页）"""
    ...

@router.post("/")
async def create_client(data: ClientCreate):
    """新建客户 — 自动检测撞单"""
    existing = await check_duplicate(data.company_name)
    if existing:
        return {"warning": "撞单预警", "existing_client": existing}
    ...

@router.get("/{client_id}/timeline")
async def client_timeline(client_id: int):
    """客户时间线 — 所有沟通记录+项目线索"""
    ...

@router.post("/{client_id}/interactions")
async def add_interaction(client_id: int, data: InteractionCreate):
    """添加沟通记录 — 支持语音/文字"""
    if data.voice_media_id:
        text = await speech_to_text(data.voice_media_id)
        ai_result = await ai_engine.extract_interaction(text)
        data.summary = ai_result["summary"]
        data.ai_tags = ai_result["tags"]
        data.next_action = ai_result["next_action"]
    ...

@router.get("/{client_id}/suggest-talk")
async def suggest_talk_script(client_id: int, scenario: str):
    """AI 生成定制话术"""
    client = await get_client(client_id)
    contacts = await get_contacts(client_id)
    script = await ai_engine.generate_talk_script(
        client_info=client.dict(),
        contact_info=contacts[0].dict() if contacts else {},
        scenario=scenario
    )
    return {"script": script}
```

### 6.3 协同引擎模块

```python
# backend/services/collaboration.py

class CollaborationEngine:

    async def check_collision(self, company_name: str, user_id: int) -> dict:
        """撞单检测"""
        existing = await db.fetch_one(
            "SELECT c.*, u.name as owner_name FROM clients c "
            "JOIN users u ON c.assigned_to = u.id "
            "WHERE c.company_name ILIKE $1 AND c.assigned_to != $2",
            f"%{company_name}%", user_id
        )
        if existing:
            return {
                "collision": True,
                "owner": existing["owner_name"],
                "client_id": existing["id"],
                "message": f"⚠️ {existing['owner_name']} 已在跟进 {existing['company_name']}"
            }
        return {"collision": False}

    async def request_support(
        self, from_user: int, to_user: int, client_id: int, request_type: str
    ):
        """协作请求（如请求 Nancy 破冰）"""
        await create_notification(
            user_id=to_user,
            title=f"协作请求：{request_type}",
            content=f"{get_user_name(from_user)} 请求你协助 {get_client_name(client_id)}",
            action_url=f"/clients/{client_id}"
        )
        await push_wechat_message(to_user, ...)

    async def check_followup_overdue(self):
        """定时检查跟进超期"""
        overdue_7d = await db.fetch_all("""
            SELECT c.*, u.name, u.wechat_work_id,
                   MAX(i.created_at) as last_interaction
            FROM clients c
            JOIN users u ON c.assigned_to = u.id
            LEFT JOIN interactions i ON i.client_id = c.id
            GROUP BY c.id, u.id
            HAVING MAX(i.created_at) < NOW() - INTERVAL '7 days'
               OR MAX(i.created_at) IS NULL
        """)
        for client in overdue_7d:
            await push_wechat_message(
                client["wechat_work_id"],
                f"⏰ 客户 {client['company_name']} 已超过7天未跟进"
            )
```

### 6.4 报告生成模块

```python
# backend/services/reports.py

class ReportGenerator:

    async def generate_personal_weekly(self, user_id: int, week_start: date):
        """个人周报自动生成"""
        week_end = week_start + timedelta(days=6)

        interactions = await db.fetch_all(
            "SELECT * FROM interactions WHERE user_id=$1 "
            "AND created_at BETWEEN $2 AND $3 ORDER BY created_at",
            user_id, week_start, week_end
        )
        new_leads = await db.fetch_all(
            "SELECT * FROM project_leads WHERE assigned_to=$1 "
            "AND created_at BETWEEN $2 AND $3",
            user_id, week_start, week_end
        )
        client_changes = await get_client_level_changes(user_id, week_start, week_end)

        report = await ai_engine.generate_weekly_report(
            user_name=get_user_name(user_id),
            interactions=[i.dict() for i in interactions],
            leads=[l.dict() for l in new_leads],
            period=f"{week_start} ~ {week_end}"
        )

        await db.execute(
            "INSERT INTO reports (report_type, period_start, period_end, "
            "user_id, content_json, content_md, ai_insights, status) "
            "VALUES ('weekly', $1, $2, $3, $4, $5, $6, 'draft')",
            week_start, week_end, user_id,
            json.dumps(report["data"]),
            report["markdown"],
            report["insights"]
        )
        return report

    async def generate_penetration_map(self, week_start: date):
        """渗透地图全景视图（Celia 用）"""
        stats = await db.fetch_all("""
            SELECT
                u.name,
                COUNT(DISTINCT CASE WHEN i.created_at >= $1 THEN i.client_id END) as touched_clients,
                COUNT(CASE WHEN i.created_at >= $1 THEN 1 END) as interaction_count,
                COUNT(DISTINCT CASE WHEN c.level = 'L1' THEN c.id END) as l1_count,
                COUNT(DISTINCT CASE WHEN c.level = 'L2' THEN c.id END) as l2_count,
                COUNT(DISTINCT CASE WHEN c.level = 'L3' THEN c.id END) as l3_count,
                COUNT(DISTINCT CASE WHEN c.level = 'L4' THEN c.id END) as l4_count
            FROM users u
            LEFT JOIN interactions i ON i.user_id = u.id
            LEFT JOIN clients c ON c.assigned_to = u.id
            WHERE u.role = 'bd'
            GROUP BY u.id, u.name
        """, week_start)

        insights = await ai_engine.generate_insights({
            "period": str(week_start),
            "team_stats": [dict(s) for s in stats]
        })
        return {"stats": stats, "insights": insights}
```

---

## 7. 安全与权限体系

### 7.1 权限矩阵

| 角色 | 看自己客户 | 看全组客户 | 编辑客户 | 删除 | 系统设置 | 导出数据 |
|------|----------|----------|--------|------|---------|---------|
| BD（Nancy/Candy...） | ✅ | 同组可看 | 自己的 | ❌ | ❌ | ❌ |
| 组长（Janice） | ✅ | ✅ 本组 | 本组的 | ❌ | ❌ | ✅ |
| 分析员（Celia） | ✅ | ✅ 全部 | ✅ 全部 | ❌ | ❌ | ✅ |
| 管理者（Ben） | ✅ | ✅ 全部 | ✅ 全部 | ✅ | ✅ | ✅ |

### 7.2 数据安全

```
┌────────────────────────────────────────────┐
│  安全措施                                    │
│                                             │
│  传输层：                                    │
│  ├─ HTTPS (Let's Encrypt / 自签证书)        │
│  ├─ 企业微信通信自带加密                      │
│  └─ AI API 调用走 HTTPS                     │
│                                             │
│  存储层：                                    │
│  ├─ PostgreSQL: 磁盘加密 + 连接 SSL          │
│  ├─ 数据库每日自动备份 → MinIO/NAS           │
│  └─ 敏感字段（手机号/微信）AES256 加密存储     │
│                                             │
│  访问层：                                    │
│  ├─ JWT Token 认证（企业微信 OAuth 登录）     │
│  ├─ RBAC 角色权限控制                        │
│  ├─ API 限流（单用户 60 req/min）            │
│  └─ 操作审计日志                             │
│                                             │
│  AI 层：                                    │
│  ├─ 客户姓名/电话脱敏后再送 AI（可配置）      │
│  ├─ AI 调用日志全量记录（ai_task_logs 表）    │
│  └─ 不向 AI 发送合同金额等高敏信息            │
└────────────────────────────────────────────┘
```

---

## 8. 分阶段落地计划

### Phase 1：基础可用（第 1-2 月）

```
目标：让 7 人先用起来，解决"信息滞后"和"手动记录"

交付物：
├─ 项目情报雷达
│  ├─ 3 个核心爬虫（政府采购网、省级交易中心、住建局）
│  ├─ AI 自动分类 + 匹配度打分
│  └─ 企微群机器人每日推送
│
├─ 基础客户管理
│  ├─ 客户/联系人/沟通记录 CRUD
│  ├─ 企微 H5 页面：移动端录入
│  ├─ 语音转文字 → AI 提取要点
│  └─ 撞单检测
│
├─ 基础数据库
│  ├─ PostgreSQL 核心表
│  └─ 每日自动备份
│
└─ 企微自建应用
   ├─ 消息推送通道
   └─ H5 嵌入页
```

### Phase 2：协同提效（第 3-4 月）

```
目标：团队协作提效，Celia 从录入员升级为分析师

交付物：
├─ 协同引擎
│  ├─ 线索自动分配（按赛道+区域）
│  ├─ 协作请求（Nancy 破冰池）
│  ├─ 跟进超期提醒（7天/30天）
│  └─ 4 人小组共享看板
│
├─ 报告自动化
│  ├─ 个人周报 AI 草稿生成
│  ├─ 小组联合周报模板
│  └─ 月报数据自动聚合
│
├─ 竞品监控
│  ├─ 竞品中标爬虫
│  └─ AI 每日情报简报
│
└─ Web 管理后台
   ├─ 客户列表/详情/时间线
   ├─ 项目线索看板
   └─ 基础统计图表
```

### Phase 3：AI 深度赋能（第 5-6 月）

```
目标：AI 成为每个人的助手

交付物：
├─ AI 话术助手
│  ├─ 根据客户画像生成定制话术
│  ├─ 按场景分类（初次接触/深度沟通/压价应对/政府）
│  └─ 企微指令 "/话术 客户名 场景"
│
├─ 渗透地图可视化
│  ├─ 按城市/赛道/客户等级展示
│  ├─ 漏斗转化率实时图表
│  └─ Metabase 仪表盘
│
├─ 名片 OCR
│  ├─ 拍照 → 自动建联系人
│  └─ 微信名片分享 → 解析入库
│
├─ AI 数据洞察
│  ├─ 月度自动分析报告
│  ├─ 客户升级预测
│  └─ 赛道趋势预测
│
└─ 政策解读 Agent
   ├─ 新政策自动摘要
   ├─ 标注"可申报专项债"等机会
   └─ 生成项目建议书草稿
```

---

## 9. 技术选型对照表

| 层次 | 组件 | 选型 | 替代方案 | 选择理由 |
|------|------|------|---------|---------|
| **前端** | 移动端 | 企业微信 H5 | 飞书小程序 | 公司已用企微；零安装 |
| | 管理后台 | Vue 3 + Element Plus | React | 中文生态好，上手快 |
| | BI 可视化 | Metabase | Grafana / Superset | 免费、SQL直连、无需开发 |
| **网关** | 反向代理 | Nginx | Traefik | 稳定成熟 |
| | 认证 | JWT + 企微 OAuth | | 企微登录即鉴权 |
| **后端** | 框架 | Python FastAPI | Django / Go Gin | 异步高性能；AI 生态 Python 最强 |
| | 异步任务 | Celery + Redis | RQ | 成熟稳定 |
| | ORM | SQLAlchemy 2.0 | Tortoise ORM | 异步支持好 |
| **AI** | 大模型 | Claude API | GPT-4o / 通义千问 | 中文理解强，结构化输出稳定 |
| | 语音转文字 | 讯飞 / Whisper | 腾讯 ASR | 中文识别率高 |
| | OCR | 百度 OCR / PaddleOCR | 腾讯 OCR | 名片识别准确 |
| **数据** | 主数据库 | PostgreSQL 16 | MySQL 8 | JSONB + PostGIS + 全文检索 |
| | 缓存/队列 | Redis 7 | | 缓存 + Celery Broker 双用 |
| | 文件存储 | MinIO | 本地磁盘 | 兼容 S3 API，方便迁移 |
| | 全文检索 | PG zhparser | Elasticsearch | 数据量小时 PG 内置够用 |
| **爬虫** | 框架 | Scrapy | requests + BS4 | 成熟、可扩展、支持分布式 |
| | 调度 | Celery Beat | crontab | 统一管理 |
| **部署** | 容器化 | Docker Compose | K8s | 7人规模不需要 K8s |
| | 服务器 | 公司内网 VM | 云服务器 | 数据主权 + 省成本 |

---

## 10. 运维与监控

### 10.1 备份策略

```
┌────────────────────────────────────────┐
│  备份计划                                │
│                                         │
│  PostgreSQL:                            │
│  ├─ 每日 02:00 pg_dump → MinIO          │
│  ├─ 保留最近 30 天                       │
│  └─ 每月 1 号拷贝到 NAS/外部硬盘         │
│                                         │
│  MinIO (文件):                           │
│  ├─ 每周日 rsync → NAS                  │
│  └─ 关键文件实时双写                     │
│                                         │
│  Docker 配置:                            │
│  ├─ docker-compose.yml → Git 版本控制    │
│  └─ .env 文件加密备份                    │
└────────────────────────────────────────┘
```

### 10.2 监控与告警

```python
# 健康检查端点
@router.get("/health")
async def health_check():
    checks = {
        "database": await check_db(),
        "redis": await check_redis(),
        "ai_api": await check_ai_api(),
        "crawler_last_run": await get_last_crawl_time(),
        "disk_usage": get_disk_usage(),
    }
    status = "healthy" if all(c["ok"] for c in checks.values()) else "degraded"
    return {"status": status, "checks": checks}
```

| 监控项 | 告警条件 | 通知方式 |
|--------|---------|---------|
| API 响应 | 5xx 错误 > 5次/分钟 | 企微推送给 IT |
| 数据库 | 连接数 > 80% / 磁盘 > 85% | 企微推送 |
| 爬虫 | 连续 2 天无新数据 | 企微推送 |
| AI API | 调用失败率 > 10% | 企微推送 |
| 备份 | pg_dump 失败 | 企微推送 |

### 10.3 日志管理

```
日志文件结构：
/var/log/crm/
├── api/
│   ├── access.log       # Nginx 访问日志
│   └── error.log        # 应用错误日志
├── crawler/
│   └── crawl.log        # 爬虫执行日志
├── celery/
│   └── worker.log       # 异步任务日志
└── ai/
    └── ai_calls.log     # AI 调用日志（含耗时、token、成本）
```

---

## 附录 A：快速启动指南

```bash
# 1. 克隆项目
git clone <repo-url> beltcollins-crm
cd beltcollins-crm

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入：
#   DB_PASSWORD, AI_API_KEY, WECHAT_WORK_CORP_ID, WECHAT_WORK_SECRET

# 3. 启动所有服务
docker compose up -d

# 4. 初始化数据库
docker compose exec api python -m alembic upgrade head

# 5. 创建初始用户
docker compose exec api python scripts/init_users.py

# 6. 访问
#   API:      http://your-server:8000/docs
#   Metabase: http://your-server:3000
#   MinIO:    http://your-server:9001
```

## 附录 B：企业微信指令速查

| 指令 | 功能 | 示例 |
|------|------|------|
| `/查 关键词` | 搜索客户/项目 | `/查 万科` |
| `/线索` | 今日新线索 | `/线索` |
| `/客户 名称` | 查看客户详情 | `/客户 华润置地` |
| `/话术 客户 场景` | AI 生成话术 | `/话术 万科 初次接触` |
| `/记录` | 快速录入沟通 | `/记录 今天见了张总，聊了XX项目` |
| `/周报` | 查看本周报告草稿 | `/周报` |
| `/漏斗` | 查看订单漏斗 | `/漏斗` |
| `/帮助` | 查看所有指令 | `/帮助` |

---

> **下一步**：确认本架构方案后，IT 部门可先搭建 Phase 1 环境（Docker + PostgreSQL + 企微接入），同步开发 3 个核心爬虫和基础客户管理 API，目标在 2-3 个月内上线第一版可用系统。
