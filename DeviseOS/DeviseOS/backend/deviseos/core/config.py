"""
Core configuration management for DeviseOS Backend
"""

import os
from typing import Any, Dict, List, Optional, Union
from pydantic import Field, validator
from pydantic_settings import BaseSettings as PydanticBaseSettings


class DatabaseSettings(PydanticBaseSettings):
    """Database configuration settings"""
    
    url: str = Field(default="postgresql://deviseos:deviseos@localhost:5432/deviseos")
    echo: bool = Field(default=False)
    pool_size: int = Field(default=20)
    max_overflow: int = Field(default=30)
    pool_pre_ping: bool = Field(default=True)
    
    class Config:
        env_prefix = "DB_"


class RedisSettings(PydanticBaseSettings):
    """Redis configuration settings"""
    
    url: str = Field(default="redis://localhost:6379/0")
    password: Optional[str] = None
    db: int = Field(default=0)
    max_connections: int = Field(default=20)
    
    class Config:
        env_prefix = "REDIS_"


class SecuritySettings(PydanticBaseSettings):
    """Security and authentication settings"""
    
    secret_key: str = Field(default="dev-secret-key-change-in-production", description="Secret key for JWT tokens")
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)
    refresh_token_expire_days: int = Field(default=7)
    
    # Clerk.dev integration
    clerk_secret_key: Optional[str] = None
    clerk_publishable_key: Optional[str] = None
    
    # Encryption
    encryption_key: str = Field(default="dev-encryption-key-32-bytes", description="AES-256 encryption key")
    
    class Config:
        env_prefix = "SECURITY_"


class AISettings(PydanticBaseSettings):
    """AI and ML processing settings"""
    
    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = Field(default="gpt-4")
    openai_max_tokens: int = Field(default=4000)
    
    # Anthropic
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = Field(default="claude-3-sonnet-20240229")
    
    # Google Gemini
    google_api_key: Optional[str] = None
    google_model: str = Field(default="gemini-pro")
    
    # Local Models
    local_llm_url: Optional[str] = None
    local_embedding_model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")
    
    # Whisper
    whisper_model: str = Field(default="base")
    whisper_device: str = Field(default="cpu")
    
    # spaCy
    spacy_model: str = Field(default="en_core_web_sm")
    
    class Config:
        env_prefix = "AI_"


class StorageSettings(PydanticBaseSettings):
    """Object storage configuration"""
    
    # S3/MinIO
    s3_endpoint: str = Field(default="http://localhost:9000")
    s3_access_key: str = Field(default="minioadmin")
    s3_secret_key: str = Field(default="minioadmin")
    s3_bucket: str = Field(default="deviseos")
    s3_region: str = Field(default="us-east-1")
    s3_secure: bool = Field(default=False)
    
    # Local storage fallback
    local_storage_path: str = Field(default="./storage")
    
    class Config:
        env_prefix = "STORAGE_"


class CelerySettings(PydanticBaseSettings):
    """Celery background task settings"""
    
    broker_url: str = Field(default="redis://localhost:6379/1")
    result_backend: str = Field(default="redis://localhost:6379/2")
    task_serializer: str = Field(default="json")
    result_serializer: str = Field(default="json")
    accept_content: List[str] = Field(default=["json"])
    timezone: str = Field(default="UTC")
    enable_utc: bool = Field(default=True)
    
    class Config:
        env_prefix = "CELERY_"


class MonitoringSettings(PydanticBaseSettings):
    """Monitoring and observability settings"""
    
    # Prometheus
    prometheus_enabled: bool = Field(default=True)
    prometheus_port: int = Field(default=9090)
    
    # OpenTelemetry
    otel_enabled: bool = Field(default=True)
    otel_endpoint: Optional[str] = None
    
    # Sentry
    sentry_dsn: Optional[str] = None
    sentry_environment: str = Field(default="development")
    
    # Logging
    log_level: str = Field(default="INFO")
    log_format: str = Field(default="json")
    
    class Config:
        env_prefix = "MONITORING_"


class PluginSettings(PydanticBaseSettings):
    """Plugin runtime settings"""
    
    plugin_dir: str = Field(default="./plugins")
    max_plugin_memory_mb: int = Field(default=512)
    plugin_timeout_seconds: int = Field(default=30)
    allow_network_access: bool = Field(default=False)
    
    class Config:
        env_prefix = "PLUGIN_"


class Settings(PydanticBaseSettings):
    """Main application settings"""
    
    # Application
    app_name: str = Field(default="DeviseOS Backend")
    version: str = Field(default="0.1.0")
    debug: bool = Field(default=False)
    environment: str = Field(default="development")
    
    # Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    workers: int = Field(default=1)
    
    # CORS
    cors_origins: List[str] = Field(default=["http://localhost:3000"])
    cors_allow_credentials: bool = Field(default=True)
    
    # Rate Limiting
    rate_limit_enabled: bool = Field(default=True)
    rate_limit_requests: int = Field(default=100)
    rate_limit_window: int = Field(default=60)
    
    # Feature Flags
    enable_graphql: bool = Field(default=True)
    enable_websockets: bool = Field(default=True)
    enable_plugins: bool = Field(default=True)
    
    # Sub-settings
    database: DatabaseSettings = DatabaseSettings()
    redis: RedisSettings = RedisSettings()
    security: SecuritySettings = SecuritySettings()
    ai: AISettings = AISettings()
    storage: StorageSettings = StorageSettings()
    celery: CelerySettings = CelerySettings()
    monitoring: MonitoringSettings = MonitoringSettings()
    plugin: PluginSettings = PluginSettings()
    
    @validator("environment")
    def validate_environment(cls, v: str) -> str:
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of {allowed}")
        return v
    
    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        env_nested_delimiter = "__"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get the global settings instance"""
    return settings 