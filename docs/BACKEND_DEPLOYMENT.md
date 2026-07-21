# LearnLoop backend deployment

This is the production path for the API. The Vercel function is `api/index.js`, which loads the Express application from `backend/app.js`.

## 1. Create a managed Postgres database

Create a database with Neon, Supabase, Railway, Render Postgres, or another provider. Copy its pooled connection string into Vercel as `DATABASE_URL`.

The API creates its tables and indexes on first startup. The schema includes users, classes, memberships, questions, attempts, and interventions.

## 2. Configure Vercel environment variables

Use separate values for Preview and Production:

```text
NODE_ENV=production
DATABASE_URL=your-managed-postgres-connection-string
DEMO_MODE=false
SEED_DEMO_DATA=false
JWT_SECRET=long-random-environment-specific-secret
CORS_ORIGIN=https://your-frontend-domain.example
API_KEY_HASHES=sha256-hash-of-a-service-key
ALLOW_TEACHER_SIGNUP=false
GROQ_API_KEY=server-only-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b
GROQ_FALLBACK_MODELS=qwen/qwen3.6-27b
AI_INSIGHTS_ENABLED=true
AI_INSIGHTS_CACHE_MINUTES=30
```

For the first database setup only, run the seed command locally with the production `DATABASE_URL`, or temporarily use `SEED_DEMO_DATA=true` and switch it back to false immediately afterward.

Generate a service key with:

```bash
npm run key:generate
```

Give the printed key to the trusted integration once, and put only the printed hash into Vercel.

## 3. Deploy

Import the repository into Vercel. The included `vercel.json` routes `/api/*` to the Node function and leaves the browser files available as static assets. The API base URL will be:

```text
https://your-project.vercel.app/api/v1
```

Swagger UI is available at `/docs` and the machine-readable contract at `/openapi.json`.

## 4. API access model

- `POST /api/v1/auth/login` returns a seven-day JWT for a student or teacher.
- Send that JWT as `Authorization: Bearer <token>` for end-user actions.
- Send `X-API-Key: <service-key>` for trusted server-to-server integrations.
- API keys do not represent a student or teacher identity; `/me` therefore requires a JWT.
- Teacher class data is restricted to the teacher's assigned class when using a JWT.
- `GET /api/v1/students/{studentId}/insights` generates a student focus summary from mastery, subskills, and mistakes.
- `GET /api/v1/teacher/classes/{classId}/insights` generates class priorities and reteaching suggestions.
- Add `?refresh=true` only when a fresh model call is needed; otherwise the API serves the cached insight.

The Groq API key is read only by the backend. It is never returned to the browser or included in the student data payload. If the key is absent or the model call fails, the API returns a deterministic fallback so learning and teacher dashboards continue working.

The configured primary model is `openai/gpt-oss-120b`, with `qwen/qwen3.6-27b` as the fallback. Both are hosted by Groq and may incur usage charges or be subject to rate limits; configure spending controls in Groq before exposing the endpoint publicly.

At runtime LearnLoop tries `GROQ_MODEL` first, then the comma-separated `GROQ_FALLBACK_MODELS`. If authentication, quota, model availability, timeout, or JSON parsing fails, the request still returns HTTP 200 with a built-in evidence-based insight.

## 5. Before inviting real users

- Replace every demo credential and remove demo accounts if they are not needed.
- Generate and store only a SHA-256 hash of each long random service key in `API_KEY_HASHES`.
- Configure database backups and connection pooling.
- Set the exact frontend origin in `CORS_ORIGIN`.
- Add monitoring for 5xx responses and failed login spikes.
- Put an account recovery and school-admin provisioning flow in front of teacher accounts.
