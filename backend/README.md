🔙 Backend – Flask API
The backend is a lightweight Flask API that powers The Sip ecommerce app. It handles product data, chatbot interactions, and basic pagination with error handling.

🔌 API Endpoints
Endpoint	Description
POST /chat	Accepts a user message and returns a chatbot reply
GET /chat/history	Returns the recent chat conversation history
GET /products	Returns a paginated list of products (page, per_page)
GET /categories	Returns a list of all available product categories

🧠 Chatbot Functionality
/chat responds to simple keywords like "hello" and "price" with canned replies

Returns helpful error messages for invalid or missing message data

Chat history is stored in memory and returned from /chat/history

📦 Product Functionality
/products supports:

Pagination via page and per_page

Search using q

Category filtering with category

Each product now includes a rating field for displaying stars on the frontend

Use /categories to fetch all available product categories

Invalid requests (like missing product names or invalid prices) return clear error responses

🚀 Setup Instructions
Run these commands from the backend/ directory:

bash
Copy
Edit
python3 -m venv venv
source venv/bin/activate
pip install Flask
python backend/app.py
🛠️ Example API Usage
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
Get paginated products:

bash
Copy
Edit
curl "http://localhost:5000/products?page=1&per_page=5"
Get the list of categories:

bash
Copy
Edit
curl http://localhost:5000/categories