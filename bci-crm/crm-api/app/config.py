from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg2://crm_app:CHANGE_ME@127.0.0.1:5433/beltcollins_crm"
    crm_api_host: str = "127.0.0.1"
    crm_api_port: int = 8100


settings = Settings()
