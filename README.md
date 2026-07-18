# LearnLoop

LearnLoop is a hackathon-ready adaptive learning dashboard built around one complete, explainable loop:

**student answer → evidence-based diagnosis → living concept map → next useful question → teacher action**

The current demo is intentionally narrow: fraction arithmetic, one class, and synthetic student data. It uses deterministic learning procedures so the core experience works without a model or backend connection.

## Run the demo

Open `index.html` in a modern browser. For a local server, run any static file server from this folder, for example:

```bash
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Demo path

1. On first launch, complete the **Parent setup · Child login** prompt with the child's name and interests.
2. Choose a presentation style such as Space explorer, Ocean explorer, Jungle adventurer, Mystery detective, or Creative learner.
3. Stay in **Student view** and click **Continue practice**.
4. Submit `2/6` to see a candidate diagnosis, or `5/6` to see a confirmed improvement signal.
5. Switch to **Teacher view**.
6. Open the **Unscaled numerator** cluster to inspect representative answer evidence.
7. Click **Review and assign follow-up** to complete the teacher action.

## Child personalization

The parent setup creates a small presentation profile (`childName`, `favorite`, and `theme`). That profile changes the student-facing skin, welcome copy, card order emphasis, decorative language, colors, and next-step framing while keeping the underlying attempts, concept states, evidence, diagnosis, and recommendations unchanged. The profile is stored locally for this demo and can be changed from the child's top-bar interest chip.

## Product boundaries

- Synthetic or anonymized data only.
- Fraction procedures and exact-answer validation only.
- No claim of classroom learning gains.
- Neutral states: unknown, developing, blocked, improving, and mastered.
- Recommendations show their reason and evidence quality.

## Next build steps

The UI is structured so the deterministic demo can be replaced with versioned API contracts later: attempt capture, diagnosis, concept map, next-question selection, cluster summaries, and intervention records.
