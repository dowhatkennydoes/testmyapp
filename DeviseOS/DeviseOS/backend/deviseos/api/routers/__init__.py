"""
API routers package for DeviseOS Backend
"""

from . import health, auth, notebooks, voice_annotations, ai_processing, sync, plugins

__all__ = [
    "health",
    "auth", 
    "notebooks",
    "voice_annotations",
    "ai_processing",
    "sync",
    "plugins",
] 