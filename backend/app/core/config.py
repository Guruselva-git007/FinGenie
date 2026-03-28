from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FinGenie API"
    app_version: str = "1.0.0"
    api_prefix: str = "/api"
    database_url: str = "mysql+pymysql://root:root@127.0.0.1:3306/fingenie?charset=utf8mb4"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    auth_secret_key: str = "dev-fingenie-secret-key"
    access_token_expire_minutes: int = 60 * 24 * 7

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
