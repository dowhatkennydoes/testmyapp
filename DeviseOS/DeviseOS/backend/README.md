# DeviseOS Backend

Privacy-first, AI-powered platform for knowledge management with local-first architecture and cloud-optional sync.

## 🏗️ Architecture Overview

### Core Components

1. **API Gateway Layer** - FastAPI 0.111 with GraphQL support
2. **Core Service Modules** - Notebook, Voice Annotation, AI Processing, Memory Engine
3. **Data & Storage Layer** - PostgreSQL 15 + pgvector, Redis, S3/MinIO
4. **Security & Compliance** - AES-256 encryption, RBAC, audit trails
5. **Monitoring & DevOps** - Prometheus + Grafana, OpenTelemetry

### Service Modules

- **Notebook Service** - CRUD for notebooks, sections, pages
- **Voice Annotation Service** - Audio recording, Whisper transcription
- **Tagging & Auto-Classification** - NLP processing, semantic suggestions
- **Memory Engine Service** - RAG, contextual search, timeline navigation
- **Summarization & Redaction** - Multi-LLM support, HIPAA compliance
- **Plugin Runtime Service** - Deno/Wasm sandbox, permission validation

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+ (with pgvector extension)
- Redis 7.2+
- Node.js 18+ (for plugin runtime)

### Development Setup

1. **Clone and setup environment:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment configuration:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services with Docker Compose:**
```bash
docker-compose up -d postgres redis minio rabbitmq
```

4. **Run database migrations:**
```bash
alembic upgrade head
```

5. **Start the development server:**
```bash
python main.py
# Or with uvicorn directly:
uvicorn deviseos.api.app:app --reload --host 0.0.0.0 --port 8000
```

6. **Start Celery workers:**
```bash
celery -A deviseos.core.celery worker --loglevel=info
celery -A deviseos.core.celery beat --loglevel=info
```

### Production Deployment

1. **Build and run with Docker Compose:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

2. **Or deploy to Kubernetes:**
```bash
kubectl apply -f k8s/
```

## 📁 Project Structure

```
backend/
├── deviseos/
│   ├── api/                 # FastAPI application and routers
│   │   ├── app.py          # Main FastAPI app
│   │   ├── routers/        # API route handlers
│   │   ├── middleware/     # Custom middleware
│   │   └── graphql/        # GraphQL schema and resolvers
│   ├── core/               # Core functionality
│   │   ├── config.py       # Configuration management
│   │   ├── database.py     # Database connection and session
│   │   ├── redis.py        # Redis connection
│   │   ├── logging.py      # Logging configuration
│   │   └── monitoring.py   # Monitoring setup
│   ├── services/           # Business logic services
│   │   ├── notebook.py     # Notebook service
│   │   ├── voice.py        # Voice annotation service
│   │   ├── ai.py           # AI processing service
│   │   ├── memory.py       # Memory engine service
│   │   └── sync.py         # Sync service
│   ├── models/             # Database models
│   │   ├── base.py         # Base models and mixins
│   │   ├── notebook.py     # Notebook-related models
│   │   └── user.py         # User and organization models
│   ├── schemas/            # Pydantic schemas
│   ├── utils/              # Utility functions
│   └── plugins/            # Plugin runtime
├── tests/                  # Test suite
├── alembic/                # Database migrations
├── docker/                 # Docker configurations
├── monitoring/             # Monitoring configurations
└── docs/                   # Documentation
```

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Database
DB_URL=postgresql://deviseos:deviseos@localhost:5432/deviseos

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECURITY_SECRET_KEY=your-secret-key-here
SECURITY_ENCRYPTION_KEY=your-encryption-key-here

# AI Services
AI_OPENAI_API_KEY=your-openai-key
AI_ANTHROPIC_API_KEY=your-anthropic-key
AI_GOOGLE_API_KEY=your-google-key

# Storage
STORAGE_S3_ENDPOINT=http://localhost:9000
STORAGE_S3_ACCESS_KEY=minioadmin
STORAGE_S3_SECRET_KEY=minioadmin

# Celery
CELERY_BROKER_URL=amqp://deviseos:deviseos@localhost:5672/
```

### Feature Flags

Control feature availability via environment variables:

```bash
ENABLE_GRAPHQL=true
ENABLE_WEBSOCKETS=true
ENABLE_PLUGINS=true
RATE_LIMIT_ENABLED=true
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=deviseos --cov-report=html

# Run specific test categories
pytest -m unit
pytest -m integration
pytest -m slow

# Run tests in parallel
pytest -n auto
```

### Test Structure

- `tests/unit/` - Unit tests for individual functions
- `tests/integration/` - Integration tests for services
- `tests/api/` - API endpoint tests
- `tests/fixtures/` - Test fixtures and data

## 📊 Monitoring

### Metrics

- **Prometheus** - System metrics at `http://localhost:9090`
- **Grafana** - Dashboards at `http://localhost:3001`
- **Health Check** - API health at `http://localhost:8000/health`

### Logging

Structured logging with JSON format:

```python
import structlog

logger = structlog.get_logger()
logger.info("User action", user_id=user.id, action="create_notebook")
```

### Tracing

OpenTelemetry integration for distributed tracing:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("process_voice") as span:
    span.set_attribute("audio.duration", duration)
    # Process audio...
```

## 🔒 Security

### Authentication

- JWT-based authentication with Clerk.dev integration
- Role-based access control (RBAC)
- Session management with Redis

### Data Protection

- AES-256 encryption at rest
- TLS 1.3 in transit
- HIPAA-compliant audit trails
- Zero-trust plugin sandbox

### Compliance

- GDPR compliance features
- HIPAA redaction capabilities
- SOC2-ready audit logging
- Data residency controls

## 🔌 Plugin System

### Plugin Development

Plugins run in isolated Deno/Wasm sandboxes:

```typescript
// plugins/example/index.ts
export function processText(text: string): string {
    return text.toUpperCase();
}
```

### Plugin Manifest

```yaml
# plugin.yaml
name: text-processor
version: 1.0.0
permissions:
  - read:content
  - write:content
runtime: deno
```

## 🚀 Deployment

### Docker Compose (Development)

```bash
docker-compose up -d
```

### Kubernetes (Production)

```bash
# Deploy to cluster
kubectl apply -f k8s/

# Check status
kubectl get pods -n deviseos
```

### Helm Chart

```bash
# Install with Helm
helm install deviseos ./helm/deviseos

# Upgrade
helm upgrade deviseos ./helm/deviseos
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting: `black . && isort . && flake8`
6. Submit a pull request

### Code Style

- **Black** for code formatting
- **isort** for import sorting
- **flake8** for linting
- **mypy** for type checking

## 📚 API Documentation

- **OpenAPI/Swagger** - `http://localhost:8000/docs`
- **ReDoc** - `http://localhost:8000/redoc`
- **GraphQL Playground** - `http://localhost:8000/graphql`

## 🆘 Support

- **Issues** - GitHub Issues
- **Discussions** - GitHub Discussions
- **Documentation** - `/docs` directory
- **Community** - Discord/Slack (links in main repo)

## 📄 License

MIT License - see LICENSE file for details. 