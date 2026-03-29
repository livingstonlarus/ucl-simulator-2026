# UCL Simulator 2026/2027

A modern web application to simulate the UEFA Champions League 2026/2027 qualifications and tournament, built entirely from scratch with full team logic, dynamic standings, and correct coefficient rules.

## Features
- **Dynamic Coefficient Boards:** Accurately tracks both Nation/League Association rankings (fantasy and real).
- **Match Simulation:** Fully interactive bracket system, including keyboard-optimized penalty shootouts.
- **Automated Wikipedia Logo Scraping:** Smart bots dynamically search Wikipedia for valid club crests, throttling correctly to avoid API limits.
- **Persistent Local Database:** All scores and generation statuses are tracked in SQLite. 
- **Premium Responsive UI:** Aesthetic "glassmorphism" UEFA design tokens, mobile-first compatibility, and deep CSS animations.

## Tech Stack
- Frontend: React (Vite.js)
- Backend: Express (Node.js)
- Database: SQLite3
- Styling: Custom Vanilla CSS (No Tailwind)
- Orchestration: Kubernetes / Docker

## Local Setup

1. **Install dependencies:**
    ```bash
    npm install
    ```
2. **Start the Express API & SQLite Database:**
    ```bash
    node server.js
    ```
    *The server runs locally on port 3000.*

3. **Start the Vite Frontend:**
    ```bash
    npm run dev
    ```
    *The frontend starts on port 5173.*

## Scripts & Utilities

In the `/scripts` directory, there are multiple built-in utility scrapers:
- **`fetch_missing_logos.js`**: Re-scrapes European team logos from Wikipedia using an authenticated API bypass and smart backoff.
- **`populate_logo_mapping.js`**: Iterates through the raw SQLite database to find any dynamically generated team name and creates a `src/logoMapping.json` target file.
- **`fix_lyon.js` / `fix_more_logos.js`**: Single-target scripts to overwrite errant kit images with correct team crests for teams like Napoli, Benfica, and Olympique Lyonnais.

## Server Deployment Strategy (Production)

The production environment correctly utilizes the **host's Git tracking** combined with a Kubernetes `hostPath` deployment architecture. To push new local changes:

1. Validate and commit your work locally (`git push origin main`).
2. SSH into the primary server: `ssh root@65.109.90.115`
3. Enter the target web directory: 
    ```bash
    cd /var/www/ucl-simulator
    ```
4. Seamlessly pull the changes from GitHub directly through HTTPS:
    ```bash
    git pull origin main
    ```
5. JavaScript packages must be built directly within the running pod (since the root host lacks Node/NPM) to correctly populate the mounted `/dist` bundle folder:
    ```bash
    kubectl exec -it deployment/ucl-simulator -n ucl-simulator -- npm install
    kubectl exec -it deployment/ucl-simulator -n ucl-simulator -- npm run build
    ```
6. Gracefully restart the backend pod to mount the new built bundle and recognize any logic updates:
    ```bash
    kubectl rollout restart deploy ucl-simulator -n ucl-simulator
    ```
