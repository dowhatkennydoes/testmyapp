use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Encryption error: {0}")]
    Encryption(String),
    
    #[error("AI processing error: {0}")]
    AIProcessing(String),
    
    #[error("File I/O error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Invalid format: {0}")]
    InvalidFormat(String),
    
    #[error("Invalid audio format: {0}")]
    InvalidAudioFormat(String),
    
    #[error("Configuration error: {0}")]
    Configuration(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Network error: {0}")]
    Network(String),
    
    #[error("Model not found: {0}")]
    ModelNotFound(String),
    
    #[error("Invalid operation: {0}")]
    InvalidOperation(String),
    
    #[error("Timeout: {0}")]
    Timeout(String),
    
    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}

// Tauri error handling
impl From<AppError> for tauri::Error {
    fn from(error: AppError) -> Self {
        tauri::Error::FailedToExecuteApi(error.into())
    }
}

pub type AppResult<T> = Result<T, AppError>;