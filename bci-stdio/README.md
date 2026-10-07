# Belt Collins Stdio

景观设计 AI 中控台（参考 AIRI lab `/stdio` 形态），品牌：**Belt Collins**。

## 结构

```text
bci-stdio/
├── web/     # React 营销站 + Sign-in + Studio
└── api/     # FastAPI API Router（鉴权 / 项目 / 真实出图）
```

## 启动

### 1) API（8200）

```bash
cd bci-stdio/api
cp .env.example .env
# 填入 OPENAI_API_KEY；正式 Microsoft 登录再填 AZURE_CLIENT_ID
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
bash start-api.sh
```

### 2) Web（5173）

```bash
cd bci-stdio/web
cp .env.example .env
# 正式登录：VITE_AZURE_CLIENT_ID=你的 SPA 应用 ID
npm install
npm run dev
```

打开：http://127.0.0.1:5173/

- 营销首页 `/`
- 登录 `/sign-in`（Microsoft；未配置时可开发预览登录）
- 中控台 `/stdio`

## Microsoft 登录（生产）

1. Azure Entra ID 注册 **SPA** 应用  
2. Redirect URI：`http://127.0.0.1:5173/sign-in`（及生产域名）  
3. API 权限：`User.Read`  
4. 同步配置：
   - `web/.env` → `VITE_AZURE_CLIENT_ID` / `VITE_AZURE_TENANT_ID`
   - `api/.env` → `AZURE_CLIENT_ID` / `AZURE_TENANT_ID`
5. 关闭开发登录：`ALLOW_DEV_AUTH=false`

## 真实出图

默认 `IMAGE_PROVIDER=openai`，需 `OPENAI_API_KEY`。  
也支持 `IMAGE_PROVIDER=fal` + `FAL_KEY`（Flux）。

## B 档范围

- ✅ 景观向落地页 + Microsoft 登录入口  
- ✅ Studio：项目、Inspire/Render/Atmosphere、Agent、画布  
- ✅ API Router + 真实图像生成管线  
- ⏳ Video 图转视频、局部 Inpaint、企业模板库（后续）
