# Single-origin production image for the Polaris demo.
# Builds the React frontend, then runs the Express server which serves both
# the static SPA and the /api/* endpoints on one port. Works on Render,
# Railway, Fly.io, Cloud Run, or any Docker host.
FROM node:22-bookworm-slim

# better-sqlite3 is a native module — needs a toolchain to build at install time.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install + build the frontend
COPY frontend/package*.json frontend/
RUN cd frontend && npm install
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Install the server deps (compiles better-sqlite3 against Node 22)
COPY server/package*.json server/
RUN cd server && npm install
COPY server/ server/

# Seed data the backend reads on first boot
COPY data/ data/

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
EXPOSE 8080

WORKDIR /app/server
CMD ["npm", "start"]
