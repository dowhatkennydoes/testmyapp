use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use crate::{AppError, AppResult, AppConfig, StorageManager, Note, SyncResult, SyncStatus};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncService {
    config: AppConfig,
    client: Option<reqwest::Client>,
    last_sync: Option<DateTime<Utc>>,
    pending_changes: Vec<SyncChange>,
    sync_version: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncChange {
    pub id: String,
    pub change_type: ChangeType,
    pub entity_type: EntityType,
    pub entity_id: String,
    pub data: String, // JSON serialized data
    pub timestamp: DateTime<Utc>,
    pub version: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChangeType {
    Create,
    Update,
    Delete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EntityType {
    Note,
    VoiceAnnotation,
    Tag,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    pub client_id: String,
    pub sync_version: u64,
    pub changes: Vec<SyncChange>,
    pub last_sync: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResponse {
    pub success: bool,
    pub server_version: u64,
    pub changes: Vec<SyncChange>,
    pub conflicts: Vec<SyncConflict>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConflict {
    pub entity_id: String,
    pub entity_type: EntityType,
    pub local_version: u64,
    pub server_version: u64,
    pub local_data: String,
    pub server_data: String,
}

impl SyncService {
    pub async fn new(config: &AppConfig) -> AppResult<Self> {
        let client = if config.sync_config.enabled {
            Some(reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .map_err(|e| AppError::Sync(format!("Failed to create HTTP client: {}", e)))?)
        } else {
            None
        };

        Ok(Self {
            config: config.clone(),
            client,
            last_sync: None,
            pending_changes: Vec::new(),
            sync_version: 0,
        })
    }

    pub async fn sync_to_cloud(&mut self) -> AppResult<SyncResult> {
        if !self.config.sync_config.enabled {
            return Ok(SyncResult {
                success: false,
                synced_notes: 0,
                synced_annotations: 0,
                errors: vec!["Sync is disabled".to_string()],
                timestamp: Utc::now(),
            });
        }

        let client = self.client.as_ref()
            .ok_or_else(|| AppError::Sync("HTTP client not available".to_string()))?;

        let endpoint = self.config.sync_config.endpoint.as_ref()
            .ok_or_else(|| AppError::Sync("Sync endpoint not configured".to_string()))?;

        let request = SyncRequest {
            client_id: self.generate_client_id(),
            sync_version: self.sync_version,
            changes: self.pending_changes.clone(),
            last_sync: self.last_sync,
        };

        let response = client.post(endpoint)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", 
                self.config.sync_config.api_key.as_ref().unwrap_or(&"".to_string())))
            .json(&request)
            .send()
            .await
            .map_err(|e| AppError::Sync(format!("Network error: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::Sync(format!("Server error: {}", response.status())));
        }

        let sync_response: SyncResponse = response.json().await
            .map_err(|e| AppError::Sync(format!("Failed to parse response: {}", e)))?;

        if !sync_response.success {
            return Err(AppError::Sync(sync_response.error.unwrap_or_else(|| "Unknown sync error".to_string())));
        }

        // Handle conflicts
        for conflict in sync_response.conflicts {
            self.resolve_conflict(conflict).await?;
        }

        // Update local state
        self.sync_version = sync_response.server_version;
        self.last_sync = Some(Utc::now());
        self.pending_changes.clear();

        Ok(SyncResult {
            success: true,
            synced_notes: self.count_notes_in_changes(&self.pending_changes),
            synced_annotations: self.count_annotations_in_changes(&self.pending_changes),
            errors: Vec::new(),
            timestamp: Utc::now(),
        })
    }

    pub async fn sync_from_cloud(&mut self) -> AppResult<SyncResult> {
        if !self.config.sync_config.enabled {
            return Ok(SyncResult {
                success: false,
                synced_notes: 0,
                synced_annotations: 0,
                errors: vec!["Sync is disabled".to_string()],
                timestamp: Utc::now(),
            });
        }

        let client = self.client.as_ref()
            .ok_or_else(|| AppError::Sync("HTTP client not available".to_string()))?;

        let endpoint = self.config.sync_config.endpoint.as_ref()
            .ok_or_else(|| AppError::Sync("Sync endpoint not configured".to_string()))?;

        let request = SyncRequest {
            client_id: self.generate_client_id(),
            sync_version: self.sync_version,
            changes: Vec::new(), // We're only pulling changes
            last_sync: self.last_sync,
        };

        let response = client.get(endpoint)
            .header("Authorization", format!("Bearer {}", 
                self.config.sync_config.api_key.as_ref().unwrap_or(&"".to_string())))
            .query(&[("last_sync", self.last_sync.map(|dt| dt.to_rfc3339()).unwrap_or_default())])
            .send()
            .await
            .map_err(|e| AppError::Sync(format!("Network error: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::Sync(format!("Server error: {}", response.status())));
        }

        let sync_response: SyncResponse = response.json().await
            .map_err(|e| AppError::Sync(format!("Failed to parse response: {}", e)))?;

        if !sync_response.success {
            return Err(AppError::Sync(sync_response.error.unwrap_or_else(|| "Unknown sync error".to_string())));
        }

        // Apply incoming changes
        let mut synced_notes = 0;
        let mut synced_annotations = 0;

        for change in sync_response.changes {
            match change.entity_type {
                EntityType::Note => {
                    // TODO: Apply note changes to local storage
                    synced_notes += 1;
                }
                EntityType::VoiceAnnotation => {
                    // TODO: Apply voice annotation changes to local storage
                    synced_annotations += 1;
                }
                EntityType::Tag => {
                    // TODO: Apply tag changes to local storage
                }
            }
        }

        // Update local state
        self.sync_version = sync_response.server_version;
        self.last_sync = Some(Utc::now());

        Ok(SyncResult {
            success: true,
            synced_notes,
            synced_annotations,
            errors: Vec::new(),
            timestamp: Utc::now(),
        })
    }

    pub async fn get_status(&self) -> AppResult<SyncStatus> {
        let is_connected = if let Some(client) = &self.client {
            if let Some(endpoint) = &self.config.sync_config.endpoint {
                // Simple connectivity check
                client.get(endpoint)
                    .timeout(std::time::Duration::from_secs(5))
                    .send()
                    .await
                    .is_ok()
            } else {
                false
            }
        } else {
            false
        };

        Ok(SyncStatus {
            last_sync: self.last_sync,
            is_connected,
            pending_changes: self.pending_changes.len(),
            sync_enabled: self.config.sync_config.enabled,
            cloud_storage_used: 0, // TODO: Implement storage usage tracking
            cloud_storage_limit: None, // TODO: Get from server
        })
    }

    pub fn add_change(&mut self, change_type: ChangeType, entity_type: EntityType, entity_id: String, data: String) {
        let change = SyncChange {
            id: uuid::Uuid::new_v4().to_string(),
            change_type,
            entity_type,
            entity_id,
            data,
            timestamp: Utc::now(),
            version: self.sync_version + 1,
        };

        self.pending_changes.push(change);
        self.sync_version += 1;
    }

    async fn resolve_conflict(&mut self, conflict: SyncConflict) -> AppResult<()> {
        // Simple conflict resolution: use the most recent change
        let local_timestamp = serde_json::from_str::<serde_json::Value>(&conflict.local_data)
            .and_then(|v| v.get("updated_at").and_then(|t| t.as_str()))
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .unwrap_or_else(|| Utc::now());

        let server_timestamp = serde_json::from_str::<serde_json::Value>(&conflict.server_data)
            .and_then(|v| v.get("updated_at").and_then(|t| t.as_str()))
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .unwrap_or_else(|| Utc::now());

        if local_timestamp > server_timestamp {
            // Keep local version, will be synced in next sync
            tracing::info!("Resolved conflict for {}: keeping local version", conflict.entity_id);
        } else {
            // Use server version
            tracing::info!("Resolved conflict for {}: using server version", conflict.entity_id);
            // TODO: Apply server data to local storage
        }

        Ok(())
    }

    fn generate_client_id(&self) -> String {
        // Generate a stable client ID based on machine characteristics
        let hostname = hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string());
        
        let username = std::env::var("USER")
            .unwrap_or_else(|_| "unknown".to_string());
        
        format!("{}-{}", hostname, username)
    }

    fn count_notes_in_changes(&self, changes: &[SyncChange]) -> usize {
        changes.iter()
            .filter(|change| matches!(change.entity_type, EntityType::Note))
            .count()
    }

    fn count_annotations_in_changes(&self, changes: &[SyncChange]) -> usize {
        changes.iter()
            .filter(|change| matches!(change.entity_type, EntityType::VoiceAnnotation))
            .count()
    }

    pub fn is_enabled(&self) -> bool {
        self.config.sync_config.enabled
    }

    pub fn get_pending_changes_count(&self) -> usize {
        self.pending_changes.len()
    }

    pub fn clear_pending_changes(&mut self) {
        self.pending_changes.clear();
    }

    pub async fn backup_to_local(&self, storage: &StorageManager) -> AppResult<()> {
        let backup_path = self.config.backup_dir.join(format!(
            "backup_{}.json",
            Utc::now().format("%Y%m%d_%H%M%S")
        ));

        // Get all notes
        let notes = storage.get_notes(None, None).await?;
        
        // Serialize to JSON
        let backup_data = serde_json::to_string_pretty(&notes)
            .map_err(|e| AppError::Sync(format!("Failed to serialize backup: {}", e)))?;

        // Write to file
        std::fs::write(&backup_path, backup_data)
            .map_err(|e| AppError::Sync(format!("Failed to write backup: {}", e)))?;

        tracing::info!("Backup created at: {:?}", backup_path);
        Ok(())
    }

    pub async fn restore_from_backup(&self, backup_path: &std::path::Path, storage: &mut StorageManager) -> AppResult<()> {
        let backup_data = std::fs::read_to_string(backup_path)
            .map_err(|e| AppError::Sync(format!("Failed to read backup: {}", e)))?;

        let notes: Vec<Note> = serde_json::from_str(&backup_data)
            .map_err(|e| AppError::Sync(format!("Failed to parse backup: {}", e)))?;

        // Clear existing notes and restore from backup
        // TODO: Implement proper backup/restore logic
        
        tracing::info!("Restored {} notes from backup", notes.len());
        Ok(())
    }
}

// Compression utilities for sync
pub fn compress_data(data: &[u8]) -> AppResult<Vec<u8>> {
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;

    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(data)
        .map_err(|e| AppError::Sync(format!("Compression failed: {}", e)))?;
    
    encoder.finish()
        .map_err(|e| AppError::Sync(format!("Compression finish failed: {}", e)))
}

pub fn decompress_data(data: &[u8]) -> AppResult<Vec<u8>> {
    use flate2::read::GzDecoder;
    use std::io::Read;

    let mut decoder = GzDecoder::new(data);
    let mut decompressed = Vec::new();
    decoder.read_to_end(&mut decompressed)
        .map_err(|e| AppError::Sync(format!("Decompression failed: {}", e)))?;
    
    Ok(decompressed)
} 