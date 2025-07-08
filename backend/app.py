from flask import Flask, jsonify, request

app = Flask(__name__)

# Sample in-memory data store
products = [
    {"id": 1, "name": "Sample Product", "price": 10.0}
]

# Simple chatbot assistant with simple rules
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
    else:
        bot = f"You said: {message}"

    return jsonify({"response": bot})

@app.route('/products', methods=['GET'])
def list_products():
    return jsonify(products)

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
