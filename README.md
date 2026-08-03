# Kevin AI - Premium Analytics & Chat Dashboard

A clean, modern, and responsive AI dashboard built with a modular Node.js + Express backend, robust database fallbacks, and a stunning custom Vanilla CSS single-page interface.

![Kevin AI Preview](public/assets/logo-light.png)

## Key Features

- **User Authentication**: Secure JWT-based registration and login system with password hashing (`bcryptjs`).
- **Interactive AI Chat**: Thread-based conversation console supporting Markdown parsing, headers, lists, code block formatting, and a single-click "Copy Code" button.
- **Usage History Charts**: Dynamic visual rendering of API requests and token expenditures using `Chart.js` matching active color themes.
- **Analytics Overview**: Tracks aggregate statistics including total requests, total token counts, and average response times.
- **Multi-Theme Support**: Instantly toggle between three custom-designed interfaces:
  - **Dark Slate** (Default): Sophisticated charcoal-slate backdrop with blue and cyan glows.
  - **Ice Light**: Crisp, bright off-white aesthetics with light card containers.
  - **Cyberpunk Neon**: Retro-futurist deep black theme with vibrant glowing cyan borders.
- **Custom Credentials**: Input your own OpenAI API key in the Settings panel; saved securely in local browser storage.
- **Failsafe System Database**: Auto-detects cloud MongoDB Atlas connection issues (e.g. firewall/IP restrictions) and seamlessly switches to local SQLite (`database.sqlite`) to ensure zero-configuration startup.
- **Developer Sandbox**: Seed simulated usage logs for the last 7 days to test analytics widgets without hitting live APIs.

---

## Tech Stack

- **Backend**: Node.js, Express, Mongoose (MongoDB), SQLite3, jsonwebtoken, bcryptjs, OpenAI SDK.
- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System & transitions), Vanilla JavaScript (SPA client router).
- **Visualization**: Chart.js.

---

## Installation & Setup

### 1. Prerequisites
Ensure you have **Node.js** installed (v18.0.0 or higher recommended).

### 2. Install Dependencies
Clone the repository and install packages from the root directory:
```bash
npm install
```

### 3. Environment Variables (Optional)
A `.env` file is generated automatically with placeholder configurations. You can adjust the parameters:
```env
PORT=3000
MONGODB_URI=your-mongodb-atlas-uri
JWT_SECRET=your-jwt-signing-secret
OPENAI_API_KEY=your-openai-api-key
```

### 4. Run the Application

Start the production server:
```bash
npm start
```

Or run in development mode (with server auto-restarts on changes):
```bash
npm run dev
```

Open your browser and navigate to **`http://localhost:3000`** to view the application.

---

## Architecture Overview

```
├── server.js            # Main entry point (Express configuration & routing binding)
├── db.js                # Unified database model wrapper (Mongoose & SQLite fallback logic)
├── package.json         # Dependencies & execution scripts
├── database.sqlite      # SQLite database file (created on MongoDB connection fallback)
├── routes/
│   ├── auth.js          # Authentication endpoint routers (JWT token generation & verifying)
│   ├── chat.js          # Conversation history & OpenAI interaction endpoints (with mock fallback)
│   └── analytics.js     # Statistics fetchers & seeding scripts
└── public/
    ├── index.html       # Single Page Application HTML frame
    ├── assets/          # Extracted brand logo assets
    ├── css/
    │   ├── style.css    # Typography, animations, and global CSS theme variables
    │   ├── dashboard.css# Overview metrics layout
    │   ├── chat.css     # Chat panel bubble styles and codeblock copy handlers
    │   └── settings.css # Profile forms and settings selectors
    └── js/
        ├── app.js       # SPA router, theme updater, and user state manager
        ├── auth.js      # Register/Login request handles
        ├── dashboard.js # Chart.js drawing and metrics loading
        ├── chat.js      # Message streams, threads, and markdown rendering
        └── settings.js  # Theme setters, custom api key cache, and seed buttons
```

---

## Robust Failsafes

### Database Fallback
If the application cannot connect to the configured MongoDB Atlas cluster (often due to IP whitelisting or bad credentials), it logs the warning and mounts a local SQLite database file `database.sqlite` in the root folder, initializing matching tables. Everything runs completely normally without user intervention.

### Prompt Simulation Failsafe
If the OpenAI API key is missing or fails due to network/credit issues, the chat interface redirects the prompt to a simulated assistant. It will output a helpful markdown response describing the mode, while logging simulated token and time latency data to database. Seeding logs is also available in the Settings panel for developers to preview the chart components.
