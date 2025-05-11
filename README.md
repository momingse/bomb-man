# bomb-man

> A full-stack application with backend and frontend running concurrently.

![bomb-man](https://github.com/user-attachments/assets/35234398-d825-4f64-95c6-de8eaa1f5387)

## Prerequisites

- [Node.js](https://nodejs.org/) v14 or newer
- npm (comes with Node.js)

## Installation

From the project root directory, run:

```bash
npm install
```

This will:

1. Install `concurrently` in the root.
2. Automatically `cd backend && npm install`
3. Then `cd frontend && npm install`

## Development

To start both backend and frontend in development mode:

```bash
npm run dev
```

- **Backend**: runs in watch mode (reloads on changes).
- **Frontend**: runs Vite/dev server (with hot-reload).

## Building for Production

Build only the frontend:

```bash
npm run build-frontend
```

This outputs optimized assets to `frontend/dist`.

## Hosting

To serve the built frontend and start the backend:

```bash
npm run host
```

- Backend: starts in dev mode on port 8000 (default).
- Frontend: serves the built files via Vite preview.

### Accessing the App

- **Local machine**:
  Open your browser at [http://localhost:8000/](http://localhost:8000/)

- **From another device on your network**:
  After running `npm run host`, look in the console for a line like:

  ```
  [1]   ➜  Network: http://192.168.1.42:8000/
  ```

  Replace `192.168.1.42` with whatever IP is shown.
  Then point the other device’s browser to that URL.

## Available Scripts

| Script                   | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `npm run postinstall`    | Installs both backend & frontend dependencies automatically |
| `npm run dev`            | Runs backend + frontend in parallel for development         |
| `npm run dev-backend`    | Runs only the backend in dev mode                           |
| `npm run dev-frontend`   | Runs only the frontend in dev mode                          |
| `npm run build-frontend` | Builds frontend for production                              |
| `npm run serve`          | Serves both backend & built frontend in parallel            |
| `npm run host`           | Builds frontend then serves backend & frontend preview      |

## License

ISC
