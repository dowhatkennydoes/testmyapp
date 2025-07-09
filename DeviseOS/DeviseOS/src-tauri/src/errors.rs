use thiserror::Error;
use std::io;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("SQLx error: {0}")]
    Sqlx(#[from] sqlx::Error),

    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("AI processing error: {0}")]
    AIProcessing(String),

    #[error("Sync error: {0}")]
    Sync(String),

    #[error("Note not found: {id}")]
    NoteNotFound { id: String },

    #[error("Tag not found: {name}")]
    TagNotFound { name: String },

    #[error("Invalid audio format: {0}")]
    InvalidAudioFormat(String),

    #[error("Transcription failed: {0}")]
    TranscriptionFailed(String),

    #[error("Embedding generation failed: {0}")]
    EmbeddingFailed(String),

    #[error("Export failed: {0}")]
    ExportFailed(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Network error: {0}")]
    Network(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Operation not supported: {0}")]
    NotSupported(String),

    #[error("Rate limit exceeded: {0}")]
    RateLimitExceeded(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl AppError {
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            AppError::Network(_) | AppError::Database(_) | AppError::Sqlx(_)
        )
    }

    pub fn is_user_error(&self) -> bool {
        matches!(
            self,
            AppError::Validation(_) | AppError::NoteNotFound { .. } | AppError::TagNotFound { .. }
        )
    }

    pub fn is_critical(&self) -> bool {
        matches!(
            self,
            AppError::Encryption(_) | AppError::Storage(_) | AppError::Internal(_)
        )
    }
}

pub type AppResult<T> = Result<T, AppError>;

// Helper functions for common error patterns
pub fn db_error<E: std::error::Error>(error: E) -> AppError {
    AppError::Database(rusqlite::Error::InvalidPath(error.to_string()))
}

pub fn ai_error(message: &str) -> AppError {
    AppError::AIProcessing(message.to_string())
}

pub fn sync_error(message: &str) -> AppError {
    AppError::Sync(message.to_string())
}

pub fn validation_error(message: &str) -> AppError {
    AppError::Validation(message.to_string())
}

pub fn not_found_error(resource: &str, id: &str) -> AppError {
    AppError::NotFound(format!("{} with id {} not found", resource, id))
} 