# DeviseOS

A privacy-first, AI-powered Memory Platform that runs as a native desktop application. DeviseOS acts as a local knowledge environment where your notes, conversations, and documents are transcribed, organized, and recalled intelligently—without your data leaving your device unless you choose to sync.

## Features

### 🔒 Privacy-First Design
- **Local-First Architecture**: All data is stored and processed locally by default
- **End-to-End Encryption**: AES-256-GCM encryption for all notes and voice recordings
- **No Cloud Dependencies**: Works completely offline with optional sync
- **Secure Key Management**: Argon2 password hashing and secure key derivation

### 🧠 AI-Powered Intelligence
- **Local Whisper Integration**: Speech-to-text transcription without external APIs
- **Semantic Search**: Find notes by meaning, not just keywords
- **Intelligent Tag Suggestions**: AI-powered tag recommendations
- **Content Analysis**: Sentiment analysis and entity extraction
- **Smart Summaries**: Automatic note summarization

### 📝 Advanced Note Management
- **Rich Text Editor**: Intuitive note creation and editing
- **Voice Annotations**: Record, transcribe, and attach voice notes
- **Hierarchical Tags**: Organize notes with intelligent tagging
- **Full-Text Search**: Fast search across all content
- **Export Options**: Multiple formats (Markdown, PDF, JSON)

### 💻 Native Desktop Experience
- **Cross-Platform**: Windows, macOS, and Linux support
- **Fast Performance**: Built with Rust and React for optimal speed
- **Offline Capable**: Full functionality without internet connection
- **System Integration**: Native OS features and notifications

## Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Vite** - Fast build tool

### Backend
- **Rust** - High-performance systems language
- **Tauri** - Cross-platform desktop framework
- **SQLite** - Local database storage
- **SQLx** - Async SQL toolkit

### AI & ML
- **Whisper** - Local speech-to-text
- **Candle** - ML inference framework
- **Local Embeddings** - Semantic search capabilities

### Security
- **AES-256-GCM** - Content encryption
- **Argon2** - Password hashing
- **Local Key Management** - Secure key derivation

## Getting Started

### Prerequisites
- **Node.js** 18+ 
- **Rust** 1.70+
- **pnpm** (recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/DeviseOS.git
   cd DeviseOS
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run in development mode**
   ```bash
   pnpm tauri dev
   ```

4. **Build for production**
   ```bash
   pnpm tauri build
   ```

## Architecture

### Data Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Tauri Core    │    │   Rust Backend  │
│                 │────│                 │────│                 │
│ • Components    │    │ • IPC Bridge    │    │ • Database      │
│ • Contexts      │    │ • Commands      │    │ • Encryption    │
│ • Pages         │    │ • Events        │    │ • AI Processing │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                               ┌─────────────────┐
                                               │   Local Storage │
                                               │                 │
                                               │ • SQLite DB     │
                                               │ • Encrypted     │
                                               │ • Embeddings    │
                                               └─────────────────┘
```

### Project Structure
```
DeviseOS/
├── src/                    # React frontend
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React contexts
│   ├── pages/             # Main application pages
│   └── utils/             # Utility functions
├── src-tauri/             # Tauri desktop app
│   ├── src/               # Rust backend code
│   │   ├── database.rs    # SQLite database layer
│   │   ├── encryption.rs  # Encryption utilities
│   │   ├── ai.rs          # AI processing
│   │   ├── models.rs      # Data models
│   │   └── lib.rs         # Tauri commands
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
└── README.md
```

## Key Features

### Privacy & Security
- **Local Processing**: All AI operations happen on your device
- **Encryption at Rest**: Notes encrypted with AES-256-GCM
- **Secure Authentication**: Argon2 password hashing
- **No Telemetry**: No data collection or tracking

### AI Capabilities
- **Speech-to-Text**: Local Whisper model for transcription
- **Semantic Search**: Find notes by meaning using embeddings
- **Auto-Tagging**: Intelligent tag suggestions
- **Content Analysis**: Sentiment and entity extraction
- **Smart Summaries**: Automatic note summarization

### User Experience
- **Intuitive Interface**: Clean, modern design
- **Fast Search**: Instant results across all content
- **Voice Integration**: Record and transcribe voice notes
- **Offline First**: Full functionality without internet
- **Cross-Platform**: Native performance on all platforms

## Development

### Running Tests
```bash
# Frontend tests
pnpm test

# Backend tests
cd src-tauri && cargo test
```

### Building
```bash
# Development build
pnpm tauri dev

# Production build
pnpm tauri build
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Privacy Policy

DeviseOS is designed with privacy as the core principle:

- **Local Processing**: All data processing happens on your device
- **No Cloud by Default**: Your data never leaves your device unless you choose to sync
- **Encryption**: All sensitive data is encrypted at rest
- **Open Source**: Full transparency in how your data is handled
- **No Telemetry**: We don't collect usage data or analytics

## License

[License to be determined]

## Support

For support, feature requests, or bug reports, please open an issue on GitHub.

---

**DeviseOS** - Your privacy-first AI memory platform. Think better, remember more, stay in control.