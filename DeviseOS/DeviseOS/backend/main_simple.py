#!/usr/bin/env python3
"""
Simple main entry point for DeviseOS Backend
"""

import uvicorn
from deviseos.core.config import get_settings


def main():
    """Main application entry point"""
    settings = get_settings()
    
    uvicorn.run(
        "deviseos.api.app_simple:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.monitoring.log_level.lower(),
    )


if __name__ == "__main__":
    main() 