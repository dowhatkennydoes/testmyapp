// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use deviseos_lib::*;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize app state
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
            update_note,
            delete_note,
            search_notes,
            transcribe_audio,
            generate_embeddings,
            suggest_tags,
            export_note,
            sync_to_cloud,
            sync_from_cloud,
            get_sync_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
