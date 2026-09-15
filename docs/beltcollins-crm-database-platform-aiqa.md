# 贝尔高林 CRM：专业数据库 + 严格权限展示平台 + AI 问答

> **版本**：v1.0 | **日期**：2026年8月20日  
> **定位**：CRM 的主干不是笔记工具，而是「专业数据库 + 灵活但权限严格的展示层 + 受同一套权限约束的 AI 问答」。

---

## 0. 产品定义（先把边界说死）

| 层 | 是什么 | 不是什么 |
|----|--------|----------|
| **数据库** | 客户、联系人、沟通、线索、权限、审计的唯一真相源 | 不是 Excel / 不是 Markdown 仓库 |
| **展示平台** | 按角色、赛道、区域动态拼出的工作台、看板、漏斗、详情页 | 不是人人都能看全库的 BI 大屏 |
| **AI 问答** | 在当前用户权限范围内检索、汇总、解释、建议 | 不是能绕过权限的“万能聊天机器人” |

**一条铁律：界面能看到什么，AI 就只能基于什么回答。**  
AI 问答必须走同一套数据访问层，不能直接裸查全库。

Obsidian 可以后置为个人知识工作台，**不作为主 CRM**。主系统必须是带账号、角色、审计的 Web 平台。

---

## 1. 总体架构

```
┌──────────────────────────────────────────────────────────────────────┐
│  展示平台（Web / 企微 H5）                                             │
│  看板 · 列表 · 漏斗 · 客户详情 · 权限内报表 · AI 问答对话框              │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ HTTPS + JWT（含 user_id / roles）
┌───────────────────────────────▼──────────────────────────────────────┐
│  API 网关 + 鉴权                                                      │
│  登录(企微 OAuth) · Token · 限流 · 审计入口                            │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│ 业务 API       │     │ 查询/视图引擎    │     │ AI 问答服务          │
│ CRUD / 工作流   │     │ 保存视图/过滤    │     │ RAG + Function Call  │
└───────┬───────┘     └────────┬────────┘     └──────────┬──────────┘
        │                      │                         │
        └──────────────────────┼─────────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ 数据访问层 (DAL)      │  ← 唯一入口
                    │ Row-Level Security   │     所有 SQL 必须带用户身份
                    │ 字段级脱敏            │
                    └──────────┬──────────┘
                               ▼
                    ┌─────────────────────┐
                    │ PostgreSQL 16        │
                    │ + RLS 策略           │
                    │ + 审计日志           │
                    └─────────────────────┘
```

要点：

- **数据库是核心**，展示和 AI 都是它的消费者。
- **权限下沉到数据库 RLS**，应用层再加一层，双保险。
- **AI 不直连库**，只调用带权限上下文的检索/聚合接口。

---

## 2. 专业数据库怎么建

### 2.1 为什么必须是 PostgreSQL

| 能力 | CRM 为什么需要 |
|------|----------------|
| **行级安全 RLS** | 同一张 `clients` 表，Pipi 只能看到自己的行，Celia/管理者能看全部 |
| **JSONB + 关系表并存** | 标准字段严格；扩展属性（政策标签、临时赛道）灵活 |
| **事务 ACID** | 撞单检测、线索分配、状态变更不能花账 |
| **审计扩展** | 谁改了客户等级、谁导出了名单，可追责 |
| **全文检索** | 中文客户名、纪要、公告检索 |
| **视图 / 物化视图** | 漏斗、渗透地图用稳定查询，而不是每次扫全表 |

MySQL 的 RLS 弱；MongoDB 灵活但权限和报表弱。**主库用 PostgreSQL，不要用笔记文件当主库。**

### 2.2 数据分三类，别混在一张大宽表

```
A. 主数据（Master）     客户、联系人、组织、项目线索
B. 活动数据（Activity）  沟通记录、任务、状态变更、分配记录
C. 控制数据（Control）   用户、角色、数据范围、视图定义、审计、AI 会话
```

这样展示层可以灵活组合，权限层可以按表/按行切开，AI 可以按类型检索。

### 2.3 核心表（权限相关必须先设计）

```sql
-- 用户
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,
    wechat_work_id  VARCHAR(100) UNIQUE,
    email           VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 角色：bd / team_lead / analyst / admin
CREATE TABLE roles (
    id    SERIAL PRIMARY KEY,
    code  VARCHAR(30) UNIQUE NOT NULL,  -- bd, team_lead, analyst, admin
    name  VARCHAR(50) NOT NULL
);

CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id),
    role_id INTEGER REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- 数据范围：按赛道、区域、小组约束可见行
CREATE TABLE data_scopes (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    scope_type  VARCHAR(20) NOT NULL,   -- track / region / team / all
    scope_value VARCHAR(50),            -- '文旅酒店' / '华南' / 'group-4'
    UNIQUE (user_id, scope_type, scope_value)
);

-- 客户主数据
CREATE TABLE clients (
    id              SERIAL PRIMARY KEY,
    company_name    VARCHAR(200) NOT NULL,
    industry        VARCHAR(50),
    track           VARCHAR(50) NOT NULL,
    region          VARCHAR(50),
    level           VARCHAR(5) DEFAULT 'L1',
    status          VARCHAR(30) DEFAULT '跟进中',
    owner_id        INTEGER REFERENCES users(id) NOT NULL,
    team_id         INTEGER,
    extra           JSONB DEFAULT '{}',   -- 灵活扩展，不破坏主结构
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_owner ON clients(owner_id);
CREATE INDEX idx_clients_track ON clients(track);
CREATE INDEX idx_clients_extra ON clients USING GIN (extra);

-- 字段级：哪些角色能看金额、电话等
CREATE TABLE field_permissions (
    role_code   VARCHAR(30) NOT NULL,
    table_name  VARCHAR(50) NOT NULL,
    field_name  VARCHAR(50) NOT NULL,
    can_read    BOOLEAN DEFAULT TRUE,
    can_write   BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (role_code, table_name, field_name)
);
```

`extra JSONB` 解决「灵活」：例如临时加 `special_bond_eligible`、`policy_tags`，不必每次改表。  
标准查询字段（赛道、负责人、等级、区域）必须是正式列，才能做权限和报表。

### 2.4 行级安全（RLS）——权限真正落地的地方

应用连接数据库时，必须设置当前用户：

```sql
-- 每个 API 请求开始时执行
SET LOCAL app.current_user_id = '12';
SET LOCAL app.current_roles = 'bd,team_lead';
```

策略示例（简化）：

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 管理员、分析员：全表
CREATE POLICY clients_admin_all ON clients
    FOR ALL
    USING (
        current_setting('app.current_roles', true) LIKE '%admin%'
        OR current_setting('app.current_roles', true) LIKE '%analyst%'
    );

-- 负责人看自己的
CREATE POLICY clients_owner ON clients
    FOR SELECT
    USING (owner_id = current_setting('app.current_user_id')::int);

-- 组长看本组
CREATE POLICY clients_team ON clients
    FOR SELECT
    USING (
        current_setting('app.current_roles', true) LIKE '%team_lead%'
        AND team_id IN (
            SELECT team_id FROM user_teams
            WHERE user_id = current_setting('app.current_user_id')::int
        )
    );
```

**效果：**

- 即使用户绕过前端、直接打 API，只要走这套连接，也看不到别人的客户。
- AI 问答如果走同一条 DAL（带着 `SET LOCAL`），天然不会泄密。
- Metabase / 报表若用独立「只读角色 + RLS」，大屏也不会漏数据。

### 2.5 审计：展示和 AI 都要记

```sql
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INTEGER,
    action      VARCHAR(30),     -- read / create / update / delete / export / ai_ask
    table_name  VARCHAR(50),
    record_id   INTEGER,
    detail      JSONB,           -- 改了哪些字段；AI 问了什么
    ip          INET,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user_time ON audit_logs(user_id, created_at DESC);
```

敏感操作必须落审计：

- 打开客户详情
- 导出名单
- 修改客户等级 / 负责人
- 每一次 AI 提问与引用了哪些记录 ID

---

## 3. 灵活但权限严格的展示平台

### 3.1 原则：视图灵活，数据不灵活越权

用户可以：

- 自己建看板（按赛道、按等级、按本周待跟进）
- 切换列表 / 看板 / 漏斗 / 地图
- 保存常用筛选
- 在权限内钻取详情

用户不可以：

- 通过换筛选条件看到范围外的客户
- 通过「导出」拿到全库
- 通过「分享链接」把别人客户发出去（分享必须再鉴权）
- 通过 AI 问出自己看不到的数据

**实现方式：所有列表、看板、报表、导出、AI，都调用同一个 `QueryEngine`。**

```
用户保存的「视图定义」只是过滤条件的 JSON
     ↓
QueryEngine 合并：视图过滤  ∩  用户数据范围  ∩  字段权限
     ↓
生成 SQL（RLS 再挡一层）
     ↓
返回行 + 脱敏后的字段
```

视图定义示例（存库，不是前端写死）：

```json
{
  "name": "本周待跟进-文旅",
  "owner_id": 5,
  "visibility": "private",
  "entity": "clients",
  "filters": [
    { "field": "track", "op": "eq", "value": "文旅酒店" },
    { "field": "next_action_date", "op": "lte", "value": "this_week" }
  ],
  "columns": ["company_name", "level", "owner_id", "last_contact"],
  "layout": "kanban",
  "group_by": "level"
}
```

`visibility`：`private` / `team` / `org`。即使设成 `org`，底层仍受 RLS 限制——别人打开这份视图，也只能看到自己权限内的行。

### 3.2 角色对应的默认工作台

| 角色 | 默认看到什么 | 默认看不到什么 |
|------|--------------|----------------|
| **BD** | 自己的客户、线索、待办、个人漏斗 | 同事客户电话、全组金额明细 |
| **组长 Janice** | 4 人小组客户、协作请求、双赛道看板 | 其他赛道（Candy 产业园）细节可配置为不可见 |
| **Celia 分析员** | 全量只读 + 漏斗/渗透地图/竞品 | 无特殊需要可不给「改负责人」 |
| **管理者** | 全部 + 权限配置 + 审计 + 导出 | — |
| **AI 服务账号** | **无独立可见范围**；继承当前登录用户 | 禁止用 admin 身份跑问答 |

### 3.3 推荐前端形态（不要做成低代码全开放）

| 方案 | 灵活度 | 权限 | 建议 |
|------|--------|------|------|
| 自研 Vue/React + QueryEngine | 高（按你们业务定制） | 最好控 | **主方案** |
| Metabase 做管理层报表 | 图表灵活 | 需单独接 RLS 只读用户 | **仅报表，不当 CRM 主界面** |
| NocoDB / Airtable 类 | 很灵活 | 企业级 ACL 弱 | **不建议当主系统** |
| Obsidian | 笔记灵活 | 几乎无 ACL | **个人侧车，不主用** |

主展示平台建议：

1. **Web 应用**（内网 + 企微打开）  
2. 页面类型固定几种：**列表、看板、漏斗、客户详情、线索池、报告、AI 问答**  
3. 灵活点放在「筛选 / 保存视图 / 字段显示」，而不是让用户随便建表

### 3.4 字段级控制（展示层必须做）

同一行客户，不同角色看到的列不同：

| 字段 | BD | 组长 | 分析员 | 管理者 |
|------|----|------|--------|--------|
| 公司名、赛道、等级 | 看 | 看 | 看 | 看 |
| 联系人手机 | 自己的客户 | 本组 | 可看 | 看 |
| 预估合同额 | 自己的 | 本组汇总+明细 | 看 | 看 |
| 商务条款谈判记录 | 自己的 | 本组 | 按策略 | 看 |

API 返回前按 `field_permissions` 剥字段；前端即使改请求参数也拿不到。

### 3.5 导出与分享（最容易出事的两个口）

- **导出**：仅 `analyst` / `admin`（或组长导本组）；文件异步生成；审计记「导出了哪些 ID」。
- **分享链接**：必须登录；打开时用**打开者**的权限再查一遍，不是用分享者权限。

---

## 4. AI 问答：怎么接才算「全面」而不是玩具

### 4.1 问答要覆盖的三类问题

商务真实会问的，系统必须能答：

**A. 查事实（权限内检索）**

- 「Pipi 名下还有哪些 L2 客户一周没跟？」
- 「开封那个文旅项目现在谁在跟？」
- 「华润置地上次拜访纪要说了什么？」

**B. 做汇总（权限内聚合）**

- 「我们组本周 L2 升 L3 有几个？」
- 「文旅赛道漏斗各阶段数量和金额？」
- 「本月新增线索里，匹配度高于 0.8 的有哪些？」

**C. 给建议（基于可见数据 + 知识）**

- 「下周该优先跟哪 5 个客户？」
- 「跟这个设计总监怎么开口？用第四代住宅话术。」
- 「这条政府公告能不能包装成生态修复专项？」

知识类（政策、话术模板、公司案例）可以来自知识库；**客户类必须来自带权限的数据库检索，禁止模型靠「印象」编造客户状态。**

### 4.2 AI 问答架构（权限贯穿）

```
用户提问（已登录）
    │
    ▼
① 意图识别
    ├─ 查客户 / 查线索 / 做统计 / 写话术 / 解读政策 / 拒答
    │
    ▼
② 规划工具调用（Function Calling）
    │  只允许调用白名单工具：
    │  search_clients / get_client / search_interactions /
    │  funnel_stats / search_leads / search_knowledge / draft_script
    │
    ▼
③ 工具执行（带着 user_id 走 DAL + RLS）
    │  返回的每条记录都是该用户可见的
    │
    ▼
④ 生成答案（只引用工具返回的内容）
    │  标注来源：客户ID、纪要日期、公告链接
    │
    ▼
⑤ 输出过滤
    │  再扫一遍：电话、金额是否该对当前角色展示
    │
    ▼
⑥ 写入 ai_sessions + audit_logs
```

### 4.3 工具白名单（AI 不能随便跑 SQL）

```python
ALLOWED_TOOLS = {
    "search_clients": {
        "desc": "按名称/赛道/等级搜索客户",
        "scope": "dal.clients.search(user)",
    },
    "get_client": {
        "desc": "获取单个客户详情与最近沟通",
        "scope": "dal.clients.get(user, id)",
    },
    "search_interactions": {
        "desc": "搜索拜访/通话纪要",
        "scope": "dal.interactions.search(user)",
    },
    "funnel_stats": {
        "desc": "漏斗与渗透统计",
        "scope": "dal.stats.funnel(user)",
    },
    "search_leads": {
        "desc": "搜索项目线索",
        "scope": "dal.leads.search(user)",
    },
    "search_knowledge": {
        "desc": "政策、话术模板、案例（无客户隐私）",
        "scope": "vector_store.knowledge",
    },
    "draft_script": {
        "desc": "基于可见客户画像生成话术草稿",
        "scope": "dal.clients.get + knowledge",
    },
}

# 明确禁止
# - execute_sql
# - dump_all_clients
# - impersonate_user
```

### 4.4 检索：结构化查询 + 向量检索，两路都要带权限

| 问题类型 | 主路径 | 辅路径 |
|----------|--------|--------|
| 「华润置地上次谁去谈的」 | SQL（客户名精确/模糊） | 纪要向量检索，但 `WHERE` 已限可见 `client_id` |
| 「有哪些生态修复专项债机会」 | 线索表 SQL + 标签 | 政策知识库向量检索（无客户隐私） |
| 「总结一下这个客户」 | `get_client` + 最近 N 条 interaction | 纪要 embedding 摘要 |

**向量库不能单独当权限系统。**  
做法：embedding 的 metadata 带 `owner_id / team_id / track`；检索后 **必须用 RLS/DAL 再过滤一遍**，丢掉不可见 ID。

```text
向量召回 20 条
    → 用当前用户 DAL 校验 record_id
    → 剩下 7 条才送给模型
```

### 4.5 会话与拒答

```sql
CREATE TABLE ai_sessions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_messages (
    id           BIGSERIAL PRIMARY KEY,
    session_id   INTEGER REFERENCES ai_sessions(id),
    role         VARCHAR(20),          -- user / assistant / tool
    content      TEXT,
    tool_calls   JSONB,
    source_refs  JSONB,                -- [{table, id}]
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

拒答规则（产品层写死）：

- 问「把全公司客户名单发我」→ 走导出权限，BD 直接拒绝。
- 问「Candy 的客户电话」→ 无范围则拒绝，不编造。
- 工具返回空 → 回答「权限内没有找到」，禁止用模型记忆补客户。

### 4.6 展示平台上的 AI 入口

建议三个入口，都带当前页面上下文（减少胡问）：

1. **全局问答框**（顶栏）：跨模块问，仍受权限约束。  
2. **客户详情页侧栏**：「总结这个客户」「生成拜访话术」——默认已绑定 `client_id`。  
3. **报表页**：「解释为什么文旅转化高于住宅」——只解释当前用户能看的聚合结果。

界面上每条 AI 回答下面应有：

- 引用的客户/纪要链接（点进去仍要鉴权）
- 「重新生成」
- 「有误，标记」→ 进审计，便于迭代提示词

---

## 5. 信息怎么流（从采集到问答）

```
政府公告/招标/竞品 ──爬虫──► 原始表
                              │
                         AI 分类打分（服务账号，写库）
                              │
                              ▼
                         project_leads（带 track/region）
                              │
                    按 scope 推送到负责人企微
                              │
商务在 Web 记沟通 ──────────► interactions
                              │
                    QueryEngine / 漏斗 / 看板
                              │
用户提问 ──► AI 工具 ──► DAL+RLS ──► 只读可见数据 ──► 回答
```

爬虫写入可用 **系统服务账号**（无问答权限，只有 insert）。  
**禁止**用 admin 身份给前台 AI 用。

---

## 6. 推荐技术栈（对准这三件事）

| 层 | 选型 | 原因 |
|----|------|------|
| 数据库 | **PostgreSQL 16 + RLS** | 专业库 + 行级权限 |
| 缓存 | Redis | 会话、视图缓存、限流 |
| 后端 | FastAPI | 鉴权中间件、AI 工具调用都方便 |
| 查询引擎 | 自研 QueryEngine | 视图 JSON → 安全 SQL，防拼接注入 |
| 前端 | Vue 3 + 权限指令 | 按钮/菜单按角色隐藏，真正安全靠 API |
| 向量库 | PGVector（先）或独立 Qdrant | 前期数据量小，权限和主数据同库更简单 |
| LLM | Claude / 通义（按合规） | Function Calling 稳定 |
| 身份 | 企业微信 OAuth | 和现有办公身份对齐 |
| 报表 | Metabase + PG RLS 只读角色 | 灵活图表，不破坏 ACL |

部署仍建议公司内网 Docker Compose，客户数据不出内网；LLM 仅发送**已脱敏、已限权**的片段。

---

## 7. 权限矩阵（实现对照表）

| 能力 | BD | 组长 | 分析员 | 管理者 | AI（继承提问者） |
|------|----|------|--------|--------|------------------|
| 看自己客户 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 看本组客户 | — | ✓ | ✓ | ✓ | 仅当提问者有此权 |
| 看全公司客户 | — | — | ✓ 只读 | ✓ | 同左 |
| 改客户负责人 | 自己的 | 本组 | — | ✓ | ✗ 默认禁止写 |
| 导出 | — | 本组 | ✓ | ✓ | ✗ |
| 建私人视图 | ✓ | ✓ | ✓ | ✓ | — |
| 发布团队视图 | — | ✓ | ✓ | ✓ | — |
| 问 AI 事实/汇总 | ✓ 范围内 | ✓ 范围内 | ✓ | ✓ | — |
| 问 AI 要全库名单 | ✗ | ✗ | 走导出流程 | 走导出流程 | 拒绝直接 dump |

AI **默认只读**。若以后要「帮我把下次跟进改到周五」，必须二次确认，并走普通更新 API + 审计。

---

## 8. 分阶段（对准你现在的目标）

### Phase 1 — 专业库 + 严格展示（先可用、先安全）

- PostgreSQL 主数据 + RLS + 审计
- 登录（企微）+ 角色 + 数据范围
- Web：客户列表/详情、沟通录入、线索列表
- 保存视图 + QueryEngine
- 不做全功能低代码

### Phase 2 — AI 问答（只读）

- Function Calling 白名单
- 客户/纪要/线索检索问答
- 客户页侧栏「总结 / 话术」
- 会话与引用、拒答规则
- 向量检索 + DAL 二次过滤

### Phase 3 — 更灵活的展示 + 更深 AI

- 漏斗、渗透地图、竞品简报
- 管理层 Metabase（RLS 只读）
- 周报自动生成（仍按人权限）
- 可选：Obsidian 只读同步个人库

---

## 9. 和「Obsidian 外挂」的关系（一句话）

Obsidian 可以当 **BD 个人草稿本**，定期同步进 PostgreSQL。  
**权限、展示、AI 问答的唯一权威是数据库 + DAL。**  
谁能看见什么，以 RLS 和角色为准，不以谁的 Vault 里有这篇笔记为准。

---

## 10. 验收标准（怎样才算「比较全面」）

1. **数据库**：客户/沟通/线索有正式表；扩展走 JSONB；有备份和审计。  
2. **展示**：同账号换筛选也翻不出范围外客户；字段级隐藏生效；导出走审批/角色。  
3. **AI**：用 BD 账号问「列出全部客户电话」必须失败；用管理者账号问漏斗能出范围内汇总；回答带得上来源记录。  
4. **一致性**：Web 列表、导出、AI 三处，同一用户看到的客户集合一致。

满足这四条，才是「专业库 + 灵活展示 + AI 问答」的完整 CRM，而不是聊天框套一层表格。
