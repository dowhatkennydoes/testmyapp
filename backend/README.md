# Backend - Flask API

This is a minimal Flask API serving product data for the CMS ecommerce app.

The API exposes a `/chat` endpoint used by the frontend chatbot and a `/products` endpoint for product management. Missing names or invalid prices return errors, while the chat endpoint echoes messages with simple rules for demonstration.

## Setup

```
python3 -m venv venv
source venv/bin/activate
pip install Flask
python backend/app.py
```


Example chat request:
```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'
```
