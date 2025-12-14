# MVP-NIC-MARKET

A "Bloomberg-style" financial intelligence platform for the Nicaraguan market (Bolsa de Valores de Nicaragua).
This project aggregates data from issuers, processes it using AI, and presents it in a modern dashboard.

## Architecture

The project is built on **Firebase** and consists of:

### 1. Frontend (`webapp/`)
- **Framework**: React (Vite) + TypeScript
- **Styling**: TailwindCSS
- **State Management**: TanStack Query (React Query)
- **Deployment**: Firebase Hosting

### 2. Backend (`functions/`)
- **Runtime**: Node.js 20 (Firebase Cloud Functions v2)
- **Database**: Cloud Firestore
- **Vector Search**: Firestore Vector Search (embeddings)
- **AI**: Google Vertex AI (Gemini Models)

## Getting Started

### Prerequisites
- Node.js (v20+)
- Firebase CLI (`npm install -g firebase-tools`)

### Running Locally

1.  **Frontend**:
    ```bash
    cd webapp
    npm install
    npm run dev
    ```

2.  **Backend (Emulators)**:
    ```bash
    cd functions
    npm install
    # From project root
    firebase emulators:start
    ```

## Project Structure

- `functions/`: Cloud Functions source code (API, Triggers, Scheduled Tasks).
- `webapp/`: React frontend application.
- `scripts/`: Maintenance and debugging scripts.
  - `maintenance/`: Recurring tasks.
  - `debug/`: One-off analysis tools.

## Key Features
- **AI-Powered Analysis**: Extracts financials and summarizes "Hechos Relevantes" using Gemini.
- **Vector Search**: Semantic search over issuer documentation.
- **Real-time Dashboard**: Live updates of market data.