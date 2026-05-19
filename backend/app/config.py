from pydantic import field_validator
from pydantic_settings import BaseSettings

_KNOWN_BAD = {"changeme", "changeme-secret-key", "CHANGE_ME", ""}


class Settings(BaseSettings):
    DATABASE_URL: str
    API_KEY: str
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_SERVER: str = ""
    MAIL_PORT: int = 587
    MAIL_TLS: bool = True
    NVD_API_KEY: str = ""

    @field_validator("API_KEY")
    @classmethod
    def api_key_must_be_set(cls, v: str) -> str:
        if v in _KNOWN_BAD:
            raise ValueError("API_KEY must be set to a strong random value (not a placeholder)")
        return v

    class Config:
        env_file = ".env"


settings = Settings()
