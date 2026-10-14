from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(ORMModel):
    id: int
    name: str
    role: str
    wechat_work_id: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime | str] = None


class ClientCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=200)
    industry: Optional[str] = None
    track: Optional[str] = None
    level: str = "L1"
    city: Optional[str] = None
    province: Optional[str] = None
    status: str = "跟进中"
    assigned_to: Optional[int] = None
    source: Optional[str] = "手动"


class ClientOut(ORMModel):
    id: int
    company_name: str
    industry: Optional[str] = None
    track: Optional[str] = None
    level: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[int] = None
    source: Optional[str] = None
    created_at: Optional[datetime | str] = None
    updated_at: Optional[datetime | str] = None


class InteractionCreate(BaseModel):
    client_id: int
    user_id: int
    summary: str = Field(min_length=1)
    contact_id: Optional[int] = None
    interaction_type: Optional[str] = "微信"
    raw_content: Optional[str] = None
    sentiment: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[date] = None


class InteractionOut(ORMModel):
    id: int
    client_id: int
    contact_id: Optional[int] = None
    user_id: Optional[int] = None
    interaction_type: Optional[str] = None
    summary: str
    raw_content: Optional[str] = None
    sentiment: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[date | str] = None
    created_at: Optional[datetime | str] = None


class LeadOut(ORMModel):
    id: int
    title: str
    source_url: Optional[str] = None
    source_type: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    track: Optional[str] = None
    stage: Optional[str] = None
    estimated_amount: Optional[float] = None
    publish_date: Optional[date | str] = None
    owner_company: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_match_score: Optional[float] = None
    status: Optional[str] = None
    assigned_to: Optional[int] = None
    linked_client: Optional[int] = None
    created_at: Optional[datetime | str] = None


class AskRequest(BaseModel):
    question: str = Field(min_length=1)
    user_id: int
    client_id: Optional[int] = None


class AskResponse(BaseModel):
    answer: str
    sources: list[dict]
    note: str
