from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Default: local SQLite so the API Router Server can start without Postgres.
    # Production (Win VDI): postgresql+psycopg2://crm_app:***@127.0.0.1:5433/beltcollins_crm
    database_url: str = "sqlite:///./bci_crm_dev.db"
    crm_api_host: str = "127.0.0.1"
    crm_api_port: int = 8100
    internal_api_token: str = "dev-internal-token"
    auto_init_schema: bool = True


settings = Settings()
