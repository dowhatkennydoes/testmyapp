# Backend - Flask API

This is a minimal Flask API serving product data for the CMS ecommerce app.



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
