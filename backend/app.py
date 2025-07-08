from flask import Flask, jsonify, request

app = Flask(__name__)

# Sample in-memory data store
products = [
    {"id": 1, "name": "Sample Product", "price": 10.0}
]

@app.route('/products', methods=['GET'])
def list_products():
    return jsonify(products)

@app.route('/products', methods=['POST'])
def create_product():
    data = request.get_json(force=True)
    product = {
        "id": len(products) + 1,
        "name": data.get("name"),
        "price": data.get("price", 0.0)
    }
    products.append(product)
    return jsonify(product), 201

if __name__ == '__main__':
    app.run(debug=True)
