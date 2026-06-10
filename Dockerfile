FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:20-alpine AS production-dependencies-env
COPY ./package.json ./pnpm-lock.yaml /app/
WORKDIR /app
RUN corepack enable && pnpm install --prod --frozen-lockfile

FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN corepack enable && pnpm build

FROM node:20-alpine
COPY ./package.json ./pnpm-lock.yaml /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/dist /app/dist
WORKDIR /app
RUN corepack enable
CMD ["pnpm", "exec", "vite", "preview", "--host", "0.0.0.0"]
