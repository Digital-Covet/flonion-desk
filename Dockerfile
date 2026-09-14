FROM node:24-alpine AS base
RUN npm install -g pnpm@12.3.4
WORKDIR /app

# Dependency stages copy only the manifests, so nothing else in the build
# context (secrets included) reaches these layers.
FROM base AS development-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
RUN pnpm install --frozen-lockfile

FROM base AS production-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
RUN pnpm install --prod --frozen-lockfile

FROM base AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
RUN pnpm run build

# Configuration (DATABASE_URL, BETTER_AUTH_*, OAUTH_*, ...) is passed at runtime,
# never baked into the image.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
CMD ["npm", "run", "start"]
