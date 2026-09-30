# Sahan Medonsa

Next.js lesson folders, YouTube video previews, student access toggles, and public student browsing and an
admin dashboard backed by Firebase Authentication and Cloud Firestore.

- Admin: `/admin`
- Public student view (no login): `/student`
- Public lessons: `/`

Follow [HOSTING.md](HOSTING.md) to enable Firestore, publish [firestore.rules](firestore.rules),
and create your admin account in Firebase project **medonsa**.

`npm run dev` starts the app. Optional `LOCAL_DEMO=true` in `.env.local` enables
browser-only demo data during development.

Checks: `npm run lint`, `npm test`, `npm run build -- --webpack`.
