"""WeCom (企业微信) callback stub — URL verification + message echo."""

from fastapi import APIRouter, Query, Request
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/wecom", tags=["wecom"])


@router.get("/callback")
def wecom_verify(
    echostr: str | None = Query(None),
    msg_signature: str | None = Query(None),
    timestamp: str | None = Query(None),
    nonce: str | None = Query(None),
):
    """企微 URL 校验：原样返回 echostr（生产需按 Token/AES 校验签名）。"""
    if echostr is None:
        return {"ok": True, "hint": "provide echostr for WeCom URL verification"}
    return PlainTextResponse(content=echostr)


@router.post("/callback")
async def wecom_callback(request: Request):
    """接收企微消息回调（Phase 1 stub：记录 body 长度，后续解析指令）。"""
    body = await request.body()
    return {
        "ok": True,
        "received_bytes": len(body),
        "note": "stub — wire Token/EncodingAESKey + command parser next",
    }
