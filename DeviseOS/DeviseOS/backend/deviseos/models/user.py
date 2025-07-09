"""
User and organization models for authentication and RBAC
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, Text, Integer, ForeignKey, Boolean, JSON, Index, Enum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from .base import Base, TimestampMixin, SoftDeleteMixin, AuditMixin


class UserRole(str, enum.Enum):
    """User role enumeration"""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class OrganizationRole(str, enum.Enum):
    """Organization role enumeration"""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    GUEST = "guest"


class User(Base, TimestampMixin, SoftDeleteMixin):
    """User model for authentication and user management"""
    
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, index=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Clerk.dev integration
    clerk_user_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    
    # Relationships
    organization_memberships: Mapped[List["OrganizationMember"]] = relationship("OrganizationMember", back_populates="user", cascade="all, delete-orphan")
    notebooks: Mapped[List["Notebook"]] = relationship("Notebook", back_populates="owner")
    
    # Indexes
    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_clerk_id", "clerk_user_id"),
        Index("idx_users_active", "is_active"),
    )


class Organization(Base, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """Organization model for multi-tenant support"""
    
    __tablename__ = "organizations"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    plan_type: Mapped[str] = mapped_column(String(50), default="free", nullable=False)  # free, pro, enterprise
    settings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    members: Mapped[List["OrganizationMember"]] = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    notebooks: Mapped[List["Notebook"]] = relationship("Notebook", back_populates="organization")
    
    # Indexes
    __table_args__ = (
        Index("idx_organizations_slug", "slug"),
        Index("idx_organizations_active", "is_active"),
        Index("idx_organizations_plan", "plan_type"),
    )


class OrganizationMember(Base, TimestampMixin, AuditMixin):
    """Organization membership model for RBAC"""
    
    __tablename__ = "organization_members"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    role: Mapped[OrganizationRole] = mapped_column(Enum(OrganizationRole), default=OrganizationRole.MEMBER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    invited_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    invited_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    permissions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="organization_memberships", foreign_keys=[user_id])
    inviter: Mapped[Optional["User"]] = relationship("User", foreign_keys=[invited_by])
    
    # Indexes
    __table_args__ = (
        Index("idx_org_members_org_user", "organization_id", "user_id", unique=True),
        Index("idx_org_members_role", "role"),
        Index("idx_org_members_active", "is_active"),
    )


class UserSession(Base, TimestampMixin):
    """User session model for session management"""
    
    __tablename__ = "user_sessions"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    session_token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, index=True)
    refresh_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv6 compatible
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    device_info: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index("idx_user_sessions_token", "session_token"),
        Index("idx_user_sessions_user", "user_id"),
        Index("idx_user_sessions_expires", "expires_at"),
        Index("idx_user_sessions_active", "is_active"),
    )


class AuditLog(Base, TimestampMixin):
    """Audit log model for compliance and security"""
    
    __tablename__ = "audit_logs"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    organization_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")
    organization: Mapped[Optional["Organization"]] = relationship("Organization")
    
    # Indexes
    __table_args__ = (
        Index("idx_audit_logs_user", "user_id"),
        Index("idx_audit_logs_org", "organization_id"),
        Index("idx_audit_logs_action", "action"),
        Index("idx_audit_logs_resource", "resource_type", "resource_id"),
        Index("idx_audit_logs_created", "created_at"),
        Index("idx_audit_logs_success", "success"),
    ) 