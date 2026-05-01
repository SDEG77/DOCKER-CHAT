# D&D Gemini Dungeon Master

This project is a Dockerized MERN app that turns Gemini into a persistent Dungeons & Dragons Dungeon Master for a solo player.

The app lets a user start a campaign, describe their character and campaign premise, and then play through the adventure in a chat interface. The AI responds as the Dungeon Master, keeps the story moving, and stores important campaign facts in MongoDB so the session can maintain continuity over time.

## How To Run

1. Create or update `EXPRESS/.env`.
2. Make sure it contains your Mongo connection plus your Gemini settings.
3. Add your Gemini API key:

```env
MONGO_URI=mongodb://sigrae_admin:fredmenson-1234@mongodb:27017/docker-chat?authSource=admin
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

1. Start your Docker engine and from the project root, start the app by typing this in the terminal:

```bash
docker compose up --build
```

5. Open the frontend at `http://localhost:5173`.
6. The Express API will be available at `http://localhost:3000`.
7. MongoDB will be available at `mongodb://localhost:27017`.

Useful commands:

```bash
docker compose down
docker compose down -v
```

- `docker compose down` stops the stack but keeps MongoDB data.
- `docker compose down -v` stops the stack and deletes the MongoDB volume data for this project.

## What This Project Does

- Uses a React frontend as the player-facing campaign interface.
- Uses an Express backend to manage campaigns, chat messages, and Gemini API calls.
- Uses MongoDB to persist campaign state, including chat history and important remembered facts.
- Uses Docker Compose to run the full stack together.

## Core Idea

The main goal of this project is to create a roleplaying chatbot that feels more like a real Dungeon Master than a generic AI assistant.

Instead of only answering the latest message, the backend builds a DM-style prompt using:

- The campaign title and premise
- The player's name and character name
- Tone and preferred play style
- Recent conversation history
- Important stored memories from earlier scenes

This helps Gemini stay in character, reference past events, and keep the campaign internally consistent.

## How Memory Works

The backend stores each campaign in MongoDB. A campaign includes:

- Campaign metadata
- A message history between the player and the Dungeon Master
- A memory list of important facts

After each exchange, the backend asks Gemini to extract durable campaign facts from the latest scene. These memories can include:

- Named NPCs
- Locations
- Quests
- Items
- Character-defining decisions
- Important world facts

Those memories are saved in MongoDB and reused in future prompts so the AI is less likely to forget what already happened.

## Project Structure

- `compose.yml`
  Runs the React app, Express API, and MongoDB database together.
- `REACT/`
  The frontend Vite + React app where the player starts a campaign and chats with the DM.
- `EXPRESS/`
  The backend API that handles campaign creation, message flow, MongoDB persistence, and Gemini requests.

## Main Flow

1. The player opens the React app.
2. The player creates a new campaign by entering the campaign title, character name, tone, and premise.
3. The Express API creates a MongoDB campaign document.
4. Gemini generates the opening scene as the Dungeon Master.
5. The player replies through the chat UI.
6. The backend sends recent context plus stored memories to Gemini.
7. Gemini replies as the Dungeon Master.
8. Important facts from the new scene are extracted and stored back into MongoDB.

## Tech Stack
- React
- Vite
- Express
- Node.js
- MongoDB
- Docker
- Gemini API
