"""
Health check router for DeviseOS Backend
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends
from datetime import datetime

from ...core.config import get_settings

router = APIRouter()


@router.get("/")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "deviseos-backend",
    }


@router.get("/ready")
async def readiness_check() -> Dict[str, Any]:
    """Readiness check for Kubernetes"""
    settings = get_settings()
    
    # TODO: Add actual health checks for dependencies
    # - Database connectivity
    # - Redis connectivity
    # - Storage connectivity
    
    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.environment,
        "version": settings.version,
    }


@router.get("/live")
async def liveness_check() -> Dict[str, Any]:
    """Liveness check for Kubernetes"""
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/info")
async def service_info() -> Dict[str, Any]:
    """Service information endpoint"""
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
        "timestamp": datetime.utcnow().isoformat(),
    } 