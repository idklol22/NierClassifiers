# LearnLoop API handoff

Swagger/OpenAPI file: `docs/openapi.yaml`

Local demo API key:

```text
ll_demo_fasttrack_20260721_local_only
```

Use it as:

```http
X-API-Key: ll_demo_fasttrack_20260721_local_only
```

Important: this key is local-only and must not be used in Vercel Production. The backend now exists in `backend/` and is deployable on Vercel with managed Postgres. For production, generate a new long random service key, store its SHA-256 hash in `API_KEY_HASHES`, and use JWTs for student/teacher identity.

## Demo accounts

Student:

```text
student@learnloop.demo
student123
```

Teacher:

```text
teacher@learnloop.demo
teacher123
```

## Key endpoints

- `POST /auth/login` logs in a student or teacher.
- `GET /me` returns the current user.
- `GET /students/{studentId}/mastery` returns topic and subskill mastery.
- `GET /students/{studentId}/insights` returns cached student focus areas, evidence, and next steps; use `?refresh=true` to request a fresh AI summary.
- `POST /practice/next` returns the next adaptive question.
- `POST /practice/attempts` saves an answer and returns diagnosis plus updated mastery.
- `GET /teacher/classes/{classId}/summary` returns teacher dashboard metrics and misconception clusters.
- `GET /teacher/classes/{classId}/insights` returns class priorities and reteaching suggestions from the measured evidence.
- `GET /teacher/classes/{classId}/students/{studentId}` returns a student drill-down with wrong answers, diagnoses, and intervention history.
- `POST /teacher/classes/{classId}/students/{studentId}/interventions` saves teacher notes.

The local API is `http://localhost:4174`; Swagger UI is `http://localhost:4174/docs`.

AI insight configuration uses a server-only Groq API key:

```text
GROQ_API_KEY=gsk_your_rotated_key
GROQ_MODEL=openai/gpt-oss-120b
GROQ_FALLBACK_MODELS=qwen/qwen3.6-27b
```

The key is never sent to student browsers. The LearnLoop access key below is separate: it authenticates callers to the LearnLoop API, while `GROQ_API_KEY` authorizes the backend's model request.

## Suggested fast-track message

```text
Here is the API Swagger contract: docs/openapi.yaml

Demo API key:
ll_demo_fasttrack_20260721_local_only

Send it in the X-API-Key header.

Heads up: this key is local-only. The deployable backend is included in the repository; use a managed Postgres database, a new production key, and JWT login for real users.
```
