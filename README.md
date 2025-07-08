# The Sip - Amazon-style Ecommerce Demo

This project is a simple ecommerce demo inspired by Amazon, named **The Sip**. It uses a Python Flask backend and a React frontend.

It now also includes a minimal, robust and reliable chatbot assistant served from
the backend and accessible from the main frontend page.

## Backend

See [backend/README.md](backend/README.md) for setup instructions.

The API now supports searching products with a `q` parameter and filtering by `category`. You can also fetch all available categories via `/categories`.

## Frontend

Open [frontend/index.html](frontend/index.html) in your browser after starting the backend. The page is styled with Bootstrap and a custom stylesheet that supports light and dark themes. A hero banner welcomes users and product cards fade in once data loads, with skeleton placeholders shown while content loads. Product listings are paginated using `page` and `per_page` query parameters.
The main React code lives in [frontend/app.js](frontend/app.js) while each route has its own component inside `frontend/pages`.

## Chatbot Assistant
The demo includes a minimal, reliable chatbot assistant served from the backend and displayed at the bottom of every page.
Messages are sent to the `/chat` API endpoint and recent conversations can be retrieved from `/chat/history`.
Keywords like "hello" or "price" trigger friendly replies, and missing messages return errors for predictability. The chat interface disables the Send button until text is entered, shows a loading indicator while awaiting replies and includes ARIA labels for accessibility.

## Storefront Pages
The React frontend now uses React Router to provide a multi-page storefront:

- **HomePage** – hero banner, featured products, promo section and footer
- **Products** – search bar, category filters, product grid and pagination
- **ProductDetails** – images, specs, add-to-cart and related products
- **Cart** – items list, discount code field and checkout button
- **Checkout** – shipping form, payment form and order summary
- **About** and **Contact** pages
- Unmatched routes show a simple *404* page

Additional frontend features include a wishlist page, an order history page with sample data, toast notifications when items are added, a currency selector (USD or EUR) and product rating stars.

## Drag-and-Drop CMS Ecommerce Stack (Python + React)

### Backend (Python)

| Functionality | Technology/Lib/Framework |
| --- | --- |
| CMS / Data Models | Django + Wagtail / FastAPI + Tortoise ORM / SQLAlchemy |
| API Layer (REST or GraphQL) | FastAPI / Django Rest Framework / Strawberry (GraphQL) |
| Auth | Django Allauth / FastAPI Users / Custom JWT |
| Media Management (file uploads) | Django Storages + S3 / FastAPI + boto3 |
| Database | PostgreSQL / SQLite (dev) |
| Dynamic Page Models | Custom JSON field for storing page layouts & content |
| Webhook & Events | Celery / FastAPI Background Tasks |
| Payments | Stripe API / PayPal SDK for Python |

### Frontend (React)

| Functionality | Library/Tech |
| --- | --- |
| Drag and Drop Engine | @dnd-kit/core, react-beautiful-dnd, or react-grid-layout |
| State Management | Zustand / Redux Toolkit (but Zustand is easier) |
| Page Canvas Rendering | Dynamic component renderer from JSON configs |
| Style Customization | Tailwind CSS + CSS Variables (for themes) |
| Reusable Blocks | Component factory pattern |
| Preview & Draft Mode | React Router + query param toggle |
| Forms, Inputs | React Hook Form + Yup validation |
| API Calls | Axios / SWR / React Query |
| Media Uploads | react-dropzone + API endpoint |
| Animation | Framer Motion |
| Auth | JWT w/ context provider or Clerk.js / Auth0.js on frontend |
| Code Split for Builder vs Storefront | Dynamic import + lazy routes |
| Localization | react-i18next |
| Responsive Canvas | ResizeObserver + CSS Grid/Flexbox layouting |

### Additional Features

- Real-time inventory tracking
- Product reviews and ratings
- Wish lists and favorites
- Order history page for customers
- Multi-currency pricing support
- SEO meta tag editing
- Social media login options
- Email notifications for new orders
- Discount codes and coupon management
- Abandoned cart reminder emails
- Sales and revenue reports
- CSV product import/export
- Multi-language storefront
- Product image zoom and gallery views
- Customer profile pages
- Newsletter signup forms
- Gift card support
- Product recommendation engine
- Advanced search with filters
- Customer support chat integration
- Admin dashboard for store metrics
- Role-based access permissions
- Automated data backup and restore
- API rate limiting controls
- Detailed audit log of changes
- Customizable shipping methods
- Tax calculation support
- Automatic supplier order emails
- Product tagging and categories
- Marketing campaign tracking

