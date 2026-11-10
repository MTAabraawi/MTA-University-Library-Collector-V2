# Testing and Verification

All results below were produced in this workspace on 2026-11-08. Tests use isolated temporary SQLite databases and do not modify the preserved production-style database.

## Commands

```bash
npm run lint     # tsc --noEmit
npm run test     # node test runner via tsx
npm run build    # production Vite build
npm run db:integrity
```

## Actual results

| Check | Result |
| --- | --- |
| TypeScript (`tsc --noEmit`) | **Passed** (exit 0) |
| Automated test suite | **36 passed, 0 failed** |
| Production frontend build | **Passed** — `dist/` generated (JS ~456.7 kB, CSS ~77.1 kB before gzip) |
| SQLite integrity check | **ok**; no foreign-key violations |
| Backend startup | **Passed** — listening on `0.0.0.0:3000`; `/api/health` returned 200 with `database: connected` |
| Frontend/backend integration | **Verified in browser** — directory, courses, curricula, library, search and auth calls returned live data |

### Test coverage (36 tests)

- Database persistence: baseline institutions and countries remain queryable after migrations.
- Prerequisite DAG cycle detection.
- scrypt password hashing.
- Super administrator provisioning.
- API health and SQLite-backed directory/search.
- Login, registration, weak-password rejection and hashed session tokens.
- Server-side RBAC for moderation routes.
- User-scoped saved items.
- PDF submission → quarantine/pending review; duplicate SHA-256 rejection; active-content rejection; mandatory copyright declaration.
- Moderation approve → publish → download, and immediate download block after unpublish.
- Public complaint recording.
- Admin CRUD validation, bulk import outcomes, institution verification with provenance/audit.
- Database backup creation/listing and integrity endpoint.
- Backup/restore preserving records and integrity.
- Security headers/no-store, CORS allow-list and origin rejection, login/upload rate limits, invalid identifier handling, last-super-admin protection.
- Licensing/accreditation status decoupling and RTL/LTR direction logic.

## Manual/runtime checks performed

- Started the real development server and confirmed the API and Vite middleware share port 3000.
- Loaded the application in a cloud browser at a narrow mobile-width viewport (320 CSS px), checked Arabic RTL rendering, English LTR switching, light/dark theme switching, the directory with 12 database-backed records, navigation and the live-data home sections.
- Confirmed the frontend reads records from the API rather than bundled demo arrays.
- Confirmed existing database records are returned after migrations.

## Not tested (and not claimed)

| Area | Status | Reason |
| --- | --- | --- |
| PostgreSQL runtime | **Not tested** | No PostgreSQL server available. SQL schema/migration supplied, unexecuted. |
| Android APK / Gradle build | **Not built** | No JDK or Android SDK installed in this environment. |
| Real email delivery | Not configured | No mail service or credentials. |
| Payment/ads/analytics | Not activated | Optional, disabled by default by design. |
| Load/performance testing | Not performed | Requires a staging environment and traffic model. |
| Third-party penetration test | Not performed | Out of scope for this environment. |
| Production deployment | Not performed | Explicitly excluded by the task rules. |

## Reproducing the checks

```bash
npm install
npm run lint
npm run test
npm run build
npm run db:integrity
```

To run the app:

```bash
cp .env.example .env
npm run dev
curl -s http://localhost:3000/api/health
```

If a test fails, do not skip it or weaken assertions. Inspect the first failure; the suite creates its own temporary database and upload directory, so failures usually indicate a real route, validation or migration regression.

## Android Build Evidence

GitHub Actions Android release run `42707047315` successfully built signed APK and AAB artifacts. The AAB passed `jarsigner` verification. This confirms the CI build only; it does not confirm installation and runtime behavior on physical Android devices. Independent APK signature verification and device testing remain outstanding.
