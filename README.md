# CMS Ecommerce App

This project is a simple CMS ecommerce demo using a Python Flask backend and a React frontend.

It now also includes a minimal, robust and reliable chatbot assistant served from
the backend and accessible from the main frontend page.

## Backend

See [backend/README.md](backend/README.md) for setup instructions.

## Frontend

Open [frontend/index.html](frontend/index.html) in your browser after starting the backend. The page is styled with Bootstrap and a custom stylesheet that supports light and dark themes. A hero banner welcomes users and product cards fade in once data loads, with skeleton placeholders shown while content loads. Product listings are paginated using `page` and `per_page` query parameters.

## Chatbot Assistant
The demo includes a minimal, reliable chatbot assistant served from the backend and displayed at the bottom of every page.
Messages are sent to the `/chat` API endpoint and recent conversations can be retrieved from `/chat/history`.
Keywords like "hello" or "price" trigger friendly replies, and missing messages return errors for predictability. The chat interface disables the Send button until text is entered, shows a loading indicator while awaiting replies and includes ARIA labels for accessibility.

## Storefront Pages
The React frontend now uses React Router to provide a multi-page storefront:

- **HomePage** – hero banner, featured products, promo section and footer
- **Products** – filters, product grid and pagination
- **ProductDetails** – images, specs, add-to-cart and related products
- **Cart** – items list, discount code field and checkout button
- **Checkout** – shipping form, payment form and order summary
- **About** and **Contact** pages
- Unmatched routes show a simple *404* page

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
