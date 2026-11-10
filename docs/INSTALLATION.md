# Installation Guide

MTA University Library Collector — MTA TECHNOLOGIES

## 1. Requirements

| Component | Minimum |
| --- | --- |
| Node.js | 20 LTS (verified on Node 26) |
| Package manager | Node.js 20+ with npm (primary package manager); `bun.lock` is retained for compatibility |
| OS | Linux, macOS or Windows (commands below use bash) |
| Disk | ~500 MB with dependencies; plus uploads and backups |
| PostgreSQL | Optional for production schema validation (not used by the runtime) |

No paid services are required. Firebase, Google Analytics and AdMob are optional and disabled by default.

## 2. Get the code

```bash
git clone <repository>
cd MTA-University-Library-Collector
```

Install with the committed lockfile — do not upgrade majors:

```bash
npm install
# npm equivalent: npm ci
```

## 3. Configure environment

```bash
cp .env.example .env
```

Important variables:

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | Public HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `MTA_DATA_DIR` | `./data` | Database, uploads, backups |
| `MTA_DB_PATH` | `./data/mta_academic.db` | Existing SQLite database |
| `MTA_UPLOADS_DIR` | `./data/uploads` | Quarantine and approved files |
| `MTA_ADMIN_EMAIL` | `admin@mta-tech.ye` | Bootstrap super administrator |
| `MTA_INITIAL_ADMIN_PASSWORD` | empty | Empty = generate a one-time password |
| `CORS_ORIGINS` | empty | Comma-separated exact production origins |
| `TRUST_PROXY` | `false` | Set `true` only behind a trusted reverse proxy |
| `SESSION_DAYS` | `7` | Session lifetime |
| `MAX_UPLOAD_MB` | `25` | PDF size limit |
| `MTA_ADS_ENABLED` | `false` | Keep disabled unless explicitly approved |

Do not commit `.env`. Production secrets should come from the host's secret manager.

### Bootstrap administrator

On first startup, if no administrator exists, the server creates one:

- with `MTA_ADMIN_EMAIL` and `MTA_INITIAL_ADMIN_PASSWORD` when the password is set; or
- with a cryptographically random password written once to `data/initial-admin-credentials.txt` (mode `0600`).

Store the password securely and delete the credentials file. Sign in, change the password from **My Account**, then create the staff accounts you need.

## 4. Preserve the database before first run

```bash
npm run db:backup
npm run db:integrity
```

Migrations run automatically and are additive/idempotent. They never drop tables or recreate the database. If you are upgrading an existing installation, keep the backup until you have verified the data.

## 5. Start development

```bash
npm run dev
```

- App and API: <http://localhost:3000>
- Health: <http://localhost:3000/api/health>
- API base: `/api`

The Vite middleware is served by Express, so there is no separate frontend port.

## 6. Production build

```bash
npm run lint
npm run test
npm run build
NODE_ENV=production npm run start
```

`npm run build` writes the SPA to `dist/`. In production mode the server serves `dist/` and falls back to `index.html` for client routes. Put a TLS-terminating reverse proxy in front of port 3000 and set `TRUST_PROXY=true` only when that proxy is trusted.

### Reverse proxy notes

- Forward `Host`, `X-Forwarded-For` and `X-Forwarded-Proto`.
- Allow at least the upload size configured in `MAX_UPLOAD_MB`.
- Do not expose `data/` (database, backups, quarantine) through the web root.
- Set `CORS_ORIGINS` to the exact HTTPS origin(s), including the Capacitor origin if used.

## 7. PostgreSQL

The SQLite database is the active runtime store. A PostgreSQL schema and migration are provided for production provisioning:

```bash
psql "$DATABASE_URL" -f server/db/migrations/postgres/001_initial.sql
```

`server/db/schema.pg.ts` contains the matching Drizzle definitions.

**Status:** this migration was authored and reviewed but **not executed against a live PostgreSQL server** in this environment. Validate it in staging, run `\dt`, check foreign keys, and exercise the application against it before claiming production readiness. The application runtime does not switch to PostgreSQL automatically; that requires a dedicated data-access adapter and migration verification.

## 8. Data locations

```
data/
  mta_academic.db          SQLite database (preserved)
  backups/                 WAL-safe backups
  uploads/quarantine/      unapproved submissions (not public)
  uploads/approved/        approved files (served only through access control)
  initial-admin-credentials.txt   one-time bootstrap password (delete after use)
```

Back up `data/` as a unit. Restore procedure: [OPERATIONS.md](OPERATIONS.md).

## 9. Android

See [../ANDROID_BUILD_GUIDE.md](../ANDROID_BUILD_GUIDE.md). A JDK and Android SDK are required; neither was available in this environment, so no APK was produced or claimed.
