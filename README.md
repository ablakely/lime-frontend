# lime-frontend

Node.js frontend for the LEMON manuals API with a Bootstrap 5 UI.

## Setup

```bash
npm install
```

## Run

```bash
LEMON_API_URL=http://localhost:8080 npm start
```

App runs at `http://localhost:3000` by default.

## Routes

- `/` make list
- `/:make` year list
- `/:make/:year` model/engine list
- `/:make/:year/:model` manual listing or manual content view

## API proxy routes

- `/api/makes`
- `/api/:make`
- `/api/:make/:year`
- `/api/:make/:year/:model`
- `/api/manual/*` (manual path passthrough)
