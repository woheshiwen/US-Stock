from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8200
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"

    azure_tenant_id: str = "common"
    azure_client_id: str = ""
    allow_dev_auth: bool = True

    openai_api_key: str = ""
    openai_image_model: str = "dall-e-3"
    openai_image_size: str = "1024x1024"
    fal_key: str = ""
    image_provider: str = "openai"

    data_dir: str = "data"


settings = Settings()
