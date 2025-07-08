Backend – Flask API
This is a minimal Flask API powering the CMS ecommerce app.
It serves product data, handles basic chatbot interactions, and supports pagination and error handling.

🔌 API Endpoints
Endpoint	Description
POST /chat	Accepts a user message and returns a chatbot reply
GET /chat/history	Returns the recent chat conversation history
GET /products	Returns a paginated list of products (page, per_page)

The /chat endpoint responds to simple keywords like "hello" and "price" with friendly replies.

Invalid requests (e.g., missing message content, bad pricing data) return meaningful error messages.

🚀 Setup
Run these commands from the backend/ directory:

bash
Copy
Edit
python3 -m venv venv
source venv/bin/activate
pip install Flask
python app.py
🛠️ Example API Requests
Send a message to the chatbot:
bash
Copy
Edit
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'
Get chat history:
bash
Copy
Edit
curl http://localhost:5000/chat/history
Get paginated product list:
bash
Copy
Edit
curl "http://localhost:5000/products?page=1&per_page=5"