// DeviseOS - Privacy-first, AI-powered desktop platform
// Local-first architecture with optional cloud sync

pub mod models;
pub mod storage;
pub mod ai;
pub mod sync;
pub mod encryption;
pub mod errors;
pub mod config;

use tauri::State;
use std::sync::Arc;
use tokio::sync::RwLock;

// Re-export main types for easier access
pub use models::*;
pub use storage::*;
pub use ai::*;
pub use sync::*;
pub use encryption::*;
pub use errors::*;
pub use config::*;

// Global application state
pub struct AppState {
    pub storage: Arc<RwLock<StorageManager>>,
    pub ai_service: Arc<RwLock<AIService>>,
    pub sync_service: Arc<RwLock<SyncService>>,
    pub config: Arc<RwLock<AppConfig>>,
}

impl AppState {
    pub async fn new() -> Result<Self, AppError> {
        let config = Arc::new(RwLock::new(AppConfig::load().await?));
        let storage = Arc::new(RwLock::new(StorageManager::new(&config.read().await).await?));
        let ai_service = Arc::new(RwLock::new(AIService::new(&config.read().await).await?));
        let sync_service = Arc::new(RwLock::new(SyncService::new(&config.read().await).await?));
        
        Ok(Self {
            storage,
            ai_service,
            sync_service,
            config,
        })
    }
}

// Tauri command handlers
#[tauri::command]
pub async fn create_note(
    state: State<'_, AppState>,
    title: String,
    content: String,
    tags: Vec<String>,
) -> Result<Note, AppError> {
    let mut storage = state.storage.write().await;
    storage.create_note(title, content, tags).await
}

#[tauri::command]
pub async fn get_notes(
    state: State<'_, AppState>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<Note>, AppError> {
    let storage = state.storage.read().await;
    storage.get_notes(limit, offset).await
}

#[tauri::command]
pub async fn update_note(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    content: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Note, AppError> {
    let mut storage = state.storage.write().await;
    storage.update_note(id, title, content, tags).await
}

#[tauri::command]
pub async fn delete_note(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    let mut storage = state.storage.write().await;
    storage.delete_note(id).await
}

#[tauri::command]
pub async fn search_notes(
    state: State<'_, AppState>,
    query: String,
    semantic: bool,
) -> Result<Vec<SearchResult>, AppError> {
    let storage = state.storage.read().await;
    let ai_service = state.ai_service.read().await;
    
    if semantic {
        ai_service.semantic_search(&storage, &query).await
    } else {
        storage.text_search(&query).await
    }
}

#[tauri::command]
pub async fn transcribe_audio(
    state: State<'_, AppState>,
    audio_data: Vec<u8>,
) -> Result<String, AppError> {
    let ai_service = state.ai_service.read().await;
    ai_service.transcribe_audio(audio_data).await
}

#[tauri::command]
pub async fn generate_embeddings(
    state: State<'_, AppState>,
    text: String,
) -> Result<Vec<f32>, AppError> {
    let ai_service = state.ai_service.read().await;
    ai_service.generate_embeddings(&text).await
}

#[tauri::command]
pub async fn suggest_tags(
    state: State<'_, AppState>,
    content: String,
) -> Result<Vec<String>, AppError> {
    let ai_service = state.ai_service.read().await;
    ai_service.suggest_tags(&content).await
}

#[tauri::command]
pub async fn export_note(
    state: State<'_, AppState>,
    id: String,
    format: ExportFormat,
) -> Result<Vec<u8>, AppError> {
    let storage = state.storage.read().await;
    storage.export_note(id, format).await
}

#[tauri::command]
pub async fn sync_to_cloud(
    state: State<'_, AppState>,
) -> Result<SyncResult, AppError> {
    let sync_service = state.sync_service.write().await;
    sync_service.sync_to_cloud().await
}

#[tauri::command]
pub async fn sync_from_cloud(
    state: State<'_, AppState>,
) -> Result<SyncResult, AppError> {
    let sync_service = state.sync_service.write().await;
    sync_service.sync_from_cloud().await
}

#[tauri::command]
pub async fn get_sync_status(
    state: State<'_, AppState>,
) -> Result<SyncStatus, AppError> {
    let sync_service = state.sync_service.read().await;
    sync_service.get_status().await
}
