# CMS Ecommerce App

This project is a simple CMS ecommerce demo using a Python Flask backend and a React frontend.

It now also includes a minimal, robust and reliable chatbot assistant served from
the backend and accessible from the main frontend page.

## Backend

See [backend/README.md](backend/README.md) for setup instructions.

## Frontend

Open [frontend/index.html](frontend/index.html) in your browser after starting the backend. The page is styled with Bootstrap and a custom stylesheet that supports light and dark themes.

## Chatbot Assistant
A minimal chatbot is included for demonstration. It is accessed via the main page and uses the `/chat` API endpoint.
Messages containing words like "hello" or "price" trigger helpful replies, otherwise the bot echoes your text. Missing messages return an error, ensuring reliable behavior.
