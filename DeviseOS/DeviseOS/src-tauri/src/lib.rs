use std::sync::Arc;
use std::path::PathBuf;
use tauri::{Manager, State};
use tokio::sync::RwLock;

mod database;
mod models;
mod encryption;
mod ai;
mod errors;

use database::Database;
use ai::AIService;
use encryption::EncryptionManager;
use errors::{AppError, AppResult};
use models::*;

pub struct AppState {
    pub database: Arc<RwLock<Database>>,
    pub ai_service: Arc<RwLock<AIService>>,
    pub config: AppConfig,
}

impl AppState {
    pub async fn new() -> AppResult<Self> {
        let config = AppConfig::default();
        
        // Ensure data directory exists
        if let Some(parent) = config.database_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        // Initialize encryption if enabled
        let encryption_manager = if config.encryption_enabled {
            if !config.encryption_key_path.exists() {
                // Generate new encryption key
                let master_password = "default_password"; // In production, get from user
                EncryptionManager::generate_key_file(&config.encryption_key_path, master_password)?;
            }
            Some(EncryptionManager::from_key_file(&config.encryption_key_path)?)
        } else {
            None
        };
        
        // Initialize database
        let database = Database::new(&config.database_path, encryption_manager).await?;
        
        // Initialize AI service
        let ai_service = AIService::new()?;
        
        Ok(Self {
            database: Arc::new(RwLock::new(database)),
            ai_service: Arc::new(RwLock::new(ai_service)),
            config,
        })
    }
}

// Tauri commands
#[tauri::command]
async fn create_note(
    state: State<'_, AppState>,
    request: CreateNoteRequest,
) -> Result<Note, String> {
    let database = state.database.read().await;
    let note = database.create_note(request.title, request.content, request.tags).await?;
    
    // Generate embeddings for the note
    let ai_service = state.ai_service.read().await;
    if ai_service.is_embedding_available() {
        if let Ok(embeddings) = ai_service.generate_embeddings(&note.content).await {
            let _ = database.store_embedding(&note.id, &embeddings).await;
        }
    }
    
    Ok(note)
}

#[tauri::command]
async fn get_notes(
    state: State<'_, AppState>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<Note>, String> {
    let database = state.database.read().await;
    let notes = database.get_notes(limit, offset).await?;
    Ok(notes)
}

#[tauri::command]
async fn get_note(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Note>, String> {
    let database = state.database.read().await;
    let note = database.get_note(&id).await?;
    Ok(note)
}

#[tauri::command]
async fn update_note(
    state: State<'_, AppState>,
    request: UpdateNoteRequest,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.update_note(&request.id, request.title, request.content.clone(), request.tags).await?;
    
    // Update embeddings if content changed
    if let Some(content) = request.content {
        let ai_service = state.ai_service.read().await;
        if ai_service.is_embedding_available() {
            if let Ok(embeddings) = ai_service.generate_embeddings(&content).await {
                let _ = database.store_embedding(&request.id, &embeddings).await;
            }
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn delete_note(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.delete_note(&id).await?;
    Ok(())
}

#[tauri::command]
async fn search_notes(
    state: State<'_, AppState>,
    request: SearchRequest,
) -> Result<Vec<Note>, String> {
    let database = state.database.read().await;
    let notes = database.search_notes(&request.query).await?;
    Ok(notes)
}

#[tauri::command]
async fn semantic_search(
    state: State<'_, AppState>,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    let database = state.database.read().await;
    let ai_service = state.ai_service.read().await;
    
    if !ai_service.is_embedding_available() {
        return Err("Embedding model not available".to_string());
    }
    
    let results = ai_service.semantic_search(&*database, &query, limit.unwrap_or(10)).await?;
    Ok(results)
}

#[tauri::command]
async fn transcribe_audio(
    state: State<'_, AppState>,
    audio_data: Vec<u8>,
) -> Result<String, String> {
    let ai_service = state.ai_service.read().await;
    
    if !ai_service.is_whisper_available() {
        return Err("Whisper model not available".to_string());
    }
    
    let transcription = ai_service.transcribe_audio(&audio_data).await?;
    Ok(transcription)
}

#[tauri::command]
async fn add_voice_annotation(
    state: State<'_, AppState>,
    request: VoiceAnnotationRequest,
) -> Result<VoiceAnnotation, String> {
    let ai_service = state.ai_service.read().await;
    
    // Transcribe audio
    let transcription = if ai_service.is_whisper_available() {
        ai_service.transcribe_audio(&request.audio_data).await?
    } else {
        "Audio transcription not available".to_string()
    };
    
    // Calculate duration (simplified)
    let duration = request.audio_data.len() as f64 / 32000.0; // Assume 16kHz mono
    
    // Store voice annotation
    let database = state.database.read().await;
    let annotation = database.add_voice_annotation(
        &request.note_id,
        request.audio_data,
        transcription,
        duration,
    ).await?;
    
    Ok(annotation)
}

#[tauri::command]
async fn suggest_tags(
    state: State<'_, AppState>,
    content: String,
) -> Result<Vec<String>, String> {
    let ai_service = state.ai_service.read().await;
    let suggestions = ai_service.suggest_tags(&content).await?;
    Ok(suggestions)
}

#[tauri::command]
async fn get_tags(
    state: State<'_, AppState>,
) -> Result<Vec<Tag>, String> {
    let database = state.database.read().await;
    let tags = database.get_tags().await?;
    Ok(tags)
}

#[tauri::command]
async fn analyze_sentiment(
    state: State<'_, AppState>,
    content: String,
) -> Result<f64, String> {
    let ai_service = state.ai_service.read().await;
    let sentiment = ai_service.analyze_sentiment(&content).await?;
    Ok(sentiment)
}

#[tauri::command]
async fn extract_entities(
    state: State<'_, AppState>,
    content: String,
) -> Result<Vec<String>, String> {
    let ai_service = state.ai_service.read().await;
    let entities = ai_service.extract_entities(&content).await?;
    Ok(entities)
}

#[tauri::command]
async fn generate_summary(
    state: State<'_, AppState>,
    content: String,
) -> Result<Option<String>, String> {
    let ai_service = state.ai_service.read().await;
    let summary = ai_service.generate_summary(&content).await?;
    Ok(summary)
}

#[tauri::command]
async fn process_note_ai(
    state: State<'_, AppState>,
    content: String,
) -> Result<AIProcessingResult, String> {
    let ai_service = state.ai_service.read().await;
    let result = ai_service.process_note(&content).await?;
    Ok(result)
}

#[tauri::command]
async fn get_app_config(
    state: State<'_, AppState>,
) -> Result<AppConfig, String> {
    Ok(state.config.clone())
}

#[tauri::command]
async fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.set_setting(&key, &value).await?;
    Ok(())
}

#[tauri::command]
async fn get_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<String>, String> {
    let database = state.database.read().await;
    let value = database.get_setting(&key).await?;
    Ok(value)
}

#[tauri::command]
async fn initialize_ai_models(
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut ai_service = state.ai_service.write().await;
    
    // Initialize Whisper model
    ai_service.initialize_whisper(
        state.config.whisper_model.clone(),
        &state.config.ai_models_path,
    ).await?;
    
    // Initialize embedding model
    ai_service.initialize_embedding_model(
        state.config.embedding_model.clone(),
        &state.config.ai_models_path,
    ).await?;
    
    Ok(())
}

#[tauri::command]
async fn get_ai_status(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let ai_service = state.ai_service.read().await;
    
    Ok(serde_json::json!({
        "whisper_available": ai_service.is_whisper_available(),
        "embedding_available": ai_service.is_embedding_available(),
        "whisper_model": ai_service.get_whisper_model(),
        "embedding_model": ai_service.get_embedding_model(),
    }))
}

// Notebook Management Commands

#[tauri::command]
async fn create_notebook(
    state: State<'_, AppState>,
    request: CreateNotebookRequest,
) -> Result<Notebook, String> {
    let database = state.database.read().await;
    let notebook = database.create_notebook(request).await?;
    Ok(notebook)
}

#[tauri::command]
async fn get_notebooks(
    state: State<'_, AppState>,
) -> Result<Vec<Notebook>, String> {
    let database = state.database.read().await;
    let notebooks = database.get_notebooks().await?;
    Ok(notebooks)
}

#[tauri::command]
async fn get_notebook(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Notebook>, String> {
    let database = state.database.read().await;
    let notebook = database.get_notebook(&id).await?;
    Ok(notebook)
}

#[tauri::command]
async fn update_notebook(
    state: State<'_, AppState>,
    request: UpdateNotebookRequest,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.update_notebook(request).await?;
    Ok(())
}

#[tauri::command]
async fn delete_notebook(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.delete_notebook(&id).await?;
    Ok(())
}

#[tauri::command]
async fn get_notebook_hierarchy(
    state: State<'_, AppState>,
    id: String,
) -> Result<NotebookHierarchy, String> {
    let database = state.database.read().await;
    let hierarchy = database.get_notebook_hierarchy(&id).await?;
    Ok(hierarchy)
}

// Section Management Commands

#[tauri::command]
async fn create_section(
    state: State<'_, AppState>,
    request: CreateSectionRequest,
) -> Result<Section, String> {
    let database = state.database.read().await;
    let section = database.create_section(request).await?;
    Ok(section)
}

#[tauri::command]
async fn get_sections(
    state: State<'_, AppState>,
    notebook_id: String,
) -> Result<Vec<Section>, String> {
    let database = state.database.read().await;
    let sections = database.get_sections(&notebook_id).await?;
    Ok(sections)
}

#[tauri::command]
async fn get_section(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Section>, String> {
    let database = state.database.read().await;
    let section = database.get_section(&id).await?;
    Ok(section)
}

#[tauri::command]
async fn update_section(
    state: State<'_, AppState>,
    request: UpdateSectionRequest,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.update_section(request).await?;
    Ok(())
}

#[tauri::command]
async fn delete_section(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.delete_section(&id).await?;
    Ok(())
}

// Page Management Commands

#[tauri::command]
async fn create_page(
    state: State<'_, AppState>,
    request: CreatePageRequest,
) -> Result<Page, String> {
    let database = state.database.read().await;
    let page = database.create_page(request).await?;
    
    // Generate embeddings for the page content
    let ai_service = state.ai_service.read().await;
    if ai_service.is_embedding_available() {
        if let Ok(embeddings) = ai_service.generate_embeddings(&page.content).await {
            let _ = database.store_embedding(&page.id, &embeddings).await;
        }
    }
    
    Ok(page)
}

#[tauri::command]
async fn get_pages(
    state: State<'_, AppState>,
    notebook_id: String,
    section_id: Option<String>,
) -> Result<Vec<Page>, String> {
    let database = state.database.read().await;
    let pages = database.get_pages(&notebook_id, section_id.as_deref()).await?;
    Ok(pages)
}

#[tauri::command]
async fn get_page(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Page>, String> {
    let database = state.database.read().await;
    let page = database.get_page(&id).await?;
    Ok(page)
}

#[tauri::command]
async fn update_page(
    state: State<'_, AppState>,
    request: UpdatePageRequest,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.update_page(request.clone()).await?;
    
    // Update embeddings if content changed
    if let Some(content) = request.content {
        let ai_service = state.ai_service.read().await;
        if ai_service.is_embedding_available() {
            if let Ok(embeddings) = ai_service.generate_embeddings(&content).await {
                let _ = database.store_embedding(&request.id, &embeddings).await;
            }
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn delete_page(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.delete_page(&id).await?;
    Ok(())
}

#[tauri::command]
async fn move_page(
    state: State<'_, AppState>,
    request: MovePageRequest,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.move_page(request).await?;
    Ok(())
}

#[tauri::command]
async fn get_page_with_subpages(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<PageWithSubpages>, String> {
    let database = state.database.read().await;
    let page_with_subpages = database.get_page_with_subpages(&id).await?;
    Ok(page_with_subpages)
}

// Media Management Commands

#[tauri::command]
async fn upload_media(
    state: State<'_, AppState>,
    request: UploadMediaRequest,
) -> Result<MediaAttachment, String> {
    let database = state.database.read().await;
    let media = database.upload_media(request).await?;
    Ok(media)
}

#[tauri::command]
async fn get_media_attachments(
    state: State<'_, AppState>,
    page_id: Option<String>,
    note_id: Option<String>,
) -> Result<Vec<MediaAttachment>, String> {
    let database = state.database.read().await;
    let attachments = database.get_media_attachments(page_id.as_deref(), note_id.as_deref()).await?;
    Ok(attachments)
}

#[tauri::command]
async fn delete_media(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.delete_media(&id).await?;
    Ok(())
}

// Page Link Management Commands

#[tauri::command]
async fn create_page_link(
    state: State<'_, AppState>,
    request: CreatePageLinkRequest,
) -> Result<PageLink, String> {
    let database = state.database.read().await;
    let link = database.create_page_link(request).await?;
    Ok(link)
}

#[tauri::command]
async fn get_page_links(
    state: State<'_, AppState>,
    page_id: String,
) -> Result<Vec<PageLink>, String> {
    let database = state.database.read().await;
    let links = database.get_page_links(&page_id).await?;
    Ok(links)
}

#[tauri::command]
async fn delete_page_link(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.delete_page_link(&id).await?;
    Ok(())
}

#[tauri::command]
async fn get_page_relationships(
    state: State<'_, AppState>,
    page_id: String,
) -> Result<PageRelationships, String> {
    let database = state.database.read().await;
    let relationships = database.get_page_relationships(&page_id).await?;
    Ok(relationships)
}

// Notebook Search and Stats Commands

#[tauri::command]
async fn search_notebook(
    state: State<'_, AppState>,
    request: NotebookSearchRequest,
) -> Result<Vec<Page>, String> {
    let database = state.database.read().await;
    let pages = database.search_notebook(request).await?;
    Ok(pages)
}

#[tauri::command]
async fn get_notebook_stats(
    state: State<'_, AppState>,
    notebook_id: String,
) -> Result<NotebookStats, String> {
    let database = state.database.read().await;
    let stats = database.get_notebook_stats(&notebook_id).await?;
    Ok(stats)
}

// Reordering Commands

#[tauri::command]
async fn reorder_notebooks(
    state: State<'_, AppState>,
    request: ReorderItemsRequest,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.reorder_notebooks(request).await?;
    Ok(())
}

#[tauri::command]
async fn reorder_sections(
    state: State<'_, AppState>,
    request: ReorderItemsRequest,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.reorder_sections(request).await?;
    Ok(())
}

#[tauri::command]
async fn reorder_pages(
    state: State<'_, AppState>,
    request: ReorderItemsRequest,
) -> Result<(), String> {
    let database = state.database.read().await;
    database.reorder_pages(request).await?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle();
            
            tauri::async_runtime::spawn(async move {
                match AppState::new().await {
                    Ok(state) => {
                        app_handle.manage(state);
                        tracing::info!("DeviseOS initialized successfully");
                    }
                    Err(e) => {
                        tracing::error!("Failed to initialize DeviseOS: {}", e);
                        std::process::exit(1);
                    }
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_note,
            get_notes,
            get_note,
            update_note,
            delete_note,
            search_notes,
            semantic_search,
            transcribe_audio,
            add_voice_annotation,
            suggest_tags,
            get_tags,
            analyze_sentiment,
            extract_entities,
            generate_summary,
            process_note_ai,
            get_app_config,
            set_setting,
            get_setting,
            initialize_ai_models,
            get_ai_status,
            // Notebook Management
            create_notebook,
            get_notebooks,
            get_notebook,
            update_notebook,
            delete_notebook,
            get_notebook_hierarchy,
            // Section Management
            create_section,
            get_sections,
            get_section,
            update_section,
            delete_section,
            // Page Management
            create_page,
            get_pages,
            get_page,
            update_page,
            delete_page,
            move_page,
            get_page_with_subpages,
            // Media Management
            upload_media,
            get_media_attachments,
            delete_media,
            // Page Link Management
            create_page_link,
            get_page_links,
            delete_page_link,
            get_page_relationships,
            // Notebook Search and Stats
            search_notebook,
            get_notebook_stats,
            // Reordering
            reorder_notebooks,
            reorder_sections,
            reorder_pages,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}