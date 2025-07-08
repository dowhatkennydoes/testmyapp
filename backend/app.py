from flask import Flask, jsonify, request

app = Flask(__name__)

# In-memory data storage
chat_history = []
products = [
    {
        "id": 1,
        "name": "Echo Dot",
        "price": 49.99,
        "category": "Electronics",
        "image": "https://via.placeholder.com/150",
        "rating": 4.5
    },
    {
        "id": 2,
        "name": "Coffee Mug",
        "price": 12.5,
        "category": "Home",
        "image": "https://via.placeholder.com/150",
        "rating": 4.0
    },
    {
        "id": 3,
        "name": "The Sip T-Shirt",
        "price": 20.0,
        "category": "Clothing",
        "image": "https://via.placeholder.com/150",
        "rating": 5.0
    }
]

# ----------- Chatbot Endpoints -----------

@app.route('/chat', methods=['POST'])
def chat():
    """Respond to user messages with keyword-based replies."""
    data = request.get_json(force=True, silent=True) or {}
    message = data.get('message')

    if not message:
        return jsonify({"error": "message required"}), 400

    text = message.lower()
    if "hello" in text:
        bot = "Hello! How can I assist you today?"
    elif "price" in text:
        bot = "Our products start at $10."
    elif "help" in text:
        bot = "Try asking about our products or say hello!"
    else:
        bot = f"You said: {message}"

    chat_history.append({"user": message, "bot": bot})
    if len(chat_history) > 50:
        chat_history.pop(0)

    return jsonify({"response": bot})

@app.route('/chat/history', methods=['GET'])
def chat_history_endpoint():
    """Return the recent chat conversation history."""
    return jsonify(chat_history)

# ----------- Product Endpoints -----------

@app.route('/categories', methods=['GET'])
def list_categories():
    """Return a list of unique product categories."""
    categories = sorted({p.get('category', 'Uncategorized') for p in products})
    return jsonify(categories)

@app.route('/products', methods=['GET'])
def list_products():
    """Return a paginated list of products with optional search and category filtering."""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 5))
    except ValueError:
        return jsonify({"error": "invalid pagination"}), 400

    if page < 1 or per_page < 1:
        return jsonify({"error": "invalid pagination"}), 400

    query = request.args.get('q', '').lower()
    category = request.args.get('category')

    filtered = products
    if query:
        filtered = [p for p in filtered if query in p['name'].lower()]
    if category:
        filtered = [p for p in filtered if p.get('category') == category]

    start = (page - 1) * per_page
    end = start + per_page
    items = filtered[start:end]

    return jsonify({
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": len(filtered)
    })

@app.route('/products', methods=['POST'])
def create_product():
    """Create a new product."""
    data = request.get_json(force=True) or {}
    name = data.get("name", "").strip()
    price = data.get("price")
    category = data.get("category", "Uncategorized")
    image = data.get("image", "https://via.placeholder.com/150")
    rating = data.get("rating", 0)

    if not name:
        return jsonify({"error": "name required"}), 400

    try:
        price_val = float(price)
    except (TypeError, ValueError):
        return jsonify({"error": "valid price required"}), 400

    try:
        rating_val = float(rating)
    except (TypeError, ValueError):
        rating_val = 0

    product = {
        "id": len(products) + 1,
        "name": name,
        "price": price_val,
        "category": category,
        "image": image,
        "rating": rating_val
    }
    products.append(product)

    return jsonify(product), 201

# ----------- Run App -----------

if __name__ == '__main__':
    app.run(debug=True)
