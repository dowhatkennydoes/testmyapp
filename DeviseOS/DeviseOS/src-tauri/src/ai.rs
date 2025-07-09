use whisper_rs::{FullParams, SamplingStrategy, WhisperContext};
use std::path::Path;
use crate::{AppError, AppResult, AppConfig, StorageManager, SearchResult, AIProcessingResult};

pub struct AIService {
    config: AppConfig,
    whisper_context: Option<WhisperContext>,
    // TODO: Add embedding model and LLM context
}

impl AIService {
    pub async fn new(config: &AppConfig) -> AppResult<Self> {
        let whisper_context = if let Some(model_path) = &config.ai_config.whisper_model_path {
            if model_path.exists() {
                let ctx = WhisperContext::new(model_path)
                    .map_err(|e| AppError::AIProcessing(format!("Failed to load Whisper model: {}", e)))?;
                Some(ctx)
            } else {
                None
            }
        } else {
            None
        };

        Ok(Self {
            config: config.clone(),
            whisper_context,
        })
    }

    pub async fn transcribe_audio(&self, audio_data: Vec<u8>) -> AppResult<String> {
        if let Some(ref ctx) = self.whisper_context {
            // Convert audio data to the format expected by Whisper
            let audio_samples = self.convert_audio_to_samples(&audio_data)?;
            
            let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
            params.set_language(Some("en"));
            params.set_print_special(false);
            params.set_print_progress(false);
            params.set_print_timestamps(false);

            let mut state = ctx.create_state()
                .map_err(|e| AppError::AIProcessing(format!("Failed to create Whisper state: {}", e)))?;

            state.full(params, &audio_samples)
                .map_err(|e| AppError::AIProcessing(format!("Transcription failed: {}", e)))?;

            let num_segments = state.full_n_segments()
                .map_err(|e| AppError::AIProcessing(format!("Failed to get segments: {}", e)))?;

            let mut transcription = String::new();
            for i in 0..num_segments {
                if let Ok(segment) = state.full_get_segment_text(i) {
                    transcription.push_str(&segment);
                    transcription.push(' ');
                }
            }

            Ok(transcription.trim().to_string())
        } else {
            Err(AppError::AIProcessing("Whisper model not available".to_string()))
        }
    }

    fn convert_audio_to_samples(&self, audio_data: &[u8]) -> AppResult<Vec<f32>> {
        // This is a simplified conversion - in a real implementation,
        // you'd want to properly decode the audio format (WAV, MP3, etc.)
        // For now, we'll assume 16-bit PCM audio at 16kHz
        
        if audio_data.len() < 44 { // WAV header is 44 bytes
            return Err(AppError::InvalidAudioFormat("Audio data too short".to_string()));
        }

        // Skip WAV header (44 bytes) and convert 16-bit samples to f32
        let mut samples = Vec::new();
        for chunk in audio_data[44..].chunks(2) {
            if chunk.len() == 2 {
                let sample = i16::from_le_bytes([chunk[0], chunk[1]]) as f32;
                samples.push(sample / 32768.0); // Normalize to [-1, 1]
            }
        }

        Ok(samples)
    }

    pub async fn generate_embeddings(&self, text: &str) -> AppResult<Vec<f32>> {
        // TODO: Implement local embedding generation
        // For now, return a simple hash-based embedding
        let mut embedding = Vec::new();
        let mut hash = 0u32;
        
        for (i, byte) in text.as_bytes().iter().enumerate() {
            hash = hash.wrapping_add((*byte as u32).wrapping_mul(i as u32 + 1));
        }
        
        // Generate a 384-dimensional embedding (common size for many models)
        for i in 0..384 {
            let seed = hash.wrapping_add(i as u32);
            let value = (seed as f32) / (u32::MAX as f32) * 2.0 - 1.0;
            embedding.push(value);
        }
        
        Ok(embedding)
    }

    pub async fn semantic_search(&self, storage: &StorageManager, query: &str) -> AppResult<Vec<SearchResult>> {
        let query_embedding = self.generate_embeddings(query).await?;
        
        // Get all notes and compute similarity
        let notes = storage.get_notes(None, None).await?;
        let mut results = Vec::new();
        
        for note in notes {
            let note_embedding = self.generate_embeddings(&note.content).await?;
            let similarity = self.compute_cosine_similarity(&query_embedding, &note_embedding);
            
            if similarity > 0.1 { // Threshold for relevance
                let snippet = self.generate_snippet(&note.content, query);
                let matched_terms = vec![query.to_string()];
                
                results.push(SearchResult {
                    note,
                    relevance_score: similarity,
                    matched_terms,
                    snippet,
                });
            }
        }
        
        // Sort by relevance score
        results.sort_by(|a, b| b.relevance_score.partial_cmp(&a.relevance_score).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(results)
    }

    fn compute_cosine_similarity(&self, a: &[f32], b: &[f32]) -> f64 {
        if a.len() != b.len() || a.is_empty() {
            return 0.0;
        }
        
        let mut dot_product = 0.0;
        let mut norm_a = 0.0;
        let mut norm_b = 0.0;
        
        for (a_val, b_val) in a.iter().zip(b.iter()) {
            let a_f64 = *a_val as f64;
            let b_f64 = *b_val as f64;
            dot_product += a_f64 * b_f64;
            norm_a += a_f64 * a_f64;
            norm_b += b_f64 * b_f64;
        }
        
        if norm_a == 0.0 || norm_b == 0.0 {
            return 0.0;
        }
        
        dot_product / (norm_a.sqrt() * norm_b.sqrt())
    }

    fn generate_snippet(&self, content: &str, query: &str) -> String {
        if let Some(pos) = content.to_lowercase().find(&query.to_lowercase()) {
            let start = pos.saturating_sub(50);
            let end = (pos + query.len() + 50).min(content.len());
            let snippet = &content[start..end];
            
            if start > 0 {
                format!("...{}...", snippet)
            } else {
                format!("{}...", snippet)
            }
        } else {
            content.chars().take(100).collect::<String>() + "..."
        }
    }

    pub async fn suggest_tags(&self, content: &str) -> AppResult<Vec<String>> {
        // TODO: Implement more sophisticated tag suggestion using NER and topic modeling
        // For now, use a simple keyword extraction approach
        
        let words: Vec<&str> = content
            .split_whitespace()
            .filter(|word| word.len() > 3 && !self.is_common_word(word))
            .collect();
        
        let mut word_freq = std::collections::HashMap::new();
        for word in words {
            let clean_word = word.trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase();
            if !clean_word.is_empty() {
                *word_freq.entry(clean_word).or_insert(0) += 1;
            }
        }
        
        // Sort by frequency and take top 5
        let mut suggestions: Vec<String> = word_freq
            .into_iter()
            .filter(|(_, count)| *count > 1)
            .map(|(word, _)| word)
            .collect();
        
        suggestions.sort();
        suggestions.truncate(5);
        
        Ok(suggestions)
    }

    fn is_common_word(&self, word: &str) -> bool {
        let common_words = [
            "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
            "by", "from", "up", "about", "into", "through", "during", "before",
            "after", "above", "below", "between", "among", "within", "without",
            "this", "that", "these", "those", "is", "are", "was", "were", "be",
            "been", "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "can", "shall", "must",
        ];
        
        common_words.contains(&word.to_lowercase().as_str())
    }

    pub async fn process_note(&self, content: &str) -> AppResult<AIProcessingResult> {
        let embeddings = self.generate_embeddings(content).await?;
        let suggested_tags = self.suggest_tags(content).await?;
        
        // Simple sentiment analysis (positive/negative word counting)
        let sentiment_score = self.analyze_sentiment(content);
        
        // Extract key entities (simple approach - capitalized words)
        let key_entities = self.extract_entities(content);
        
        // Generate summary (first few sentences for now)
        let summary = self.generate_summary(content);
        
        Ok(AIProcessingResult {
            embeddings,
            suggested_tags,
            sentiment_score,
            key_entities,
            summary,
        })
    }

    fn analyze_sentiment(&self, text: &str) -> f64 {
        let positive_words = [
            "good", "great", "excellent", "amazing", "wonderful", "fantastic",
            "love", "like", "enjoy", "happy", "joy", "success", "win", "best",
        ];
        
        let negative_words = [
            "bad", "terrible", "awful", "horrible", "hate", "dislike", "sad",
            "angry", "frustrated", "fail", "lose", "worst", "problem", "issue",
        ];
        
        let words: Vec<&str> = text.split_whitespace().collect();
        let mut positive_count = 0;
        let mut negative_count = 0;
        
        for word in words {
            let word_lower = word.to_lowercase();
            if positive_words.contains(&word_lower.as_str()) {
                positive_count += 1;
            } else if negative_words.contains(&word_lower.as_str()) {
                negative_count += 1;
            }
        }
        
        let total = positive_count + negative_count;
        if total == 0 {
            0.0
        } else {
            (positive_count as f64 - negative_count as f64) / total as f64
        }
    }

    fn extract_entities(&self, text: &str) -> Vec<String> {
        let words: Vec<&str> = text.split_whitespace().collect();
        let mut entities = Vec::new();
        
        for word in words {
            let clean_word = word.trim_matches(|c: char| !c.is_alphanumeric());
            if clean_word.len() > 2 && clean_word.chars().next().unwrap().is_uppercase() {
                entities.push(clean_word.to_string());
            }
        }
        
        entities.sort();
        entities.dedup();
        entities.truncate(10); // Limit to top 10 entities
        entities
    }

    fn generate_summary(&self, text: &str) -> Option<String> {
        let sentences: Vec<&str> = text
            .split(|c| c == '.' || c == '!' || c == '?')
            .filter(|s| !s.trim().is_empty())
            .collect();
        
        if sentences.is_empty() {
            None
        } else {
            let summary_sentences: Vec<&str> = sentences.iter().take(3).copied().collect();
            Some(summary_sentences.join(". ") + ".")
        }
    }

    pub fn is_whisper_available(&self) -> bool {
        self.whisper_context.is_some()
    }

    pub fn is_local_processing_enabled(&self) -> bool {
        self.config.ai_config.enable_local_processing
    }
} 