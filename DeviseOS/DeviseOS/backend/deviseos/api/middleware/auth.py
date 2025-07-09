"""
Authentication middleware for DeviseOS Backend
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class AuthMiddleware(BaseHTTPMiddleware):
    """Authentication middleware for JWT token validation"""
    
    async def dispatch(self, request: Request, call_next):
        # TODO: Implement JWT token validation
        # - Extract token from Authorization header
        # - Validate token with Clerk.dev or local JWT
        # - Add user context to request state
        
        response = await call_next(request)
        return response 