# LearnLoop

LearnLoop is an adaptive upper-high-school mathematics platform. The repository contains the browser experience plus a deployable API for authentication, persistent learning evidence, adaptive practice, generated follow-up questions, and teacher diagnostics.

## Run locally

Install dependencies, then start the API:

```bash
npm install
npm run dev
```

The API runs at `http://localhost:4174`. The browser demo remains available from the project folder:

```bash
python -m http.server 4173
```

Open `http://localhost:4173` for the UI, `http://localhost:4174/docs` for Swagger UI, and `http://localhost:4174/health` for the API health check.

Local demo mode is enabled by setting `DEMO_MODE=true`, as shown in `.env.example`. It uses an in-memory repository so it can be run without a database. The API still hashes passwords and enforces JWT/API-key access in this mode.

## Demo accounts

- Student: `student@learnloop.demo` / `student123`
- Teacher: `teacher@learnloop.demo` / `teacher123`
- Demo integration key: `ll_demo_fasttrack_20260721_local_only`

The demo key is for local testing only. Do not use it in a hosted environment.

## Production deployment

The backend is Postgres-first and includes `api/index.js` plus `vercel.json` for Vercel. Set these Vercel Environment Variables:

- `DATABASE_URL`: managed Postgres connection string (Neon, Supabase, Railway, or equivalent).
- `JWT_SECRET`: long random secret, different for each environment.
- `DEMO_MODE=false`.
- `SEED_DEMO_DATA=false` after the initial controlled seed.
- `CORS_ORIGIN`: the deployed frontend origin.
- `API_KEY_HASHES` or a rotated `API_KEYS` value for service-to-service clients.

Run `npm run seed` once against the production database if you want the bundled question bank and demo accounts. For a real school, replace the demo accounts with provisioned users and rotate the integration key before sharing access.

See [docs/BACKEND_DEPLOYMENT.md](docs/BACKEND_DEPLOYMENT.md) for the Vercel/database checklist and [docs/openapi.yaml](docs/openapi.yaml) for the API contract.

## Included learning model

- 36 curated questions across algebra, functions, trigonometry, calculus, coordinate geometry/vectors, probability/statistics, matrices, and complex numbers.
- Multi-topic and multi-subskill tags.
- Distractor-level misconception diagnoses, not just right/wrong results.
- Topic and subskill mastery computed from every attempt.
- Adaptive next-question selection that prioritizes weak topics, avoids recent repeats, and adjusts difficulty.
- Parameterized questions generated on the fly when the curated bank is exhausted for a learner.
- Teacher class summaries, shared misconception clusters, student drill-downs, exact wrong selections, right solutions, and interventions.
- Optional AI insight endpoints that turn measured evidence into student focus areas and teacher reteaching suggestions. The OpenAI key stays server-side, responses are cached, and deterministic summaries remain available without a key.

## Security boundary

Passwords are hashed with bcrypt on the server. End-user sessions use signed JWTs. API keys are intended for trusted integrations and are separate from student/teacher identity. Production should use HTTPS, managed Postgres, environment secrets, key rotation, database backups, and a real deployment-specific CORS origin.
