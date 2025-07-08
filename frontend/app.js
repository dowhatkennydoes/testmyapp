      const { BrowserRouter, Routes, Route, Link, useParams, useNavigate } = ReactRouterDOM;

      function useCurrencyFormatter(code) {
        return React.useCallback(value => new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(value), [code]);
      }

      function HeroBanner() {
        return (
          <section className="hero text-center py-5 bg-light mb-4">
            <div className="container">
              <h2 className="display-6 fw-normal">Welcome to The Sip</h2>
              <p>Browse products, add your own, and chat with our assistant.</p>
            </div>
          </section>
        );
      }

      function Rating({ value }) {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
          stars.push(
            <i key={i} className={`fa-star ${i <= Math.round(value) ? 'fas text-warning' : 'far text-muted'}`}></i>
          );
        }
        return <div className="mb-1">{stars}</div>;
      }

      function FeaturedProducts({ products, formatCurrency }) {
        return (
          <div className="row row-cols-1 row-cols-md-3 g-3 mb-4">
            {products.map(p => (
              <div key={p.id} className="col">
                <div className="card h-100 shadow-sm product-card">
                  <img className="card-img-top" src={p.image} alt="" />
                  <div className="card-body text-center">
                    <h5 className="card-title">{p.name}</h5>
                    <Rating value={p.rating || 0} />
                    <p className="card-text">{formatCurrency(p.price)}</p>
                    <Link to={`/products/${p.id}`} className="btn btn-primary btn-sm">View</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      function PromoSection() {
        return (
          <div className="p-4 mb-4 bg-secondary text-white text-center rounded">
            Limited time promotion! Get 10% off your first order.
          </div>
        );
      }

      const FooterComp = () => (
        <footer className="text-white mt-5">&copy; 2025 The Sip</footer>
      );

      function ProductFilters({ filter, setFilter, categories, category, setCategory }) {
        return (
          <div className="mb-3">
            <input className="form-control" placeholder="Search products" value={filter} onChange={e => setFilter(e.target.value)} />
            <select className="form-select mt-2" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        );
      }

      function ProductGrid({ products, formatCurrency }) {
        return (
          <div className="row row-cols-1 g-3">
            {products.map(p => (
              <div key={p.id} className="col">
                <div className="card h-100 shadow-sm product-card">
                  <img className="card-img-top" src={p.image} alt="" />
                  <div className="card-body text-center">
                    <h5 className="card-title">{p.name}</h5>
                    <Rating value={p.rating || 0} />
                    <p className="card-text">{formatCurrency(p.price)}</p>
                    <Link to={`/products/${p.id}`} className="btn btn-primary btn-sm">Details</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      function Pagination({ page, total, perPage, setPage }) {
        const max = Math.ceil(total / perPage);
        return (
          <nav className="mt-3" aria-label="Product pages">
            <ul className="pagination justify-content-center">
              <li className="page-item">
                <button className="page-link" onClick={() => setPage(page - 1)} disabled={page <= 1}>Prev</button>
              </li>
              <li className="page-item disabled"><span className="page-link">Page {page}</span></li>
              <li className="page-item">
                <button className="page-link" onClick={() => setPage(page + 1)} disabled={page >= max}>Next</button>
              </li>
            </ul>
          </nav>
        );
      }

      function ProductImages({ src }) {
        return <img className="img-fluid mb-3" src={src} alt="" />;
      }

      function AddToCartButton({ onAdd }) {
        return <button className="btn btn-success" onClick={onAdd}>Add to Cart</button>;
      }

      function ProductSpecs() {
        return <p>Product specifications go here.</p>;
      }

      function RelatedProducts() {
        return <p className="text-muted">Related products will appear here.</p>;
      }

      function CartItemsList({ cart, formatCurrency }) {
        return (
          <ul className="list-group mb-3">
            {cart.map((c, i) => (
              <li key={i} className="list-group-item d-flex justify-content-between">
                <span>{c.name}</span>
                <span>{formatCurrency(c.price)}</span>
              </li>
            ))}
          </ul>
        );
      }

      function DiscountCode() {
        return (
          <div className="mb-3">
            <input className="form-control" placeholder="Discount code" />
          </div>
        );
      }

      function CheckoutCTA() {
        const navigate = useNavigate();
        return <button className="btn btn-primary" onClick={() => navigate('/checkout')}>Checkout</button>;
      }

      function ShippingInfo() {
        return <input className="form-control mb-3" placeholder="Shipping address" />;
      }

      function PaymentForm() {
        return <input className="form-control mb-3" placeholder="Payment details" />;
      }

      function OrderSummary({ cart, formatCurrency }) {
        const total = cart.reduce((s, c) => s + c.price, 0);
        return <p>Total: {formatCurrency(total)}</p>;
      }

      function ChatMessage({ from, text }) {
        return (
          <div className="chat-message d-flex" role="status">
            <i className={`fas ${from === 'bot' ? 'fa-robot text-secondary' : 'fa-user text-primary'} me-2`}></i>
            <span>{text}</span>
          </div>
        );
      }

      function Chatbot() {
        const [messages, setMessages] = React.useState([]);
        const [message, setMessage] = React.useState('');
        const [loading, setLoading] = React.useState(false);

        React.useEffect(() => {
          fetch('/chat/history')
            .then(res => res.json())
            .then(hist => setMessages(hist || []));
        }, []);

        const sendMessage = () => {
          if (!message.trim()) return;
          const userMsg = { from: 'user', text: message.trim() };
          setMessages(m => [...m, userMsg]);
          setMessage('');
          setLoading(true);
          fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg.text })
          })
            .then(res => res.json())
            .then(data => {
              if (data && data.response) {
                setMessages(m => [...m, { from: 'bot', text: data.response }]);
              }
            })
            .finally(() => setLoading(false));
        };

        return (
          <div className="chatbot mt-5" aria-label="Chatbot assistant">
            <h3 className="h5 mb-3">Chatbot Assistant</h3>
            <div className="mb-3" id="chatHistory">
              {messages.map((m, i) => (
                <ChatMessage key={i} from={m.from} text={m.text} />
              ))}
              {loading && (
                <div className="chat-message d-flex text-muted">
                  <i className="fas fa-robot me-2"></i>
                  <span>...</span>
                </div>
              )}
            </div>
            <div className="input-group">
              <input
                className="form-control"
                placeholder="Type a message"
                aria-label="Message"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={sendMessage}
                disabled={!message.trim() || loading}
                title="Send"
              >
                Send
              </button>
            </div>
          </div>
        );
      }



      function App() {
        const [products, setProducts] = React.useState([]);
        const [loadingProducts, setLoadingProducts] = React.useState(true);
        const [page, setPage] = React.useState(1);
        const perPage = 5;
        const [total, setTotal] = React.useState(0);
        const [filter, setFilter] = React.useState('');
        const [category, setCategory] = React.useState('');
        const [categories, setCategories] = React.useState([]);
        const [cart, setCart] = React.useState([]);
        const [favorites, setFavorites] = React.useState([]);
        const [orders, setOrders] = React.useState([
          { id: 1, date: '2025-01-01', total: 99.99 }
        ]);
        const [currencyCode, setCurrencyCode] = React.useState('USD');
        const formatCurrency = useCurrencyFormatter(currencyCode);

        React.useEffect(() => {
          fetch('/categories')
            .then(res => res.json())
            .then(data => setCategories(data));
        }, []);

        React.useEffect(() => {
          setLoadingProducts(true);
          const params = new URLSearchParams({ page, per_page: perPage });
          if (filter) params.append('q', filter);
          if (category) params.append('category', category);
          fetch(`/products?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
              setProducts(data.items);
              setTotal(data.total);
            })
            .finally(() => setLoadingProducts(false));
        }, [page, filter, category]);

        const addToCart = product => {
          setCart([...cart, product]);
          showToast('Added to cart');
        };

        const addToFav = product => {
          if (!favorites.some(f => f.id === product.id)) {
            setFavorites([...favorites, product]);
            showToast('Added to wishlist');
          }
        };

        const showToast = text => {
          const toastEl = document.getElementById('toast');
          if (toastEl) {
            toastEl.querySelector('.toast-body').textContent = text;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
          }
        };

        return (
          <BrowserRouter>
            <header className="bg-primary text-white p-3 mb-4 sticky-top">
              <div className="container d-flex justify-content-between align-items-center">
                <h1 className="h3 mb-0"><i className="fas fa-store me-2"></i>The Sip</h1>
                <nav>
                  <Link to="/" className="text-white me-3">Home</Link>
                  <Link to="/products" className="text-white me-3">Products</Link>
                  <Link to="/wishlist" className="text-white me-3">Wishlist</Link>
                  <Link to="/orders" className="text-white me-3">Orders</Link>
                  <Link to="/cart" className="text-white me-3">Cart</Link>
                  <Link to="/about" className="text-white me-3">About</Link>
                  <Link to="/contact" className="text-white">Contact</Link>
                </nav>
                <form className="d-flex me-3" onSubmit={e => e.preventDefault()}>
                  <input
                    className="form-control form-control-sm me-2"
                    type="search"
                    placeholder="Search"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                  />
                </form>
                <select className="form-select form-select-sm w-auto me-2" value={currencyCode} onChange={e => setCurrencyCode(e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <button className="btn btn-light dark-mode-toggle" aria-label="Toggle dark mode"><i className="fas fa-moon"></i></button>
              </div>
            </header>
            <div className="container">
              {loadingProducts && <div className="text-center mb-3">Loading...</div>}
              <Routes>
                <Route path="/" element={<HomePage products={products} formatCurrency={formatCurrency} />} />
                <Route path="/products" element={<ProductsPage products={products} page={page} setPage={setPage} total={total} perPage={perPage} filter={filter} setFilter={setFilter} categories={categories} category={category} setCategory={setCategory} formatCurrency={formatCurrency} />} />
                <Route path="/products/:id" element={<ProductDetails products={products} addToCart={addToCart} addToFav={addToFav} formatCurrency={formatCurrency} />} />
                <Route path="/cart" element={<CartPage cart={cart} formatCurrency={formatCurrency} />} />
                <Route path="/wishlist" element={<WishlistPage favorites={favorites} formatCurrency={formatCurrency} />} />
                <Route path="/orders" element={<OrdersPage orders={orders} formatCurrency={formatCurrency} />} />
                <Route path="/checkout" element={<CheckoutPage cart={cart} formatCurrency={formatCurrency} />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Chatbot />
              <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 11 }}>
                <div id="toast" className="toast" role="alert" aria-live="assertive" aria-atomic="true">
                  <div className="toast-body"></div>
                </div>
              </div>
            </div>
          </BrowserRouter>
        );
      }

      React.useEffect(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const toggle = document.querySelector('.dark-mode-toggle');
          if (toggle) toggle.addEventListener('click', () => document.body.classList.toggle('dark'));
        });
      }, []);

      ReactDOM.render(<App />, document.getElementById('root'));
