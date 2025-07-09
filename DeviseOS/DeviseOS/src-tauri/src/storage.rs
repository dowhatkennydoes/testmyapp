use rusqlite::{Connection, Result as SqliteResult, params, Row};
use sqlx::{SqlitePool, Row as SqlxRow};
use serde_json;
use std::path::Path;
use crate::{
    AppError, AppResult, AppConfig, EncryptionManager,
    Note, Tag, VoiceAnnotation, SearchResult, ExportFormat, ExportType,
    models::*,
};

pub struct StorageManager {
    pool: SqlitePool,
    encryption_manager: Option<EncryptionManager>,
    config: AppConfig,
}

impl StorageManager {
    pub async fn new(config: &AppConfig) -> AppResult<Self> {
        let database_url = config.get_database_url();
        let pool = SqlitePool::connect(&database_url).await?;
        
        // Initialize database schema
        Self::init_database(&pool).await?;
        
        // Initialize encryption if enabled
        let encryption_manager = if config.security_config.encryption_enabled {
            Some(EncryptionManager::from_key_file(&config.encryption_key_path)?)
        } else {
            None
        };
        
        Ok(Self {
            pool,
            encryption_manager,
            config: config.clone(),
        })
    }

    async fn init_database(pool: &SqlitePool) -> AppResult<()> {
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
        ).execute(pool).await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS voice_annotations (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                audio_data BLOB NOT NULL,
                transcription TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                duration REAL NOT NULL,
                metadata TEXT NOT NULL,
                FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
            )
            "#
        ).execute(pool).await?;

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
        ).execute(pool).await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS embeddings (
                note_id TEXT PRIMARY KEY,
                embedding BLOB NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
            )
            "#
        ).execute(pool).await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sync_metadata (
                id TEXT PRIMARY KEY,
                last_sync TEXT,
                sync_version INTEGER NOT NULL DEFAULT 0,
                pending_changes INTEGER NOT NULL DEFAULT 0
            )
            "#
        ).execute(pool).await?;

        // Create indexes for better performance
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at)").execute(pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes (updated_at)").execute(pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_voice_annotations_note_id ON voice_annotations (note_id)").execute(pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name)").execute(pool).await?;

        Ok(())
    }

    // Note operations
    pub async fn create_note(&mut self, title: String, content: String, tags: Vec<String>) -> AppResult<Note> {
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

        // Create tags if they don't exist
        for tag_name in &note.tags {
            self.ensure_tag_exists(tag_name).await?;
        }

        Ok(note)
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
            let content = row.get::<String, _>("content");
            let decrypted_content = if let Some(ref enc) = self.encryption_manager {
                enc.decrypt_string(&content)?
            } else {
                content
            };

            let note = Note {
                id: row.get("id"),
                title: row.get("title"),
                content: decrypted_content,
                tags: serde_json::from_str(&row.get::<String, _>("tags"))?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&chrono::Utc),
                voice_annotations: self.get_voice_annotations(&row.get::<String, _>("id")).await?,
                metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
            };
            notes.push(note);
        }

        Ok(notes)
    }

    pub async fn update_note(&mut self, id: String, title: Option<String>, content: Option<String>, tags: Option<Vec<String>>) -> AppResult<Note> {
        let mut note = self.get_note_by_id(&id).await?;

        if let Some(title) = title {
            note.title = title;
        }

        if let Some(content) = content {
            note.update_content(content);
        }

        if let Some(tags) = tags {
            note.tags = tags.clone();
            // Create tags if they don't exist
            for tag_name in &tags {
                self.ensure_tag_exists(tag_name).await?;
            }
        }

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
        .bind(&id)
        .execute(&self.pool)
        .await?;

        Ok(note)
    }

    pub async fn delete_note(&mut self, id: String) -> AppResult<()> {
        sqlx::query("DELETE FROM notes WHERE id = ?")
            .bind(&id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn get_note_by_id(&self, id: &str) -> AppResult<Note> {
        let row = sqlx::query(
            r#"
            SELECT id, title, content, tags, created_at, updated_at, metadata
            FROM notes
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NoteNotFound { id: id.to_string() })?;

        let content = row.get::<String, _>("content");
        let decrypted_content = if let Some(ref enc) = self.encryption_manager {
            enc.decrypt_string(&content)?
        } else {
            content
        };

        let note = Note {
            id: row.get("id"),
            title: row.get("title"),
            content: decrypted_content,
            tags: serde_json::from_str(&row.get::<String, _>("tags"))?,
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&chrono::Utc),
            updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&chrono::Utc),
            voice_annotations: self.get_voice_annotations(id).await?,
            metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
        };

        Ok(note)
    }

    // Voice annotation operations
    pub async fn add_voice_annotation(&mut self, note_id: &str, audio_data: Vec<u8>, transcription: String, duration: f64) -> AppResult<VoiceAnnotation> {
        let annotation = VoiceAnnotation {
            id: uuid::Uuid::new_v4().to_string(),
            note_id: note_id.to_string(),
            audio_data: audio_data.clone(),
            transcription: transcription.clone(),
            timestamp: chrono::Utc::now(),
            duration,
            metadata: crate::VoiceMetadata::default(),
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
            let audio_data = row.get::<Vec<u8>, _>("audio_data");
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
                timestamp: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("timestamp"))?.with_timezone(&chrono::Utc),
                duration: row.get("duration"),
                metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
            };
            annotations.push(annotation);
        }

        Ok(annotations)
    }

    // Tag operations
    async fn ensure_tag_exists(&mut self, name: &str) -> AppResult<()> {
        let exists = sqlx::query("SELECT 1 FROM tags WHERE name = ?")
            .bind(name)
            .fetch_optional(&self.pool)
            .await?
            .is_some();

        if !exists {
            let tag = Tag::new(name.to_string(), "#3B82F6".to_string()); // Default blue color
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
            .bind(tag.usage_count)
            .bind(&tag.created_at.to_rfc3339())
            .bind(&tag.last_used.map(|dt| dt.to_rfc3339()))
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

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
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&chrono::Utc),
                last_used: row.get::<Option<String>, _>("last_used")
                    .map(|s| chrono::DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&chrono::Utc)),
            };
            tags.push(tag);
        }

        Ok(tags)
    }

    // Search operations
    pub async fn text_search(&self, query: &str) -> AppResult<Vec<SearchResult>> {
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

        let mut results = Vec::new();
        for row in rows {
            let content = row.get::<String, _>("content");
            let decrypted_content = if let Some(ref enc) = self.encryption_manager {
                enc.decrypt_string(&content)?
            } else {
                content
            };

            let note = Note {
                id: row.get("id"),
                title: row.get("title"),
                content: decrypted_content.clone(),
                tags: serde_json::from_str(&row.get::<String, _>("tags"))?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&chrono::Utc),
                voice_annotations: self.get_voice_annotations(&row.get::<String, _>("id")).await?,
                metadata: serde_json::from_str(&row.get::<String, _>("metadata"))?,
            };

            let snippet = self.generate_snippet(&decrypted_content, query);
            let matched_terms = vec![query.to_string()];

            results.push(SearchResult {
                note,
                relevance_score: 1.0, // Simple text search doesn't provide relevance scoring
                matched_terms,
                snippet,
            });
        }

        Ok(results)
    }

    fn generate_snippet(&self, content: &str, query: &str) -> String {
        if let Some(pos) = content.to_lowercase().find(&query.to_lowercase()) {
            let start = pos.saturating_sub(50);
            let end = (pos + query.len() + 50).min(content.len());
            let snippet = &content[start..end];
            
            if start > 0 {
                format!("...{}...", snippet)
            } else {
                format!("{}...", snippet)
            }
        } else {
            content.chars().take(100).collect::<String>() + "..."
        }
    }

    // Export operations
    pub async fn export_note(&self, id: String, format: ExportFormat) -> AppResult<Vec<u8>> {
        let note = self.get_note_by_id(&id).await?;
        
        match format.format {
            ExportType::Markdown => self.export_to_markdown(&note, &format).await,
            ExportType::PDF => self.export_to_pdf(&note, &format).await,
            ExportType::DOCX => self.export_to_docx(&note, &format).await,
            ExportType::TXT => self.export_to_txt(&note, &format).await,
            ExportType::HTML => self.export_to_html(&note, &format).await,
            ExportType::JSON => self.export_to_json(&note, &format).await,
        }
    }

    async fn export_to_markdown(&self, note: &Note, format: &ExportFormat) -> AppResult<Vec<u8>> {
        let mut markdown = String::new();
        
        markdown.push_str(&format!("# {}\n\n", note.title));
        markdown.push_str(&note.content);
        markdown.push('\n');

        if format.include_metadata {
            markdown.push_str(&format!("\n---\n\n"));
            markdown.push_str(&format!("**Created:** {}\n", note.created_at.format("%Y-%m-%d %H:%M:%S")));
            markdown.push_str(&format!("**Updated:** {}\n", note.updated_at.format("%Y-%m-%d %H:%M:%S")));
            markdown.push_str(&format!("**Tags:** {}\n", note.tags.join(", ")));
            markdown.push_str(&format!("**Word Count:** {}\n", note.metadata.word_count));
        }

        if format.include_voice_annotations && !note.voice_annotations.is_empty() {
            markdown.push_str("\n## Voice Annotations\n\n");
            for annotation in &note.voice_annotations {
                markdown.push_str(&format!("**{}** - {}\n\n", 
                    annotation.timestamp.format("%H:%M:%S"),
                    annotation.transcription));
            }
        }

        Ok(markdown.into_bytes())
    }

    async fn export_to_txt(&self, note: &Note, _format: &ExportFormat) -> AppResult<Vec<u8>> {
        let mut text = String::new();
        text.push_str(&format!("{}\n\n", note.title));
        text.push_str(&note.content);
        Ok(text.into_bytes())
    }

    async fn export_to_json(&self, note: &Note, _format: &ExportFormat) -> AppResult<Vec<u8>> {
        let json = serde_json::to_string_pretty(note)?;
        Ok(json.into_bytes())
    }

    async fn export_to_pdf(&self, _note: &Note, _format: &ExportFormat) -> AppResult<Vec<u8>> {
        // TODO: Implement PDF export
        Err(AppError::NotSupported("PDF export not yet implemented".to_string()))
    }

    async fn export_to_docx(&self, _note: &Note, _format: &ExportFormat) -> AppResult<Vec<u8>> {
        // TODO: Implement DOCX export
        Err(AppError::NotSupported("DOCX export not yet implemented".to_string()))
    }

    async fn export_to_html(&self, _note: &Note, _format: &ExportFormat) -> AppResult<Vec<u8>> {
        // TODO: Implement HTML export
        Err(AppError::NotSupported("HTML export not yet implemented".to_string()))
    }
} 