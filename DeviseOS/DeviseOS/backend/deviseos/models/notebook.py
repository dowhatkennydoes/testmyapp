"""
Notebook models for the core notebook service
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, Text, Integer, ForeignKey, Boolean, JSON, Index
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import uuid

from .base import Base, TimestampMixin, SoftDeleteMixin, AuditMixin


class Notebook(Base, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """Notebook model representing a collection of notes"""
    
    __tablename__ = "notebooks"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # Hex color code
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    sections: Mapped[List["Section"]] = relationship("Section", back_populates="notebook", cascade="all, delete-orphan")
    pages: Mapped[List["Page"]] = relationship("Page", back_populates="notebook", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_notebooks_user_created", "created_by", "created_at"),
        Index("idx_notebooks_archived", "is_archived"),
        Index("idx_notebooks_pinned", "is_pinned"),
    )


class Section(Base, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """Section model for organizing pages within notebooks"""
    
    __tablename__ = "sections"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    notebook_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("notebooks.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_collapsed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    notebook: Mapped["Notebook"] = relationship("Notebook", back_populates="sections")
    pages: Mapped[List["Page"]] = relationship("Page", back_populates="section", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_sections_notebook_order", "notebook_id", "order"),
        Index("idx_sections_user_created", "created_by", "created_at"),
    )


class Page(Base, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """Page model representing individual notes/pages"""
    
    __tablename__ = "pages"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    notebook_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("notebooks.id"), nullable=False)
    section_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("sections.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_type: Mapped[str] = mapped_column(String(50), default="markdown", nullable=False)  # markdown, rich_text, etc.
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reading_time_minutes: Mapped[float] = mapped_column(Integer, default=0, nullable=False)
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    access_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    notebook: Mapped["Notebook"] = relationship("Notebook", back_populates="pages")
    section: Mapped[Optional["Section"]] = relationship("Section", back_populates="pages")
    voice_annotations: Mapped[List["VoiceAnnotation"]] = relationship("VoiceAnnotation", back_populates="page", cascade="all, delete-orphan")
    embeddings: Mapped[List["PageEmbedding"]] = relationship("PageEmbedding", back_populates="page", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_pages_notebook_section", "notebook_id", "section_id"),
        Index("idx_pages_user_created", "created_by", "created_at"),
        Index("idx_pages_archived", "is_archived"),
        Index("idx_pages_pinned", "is_pinned"),
        Index("idx_pages_tags", "tags", postgresql_using="gin"),
        Index("idx_pages_title_content", "title", "content", postgresql_using="gin"),
    )


class VoiceAnnotation(Base, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """Voice annotation model for audio recordings and transcriptions"""
    
    __tablename__ = "voice_annotations"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("pages.id"), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    audio_file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    transcription: Mapped[str] = mapped_column(Text, nullable=False, default="")
    transcription_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, processing, completed, failed
    duration_seconds: Mapped[float] = mapped_column(Integer, default=0, nullable=False)
    sample_rate: Mapped[int] = mapped_column(Integer, default=44100, nullable=False)
    channels: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    bit_depth: Mapped[int] = mapped_column(Integer, default=16, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    page: Mapped["Page"] = relationship("Page", back_populates="voice_annotations")
    
    # Indexes
    __table_args__ = (
        Index("idx_voice_annotations_page", "page_id"),
        Index("idx_voice_annotations_status", "transcription_status"),
        Index("idx_voice_annotations_user_created", "created_by", "created_at"),
    )


class PageEmbedding(Base, TimestampMixin, AuditMixin):
    """Page embedding model for vector search"""
    
    __tablename__ = "page_embeddings"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("pages.id"), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    embedding_vector: Mapped[List[float]] = mapped_column(ARRAY(Integer), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    page: Mapped["Page"] = relationship("Page", back_populates="embeddings")
    
    # Indexes
    __table_args__ = (
        Index("idx_page_embeddings_page_model", "page_id", "model_name"),
        Index("idx_page_embeddings_vector", "embedding_vector", postgresql_using="ivfflat"),
    ) 