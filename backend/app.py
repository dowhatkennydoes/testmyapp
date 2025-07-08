from flask import Flask, jsonify, request

app = Flask(__name__)

# store conversation history in memory
chat_history = []

# Sample in-memory data store
products = [
    {"id": 1, "name": "Sample Product", "price": 10.0}
]

# Simple chatbot assistant with basic keyword responses
@app.route('/chat', methods=['POST'])
def chat():
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
    """Return recent chat history."""
    return jsonify(chat_history)

@app.route('/products', methods=['GET'])
def list_products():
    """Return a paginated list of products."""
    try:
        page = int(request.args.get('page', '1'))
        per_page = int(request.args.get('per_page', '5'))
    except ValueError:
        return jsonify({"error": "invalid pagination"}), 400

    if page < 1 or per_page < 1:
        return jsonify({"error": "invalid pagination"}), 400

    start = (page - 1) * per_page
    end = start + per_page
    items = products[start:end]
    return jsonify({
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": len(products)
    })

@app.route('/products', methods=['POST'])
def create_product():
    data = request.get_json(force=True) or {}
    name = data.get("name", "").strip()
    price = data.get("price")

    if not name:
        return jsonify({"error": "name required"}), 400

    try:
        price_val = float(price)
    except (TypeError, ValueError):
        return jsonify({"error": "valid price required"}), 400

    product = {
        "id": len(products) + 1,
        "name": name,
        "price": price_val
    }
    products.append(product)
    return jsonify(product), 201

if __name__ == '__main__':
    app.run(debug=True)
