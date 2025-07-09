use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceAnnotation {
    pub id: String,
    pub note_id: String,
    pub audio_data: Vec<u8>,
    pub transcription: String,
    pub timestamp: DateTime<Utc>,
    pub duration: f64,
    pub metadata: VoiceMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceMetadata {
    pub sample_rate: u32,
    pub channels: u16,
    pub bit_depth: u16,
    pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteMetadata {
    pub word_count: usize,
    pub character_count: usize,
    pub reading_time_minutes: f64,
    pub last_accessed: Option<DateTime<Utc>>,
    pub access_count: u64,
    pub is_archived: bool,
    pub is_pinned: bool,
    pub encryption_level: EncryptionLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EncryptionLevel {
    None,
    Standard,
    High,
    Military,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub description: Option<String>,
    pub usage_count: u64,
    pub created_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub note: Note,
    pub relevance_score: f64,
    pub matched_terms: Vec<String>,
    pub snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportFormat {
    pub format: ExportType,
    pub include_metadata: bool,
    pub include_voice_annotations: bool,
    pub encryption: Option<EncryptionLevel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportType {
    Markdown,
    PDF,
    DOCX,
    TXT,
    HTML,
    JSON,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub synced_notes: usize,
    pub synced_annotations: usize,
    pub errors: Vec<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub last_sync: Option<DateTime<Utc>>,
    pub is_connected: bool,
    pub pending_changes: usize,
    pub sync_enabled: bool,
    pub cloud_storage_used: u64,
    pub cloud_storage_limit: Option<u64>,
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
pub struct UserPreferences {
    pub theme: Theme,
    pub language: String,
    pub auto_save_interval: u64,
    pub backup_frequency: BackupFrequency,
    pub ai_features_enabled: bool,
    pub sync_enabled: bool,
    pub encryption_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Theme {
    Light,
    Dark,
    System,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BackupFrequency {
    Never,
    Daily,
    Weekly,
    Monthly,
}

impl Note {
    pub fn new(title: String, content: String, tags: Vec<String>) -> Self {
        let now = Utc::now();
        let id = Uuid::new_v4().to_string();
        
        Self {
            id,
            title,
            content: content.clone(),
            tags,
            created_at: now,
            updated_at: now,
            voice_annotations: Vec::new(),
            metadata: NoteMetadata::new(&content),
        }
    }

    pub fn update_content(&mut self, content: String) {
        self.content = content.clone();
        self.updated_at = Utc::now();
        self.metadata = NoteMetadata::new(&content);
    }

    pub fn add_voice_annotation(&mut self, audio_data: Vec<u8>, transcription: String, duration: f64) {
        let annotation = VoiceAnnotation {
            id: Uuid::new_v4().to_string(),
            note_id: self.id.clone(),
            audio_data,
            transcription,
            timestamp: Utc::now(),
            duration,
            metadata: VoiceMetadata::default(),
        };
        self.voice_annotations.push(annotation);
        self.updated_at = Utc::now();
    }
}

impl NoteMetadata {
    pub fn new(content: &str) -> Self {
        let word_count = content.split_whitespace().count();
        let character_count = content.chars().count();
        let reading_time_minutes = (word_count as f64 / 200.0).max(0.1); // 200 WPM average

        Self {
            word_count,
            character_count,
            reading_time_minutes,
            last_accessed: None,
            access_count: 0,
            is_archived: false,
            is_pinned: false,
            encryption_level: EncryptionLevel::Standard,
        }
    }
}

impl VoiceMetadata {
    pub fn default() -> Self {
        Self {
            sample_rate: 44100,
            channels: 1,
            bit_depth: 16,
            format: "WAV".to_string(),
        }
    }
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

    pub fn increment_usage(&mut self) {
        self.usage_count += 1;
        self.last_used = Some(Utc::now());
    }
}

impl UserPreferences {
    pub fn default() -> Self {
        Self {
            theme: Theme::System,
            language: "en".to_string(),
            auto_save_interval: 30000, // 30 seconds
            backup_frequency: BackupFrequency::Weekly,
            ai_features_enabled: true,
            sync_enabled: false,
            encryption_enabled: true,
        }
    }
} 