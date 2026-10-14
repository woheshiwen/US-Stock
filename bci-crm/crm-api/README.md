# BCI CRM — API Router Server

FastAPI **APIRouter** 模块化服务，默认监听 **8100**。

## Routers

| Router | 路径 | 说明 |
|--------|------|------|
| health | `GET /health` | 健康检查 + DB |
| users | `GET /users` | 用户列表 |
| clients | `GET/POST /clients`、`GET /clients/{id}`、`GET /clients/{id}/timeline` | 客户 CRUD + 撞单检测 + 时间线 |
| interactions | `GET/POST /interactions` | 沟通记录 |
| leads | `GET /leads` | 项目线索 |
| wecom | `GET/POST /wecom/callback` | 企微回调 stub |
| internal | `GET /internal/clients` | Brain 内网调用（`X-Internal-Token`） |
| ai | `POST /ai/ask` | 权限内检索问答 stub |

## 本地启动（Linux / macOS / Cloud）

```bash
cd bci-crm/crm-api
cp .env.example .env
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8100
```

或：`bash start-api.sh`

默认使用 **SQLite**（`bci_crm_dev.db`），启动时自动建表并种子 8 名用户 + 示例客户/线索。

## Windows VDI（生产库 Postgres :5433）

1. 复制目录到 `D:\BCI-CRM\crm-api\`
2. `.env` 改为：

```env
DATABASE_URL=postgresql+psycopg2://crm_app:密码@127.0.0.1:5433/beltcollins_crm
CRM_API_HOST=127.0.0.1
CRM_API_PORT=8100
INTERNAL_API_TOKEN=换成强随机串
AUTO_INIT_SCHEMA=false
```

3. 双击 `start-api.bat` 或：

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8100
```

## 验证

```text
http://127.0.0.1:8100/
http://127.0.0.1:8100/docs
http://127.0.0.1:8100/health
http://127.0.0.1:8100/users
http://127.0.0.1:8100/clients
http://127.0.0.1:8100/leads
```

Internal（需 Header）：

```bash
curl -H "X-Internal-Token: dev-internal-token" \
  "http://127.0.0.1:8100/internal/clients?user_id=8"
```

## 端口约定

| 服务 | 端口 |
|------|------|
| CRM API Router Server | **8100** |
| CRM PostgreSQL | **5433** |
| Brain Hindsight PG | 5432 |
| Hindsight API | 8888 |
