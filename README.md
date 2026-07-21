# LearnLoop

LearnLoop is an adaptive upper-high-school mathematics platform. The repository contains the browser experience plus a deployable API for authentication, persistent learning evidence, adaptive practice, generated follow-up questions, and teacher diagnostics.

## Repository and AI-assisted development

**Code repository:** https://github.com/idklol22/NierClassifiers

This entire codebase was developed phase by phase with Codex running on GPT-5.6, together with the Terra and Luna agents. The agents were used as implementation and review collaborators: requirements and outcomes were directed by the project author, while the agents generated, connected, tested, and refined the code and documentation in each phase.

| Phase | Codex, GPT-5.6, Terra, and Luna contribution | Delivered work |
| --- | --- | --- |
| 1. Product foundation | Translated the learning-platform requirements into the application structure, data model, question format, and interface plan. | LearnLoop browser application, curated mathematics question bank, and adaptive-learning foundations. |
| 2. Learning experience | Implemented and iterated on the student and teacher flows, including practice sessions, answer feedback, mastery evidence, and diagnostics. | Responsive frontend, adaptive question selection, misconception tracking, and teacher views. |
| 3. Production backend | Built and connected the API, database repository layer, authentication, authorization, validation, and deployment configuration. | Express/Postgres backend, JWT sessions, password hashing, API keys, seed tooling, and Vercel support. |
| 4. AI insights and hardening | Added the optional AI insight workflow, reviewed failure cases, improved fallbacks, and aligned operational documentation with the implementation. | Server-side Hugging Face insight endpoints, deterministic fallbacks, OpenAPI documentation, deployment guidance, and local run instructions. |

Codex and GPT-5.6 were used throughout the phases for implementation, debugging, code review, integration, and documentation. Terra and Luna were used alongside them to iterate on features, identify gaps, and strengthen the final end-to-end product.

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
- Optional Hugging Face AI insight endpoints that turn measured evidence into student focus areas and teacher reteaching suggestions. The Hugging Face token stays server-side, responses are cached, and deterministic summaries remain available without a token. The default uses the smaller `openai/gpt-oss-20b:cheapest` route to stay within free-tier credits as long as possible.
- AI-provider failures are soft failures: unavailable models, quota limits, refused requests, timeouts, or malformed model output never break the learning API; the response returns a friendly built-in insight instead.

## Security boundary

Passwords are hashed with bcrypt on the server. End-user sessions use signed JWTs. API keys are intended for trusted integrations and are separate from student/teacher identity. Production should use HTTPS, managed Postgres, environment secrets, key rotation, database backups, and a real deployment-specific CORS origin.
