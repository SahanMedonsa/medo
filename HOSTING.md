# Firebase setup — Sahan Medonsa

The website now uses **Cloud Firestore** and **Firebase Authentication** in your
`medonsa` project. Supabase is no longer used by the app. Its old SQL files are
retained only as historical references; do not run them for Firebase.

## Finish setup in Firebase Console

1. Open https://console.firebase.google.com/project/medonsa/overview.
2. Go to **Build → Firestore Database → Create database**. Choose the **Standard**
   edition and the default database, select a suitable location, and use production
   mode. If you already created the default database, skip this step.
3. Open Firestore's **Rules** tab. Replace its contents with this project's
   `firestore.rules` and click **Publish**.
4. Open **Authentication → Get started → Sign-in method** and enable **Email/Password**.
5. Under **Authentication → Users → Add user**, create your administrator email/password.
6. Copy that account's **User UID**.
7. In Firestore **Data**, create a collection called `admins`. Create a document
   whose **document ID is exactly that User UID**. Add a string field
   `label` with the value `Administrator`. This document grants admin access.
   Only trusted project owners should create admin documents in the console.
8. Run `npm run dev`, open http://localhost:3000/admin, and sign in with your email
   and password. The Username field accepts your email.

The app creates `lesson_folders` and `modules` documents when you save content.
There are no SQL migrations for Firebase. Optional username aliases can be configured
with `ADMIN_USERNAME` and `ADMIN_EMAIL` in `.env.local`.

## Student access

Everyone can browse all published lessons at `/` or `/student` without an account.
The old `/student/login` address redirects to `/student`. Only administrators sign
in to manage content. Drafts remain visible only to administrators.

## Add lessons and videos

At `/admin`, choose a course and click **Add lessons**. Enter the folder title,
description, planned video count, and available marks. Open the folder and click
**Add video**, paste a YouTube link, then **Get title & preview**. Save as a draft or
publish. The card switch enables/disables the video for students. High-resolution
thumbnails fall back when YouTube does not provide them.

Folder metadata is public. Only published videos are public. Admins see all videos.
The planned count is informational; actual counts depend on videos visible to the viewer.

## #tute videos

Open **#tute → Add video**, paste a YouTube link, and save a draft or publish.
This section contains videos only; the PDF upload option has been removed.

If Firebase blocks saving, publish this project's latest `firestore.rules` in
**Firebase Console → Firestore Database → Rules**. The rules must allow the
`#tute` category and a null `folder_id` for videos outside lesson folders.
Restarting or redeploying the website does not publish Firestore rules.

## Local frontend demo

To continue previewing without Firebase login, put `LOCAL_DEMO=true` in `.env.local`
and restart `npm run dev`. This explicitly selects browser-only demo storage and
does not connect that demo data to Firebase. It is ignored in production.
Set it to false or remove it to use Firebase.

Existing browser demo data and any old Supabase data are **not automatically migrated**.
Create your folders/videos in Firebase after signing in to save them online.

## Deploy

Use a Next.js-capable host, such as Vercel. Import the Git repository, select Next.js,
and deploy with `npm run build`. Do not use static export: the app has server APIs.
Your supplied Firebase web configuration is in `src/lib/firebase-config.ts`.
It identifies the project; the Firestore rules control access. No service-account
private key is needed: server database calls use the signed-in user's Firebase ID token.

If Firebase CLI is already configured and you prefer CLI rule deployment:
`firebase deploy --only firestore:rules --project medonsa`.
This repository includes `firebase.json` and `.firebaserc`; no rules have been
deployed automatically.

Admin sessions use HTTP-only cookies with Secure enabled in
production. Sessions last at most one hour; sign in again after expiration. Logout
removes the cookie from this browser; an already issued Firebase ID token remains
valid until expiry. Refresh tokens are not retained.

## Verify before sharing

- Publish the supplied rules; never enable unrestricted database writes.
- Add a folder and draft video as admin; refresh to verify persistence.
- Check in a private window that draft videos do not appear.
- Toggle the video on/off and reload the student view.
- Verify visitors can browse without signing in and cannot modify content.
- Test real YouTube metadata and playback; restricted videos may not embed.

Run `npm run lint`, `npm test`, and `npm run build -- --webpack` locally.
Automated tests mock Firebase network responses. Real authentication, rule enforcement
and persistence must also be checked against the configured project.

References:
- https://firebase.google.com/docs/firestore/use-rest-api
- https://firebase.google.com/docs/reference/rest/auth
- https://firebase.google.com/docs/firestore/security/get-started

## Sinhala and English medium

Choose a medium beside “Learning space” to browse its folders and videos. The
selection is remembered in this browser. Existing content without a medium is
shown under Sinhala.

Admins use the same selector to browse content, then choose the teaching medium
in the folder or video editor. Enter titles and descriptions in that medium;
these are separate lessons, not automatic translations. Folder medium is fixed
after creation to keep its videos together. Create another folder for the other
medium. A video can only be assigned to a folder with the same medium.

Publish the updated `firestore.rules` before saving medium-tagged content:
`firebase deploy --only firestore:rules --project medonsa`.
If your CLI session has expired, run `firebase login --reauth` first.
