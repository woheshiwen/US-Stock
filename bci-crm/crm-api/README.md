# BCI CRM API — 本机启动（Windows）

## 1. 复制到本机

把本目录复制到：

```text
D:\BCI-CRM\crm-api\
```

## 2. 配置数据库密码

```powershell
cd D:\BCI-CRM\crm-api
copy .env.example .env
notepad .env
```

把 `CHANGE_ME` 改成你创建的 `crm_app` 密码。

## 3. 创建虚拟环境并安装依赖

```powershell
cd D:\BCI-CRM\crm-api
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

若 `py` 不可用，改用 `python`。

## 4. 启动（监听 8100）

```powershell
cd D:\BCI-CRM\crm-api
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8100
```

## 5. 验证

浏览器或 CMD：

```text
http://127.0.0.1:8100/health
http://127.0.0.1:8100/users
http://127.0.0.1:8100/docs
```

期望 `/health` 返回 `"status":"ok"`，且 `database.port` 为 `5433`。

## 端口约定

| 服务 | 端口 |
|------|------|
| CRM API | **8100** |
| CRM PostgreSQL | **5433** |
| Brain Hindsight PG | 5432 |
| Hindsight API | 8888 |
| Brain IIS | 8080 |

## 停止

在运行 uvicorn 的窗口按 `Ctrl+C`。
