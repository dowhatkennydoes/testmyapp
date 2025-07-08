# Backend - Flask API

This is a minimal Flask API serving product data for the CMS ecommerce app.

The API exposes a `/chat` endpoint used by the frontend chatbot, a `/chat/history` endpoint to fetch recent conversations, and a `/products` endpoint for product management. Missing names or invalid prices return errors, while the chat endpoint responds with simple rules for demonstration. The products endpoint also accepts `page` and `per_page` query parameters for pagination.

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

Get chat history:
```bash
curl http://localhost:5000/chat/history
```

Paginated products:
```bash
curl "http://localhost:5000/products?page=1&per_page=5"
```
