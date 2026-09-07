# Quantum Particle Swarm Optimization (QPSO) Road Network Routing System

An advanced, high-performance web application for multi-objective road routing and traffic optimization across Andhra Pradesh using **Quantum-behaved Particle Swarm Optimization (QPSO)** and **Dijkstra's Algorithm**.

---

## 📁 Project Directory Structure

```text
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── Dockerfile              # Production multi-stage Docker build (Node.js + Nginx)
├── README.md               # Project documentation and deployment guide
├── index.html              # Primary HTML entry point
├── metadata.json           # Application metadata & permissions
├── nginx.conf              # Production Nginx reverse proxy configuration
├── package.json            # Dependencies and npm scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
├── public/                 # Static public assets
└── src/
    ├── App.tsx             # Main application component & layout shell
    ├── main.tsx            # Application entry point & React root mount
    ├── index.css           # Global Tailwind CSS entry
    ├── algorithms/         # Metaheuristic routing & AI model logic
    │   ├── evaluator.ts    # Multi-objective fitness function & Dijkstra solver
    │   ├── qpso.ts         # QPSO engine (quantum position update, mbest, decay)
    │   └── trafficModel.ts # Machine Learning traffic congestion predictor
    ├── components/         # Modular UI components
    │   ├── ControlPanel.tsx         # Route selection, vehicle filters, mode toggles
    │   ├── GraphVisualizer.tsx      # Interactive SVG road network graph visualizer
    │   ├── QpsoConvergenceChart.tsx # Recharts convergence & fitness curves
    │   ├── RouteComparisonCard.tsx  # Side-by-side metric comparison cards
    │   ├── Header.tsx               # Application header navigation bar
    │   └── IncidentManager.tsx      # Road incident & hazard simulation controls
    ├── data/               # Regional road network data
    │   └── roadNetworks.ts # Andhra Pradesh cities, towns, villages & road edges
    └── types/              # TypeScript interfaces & types
        └── index.ts        # Vertex, Edge, Route, QPSO & Traffic model types
```

---

## 🛠️ Tech Stack & Key Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Visualization & UI**: Lucide React icons, Recharts (convergence graphs), Custom Interactive SVG Canvas
- **Algorithms**: Quantum Particle Swarm Optimization (QPSO), Dijkstra's Algorithm
- **Deployment**: Nginx, Docker, Render.com / Cloud Run

---

## ⚡ Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd <project-folder>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start the dev server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (or `http://localhost:5173`) in your browser.

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📋 Deployment Requirements

Before deploying to Render (or any cloud host), verify:

1. **Node.js Runtime**: Node 18+ or Node 20+.
2. **Build Command**: `npm run build` (generates static output in the `dist/` directory).
3. **Publish / Output Directory**: `dist`
4. **Environment Variables** (Optional):
   - `VITE_APP_TITLE` (optional custom title)
   - `GEMINI_API_KEY` (if using server-side Gemini features)

---

## 🚀 Deployment Process on Render.com

Render offers two seamless deployment options: **Static Site (Recommended & Free)** and **Web Service / Docker Container**.

### Option 1: Render Static Site (Recommended)

1. **Push Code to GitHub / GitLab**:
   - Push your code repository to GitHub or GitLab.

2. **Log in to Render**:
   - Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in.

3. **Create a New Static Site**:
   - Click the **New +** button in the top right corner.
   - Select **Static Site**.

4. **Connect Repository**:
   - Select your GitHub/GitLab repository and grant access.

5. **Configure Build Settings**:
   - **Name**: `qpso-road-routing` (or your preferred name)
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave blank (root)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

6. **Configure Single Page Application (SPA) Redirects**:
   - In the Render Dashboard under **Redirects/Rewrite Rules**:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite`
   *(This ensures client-side routing works on refresh).*

7. **Deploy**:
   - Click **Create Static Site**. Render will automatically build and deploy your app with a free custom SSL URL (`https://your-app.onrender.com`).

---

### Option 2: Render Docker Web Service

Since the project includes a production `Dockerfile` and `nginx.conf`:

1. Go to Render Dashboard -> Click **New +** -> Select **Web Service**.
2. Connect your GitHub/GitLab repository.
3. Set **Runtime** to **Docker**.
4. Set **Region** and select the **Free** tier (or paid tier).
5. Render will automatically detect `Dockerfile` and `nginx.conf`, build the multi-stage image, and launch the Nginx web server on port `80`.

---

## 🧪 Testing Production Build Locally

To test the production build locally using Docker:

```bash
docker build -t qpso-routing-app .
docker run -p 8080:80 qpso-routing-app
```
Then visit `http://localhost:8080` in your browser.
