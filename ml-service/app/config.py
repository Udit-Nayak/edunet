import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URI: str
    DB_NAME: str = "test"  # MongoDB database name

    REDIS_URL: str = "redis://localhost:6379"

    EMBEDDING_MODEL_URL: str = "https://tfhub.dev/google/universal-sentence-encoder/4"

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    BATCH_SIZE: int = 32
    MAX_RESULTS: int = 50

    class Config:
        env_file = ".env"
settings = Settings()