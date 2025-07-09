"""
Simplified FastAPI application for DeviseOS Backend
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import Dict, Any

from ..core.config import get_settings


def create_simple_app() -> FastAPI:
    """Create a simplified FastAPI application"""
    settings = get_settings()
    
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="Privacy-first, AI-powered platform for knowledge management",
        docs_url="/docs",
        redoc_url="/redoc",
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    return app


# Create the application instance
app = create_simple_app()


@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint"""
    return {
        "message": "Welcome to DeviseOS Backend",
        "version": app.version,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "deviseos-backend",
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


@app.get("/api/v1/notebooks")
async def list_notebooks() -> Dict[str, Any]:
    """List notebooks endpoint"""
    return {
        "message": "List notebooks endpoint - placeholder",
        "notebooks": [],
    }


@app.get("/api/v1/ai")
async def ai_info() -> Dict[str, Any]:
    """AI processing information endpoint"""
    return {
        "message": "AI processing endpoints",
        "endpoints": [
            "/api/v1/ai/embed",
            "/api/v1/ai/summarize",
            "/api/v1/ai/tag-suggestions",
            "/api/v1/ai/memory-search",
            "/api/v1/ai/redact",
        ]
    } 