# Bosch Solution Hub

## Run with Docker

Build and start the production container:

```powershell
docker compose up --build
```

Open `http://localhost:3000`.

To run the image without Compose:

```powershell
docker build -t bosch-solution-hub .
docker run --rm -p 3000:3000 --name bosch-solution-hub bosch-solution-hub
```

The Docker image uses Next.js standalone output, runs as a non-root user, and contains only the production runtime bundle. All data remains fictional mock data; no backend or authentication service is included.

## Local development

```powershell
npm.cmd install
npm.cmd run dev -- --webpack
```
