<div align="center">

# MTA University Library Collector

**المكتبة الأكاديمية الجامعية**

**MTA TECHNOLOGIES** · Learn • Search • Explore · تعلّم • ابحث • استكشف

Android package: `com.mtatechnologies.universitylibrarycollector`

</div>

---

## What this project is

An existing full-stack academic platform for Yemen's higher-education system, preserved and completed rather than replaced:

- **Academic directory** of institutions, faculties, departments, programs, study plans and courses.
- **Academic digital library** of books, research, theses, journals, dictionaries, encyclopedias, OER and course material, with copyright and access metadata.
- **Unified search** across the directory, curricula and library.
- **Accounts and RBAC** for five roles, with server-enforced permissions, profiles, saved items and reading lists.
- **Moderated PDF submissions** open to visitors without registration: quarantine, SHA-256 duplicate detection, security screening, academic review, separate approval and publication, complaints and audit trails.
- **Arabic-first RTL UI** with English LTR, light/dark themes, responsive layouts, and the original MTA TECHNOLOGIES identity.
- **Capacitor Android project** configured with the original package ID.

No academic record, licence, accreditation, statistic or test result in this repository is invented. Missing evidence is displayed as **not documented / unverified**, never as approval or rejection.

## Architecture

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, lucide-react |
| Backend | Node.js, Express 4, TypeScript (tsx), Zod validation |
| Database | SQLite via better-sqlite3 + Drizzle ORM (development/default) |
| Production schema | PostgreSQL Drizzle schema + `server/db/migrations/postgres/001_initial.sql` |
| Auth | scrypt password hashing, opaque bearer session tokens stored as SHA-256 hashes |
| Mobile | Capacitor 8 Android shell (`android/`) |
| Tests | Node test runner (`tsx --test`) with isolated temporary databases |

The Express server also serves the Vite middleware in development and the built SPA in production, so the frontend and API share port `3000`.

## Quick start

Requirements: Node.js 20+ and npm. The repository retains bun.lock for compatibility.

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:3000>. The API health check is at `/api/health`.

The first startup creates a super administrator. If `MTA_INITIAL_ADMIN_PASSWORD` is empty, a one-time password is generated at `data/initial-admin-credentials.txt` (mode `0600`). Move it to a password manager and delete the file. This account is **not** a demo account with a published password.

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for full setup, [docs/OPERATIONS.md](docs/OPERATIONS.md) for running and moderation procedures, [docs/SECURITY.md](docs/SECURITY.md) for controls, and [docs/TESTING.md](docs/TESTING.md) for exact verification results.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server (API + Vite) on port 3000 |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm run test` | Full automated test suite |
| `npm run build` | Production frontend build into `dist/` |
| `npm run start` | Production server serving `dist/` and the API |
| `npm run db:integrity` | SQLite `integrity_check` and foreign-key check |
| `npm run db:backup` | WAL-safe database backup into `data/backups/` |
| `npm run db:restore -- <file>` | Restore a backup (takes a safety copy first) |

## Roles

| Role | Capabilities |
| --- | --- |
| `super_admin` | Everything, including administrator user roles and deleting content |
| `admin` | Directory/library CRUD, moderation, users, audit, backups |
| `academic_editor` | Directory/library CRUD and bulk import; no user or destructive admin operations |
| `academic_reviewer` | PDF review queue, approve/reject, publish/unpublish, complaints |
| `regular_user` | Account, saved items, reading lists; public content only |

The frontend hides controls a role cannot use, but **the server re-checks every request**. Role is always read from `/api/auth/me`, never inferred from an email address.

## PDF moderation workflow

```
submitted → screening → pending academic review → approved / rejected → published
```

- Uploads are accepted from visitors without registration.
- Files are stored under `data/uploads/quarantine/`, outside the public web root, with generated names.
- Extension, MIME type, PDF signature, structure, size and active-content checks run before acceptance.
- SHA-256 hashes prevent duplicate submissions.
- Upload and report endpoints are rate-limited and require a copyright declaration.
- **Approval and publication are separate steps.** Only `published` documents are downloadable.
- Every moderation action creates a review record and an audit entry.
- Complaints can be filed publicly and resolved by reviewers.

## Data integrity and provenance

- The existing SQLite database is preserved. Migrations are additive and idempotent; no table is dropped or recreated.
- Every academic record supports `sourceUrl`, `sourceInstitution`, `collectedAt`, `verificationStatus`, `lastVerifiedAt`, supporting documentation and notes.
- Institutional **licensing** and institutional/programmatic **accreditation** are separate fields with separate authorities.
- Legacy records were backed up to `data/backups/` before migration; records without evidence were marked unverified rather than deleted.
- Backups are WAL-safe and include integrity checks.

## Environment

All configuration is documented in [.env.example](.env.example). Secrets belong in `.env` or the deployment secret store — never in source, screenshots or logs. Advertising, Firebase and analytics are disabled by default and optional.

## Android

The Capacitor project is at `android/` with package `com.mtatechnologies.universitylibrarycollector`. Web assets are built with `npm run build` and synced with `npx cap sync android`. A live backend can be supplied through `CAPACITOR_SERVER_URL`; otherwise the APK loads the bundled build and calls the same origin or `VITE_API_BASE_URL`.

**No APK was built in this environment** because no JDK or Android SDK is installed. The reproducible procedure and required versions are in [ANDROID_BUILD_GUIDE.md](ANDROID_BUILD_GUIDE.md).

## Known limitations

- PostgreSQL schema and SQL are complete but **were not executed against a PostgreSQL instance** here; the runtime uses SQLite.
- No Android build or device test was performed (no JDK/Android SDK).
- No deployment or GitHub push was performed.
- The academic directory contains only the records already present in the database; no census data was fabricated to fill gaps.
- Automated tests cover the API, auth/RBAC, upload security, moderation, backup/restore and type/build checks. They do not replace a penetration test or a production load test.

## License

Source files carry `SPDX-License-Identifier: Apache-2.0`. Branding, name and logo belong to MTA TECHNOLOGIES. Academic metadata remains subject to the rights of its original publishers and institutions.

## Android Release Build Status

The Android release workflow completed successfully in GitHub Actions (run `42707047315`) and produced signed APK and AAB artifacts. The AAB passed `jarsigner` verification. Independent APK signature verification and physical-device testing remain separate outstanding checks. A successful CI build alone does not establish Google Play publication readiness.
