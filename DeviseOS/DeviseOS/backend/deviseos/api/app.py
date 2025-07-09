"""
Main FastAPI application for DeviseOS Backend
"""

from contextlib import asynccontextmanager
from typing import Dict, Any
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import time
import structlog
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from ..core.config import get_settings
from ..core.database import init_database, close_database
from ..core.redis import init_redis, close_redis
from ..core.logging import setup_logging
from ..core.monitoring import setup_monitoring
from .routers import (
    auth,
    notebooks,
    voice_annotations,
    ai_processing,
    sync,
    plugins,
    health,
)
from .middleware import (
    AuthMiddleware,
    RateLimitMiddleware,
    AuditMiddleware,
    RequestIDMiddleware,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    settings = get_settings()
    
    # Setup logging
    setup_logging(settings.monitoring.log_level, settings.monitoring.log_format)
    logger = structlog.get_logger()
    
    # Setup monitoring
    if settings.monitoring.otel_enabled:
        setup_monitoring(settings.monitoring.otel_endpoint)
        FastAPIInstrumentor.instrument_app(app)
    
    # Initialize database
    await init_database(settings.database)
    logger.info("Database initialized")
    
    # Initialize Redis
    await init_redis(settings.redis)
    logger.info("Redis initialized")
    
    yield
    
    # Cleanup
    await close_database()
    await close_redis()
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    settings = get_settings()
    
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="Privacy-first, AI-powered platform for knowledge management",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
        lifespan=lifespan,
    )
    
    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(AuditMiddleware)
    app.add_middleware(AuthMiddleware)
    
    if settings.rate_limit_enabled:
        app.add_middleware(RateLimitMiddleware)
    
    # Add exception handlers
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
    
    # Add request/response middleware
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
    
    # Include routers
    app.include_router(health.router, prefix="/health", tags=["health"])
    app.include_router(auth.router, prefix="/auth", tags=["authentication"])
    app.include_router(notebooks.router, prefix="/api/v1/notebooks", tags=["notebooks"])
    app.include_router(voice_annotations.router, prefix="/api/v1/voice-annotations", tags=["voice-annotations"])
    app.include_router(ai_processing.router, prefix="/api/v1/ai", tags=["ai-processing"])
    app.include_router(sync.router, prefix="/api/v1/sync", tags=["sync"])
    
    if settings.enable_plugins:
        app.include_router(plugins.router, prefix="/api/v1/plugins", tags=["plugins"])
    
    # Add GraphQL support if enabled
    if settings.enable_graphql:
        from .graphql import create_graphql_app
        graphql_app = create_graphql_app()
        app.mount("/graphql", graphql_app)
    
    return app


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions"""
    logger = structlog.get_logger()
    logger.warning(
        "HTTP exception",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        method=request.method,
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "http_error",
            "message": exc.detail,
            "status_code": exc.status_code,
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle validation exceptions"""
    logger = structlog.get_logger()
    logger.warning(
        "Validation error",
        errors=exc.errors(),
        path=request.url.path,
        method=request.method,
    )
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": "Request validation failed",
            "details": exc.errors(),
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle general exceptions"""
    logger = structlog.get_logger()
    logger.error(
        "Unhandled exception",
        exception=str(exc),
        exception_type=type(exc).__name__,
        path=request.url.path,
        method=request.method,
        exc_info=True,
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "An internal server error occurred",
        }
    )


# Create the application instance
app = create_app()


@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint"""
    return {
        "message": "Welcome to DeviseOS Backend",
        "version": app.version,
        "docs": "/docs" if app.docs_url else None,
        "health": "/health",
    }


@app.get("/info")
async def info() -> Dict[str, Any]:
    """Application information endpoint"""
    settings = get_settings()
    return {
        "name": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "features": {
            "graphql": settings.enable_graphql,
            "websockets": settings.enable_websockets,
            "plugins": settings.enable_plugins,
            "rate_limiting": settings.rate_limit_enabled,
        },
    } 