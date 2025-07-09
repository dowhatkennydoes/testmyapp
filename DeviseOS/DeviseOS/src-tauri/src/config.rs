use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;
use crate::{AppError, UserPreferences, errors::*};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub app_name: String,
    pub version: String,
    pub data_dir: PathBuf,
    pub cache_dir: PathBuf,
    pub backup_dir: PathBuf,
    pub temp_dir: PathBuf,
    pub database_path: PathBuf,
    pub encryption_key_path: PathBuf,
    pub user_preferences: UserPreferences,
    pub ai_config: AIConfig,
    pub sync_config: SyncConfig,
    pub security_config: SecurityConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub whisper_model_path: Option<PathBuf>,
    pub embedding_model_path: Option<PathBuf>,
    pub llm_model_path: Option<PathBuf>,
    pub enable_local_processing: bool,
    pub enable_cloud_fallback: bool,
    pub max_audio_duration: u64,
    pub max_text_length: usize,
    pub processing_threads: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    pub enabled: bool,
    pub endpoint: Option<String>,
    pub api_key: Option<String>,
    pub sync_interval: u64,
    pub max_sync_size: u64,
    pub compression_enabled: bool,
    pub encryption_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub encryption_enabled: bool,
    pub encryption_algorithm: String,
    pub key_derivation_iterations: u32,
    pub session_timeout: u64,
    pub max_login_attempts: u32,
    pub require_biometric: bool,
}

impl AppConfig {
    pub async fn load() -> Result<Self, AppError> {
        let config_path = Self::get_config_path()?;
        
        if config_path.exists() {
            let config_data = fs::read_to_string(&config_path)
                .map_err(|e| AppError::Config(format!("Failed to read config file: {}", e)))?;
            
            let mut config: AppConfig = serde_json::from_str(&config_data)
                .map_err(|e| AppError::Config(format!("Failed to parse config: {}", e)))?;
            
            // Ensure directories exist
            config.ensure_directories().await?;
            
            Ok(config)
        } else {
            // Create default configuration
            let config = Self::default();
            config.save().await?;
            Ok(config)
        }
    }

    pub async fn save(&self) -> Result<(), AppError> {
        let config_path = Self::get_config_path()?;
        let config_data = serde_json::to_string_pretty(self)
            .map_err(|e| AppError::Config(format!("Failed to serialize config: {}", e)))?;
        
        // Ensure config directory exists
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| AppError::Config(format!("Failed to create config directory: {}", e)))?;
        }
        
        fs::write(&config_path, config_data)
            .map_err(|e| AppError::Config(format!("Failed to write config file: {}", e)))?;
        
        Ok(())
    }

    pub async fn ensure_directories(&self) -> Result<(), AppError> {
        let dirs = [
            &self.data_dir,
            &self.cache_dir,
            &self.backup_dir,
            &self.temp_dir,
        ];

        for dir in dirs.iter() {
            fs::create_dir_all(dir)
                .map_err(|e| AppError::Config(format!("Failed to create directory {:?}: {}", dir, e)))?;
        }

        Ok(())
    }

    fn get_config_path() -> Result<PathBuf, AppError> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| AppError::Config("Could not determine config directory".to_string()))?
            .join("DeviseOS");
        
        Ok(config_dir.join("config.json"))
    }

    fn get_data_dir() -> PathBuf {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("DeviseOS")
    }

    fn get_cache_dir() -> PathBuf {
        dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("DeviseOS")
    }

    fn get_backup_dir() -> PathBuf {
        dirs::document_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("DeviseOS")
            .join("Backups")
    }

    fn get_temp_dir() -> PathBuf {
        std::env::temp_dir().join("DeviseOS")
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        let data_dir = Self::get_data_dir();
        let cache_dir = Self::get_cache_dir();
        let backup_dir = Self::get_backup_dir();
        let temp_dir = Self::get_temp_dir();

        Self {
            app_name: "DeviseOS".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            database_path: data_dir.join("deviseos.db"),
            encryption_key_path: data_dir.join("encryption.key"),
            data_dir,
            cache_dir,
            backup_dir,
            temp_dir,
            user_preferences: UserPreferences::default(),
            ai_config: AIConfig::default(),
            sync_config: SyncConfig::default(),
            security_config: SecurityConfig::default(),
        }
    }
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            whisper_model_path: None,
            embedding_model_path: None,
            llm_model_path: None,
            enable_local_processing: true,
            enable_cloud_fallback: false,
            max_audio_duration: 300, // 5 minutes
            max_text_length: 10000,
            processing_threads: num_cpus::get(),
        }
    }
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            endpoint: None,
            api_key: None,
            sync_interval: 3600, // 1 hour
            max_sync_size: 100 * 1024 * 1024, // 100 MB
            compression_enabled: true,
            encryption_enabled: true,
        }
    }
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            encryption_enabled: true,
            encryption_algorithm: "AES-256-GCM".to_string(),
            key_derivation_iterations: 100000,
            session_timeout: 3600, // 1 hour
            max_login_attempts: 5,
            require_biometric: false,
        }
    }
}

// Environment-specific configuration helpers
impl AppConfig {
    pub fn is_development(&self) -> bool {
        cfg!(debug_assertions)
    }

    pub fn is_production(&self) -> bool {
        !self.is_development()
    }

    pub fn get_log_level(&self) -> &'static str {
        if self.is_development() {
            "debug"
        } else {
            "info"
        }
    }

    pub fn get_database_url(&self) -> String {
        format!("sqlite:{}", self.database_path.display())
    }

    pub fn get_model_path(&self, model_type: &str) -> Option<PathBuf> {
        match model_type {
            "whisper" => self.ai_config.whisper_model_path.clone(),
            "embedding" => self.ai_config.embedding_model_path.clone(),
            "llm" => self.ai_config.llm_model_path.clone(),
            _ => None,
        }
    }

    pub fn set_model_path(&mut self, model_type: &str, path: PathBuf) {
        match model_type {
            "whisper" => self.ai_config.whisper_model_path = Some(path),
            "embedding" => self.ai_config.embedding_model_path = Some(path),
            "llm" => self.ai_config.llm_model_path = Some(path),
            _ => {}
        }
    }
} 