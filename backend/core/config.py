from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = Field(min_length=1, validation_alias="PROJECT_NAME")
    version: str = Field(min_length=1, validation_alias="VERSION")
    database_url: str = Field(min_length=1, validation_alias="DATABASE_URL")
    supabase_url: str = Field(min_length=1, validation_alias="SUPABASE_URL")
    supabase_anon_key: str = Field(min_length=1, validation_alias="SUPABASE_ANON_KEY")
    supabase_jwt_secret: str = Field(min_length=1, validation_alias="SUPABASE_JWT_SECRET")

    # Carrega variaveis de ambiente do arquivo .env
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()
