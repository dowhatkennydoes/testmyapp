use rusqlite::{Connection, Result as SqliteResult, params};
use sqlx::{SqlitePool, Row as SqlxRow};
use serde_json;
use std::path::Path;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use crate::{
    AppError, AppResult, 
    models::{
        Note, VoiceAnnotation, Tag, NoteMetadata, VoiceMetadata,
        Notebook, Section, Page, MediaAttachment, PageLink, PageLinkType,
        NotebookMetadata, PageMetadata, MediaMetadata,
        CreateNotebookRequest, UpdateNotebookRequest,
        CreateSectionRequest, UpdateSectionRequest,
        CreatePageRequest, UpdatePageRequest, MovePageRequest,
        UploadMediaRequest, CreatePageLinkRequest,
        NotebookHierarchy, SectionWithPages, PageWithSubpages,
        NotebookStats, PageRelationships
    },
    encryption::EncryptionManager,
};

pub struct Database {
    pool: SqlitePool,
    encryption_manager: Option<EncryptionManager>,
}

impl Database {
    pub async fn new(database_path: &Path, encryption_manager: Option<EncryptionManager>) -> AppResult<Self> {
        let database_url = format!("sqlite:{}", database_path.to_string_lossy());
        let pool = SqlitePool::connect(&database_url).await?;
        
        let db = Self {
            pool,
            encryption_manager,
        };
        
        db.init_schema().await?;
        Ok(db)
    }

    async fn init_schema(&self) -> AppResult<()> {
        // Notebooks table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS notebooks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                color TEXT NOT NULL DEFAULT '#3B82F6',
                order_index INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                metadata TEXT NOT NULL
            )
            "#
        ).execute(&self.pool).await?;

        // Sections table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sections (
                id TEXT PRIMARY KEY,
                notebook_id TEXT NOT NULL,
                title TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#3B82F6',
                order_index INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (notebook_id) REFERENCES notebooks (id) ON DELETE CASCADE
            )
            "#
        ).execute(&self.pool).await?;

        // Pages table (enhanced notes table with hierarchy)
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS pages (
                id TEXT PRIMARY KEY,
                notebook_id TEXT NOT NULL,
                section_id TEXT,
                parent_page_id TEXT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT NOT NULL,
                order_index INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                metadata TEXT NOT NULL,
                FOREIGN KEY (notebook_id) REFERENCES notebooks (id) ON DELETE CASCADE,
                FOREIGN KEY (section_id) REFERENCES sections (id) ON DELETE SET NULL,
                FOREIGN KEY (parent_page_id) REFERENCES pages (id) ON DELETE CASCADE
            )
            "#
        ).execute(&self.pool).await?;

        // Legacy notes table (for backward compatibility)
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                metadata TEXT NOT NULL
            )
            "#
        ).execute(&self.pool).await?;

        // Voice annotations table (updated to support pages)
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS voice_annotations (
                id TEXT PRIMARY KEY,
                page_id TEXT,
                note_id TEXT,
                audio_data BLOB NOT NULL,
                transcription TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                duration REAL NOT NULL,
                metadata TEXT NOT NULL,
                FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE CASCADE,
                FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
            )
            "#
        ).execute(&self.pool).await?;

        // Media attachments table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS media_attachments (
                id TEXT PRIMARY KEY,
                page_id TEXT,
                note_id TEXT,
                filename TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                file_data BLOB NOT NULL,
                thumbnail_data BLOB,
                position_in_content INTEGER,
                created_at TEXT NOT NULL,
                metadata TEXT NOT NULL,
                FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE CASCADE,
                FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
            )
            "#
        ).execute(&self.pool).await?;

        // Page links table for cross-references
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS page_links (
                id TEXT PRIMARY KEY,
                source_page_id TEXT NOT NULL,
                target_page_id TEXT NOT NULL,
                link_text TEXT NOT NULL,
                link_type TEXT NOT NULL DEFAULT 'manual',
                created_at TEXT NOT NULL,
                FOREIGN KEY (source_page_id) REFERENCES pages (id) ON DELETE CASCADE,
                FOREIGN KEY (target_page_id) REFERENCES pages (id) ON DELETE CASCADE,
                UNIQUE(source_page_id, target_page_id, link_text)
            )
            "#
        ).execute(&self.pool).await?;

        // Tags table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                color TEXT NOT NULL,
                description TEXT,
                usage_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                last_used TEXT
            )
            "#
        ).execute(&self.pool).await?;

        // Embeddings table for semantic search
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS embeddings (
                note_id TEXT PRIMARY KEY,
                embedding BLOB NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
            )
            "#
        ).execute(&self.pool).await?;

        // Settings table for app configuration
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#
        ).execute(&self.pool).await?;

        // Create indexes for better performance
        // Notebook indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_notebooks_order_index ON notebooks (order_index)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_notebooks_created_at ON notebooks (created_at)").execute(&self.pool).await?;
        
        // Section indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_sections_notebook_id ON sections (notebook_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_sections_order_index ON sections (notebook_id, order_index)").execute(&self.pool).await?;
        
        // Page indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_pages_notebook_id ON pages (notebook_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_pages_section_id ON pages (section_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_pages_parent_page_id ON pages (parent_page_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_pages_order_index ON pages (notebook_id, section_id, order_index)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_pages_created_at ON pages (created_at)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_pages_updated_at ON pages (updated_at)").execute(&self.pool).await?;
        
        // Media attachment indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_media_page_id ON media_attachments (page_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_media_note_id ON media_attachments (note_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_media_position ON media_attachments (page_id, position_in_content)").execute(&self.pool).await?;
        
        // Page links indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_page_links_source ON page_links (source_page_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_page_links_target ON page_links (target_page_id)").execute(&self.pool).await?;
        
        // Legacy note indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes (updated_at)").execute(&self.pool).await?;
        
        // Voice annotation indexes (updated)
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_voice_annotations_page_id ON voice_annotations (page_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_voice_annotations_note_id ON voice_annotations (note_id)").execute(&self.pool).await?;
        
        // Tag indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags (usage_count)").execute(&self.pool).await?;

        Ok(())
    }

    // Note operations
    pub async fn create_note(&self, title: String, content: String, tags: Vec<String>) -> AppResult<Note> {
        let note = Note::new(title, content, tags);
        
        let encrypted_content = if let Some(ref enc) = self.encryption_manager {
            enc.encrypt_string(&note.content)?
        } else {
            note.content.clone()
        };

        sqlx::query(
            r#"
            INSERT INTO notes (id, title, content, tags, created_at, updated_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&note.id)
        .bind(&note.title)
        .bind(&encrypted_content)
        .bind(&serde_json::to_string(&note.tags)?)
        .bind(&note.created_at.to_rfc3339())
        .bind(&note.updated_at.to_rfc3339())
        .bind(&serde_json::to_string(&note.metadata)?)
        .execute(&self.pool)
        .await?;

        // Update tag usage counts
        for tag_name in &note.tags {
            self.increment_tag_usage(tag_name).await?;
        }

        Ok(note)
    }

    pub async fn get_note(&self, id: &str) -> AppResult<Option<Note>> {
        let row = sqlx::query(
            r#"
            SELECT id, title, content, tags, created_at, updated_at, metadata
            FROM notes
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let content: String = row.get("content");
            let decrypted_content = if let Some(ref enc) = self.encryption_manager {
                enc.decrypt_string(&content)?
            } else {
                content
            };

            let voice_annotations = self.get_voice_annotations(id).await?;

            let note = Note {
                id: row.get("id"),
                title: row.get("title"),
                content: decrypted_content,
                tags: serde_json::from_str(&row.get::<String, _>("tags"))?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&Utc),
                voice_annotations,
                metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
            };

            Ok(Some(note))
        } else {
            Ok(None)
        }
    }

    pub async fn get_notes(&self, limit: Option<usize>, offset: Option<usize>) -> AppResult<Vec<Note>> {
        let limit = limit.unwrap_or(50);
        let offset = offset.unwrap_or(0);

        let rows = sqlx::query(
            r#"
            SELECT id, title, content, tags, created_at, updated_at, metadata
            FROM notes
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
            "#
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        let mut notes = Vec::new();
        for row in rows {
            let content: String = row.get("content");
            let decrypted_content = if let Some(ref enc) = self.encryption_manager {
                enc.decrypt_string(&content)?
            } else {
                content
            };

            let voice_annotations = self.get_voice_annotations(&row.get::<String, _>("id")).await?;

            let note = Note {
                id: row.get("id"),
                title: row.get("title"),
                content: decrypted_content,
                tags: serde_json::from_str(&row.get::<String, _>("tags"))?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&Utc),
                voice_annotations,
                metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
            };
            notes.push(note);
        }

        Ok(notes)
    }

    pub async fn update_note(&self, id: &str, title: Option<String>, content: Option<String>, tags: Option<Vec<String>>) -> AppResult<()> {
        let mut note = self.get_note(id).await?
            .ok_or_else(|| AppError::NotFound(format!("Note with id {} not found", id)))?;

        if let Some(title) = title {
            note.title = title;
        }

        if let Some(content) = content {
            note.content = content;
            note.metadata.word_count = note.content.split_whitespace().count() as u32;
        }

        if let Some(tags) = tags {
            note.tags = tags;
        }

        note.updated_at = Utc::now();

        let encrypted_content = if let Some(ref enc) = self.encryption_manager {
            enc.encrypt_string(&note.content)?
        } else {
            note.content.clone()
        };

        sqlx::query(
            r#"
            UPDATE notes
            SET title = ?, content = ?, tags = ?, updated_at = ?, metadata = ?
            WHERE id = ?
            "#
        )
        .bind(&note.title)
        .bind(&encrypted_content)
        .bind(&serde_json::to_string(&note.tags)?)
        .bind(&note.updated_at.to_rfc3339())
        .bind(&serde_json::to_string(&note.metadata)?)
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn delete_note(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM notes WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    // Voice annotation operations
    pub async fn add_voice_annotation(&self, note_id: &str, audio_data: Vec<u8>, transcription: String, duration: f64) -> AppResult<VoiceAnnotation> {
        let annotation = VoiceAnnotation {
            id: Uuid::new_v4().to_string(),
            note_id: note_id.to_string(),
            audio_data: audio_data.clone(),
            transcription,
            timestamp: Utc::now(),
            duration,
            metadata: VoiceMetadata::default(),
        };

        let encrypted_audio = if let Some(ref enc) = self.encryption_manager {
            enc.encrypt(&audio_data)?
        } else {
            audio_data
        };

        sqlx::query(
            r#"
            INSERT INTO voice_annotations (id, note_id, audio_data, transcription, timestamp, duration, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&annotation.id)
        .bind(&annotation.note_id)
        .bind(&encrypted_audio)
        .bind(&annotation.transcription)
        .bind(&annotation.timestamp.to_rfc3339())
        .bind(annotation.duration)
        .bind(&serde_json::to_string(&annotation.metadata)?)
        .execute(&self.pool)
        .await?;

        Ok(annotation)
    }

    async fn get_voice_annotations(&self, note_id: &str) -> AppResult<Vec<VoiceAnnotation>> {
        let rows = sqlx::query(
            r#"
            SELECT id, note_id, audio_data, transcription, timestamp, duration, metadata
            FROM voice_annotations
            WHERE note_id = ?
            ORDER BY timestamp ASC
            "#
        )
        .bind(note_id)
        .fetch_all(&self.pool)
        .await?;

        let mut annotations = Vec::new();
        for row in rows {
            let audio_data: Vec<u8> = row.get("audio_data");
            let decrypted_audio = if let Some(ref enc) = self.encryption_manager {
                enc.decrypt(&audio_data)?
            } else {
                audio_data
            };

            let annotation = VoiceAnnotation {
                id: row.get("id"),
                note_id: row.get("note_id"),
                audio_data: decrypted_audio,
                transcription: row.get("transcription"),
                timestamp: DateTime::parse_from_rfc3339(&row.get::<String, _>("timestamp"))?.with_timezone(&Utc),
                duration: row.get("duration"),
                metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
            };
            annotations.push(annotation);
        }

        Ok(annotations)
    }

    // Tag operations
    pub async fn get_tags(&self) -> AppResult<Vec<Tag>> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, color, description, usage_count, created_at, last_used
            FROM tags
            ORDER BY usage_count DESC, name ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut tags = Vec::new();
        for row in rows {
            let tag = Tag {
                id: row.get("id"),
                name: row.get("name"),
                color: row.get("color"),
                description: row.get("description"),
                usage_count: row.get("usage_count"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&Utc),
                last_used: row.get::<Option<String>, _>("last_used")
                    .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
            };
            tags.push(tag);
        }

        Ok(tags)
    }

    async fn increment_tag_usage(&self, tag_name: &str) -> AppResult<()> {
        // Check if tag exists
        let existing = sqlx::query("SELECT id FROM tags WHERE name = ?")
            .bind(tag_name)
            .fetch_optional(&self.pool)
            .await?;

        if existing.is_some() {
            // Update usage count
            sqlx::query(
                r#"
                UPDATE tags
                SET usage_count = usage_count + 1, last_used = ?
                WHERE name = ?
                "#
            )
            .bind(&Utc::now().to_rfc3339())
            .bind(tag_name)
            .execute(&self.pool)
            .await?;
        } else {
            // Create new tag
            let tag = Tag::new(tag_name.to_string(), "#3B82F6".to_string());
            sqlx::query(
                r#"
                INSERT INTO tags (id, name, color, description, usage_count, created_at, last_used)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(&tag.id)
            .bind(&tag.name)
            .bind(&tag.color)
            .bind(&tag.description)
            .bind(1) // First usage
            .bind(&tag.created_at.to_rfc3339())
            .bind(&Utc::now().to_rfc3339())
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    // Search operations
    pub async fn search_notes(&self, query: &str) -> AppResult<Vec<Note>> {
        let rows = sqlx::query(
            r#"
            SELECT id, title, content, tags, created_at, updated_at, metadata
            FROM notes
            WHERE title LIKE ? OR content LIKE ?
            ORDER BY updated_at DESC
            "#
        )
        .bind(&format!("%{}%", query))
        .bind(&format!("%{}%", query))
        .fetch_all(&self.pool)
        .await?;

        let mut notes = Vec::new();
        for row in rows {
            let content: String = row.get("content");
            let decrypted_content = if let Some(ref enc) = self.encryption_manager {
                enc.decrypt_string(&content)?
            } else {
                content
            };

            // Only include if search term is found in decrypted content
            if decrypted_content.to_lowercase().contains(&query.to_lowercase()) ||
               row.get::<String, _>("title").to_lowercase().contains(&query.to_lowercase()) {
                
                let voice_annotations = self.get_voice_annotations(&row.get::<String, _>("id")).await?;

                let note = Note {
                    id: row.get("id"),
                    title: row.get("title"),
                    content: decrypted_content,
                    tags: serde_json::from_str(&row.get::<String, _>("tags"))?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&Utc),
                    voice_annotations,
                    metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
                };
                notes.push(note);
            }
        }

        Ok(notes)
    }

    // Settings operations
    pub async fn get_setting(&self, key: &str) -> AppResult<Option<String>> {
        let row = sqlx::query("SELECT value FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let value: String = row.get("value");
            let decrypted_value = if let Some(ref enc) = self.encryption_manager {
                enc.decrypt_string(&value)?
            } else {
                value
            };
            Ok(Some(decrypted_value))
        } else {
            Ok(None)
        }
    }

    pub async fn set_setting(&self, key: &str, value: &str) -> AppResult<()> {
        let encrypted_value = if let Some(ref enc) = self.encryption_manager {
            enc.encrypt_string(value)?
        } else {
            value.to_string()
        };

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
            "#
        )
        .bind(key)
        .bind(&encrypted_value)
        .bind(&Utc::now().to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Embedding operations
    pub async fn store_embedding(&self, note_id: &str, embedding: &[f32]) -> AppResult<()> {
        let embedding_bytes = embedding.iter()
            .flat_map(|f| f.to_le_bytes())
            .collect::<Vec<u8>>();

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO embeddings (note_id, embedding, created_at)
            VALUES (?, ?, ?)
            "#
        )
        .bind(note_id)
        .bind(&embedding_bytes)
        .bind(&Utc::now().to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_embedding(&self, note_id: &str) -> AppResult<Option<Vec<f32>>> {
        let row = sqlx::query("SELECT embedding FROM embeddings WHERE note_id = ?")
            .bind(note_id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let embedding_bytes: Vec<u8> = row.get("embedding");
            let embedding = embedding_bytes
                .chunks(4)
                .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                .collect();
            Ok(Some(embedding))
        } else {
            Ok(None)
        }
    }

    pub async fn get_all_embeddings(&self) -> AppResult<Vec<(String, Vec<f32>)>> {
        let rows = sqlx::query("SELECT note_id, embedding FROM embeddings")
            .fetch_all(&self.pool)
            .await?;

        let mut embeddings = Vec::new();
        for row in rows {
            let note_id: String = row.get("note_id");
            let embedding_bytes: Vec<u8> = row.get("embedding");
            let embedding = embedding_bytes
                .chunks(4)
                .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                .collect();
            embeddings.push((note_id, embedding));
        }

        Ok(embeddings)
    }

    // Notebook operations
    pub async fn create_notebook(&self, request: CreateNotebookRequest) -> AppResult<Notebook> {
        let notebook = Notebook::new(request.title, request.description, request.color);
        
        sqlx::query(
            r#"
            INSERT INTO notebooks (id, title, description, color, order_index, created_at, updated_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&notebook.id)
        .bind(&notebook.title)
        .bind(&notebook.description)
        .bind(&notebook.color)
        .bind(notebook.order_index)
        .bind(&notebook.created_at.to_rfc3339())
        .bind(&notebook.updated_at.to_rfc3339())
        .bind(&serde_json::to_string(&notebook.metadata)?)
        .execute(&self.pool)
        .await?;

        Ok(notebook)
    }

    pub async fn get_notebooks(&self) -> AppResult<Vec<Notebook>> {
        let rows = sqlx::query(
            r#"
            SELECT id, title, description, color, order_index, created_at, updated_at, metadata
            FROM notebooks
            ORDER BY order_index ASC, created_at ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut notebooks = Vec::new();
        for row in rows {
            let notebook = Notebook {
                id: row.get("id"),
                title: row.get("title"),
                description: row.get("description"),
                color: row.get("color"),
                order_index: row.get("order_index"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&Utc),
                sections: Vec::new(), // Will be populated by get_notebook_hierarchy
                metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
            };
            notebooks.push(notebook);
        }

        Ok(notebooks)
    }

    pub async fn get_notebook(&self, id: &str) -> AppResult<Option<Notebook>> {
        let row = sqlx::query(
            r#"
            SELECT id, title, description, color, order_index, created_at, updated_at, metadata
            FROM notebooks
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let notebook = Notebook {
                id: row.get("id"),
                title: row.get("title"),
                description: row.get("description"),
                color: row.get("color"),
                order_index: row.get("order_index"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&Utc),
                sections: Vec::new(),
                metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
            };
            Ok(Some(notebook))
        } else {
            Ok(None)
        }
    }

    pub async fn update_notebook(&self, request: UpdateNotebookRequest) -> AppResult<()> {
        let mut query_parts = Vec::new();
        let mut params = Vec::new();

        if let Some(title) = &request.title {
            query_parts.push("title = ?");
            params.push(title.as_str());
        }
        if let Some(description) = &request.description {
            query_parts.push("description = ?");
            params.push(description.as_str());
        }
        if let Some(color) = &request.color {
            query_parts.push("color = ?");
            params.push(color.as_str());
        }
        if let Some(order_index) = &request.order_index {
            query_parts.push("order_index = ?");
            params.push(&order_index.to_string());
        }

        if query_parts.is_empty() {
            return Ok(());
        }

        query_parts.push("updated_at = ?");
        let now = Utc::now().to_rfc3339();
        params.push(&now);

        let query = format!(
            "UPDATE notebooks SET {} WHERE id = ?",
            query_parts.join(", ")
        );

        let mut query_builder = sqlx::query(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }
        query_builder = query_builder.bind(&request.id);

        query_builder.execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete_notebook(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM notebooks WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // Section operations
    pub async fn create_section(&self, request: CreateSectionRequest) -> AppResult<Section> {
        let section = Section::new(request.notebook_id, request.title, request.color);
        
        sqlx::query(
            r#"
            INSERT INTO sections (id, notebook_id, title, color, order_index, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&section.id)
        .bind(&section.notebook_id)
        .bind(&section.title)
        .bind(&section.color)
        .bind(section.order_index)
        .bind(&section.created_at.to_rfc3339())
        .bind(&section.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(section)
    }

    pub async fn get_sections(&self, notebook_id: &str) -> AppResult<Vec<Section>> {
        let rows = sqlx::query(
            r#"
            SELECT id, notebook_id, title, color, order_index, created_at, updated_at
            FROM sections
            WHERE notebook_id = ?
            ORDER BY order_index ASC, created_at ASC
            "#
        )
        .bind(notebook_id)
        .fetch_all(&self.pool)
        .await?;

        let mut sections = Vec::new();
        for row in rows {
            let section = Section {
                id: row.get("id"),
                notebook_id: row.get("notebook_id"),
                title: row.get("title"),
                color: row.get("color"),
                order_index: row.get("order_index"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&Utc),
                pages: Vec::new(),
            };
            sections.push(section);
        }

        Ok(sections)
    }

    pub async fn update_section(&self, request: UpdateSectionRequest) -> AppResult<()> {
        let mut query_parts = Vec::new();
        let mut params = Vec::new();

        if let Some(title) = &request.title {
            query_parts.push("title = ?");
            params.push(title.as_str());
        }
        if let Some(color) = &request.color {
            query_parts.push("color = ?");
            params.push(color.as_str());
        }
        if let Some(order_index) = &request.order_index {
            query_parts.push("order_index = ?");
            params.push(&order_index.to_string());
        }

        if query_parts.is_empty() {
            return Ok(());
        }

        query_parts.push("updated_at = ?");
        let now = Utc::now().to_rfc3339();
        params.push(&now);

        let query = format!(
            "UPDATE sections SET {} WHERE id = ?",
            query_parts.join(", ")
        );

        let mut query_builder = sqlx::query(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }
        query_builder = query_builder.bind(&request.id);

        query_builder.execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete_section(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM sections WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // Page operations
    pub async fn create_page(&self, request: CreatePageRequest) -> AppResult<Page> {
        let page = Page::new(
            request.notebook_id,
            request.section_id,
            request.parent_page_id,
            request.title,
            request.content,
            request.tags,
        );
        
        let encrypted_content = if let Some(ref enc) = self.encryption_manager {
            enc.encrypt_string(&page.content)?
        } else {
            page.content.clone()
        };

        sqlx::query(
            r#"
            INSERT INTO pages (id, notebook_id, section_id, parent_page_id, title, content, tags, order_index, created_at, updated_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&page.id)
        .bind(&page.notebook_id)
        .bind(&page.section_id)
        .bind(&page.parent_page_id)
        .bind(&page.title)
        .bind(&encrypted_content)
        .bind(&serde_json::to_string(&page.tags)?)
        .bind(page.order_index)
        .bind(&page.created_at.to_rfc3339())
        .bind(&page.updated_at.to_rfc3339())
        .bind(&serde_json::to_string(&page.metadata)?)
        .execute(&self.pool)
        .await?;

        Ok(page)
    }

    pub async fn get_pages(&self, notebook_id: &str, section_id: Option<&str>) -> AppResult<Vec<Page>> {
        let rows = if let Some(section_id) = section_id {
            sqlx::query(
                r#"
                SELECT id, notebook_id, section_id, parent_page_id, title, content, tags, order_index, created_at, updated_at, metadata
                FROM pages
                WHERE notebook_id = ? AND section_id = ?
                ORDER BY order_index ASC, created_at ASC
                "#
            )
            .bind(notebook_id)
            .bind(section_id)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                r#"
                SELECT id, notebook_id, section_id, parent_page_id, title, content, tags, order_index, created_at, updated_at, metadata
                FROM pages
                WHERE notebook_id = ?
                ORDER BY order_index ASC, created_at ASC
                "#
            )
            .bind(notebook_id)
            .fetch_all(&self.pool)
            .await?
        };

        let mut pages = Vec::new();
        for row in rows {
            let content: String = row.get("content");
            let decrypted_content = if let Some(ref enc) = self.encryption_manager {
                enc.decrypt_string(&content)?
            } else {
                content
            };

            let page = Page {
                id: row.get("id"),
                notebook_id: row.get("notebook_id"),
                section_id: row.get("section_id"),
                parent_page_id: row.get("parent_page_id"),
                title: row.get("title"),
                content: decrypted_content,
                tags: serde_json::from_str(&row.get::<String, _>("tags"))?,
                order_index: row.get("order_index"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&Utc),
                voice_annotations: Vec::new(),
                media_attachments: Vec::new(),
                page_links: Vec::new(),
                subpages: Vec::new(),
                metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
            };
            pages.push(page);
        }

        Ok(pages)
    }

    pub async fn get_page(&self, id: &str) -> AppResult<Option<Page>> {
        let row = sqlx::query(
            r#"
            SELECT id, notebook_id, section_id, parent_page_id, title, content, tags, order_index, created_at, updated_at, metadata
            FROM pages
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let content: String = row.get("content");
            let decrypted_content = if let Some(ref enc) = self.encryption_manager {
                enc.decrypt_string(&content)?
            } else {
                content
            };

            let page = Page {
                id: row.get("id"),
                notebook_id: row.get("notebook_id"),
                section_id: row.get("section_id"),
                parent_page_id: row.get("parent_page_id"),
                title: row.get("title"),
                content: decrypted_content,
                tags: serde_json::from_str(&row.get::<String, _>("tags"))?,
                order_index: row.get("order_index"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&Utc),
                voice_annotations: Vec::new(),
                media_attachments: Vec::new(),
                page_links: Vec::new(),
                subpages: Vec::new(),
                metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
            };
            Ok(Some(page))
        } else {
            Ok(None)
        }
    }

    pub async fn update_page(&self, request: UpdatePageRequest) -> AppResult<()> {
        let mut query_parts = Vec::new();
        let mut params: Vec<Box<dyn ToString>> = Vec::new();

        if let Some(title) = &request.title {
            query_parts.push("title = ?");
            params.push(Box::new(title.clone()));
        }
        if let Some(content) = &request.content {
            let encrypted_content = if let Some(ref enc) = self.encryption_manager {
                enc.encrypt_string(content)?
            } else {
                content.clone()
            };
            query_parts.push("content = ?");
            params.push(Box::new(encrypted_content));
        }
        if let Some(tags) = &request.tags {
            query_parts.push("tags = ?");
            params.push(Box::new(serde_json::to_string(tags)?));
        }
        if let Some(order_index) = &request.order_index {
            query_parts.push("order_index = ?");
            params.push(Box::new(*order_index));
        }

        if query_parts.is_empty() {
            return Ok(());
        }

        query_parts.push("updated_at = ?");
        let now = Utc::now().to_rfc3339();
        params.push(Box::new(now));

        let query = format!(
            "UPDATE pages SET {} WHERE id = ?",
            query_parts.join(", ")
        );

        let mut query_builder = sqlx::query(&query);
        for param in params {
            query_builder = query_builder.bind(param.to_string());
        }
        query_builder = query_builder.bind(&request.id);

        query_builder.execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete_page(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM pages WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn move_page(&self, request: MovePageRequest) -> AppResult<()> {
        let mut query_parts = Vec::new();
        let mut params: Vec<String> = Vec::new();

        if let Some(notebook_id) = &request.new_notebook_id {
            query_parts.push("notebook_id = ?");
            params.push(notebook_id.clone());
        }
        if let Some(section_id) = &request.new_section_id {
            query_parts.push("section_id = ?");
            params.push(section_id.clone());
        }
        if let Some(parent_page_id) = &request.new_parent_page_id {
            query_parts.push("parent_page_id = ?");
            params.push(parent_page_id.clone());
        }
        if let Some(order_index) = &request.new_order_index {
            query_parts.push("order_index = ?");
            params.push(order_index.to_string());
        }

        if query_parts.is_empty() {
            return Ok(());
        }

        query_parts.push("updated_at = ?");
        let now = Utc::now().to_rfc3339();
        params.push(now);

        let query = format!(
            "UPDATE pages SET {} WHERE id = ?",
            query_parts.join(", ")
        );

        let mut query_builder = sqlx::query(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }
        query_builder = query_builder.bind(&request.page_id);

        query_builder.execute(&self.pool).await?;
        Ok(())
    }
}