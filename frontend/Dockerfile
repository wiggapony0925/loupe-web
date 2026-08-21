# trackify web — the SAME bundle Capacitor ships to iOS/Android, served as a
# website from nginx on Cloud Run (the loupe-web pattern).
#
#   gcloud run deploy trackify-web --source frontend --region us-central1

FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# capacitor.config.ts is listed in tsconfig's `include`; copying it keeps the
# image's typecheck byte-identical to the one CI and developers run.
COPY tsconfig.json vite.config.ts index.html capacitor.config.ts ./
COPY src ./src
# Public identifiers only (Firebase web config is not a secret); real secrets
# stay server-side. Supplied at build time by CI --build-arg.
ARG VITE_API_URL=""
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ENV VITE_API_URL=$VITE_API_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
RUN npx tsc -p tsconfig.json --noEmit && npx vite build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
