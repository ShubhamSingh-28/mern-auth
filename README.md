# MERN Auth — two-token authentication

A minimal MERN app (MongoDB, Express, React, Node) demonstrating signup, login,
and a protected dashboard using a short-lived access token + long-lived,
rotating refresh token. Backend and frontend are both TypeScript, and both
use native ES modules (`"type": "module"` on the server, Vite's default ESM
setup on the client) — no CommonJS `require`.

## Structure

```
mern-auth/
  server/   Express + TypeScript API (ESM)
  client/   React + TypeScript frontend (Vite, ESM)
```

## How the tokens work

- **Access token** — a JWT signed with `ACCESS_TOKEN_SECRET`, 15 minute
  expiry. Sent in the `Authorization: Bearer` header on every API call.
  Kept only in a JS variable in memory on the client (`src/api/axios.ts`) —
  never written to `localStorage`/`sessionStorage`, which reduces exposure
  to XSS-based token theft. It's lost on page refresh by design; that's what
  the refresh token is for.
- **Refresh token** — a JWT signed with a *different* secret
  (`REFRESH_TOKEN_SECRET`), 7 day expiry. Stored as an **httpOnly, secure,
  sameSite cookie**, scoped to `/api/auth`, so client-side JS can never read
  it — only the browser sends it automatically to that path. A hash of it is
  also stored on the `User` document so it can be looked up and revoked.
- **Rotation** — every call to `POST /api/auth/refresh` invalidates the
  refresh token that was used and issues a new one. This limits the damage
  if a refresh token is ever stolen: it can only be replayed once before the
  legitimate user's next refresh call invalidates it.
- **Session bootstrap** — on page load, the client silently calls
  `/api/auth/refresh`. If the httpOnly cookie is still valid, the user is
  logged back in without re-entering credentials. If not, they're routed to
  `/login`.
- **401 handling** — an axios response interceptor catches expired-access-token
  401s, calls `/api/auth/refresh` once, and retries the original request
  transparently.

## Local setup

**Server**
```
cd server
cp .env.example .env   # fill in MongoDB URI and JWT secrets
npm install
npm run dev
```

**Client**
```
cd client
cp .env.example .env
npm install
npm run dev
```

Visit `https://mern-auth-one-eta.vercel.app`.

## Deployment notes

- **Frontend** → Vercel or Netlify (static build via `npm run build`).
- **Backend** → Render or Railway (both support long-running Node processes
  and easy env var config).
- **Database** → MongoDB Atlas free tier.
- In production, `NODE_ENV=production` switches the refresh cookie to
  `secure: true, sameSite: "none"`, which is required for cross-origin
  cookies (frontend and backend on different domains) to be sent by the
  browser at all. `CORS` is configured with `credentials: true` on the
  server and `withCredentials: true` on the client to match.

## API summary

| Method | Route                | Auth required | Purpose |
|--------|-----------------------|---------------|---------|
| POST   | /api/auth/signup      | no            | Create account, issue tokens |
| POST   | /api/auth/login       | no            | Verify credentials, issue tokens |
| POST   | /api/auth/refresh     | refresh cookie| Rotate refresh token, issue new access token |
| POST   | /api/auth/logout      | refresh cookie| Revoke refresh token, clear cookie |
| GET    | /api/dashboard        | access token  | Example protected route |
