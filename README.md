# D&D AI Dungeon Master

This project is a Dockerized MERN app for solo Dungeons & Dragons roleplay.

The player creates a campaign, defines a character and premise, and then plays through the story in a chat interface where the AI acts as the Dungeon Master. Campaign state is stored in MongoDB so the story, memory, and inventory can persist across sessions.

## How To Run

1. Create or update `EXPRESS/.env`.
2. Add your MongoDB config, Gemini config, and optional Groq fallback config.

```env
MONGO_URI=mongodb://sigrae_admin:fredmenson-1234@mongodb:27017/docker-chat?authSource=admin
PORT=3000
CLIENT_ORIGIN=http://localhost:5173

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_FALLBACK_MODELS=openai/gpt-oss-20b,llama-3.1-8b-instant,openai/gpt-oss-120b
```

3. From the project root, build and start the stack:

```bash
docker compose up --build
```

4. Open the frontend at `http://localhost:5173`.
5. The Express API runs at `http://localhost:3000`.
6. MongoDB is exposed at `mongodb://localhost:27017`.

Useful commands:

```bash
docker compose restart express
docker compose down
docker compose down -v
```

- `docker compose restart express` reloads backend code and env changes.
- `docker compose down` stops the stack but keeps MongoDB data.
- `docker compose down -v` stops the stack and deletes the MongoDB volume for this project.

## What The App Does

- Runs a D&D-style Dungeon Master chatbot in a React campaign interface.
- Stores campaigns, chat history, inventory, and remembered world facts in MongoDB.
- Uses Gemini as the primary model for DM responses.
- Automatically falls back to Groq if Gemini hits quota or retryable provider errors and Groq credentials are configured.
- Lets the player manually manage inventory with add, edit, and delete actions.

## Main Features

- Persistent campaigns:
  A campaign can be reopened later from local storage and MongoDB state.

- AI Dungeon Master:
  The assistant stays in DM mode and responds based on recent scenes, campaign setup, stored memory, and current inventory.

- Memory system:
  The backend extracts important durable facts from scenes and saves them for future continuity.

- Inventory system:
  The backend tracks inventory from the story, and the frontend provides manual CRUD controls in inventory modals.

- Provider awareness:
  The active AI provider and model are recorded on the campaign and shown in the UI.

- Error handling:
  Provider failures are shown as closable toast notifications, with a full error viewer available on demand.

## How The AI Works

For each DM response, the backend builds a prompt from:

- Campaign title and premise
- Player name and character name
- Tone and play style
- Recent conversation history
- Stored campaign memories
- Current tracked inventory

This helps the model behave more like a real Dungeon Master instead of a generic assistant.

## Fallback Behavior

The backend tries providers in this order:

1. Gemini
2. Groq

If Gemini returns quota, rate-limit, or similar retryable provider errors, the backend retries the request with Groq automatically.

Within Groq itself, the backend can also try multiple models in sequence:

1. `GROQ_MODEL`
2. models listed in `GROQ_FALLBACK_MODELS`
3. built-in defaults if no custom fallback list is provided

This fallback is used for:

- DM replies
- Memory extraction
- Inventory extraction

## Campaign Data Stored In MongoDB

Each campaign stores:

- Title
- Player name
- Character name
- Campaign premise
- Tone
- Play style
- Message history
- Memory entries
- Inventory items
- Active AI provider and model

## Project Structure

- `compose.yml`
  Defines the React, Express, and MongoDB services.

- `REACT/`
  The Vite + React frontend for campaign creation, story chat, inventory modals, toasts, and active-provider display.

- `EXPRESS/`
  The Express backend for campaign APIs, AI provider orchestration, MongoDB persistence, memory extraction, and inventory tracking.

## Current UI Overview

- Campaign setup screen before play begins
- Fixed top bar during active play
- Floating inventory button
- Inventory list modal
- Inventory create/edit modal
- Quick choice buttons when the DM gives structured options
- Jump-to-bottom control for long campaigns
- Hoverable AI indicator showing the current provider and model
- Dismissible error toast with full error detail modal

## Tech Stack

- React
- Vite
- Express
- Node.js
- MongoDB
- Mongoose
- Docker Compose
- Gemini API
- Groq API

## Credit

Created by Sigrae Derf Gabriel.
