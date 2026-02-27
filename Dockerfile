# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# API keys are baked into the bundle at build time by Vite's `define`
ARG API_KEY
ARG GEMINI_API_KEY
ENV API_KEY=$API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

RUN echo "=== Build-time env check ===" \
    && echo "API_KEY:        ${API_KEY:+[SET]}${API_KEY:-[NOT SET - API calls will fail]}" \
    && echo "GEMINI_API_KEY: ${GEMINI_API_KEY:+[SET]}${GEMINI_API_KEY:-[NOT SET - AI features will fail]}" \
    && npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config template — PORT is substituted at container startup
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Railway sets $PORT at runtime; default to 8080 for local Docker runs
ENV PORT=8080
EXPOSE 8080

CMD sh -c "envsubst '\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
