# Frontend production deployment

Use this checkout with the backend `production-ready-final` deployment. [Backend DEPLOYMENT.md](https://github.com/truongnguyen3006/ecommerce-backend-1-/blob/production-ready-final/DEPLOYMENT.md) covers complete infrastructure, secrets, ingress, Keycloak, migrations and recovery. Local `npm run dev` on port 3001 remains unchanged.

## Build and runtime

`Dockerfile` uses pinned Node 24.19.0 image digests, locked `npm ci`, a production Next standalone build and a non-root `node` runtime containing standalone output/static/public assets. Build-time inputs are `API_URL` (private Gateway HTTP upstream) and `NEXT_PUBLIC_WS_URL` (public HTTPS SockJS base URL, for example `https://shop.yourdomain/ws`). Changing these at runtime does not update compiled rewrite rules or browser JavaScript; rebuild for changed hosts. No Keycloak client secret, Cloudinary API secret, merchant secret or access token belongs in frontend environment/build arguments.

```bash
npm ci
npm run lint
npm run build
npm run test:unit
npm run test:e2e
npm run test:responsive
docker build --build-arg API_URL=http://api-gateway:8080   --build-arg NEXT_PUBLIC_WS_URL=https://shop.yourdomain/ws   -t ghcr.io/your-owner/frontend:your-immutable-release .
```

The container runs `node server.js` on port 3001. `/health` returns status with no caching and has a Node-fetch container healthcheck. This endpoint verifies the frontend process, not backend readiness. Public ingress separately checks Gateway readiness. Existing local `npm run start` remains for test/dev use; production uses the standalone entrypoint.

The backend Nginx routes same-origin `/api/` and `/auth/` directly to Gateway and `/ws`/SockJS to Notification. Next rewrite configuration remains usable for direct local access. HTTPS SockJS uses WSS for its WebSocket transport; do not give SockJS a `wss://` base URL. Credentials remain server-side in User/Product/Payment services. Browser JWT handling and existing authentication/owner checks are preserved.

## Upload and security

Frontend accepts at most 20 images, 10 MiB each, total file bytes at most 48 MiB. Nginx/Gateway/Spring permit at most 50 MiB total multipart body, preserving overhead margin. A 413 produces an accurate size message. Public uploads bypass Next.js proxy buffering; they retain backend ADMIN enforcement and server-side Cloudinary secrets. Missing Cloudinary credentials still fail safely; broad M03 error redesign is deferred.

Next sets frame denial, content-type and referrer headers and removes `X-Powered-By`; ingress supplies additional headers/HSTS only behind the configured HTTPS edge. No fake TLS certificate or active HTTPS claim is included.

Payment fence/pending/reconciliation flags drive cancellation/payment actions and polling. Late confirmed receipts requiring reconciliation are visible; the UI never treats a provider return query string as authoritative success. No unrelated page/layout/feature change is included.

## CI and publication

`ci.yml` runs on relevant branch pushes and pull requests: pinned Node, `npm ci`, lint, build, Playwright Chromium installation, unit, desktop/mobile E2E and responsive tests. Self-contained fixtures do not need production credentials. `release.yml` is manual, guarded to `production-ready-final`, repeats those checks and publishes an immutable GHCR image with `GITHUB_TOKEN`, SBOM and provenance. Inputs are an immutable release tag and a public HTTPS SockJS URL; use the backend release tag for a matched deployment. There is no automatic server deployment.

Run the backend production checklist, real ingress health checks, authenticated smoke, Cloudinary/VNPay sandbox and backup/restore rehearsal before enabling public writes. This task did not deploy a public website or execute external provider flows.
