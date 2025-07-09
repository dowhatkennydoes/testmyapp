use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

// Notebook structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notebook {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub color: String,
    pub order_index: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub sections: Vec<Section>,
    pub metadata: NotebookMetadata,
}

impl Notebook {
    pub fn new(title: String, description: Option<String>, color: Option<String>) -> Self {
        let now = Utc::now();
        
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            description,
            color: color.unwrap_or_else(|| "#3B82F6".to_string()),
            order_index: 0,
            created_at: now,
            updated_at: now,
            sections: Vec::new(),
            metadata: NotebookMetadata::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotebookMetadata {
    pub page_count: u32,
    pub section_count: u32,
    pub total_word_count: u32,
    pub last_accessed: Option<DateTime<Utc>>,
    pub is_pinned: bool,
}

impl Default for NotebookMetadata {
    fn default() -> Self {
        Self {
            page_count: 0,
            section_count: 0,
            total_word_count: 0,
            last_accessed: None,
            is_pinned: false,
        }
    }
}

// Section structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Section {
    pub id: String,
    pub notebook_id: String,
    pub title: String,
    pub color: String,
    pub order_index: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub pages: Vec<Page>,
}

impl Section {
    pub fn new(notebook_id: String, title: String, color: Option<String>) -> Self {
        let now = Utc::now();
        
        Self {
            id: Uuid::new_v4().to_string(),
            notebook_id,
            title,
            color: color.unwrap_or_else(|| "#3B82F6".to_string()),
            order_index: 0,
            created_at: now,
            updated_at: now,
            pages: Vec::new(),
        }
    }
}

// Page structure (enhanced Note)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Page {
    pub id: String,
    pub notebook_id: String,
    pub section_id: Option<String>,
    pub parent_page_id: Option<String>,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub order_index: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub voice_annotations: Vec<VoiceAnnotation>,
    pub media_attachments: Vec<MediaAttachment>,
    pub page_links: Vec<PageLink>,
    pub subpages: Vec<Page>,
    pub metadata: PageMetadata,
}

impl Page {
    pub fn new(
        notebook_id: String, 
        section_id: Option<String>, 
        parent_page_id: Option<String>, 
        title: String, 
        content: String, 
        tags: Vec<String>
    ) -> Self {
        let now = Utc::now();
        let word_count = content.split_whitespace().count() as u32;
        
        Self {
            id: Uuid::new_v4().to_string(),
            notebook_id,
            section_id,
            parent_page_id,
            title,
            content,
            tags,
            order_index: 0,
            created_at: now,
            updated_at: now,
            voice_annotations: Vec::new(),
            media_attachments: Vec::new(),
            page_links: Vec::new(),
            subpages: Vec::new(),
            metadata: PageMetadata {
                word_count,
                character_count: content.len() as u32,
                reading_time: (word_count / 200).max(1),
                version: 1,
                depth_level: if parent_page_id.is_some() { 1 } else { 0 },
            },
        }
    }

    pub fn update_content(&mut self, content: String) {
        self.content = content;
        self.updated_at = Utc::now();
        self.metadata.word_count = self.content.split_whitespace().count() as u32;
        self.metadata.character_count = self.content.len() as u32;
        self.metadata.reading_time = (self.metadata.word_count / 200).max(1);
        self.metadata.version += 1;
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageMetadata {
    pub word_count: u32,
    pub character_count: u32,
    pub reading_time: u32, // minutes
    pub version: u32,
    pub depth_level: u32,
}

// Media attachment structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaAttachment {
    pub id: String,
    pub page_id: Option<String>,
    pub note_id: Option<String>,
    pub filename: String,
    pub original_filename: String,
    pub mime_type: String,
    pub file_size: u64,
    pub file_data: Vec<u8>,
    pub thumbnail_data: Option<Vec<u8>>,
    pub position_in_content: Option<u32>,
    pub created_at: DateTime<Utc>,
    pub metadata: MediaMetadata,
}

impl MediaAttachment {
    pub fn new(
        page_id: Option<String>,
        note_id: Option<String>,
        original_filename: String,
        mime_type: String,
        file_data: Vec<u8>,
    ) -> Self {
        let filename = format!("{}_{}", Uuid::new_v4(), original_filename);
        
        Self {
            id: Uuid::new_v4().to_string(),
            page_id,
            note_id,
            filename,
            original_filename,
            mime_type,
            file_size: file_data.len() as u64,
            file_data,
            thumbnail_data: None,
            position_in_content: None,
            created_at: Utc::now(),
            metadata: MediaMetadata::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaMetadata {
    pub alt_text: Option<String>,
    pub caption: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub is_embedded: bool,
}

impl Default for MediaMetadata {
    fn default() -> Self {
        Self {
            alt_text: None,
            caption: None,
            width: None,
            height: None,
            is_embedded: true,
        }
    }
}

// Page link structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageLink {
    pub id: String,
    pub source_page_id: String,
    pub target_page_id: String,
    pub link_text: String,
    pub link_type: PageLinkType,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PageLinkType {
    Manual,      // User-created link
    Auto,        // AI-detected relationship
    Reference,   // Citation or reference
    Related,     // Suggested related content
}

impl PageLink {
    pub fn new(source_page_id: String, target_page_id: String, link_text: String, link_type: PageLinkType) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            source_page_id,
            target_page_id,
            link_text,
            link_type,
            created_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub voice_annotations: Vec<VoiceAnnotation>,
    pub metadata: NoteMetadata,
}

impl Note {
    pub fn new(title: String, content: String, tags: Vec<String>) -> Self {
        let now = Utc::now();
        let word_count = content.split_whitespace().count() as u32;
        
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            content,
            tags,
            created_at: now,
            updated_at: now,
            voice_annotations: Vec::new(),
            metadata: NoteMetadata {
                word_count,
                character_count: content.len() as u32,
                reading_time: (word_count / 200).max(1), // Assume 200 WPM reading speed
                version: 1,
            },
        }
    }

    pub fn update_content(&mut self, content: String) {
        self.content = content;
        self.updated_at = Utc::now();
        self.metadata.word_count = self.content.split_whitespace().count() as u32;
        self.metadata.character_count = self.content.len() as u32;
        self.metadata.reading_time = (self.metadata.word_count / 200).max(1);
        self.metadata.version += 1;
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteMetadata {
    pub word_count: u32,
    pub character_count: u32,
    pub reading_time: u32, // minutes
    pub version: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceAnnotation {
    pub id: String,
    pub note_id: String,
    pub audio_data: Vec<u8>,
    pub transcription: String,
    pub timestamp: DateTime<Utc>,
    pub duration: f64, // seconds
    pub metadata: VoiceMetadata,
}

impl VoiceAnnotation {
    pub fn new(note_id: String, audio_data: Vec<u8>, transcription: String, duration: f64) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            note_id,
            audio_data,
            transcription,
            timestamp: Utc::now(),
            duration,
            metadata: VoiceMetadata::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceMetadata {
    pub sample_rate: u32,
    pub channels: u32,
    pub format: String,
    pub quality: f32, // 0.0 to 1.0
}

impl Default for VoiceMetadata {
    fn default() -> Self {
        Self {
            sample_rate: 16000,
            channels: 1,
            format: "wav".to_string(),
            quality: 0.8,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub description: Option<String>,
    pub usage_count: u32,
    pub created_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
}

impl Tag {
    pub fn new(name: String, color: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            color,
            description: None,
            usage_count: 0,
            created_at: Utc::now(),
            last_used: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub note: Note,
    pub relevance_score: f64,
    pub matched_terms: Vec<String>,
    pub snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIProcessingResult {
    pub embeddings: Vec<f32>,
    pub suggested_tags: Vec<String>,
    pub sentiment_score: f64,
    pub key_entities: Vec<String>,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportFormat {
    pub format: ExportType,
    pub include_metadata: bool,
    pub include_voice_annotations: bool,
    pub include_tags: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportType {
    Markdown,
    PDF,
    HTML,
    JSON,
    TXT,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub database_path: std::path::PathBuf,
    pub encryption_enabled: bool,
    pub encryption_key_path: std::path::PathBuf,
    pub ai_models_path: std::path::PathBuf,
    pub backup_path: std::path::PathBuf,
    pub whisper_model: WhisperModel,
    pub embedding_model: EmbeddingModel,
    pub max_file_size: u64, // bytes
    pub auto_backup_interval: u64, // minutes
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WhisperModel {
    Tiny,
    Base,
    Small,
    Medium,
    Large,
}

impl WhisperModel {
    pub fn model_size(&self) -> u64 {
        match self {
            WhisperModel::Tiny => 39_000_000,     // ~39MB
            WhisperModel::Base => 74_000_000,     // ~74MB
            WhisperModel::Small => 244_000_000,   // ~244MB
            WhisperModel::Medium => 769_000_000,  // ~769MB
            WhisperModel::Large => 1_550_000_000, // ~1.55GB
        }
    }

    pub fn model_name(&self) -> &'static str {
        match self {
            WhisperModel::Tiny => "tiny",
            WhisperModel::Base => "base",
            WhisperModel::Small => "small",
            WhisperModel::Medium => "medium",
            WhisperModel::Large => "large",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EmbeddingModel {
    MiniLM,
    BGE,
    E5,
}

impl EmbeddingModel {
    pub fn model_name(&self) -> &'static str {
        match self {
            EmbeddingModel::MiniLM => "all-MiniLM-L6-v2",
            EmbeddingModel::BGE => "bge-small-en-v1.5",
            EmbeddingModel::E5 => "multilingual-e5-small",
        }
    }

    pub fn embedding_dimension(&self) -> usize {
        match self {
            EmbeddingModel::MiniLM => 384,
            EmbeddingModel::BGE => 384,
            EmbeddingModel::E5 => 384,
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        let data_dir = dirs::data_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap())
            .join("DeviseOS");

        Self {
            database_path: data_dir.join("notes.db"),
            encryption_enabled: true,
            encryption_key_path: data_dir.join("encryption.key"),
            ai_models_path: data_dir.join("models"),
            backup_path: data_dir.join("backups"),
            whisper_model: WhisperModel::Base,
            embedding_model: EmbeddingModel::MiniLM,
            max_file_size: 100 * 1024 * 1024, // 100MB
            auto_backup_interval: 60, // 1 hour
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub last_sync: Option<DateTime<Utc>>,
    pub is_connected: bool,
    pub pending_changes: usize,
    pub sync_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub path: std::path::PathBuf,
    pub created_at: DateTime<Utc>,
    pub size: u64,
    pub notes_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppStats {
    pub total_notes: u32,
    pub total_voice_annotations: u32,
    pub total_tags: u32,
    pub database_size: u64,
    pub oldest_note: Option<DateTime<Utc>>,
    pub newest_note: Option<DateTime<Utc>>,
    pub most_used_tags: Vec<(String, u32)>,
}

// Request/Response types for Tauri commands
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNoteRequest {
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNoteRequest {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceAnnotationRequest {
    pub note_id: String,
    pub audio_data: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportRequest {
    pub note_id: String,
    pub format: ExportFormat,
}

// New request/response types for notebook operations
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNotebookRequest {
    pub title: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNotebookRequest {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub order_index: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSectionRequest {
    pub notebook_id: String,
    pub title: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSectionRequest {
    pub id: String,
    pub title: Option<String>,
    pub color: Option<String>,
    pub order_index: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePageRequest {
    pub notebook_id: String,
    pub section_id: Option<String>,
    pub parent_page_id: Option<String>,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePageRequest {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
    pub order_index: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MovePageRequest {
    pub page_id: String,
    pub new_notebook_id: Option<String>,
    pub new_section_id: Option<String>,
    pub new_parent_page_id: Option<String>,
    pub new_order_index: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReorderItemsRequest {
    pub items: Vec<ReorderItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReorderItem {
    pub id: String,
    pub new_order_index: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadMediaRequest {
    pub page_id: Option<String>,
    pub note_id: Option<String>,
    pub filename: String,
    pub mime_type: String,
    pub file_data: Vec<u8>,
    pub position_in_content: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePageLinkRequest {
    pub source_page_id: String,
    pub target_page_id: String,
    pub link_text: String,
    pub link_type: PageLinkType,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotebookSearchRequest {
    pub notebook_id: String,
    pub query: String,
    pub include_sections: Option<Vec<String>>,
    pub limit: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotebookExportRequest {
    pub notebook_id: String,
    pub format: ExportFormat,
    pub include_all_sections: bool,
    pub section_ids: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotebookHierarchy {
    pub notebook: Notebook,
    pub sections: Vec<SectionWithPages>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SectionWithPages {
    pub section: Section,
    pub pages: Vec<PageWithSubpages>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PageWithSubpages {
    pub page: Page,
    pub subpages: Vec<PageWithSubpages>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotebookStats {
    pub notebook_id: String,
    pub total_pages: u32,
    pub total_sections: u32,
    pub total_words: u32,
    pub total_media: u32,
    pub last_activity: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PageRelationships {
    pub page_id: String,
    pub outgoing_links: Vec<PageLink>,
    pub incoming_links: Vec<PageLink>,
    pub related_pages: Vec<Page>,
    pub parent_page: Option<Page>,
    pub child_pages: Vec<Page>,
}