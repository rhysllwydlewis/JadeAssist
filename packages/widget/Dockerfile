# packages/widget/Dockerfile
#
# Multi-stage build for the @jadeassist/widget service.
#
# Railway service settings (update in Railway dashboard):
#   Root Directory  : .   (repo root — gives Docker access to the monorepo root
#                          where package-lock.json lives)
#   Dockerfile Path : packages/widget/Dockerfile
#
# The build context must be the repo root so that COPY can access:
#   - package.json + package-lock.json  (at repo root)
#   - packages/                         (all workspace packages)
#
# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root-level workspace manifests (package-lock.json lives here)
# tsconfig.json is also required because packages/widget/tsconfig.json and
# packages/shared/tsconfig.json both extend "../../tsconfig.json" (repo root).
COPY package.json package-lock.json tsconfig.json ./

# Copy all workspace packages (needed for npm workspaces resolution and the
# @jadeassist/shared dependency referenced by the widget)
COPY packages/ ./packages/

# Install all dependencies from the monorepo root using the root lockfile.
# --ignore-scripts prevents lifecycle scripts (postinstall etc.) in third-party
# packages from running, which is a Docker security best practice. No workspace
# package in this repo uses postinstall scripts, so this is safe.
RUN npm ci --ignore-scripts

# Build the widget workspace (tsc + vite build + validate-build.js)
RUN npm run build --workspace=packages/widget

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:18-alpine AS runtime

WORKDIR /app/packages/widget

# Copy only what the static file server needs to run — keeps the image small
COPY --from=builder /app/packages/widget/dist ./dist
COPY --from=builder /app/packages/widget/server.js ./server.js

# PORT is injected by Railway at runtime (server.js defaults to 3000)
EXPOSE 3000

# Start the lightweight static file server
CMD ["node", "server.js"]
