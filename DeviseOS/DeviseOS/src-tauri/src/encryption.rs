use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use base64::{Engine as _, engine::general_purpose};
use rand::RngCore;
use std::fs;
use std::path::Path;
use crate::AppError;

pub type AppResult<T> = Result<T, AppError>;

pub struct EncryptionManager {
    key: Key<Aes256Gcm>,
    cipher: Aes256Gcm,
}

impl EncryptionManager {
    pub fn new(master_password: &str, salt: &[u8]) -> AppResult<Self> {
        let argon2 = Argon2::default();
        let salt_string = SaltString::encode_b64(salt)
            .map_err(|e| AppError::Encryption(format!("Invalid salt: {}", e)))?;
        
        let password_hash = argon2
            .hash_password(master_password.as_bytes(), &salt_string)
            .map_err(|e| AppError::Encryption(format!("Failed to hash password: {}", e)))?;
        
        let key_bytes = password_hash.hash
            .ok_or_else(|| AppError::Encryption("Failed to get hash bytes".to_string()))?
            .as_bytes();
        
        if key_bytes.len() < 32 {
            return Err(AppError::Encryption("Key too short".to_string()));
        }
        
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes[..32]);
        let cipher = Aes256Gcm::new(key);
        
        Ok(Self { key: *key, cipher })
    }

    pub fn from_key_file(key_path: &Path) -> AppResult<Self> {
        let key_data = fs::read(key_path)
            .map_err(|e| AppError::Encryption(format!("Failed to read key file: {}", e)))?;
        
        if key_data.len() < 32 {
            return Err(AppError::Encryption("Key file too short".to_string()));
        }
        
        let key = Key::<Aes256Gcm>::from_slice(&key_data[..32]);
        let cipher = Aes256Gcm::new(key);
        
        Ok(Self { key: *key, cipher })
    }

    pub fn generate_key_file(key_path: &Path, master_password: &str) -> AppResult<()> {
        let salt = generate_salt()?;
        let manager = Self::new(master_password, &salt)?;
        
        // Create directory if it doesn't exist
        if let Some(parent) = key_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| AppError::Encryption(format!("Failed to create key directory: {}", e)))?;
        }
        
        let key_bytes = manager.key.as_slice();
        fs::write(key_path, key_bytes)
            .map_err(|e| AppError::Encryption(format!("Failed to write key file: {}", e)))?;
        
        Ok(())
    }

    pub fn encrypt(&self, data: &[u8]) -> AppResult<Vec<u8>> {
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        let ciphertext = self.cipher
            .encrypt(nonce, data)
            .map_err(|e| AppError::Encryption(format!("Encryption failed: {}", e)))?;
        
        // Combine nonce and ciphertext
        let mut result = Vec::with_capacity(12 + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);
        
        Ok(result)
    }

    pub fn decrypt(&self, encrypted_data: &[u8]) -> AppResult<Vec<u8>> {
        if encrypted_data.len() < 12 {
            return Err(AppError::Encryption("Encrypted data too short".to_string()));
        }
        
        let nonce_bytes = &encrypted_data[..12];
        let ciphertext = &encrypted_data[12..];
        
        let nonce = Nonce::from_slice(nonce_bytes);
        
        let plaintext = self.cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| AppError::Encryption(format!("Decryption failed: {}", e)))?;
        
        Ok(plaintext)
    }

    pub fn encrypt_string(&self, text: &str) -> AppResult<String> {
        let encrypted = self.encrypt(text.as_bytes())?;
        Ok(general_purpose::STANDARD.encode(encrypted))
    }

    pub fn decrypt_string(&self, encrypted_text: &str) -> AppResult<String> {
        let encrypted_data = general_purpose::STANDARD.decode(encrypted_text)
            .map_err(|e| AppError::Encryption(format!("Failed to decode base64: {}", e)))?;
        
        let decrypted = self.decrypt(&encrypted_data)?;
        String::from_utf8(decrypted)
            .map_err(|e| AppError::Encryption(format!("Invalid UTF-8: {}", e)))
    }

    pub fn hash_password(password: &str) -> AppResult<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::Encryption(format!("Failed to hash password: {}", e)))?;
        
        Ok(password_hash.to_string())
    }

    pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|e| AppError::Encryption(format!("Invalid hash format: {}", e)))?;
        
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    pub fn change_password(&self, old_password: &str, new_password: &str, key_path: &Path) -> AppResult<()> {
        // For now, we'll just generate a new key with the new password
        // In a real implementation, you'd want to re-encrypt all data
        let salt = generate_salt()?;
        let new_manager = Self::new(new_password, &salt)?;
        
        let key_bytes = new_manager.key.as_slice();
        fs::write(key_path, key_bytes)
            .map_err(|e| AppError::Encryption(format!("Failed to write new key file: {}", e)))?;
        
        Ok(())
    }
}

// Secure random number generation
pub fn generate_random_bytes(length: usize) -> AppResult<Vec<u8>> {
    let mut bytes = vec![0u8; length];
    OsRng.fill_bytes(&mut bytes);
    Ok(bytes)
}

pub fn generate_salt() -> AppResult<Vec<u8>> {
    generate_random_bytes(32)
}

// Secure string handling
pub struct SecureString {
    data: Vec<u8>,
}

impl SecureString {
    pub fn new(text: &str) -> Self {
        Self {
            data: text.as_bytes().to_vec(),
        }
    }

    pub fn as_str(&self) -> &str {
        std::str::from_utf8(&self.data).unwrap_or("")
    }

    pub fn clear(&mut self) {
        // Securely clear the memory
        for byte in &mut self.data {
            *byte = 0;
        }
        self.data.clear();
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

impl Drop for SecureString {
    fn drop(&mut self) {
        self.clear();
    }
}

impl std::fmt::Display for SecureString {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl std::fmt::Debug for SecureString {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SecureString([REDACTED])")
    }
}

// Encryption levels for different security requirements
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EncryptionLevel {
    None,
    Standard,  // AES-256-GCM
    High,      // AES-256-GCM with additional key derivation
    Military,  // AES-256-GCM with maximum security settings
}

impl EncryptionLevel {
    pub fn key_derivation_iterations(&self) -> u32 {
        match self {
            EncryptionLevel::None => 0,
            EncryptionLevel::Standard => 100_000,
            EncryptionLevel::High => 500_000,
            EncryptionLevel::Military => 1_000_000,
        }
    }

    pub fn salt_length(&self) -> usize {
        match self {
            EncryptionLevel::None => 0,
            EncryptionLevel::Standard => 32,
            EncryptionLevel::High => 64,
            EncryptionLevel::Military => 128,
        }
    }

    pub fn memory_cost(&self) -> u32 {
        match self {
            EncryptionLevel::None => 0,
            EncryptionLevel::Standard => 65536,   // 64 MiB
            EncryptionLevel::High => 262144,      // 256 MiB
            EncryptionLevel::Military => 1048576, // 1 GiB
        }
    }
}

// Key derivation for different encryption levels
pub struct KeyDerivation {
    level: EncryptionLevel,
}

impl KeyDerivation {
    pub fn new(level: EncryptionLevel) -> Self {
        Self { level }
    }

    pub fn derive_key(&self, password: &str, salt: &[u8]) -> AppResult<Vec<u8>> {
        if self.level == EncryptionLevel::None {
            return Err(AppError::Encryption("Cannot derive key with None encryption level".to_string()));
        }

        let config = argon2::Config::default();
        let hash = argon2::hash_raw(
            password.as_bytes(),
            salt,
            &config,
        ).map_err(|e| AppError::Encryption(format!("Key derivation failed: {}", e)))?;

        Ok(hash)
    }
}

// Utility functions for secure operations
pub fn secure_compare(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}

pub fn zeroize(data: &mut [u8]) {
    for byte in data {
        *byte = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_roundtrip() {
        let password = "test_password";
        let salt = generate_salt().unwrap();
        let manager = EncryptionManager::new(password, &salt).unwrap();
        
        let plaintext = "Hello, World!";
        let encrypted = manager.encrypt_string(plaintext).unwrap();
        let decrypted = manager.decrypt_string(&encrypted).unwrap();
        
        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_password_hashing() {
        let password = "test_password";
        let hash = EncryptionManager::hash_password(password).unwrap();
        
        assert!(EncryptionManager::verify_password(password, &hash).unwrap());
        assert!(!EncryptionManager::verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_secure_string() {
        let mut secure = SecureString::new("sensitive_data");
        assert_eq!(secure.as_str(), "sensitive_data");
        
        secure.clear();
        assert!(secure.is_empty());
    }

    #[test]
    fn test_secure_compare() {
        let a = b"hello";
        let b = b"hello";
        let c = b"world";
        
        assert!(secure_compare(a, b));
        assert!(!secure_compare(a, c));
    }
}