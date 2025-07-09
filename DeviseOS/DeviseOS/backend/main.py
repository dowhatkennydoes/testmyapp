#!/usr/bin/env python3
"""
Main entry point for DeviseOS Backend
"""

import uvicorn
from deviseos.core.config import get_settings


def main():
    """Main application entry point"""
    settings = get_settings()
    
    uvicorn.run(
        "deviseos.api.app:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        workers=settings.workers if not settings.debug else 1,
        log_level=settings.monitoring.log_level.lower(),
        access_log=True,
    )


if __name__ == "__main__":
    main() 