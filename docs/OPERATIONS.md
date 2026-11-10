# Operations Guide

## Running the service

Development:

```bash
npm run dev
```

Production:

```bash
npm run build
NODE_ENV=production npm run start
```

The process logs to stdout/stderr. Use your process supervisor (systemd, container runtime, PM2) to restart on failure and rotate logs. Health endpoint: `GET /api/health`.

Graceful shutdown is handled for `SIGTERM`/`SIGINT`; SQLite is closed and in-flight requests get up to 10 seconds.

## Database backups

```bash
npm run db:backup
npm run db:integrity
```

- Backups are created through SQLite's online backup API, so they are consistent while the server is running (WAL-safe).
- Files land in `data/backups/` with a timestamp.
- Verify with `npm run db:integrity`, which reports `integrity_check`, foreign-key violations and journal mode.
- Keep at least one copy off the host. Backups contain user data (emails, password hashes) and must be protected like the database.

### Restore

```bash
npm run db:restore -- data/backups/<file>.db
```

Stop the server first. The restore script creates a safety copy of the current database before replacing it, then runs an integrity check. Start the server and confirm `/api/health` and the directory.

## Accounts and roles

- Super administrators manage roles on **Administration → Users**. At least one active super administrator must remain.
- Administrators can manage content, users, moderation and backups.
- Academic editors can create/update academic content and bulk-import; they cannot delete or manage users.
- Academic reviewers handle the PDF review queue and complaints.
- Regular users have accounts, saved items and reading lists only.

All permissions are enforced server-side. Hiding a button is not a security boundary.

## Academic content

Use **Administration → Academic content**:

1. Select the entity (institutions, faculties, departments, programs, study plans, courses, library, sources).
2. Add or edit via the allow-listed JSON form. Unknown fields are ignored; foreign keys are enforced.
3. Record provenance on every row: `sourceUrl`, `sourceInstitution`, `collectedAt`, `verificationStatus`, `lastVerifiedAt`, `supportingDocumentationUrl`, `verificationNotes`.
4. Mark records as verified only when evidence exists. Otherwise keep `unverified` / `under_verification`.
5. Use **Bulk import** for JSON arrays. Results are reported per record.

Deleting a referenced record fails safely rather than cascading silently. Prefer correcting or archiving over deletion.

## PDF moderation

Queue: **Administration → File moderation**.

1. `submitted` → run **screen**. Security screening must pass before academic review.
2. `screening` / `pending_review` → **approve** or **reject**. Rejections should include a reason in the notes field.
3. `approved` → **publish** when the academic review is complete.
4. `published` → **unpublish** immediately if a complaint is upheld or a rights issue appears.
5. **quarantine** isolates a file at any stage.

Notes are stored in the document record and the audit trail. Files in quarantine are never public. Only `published` documents can be downloaded, and downloads are counted.

Complaints appear under **Reports**. Record the resolution; copyright complaints should be resolved by unpublishing until rights are cleared.

## Rate limits and abuse

Default limits (configurable):

| Endpoint | Limit |
| --- | --- |
| Login | 10 attempts / 15 min / IP |
| Registration | 5 / hour / IP |
| Upload | 5 / hour / IP |
| Complaints | 10 / hour / IP |

Rate-limit state is in memory, so limits are per process. Use a shared store if you run multiple instances. Behind a reverse proxy, set `TRUST_PROXY=true` only if the proxy strips client-supplied forwarding headers.

## Security headers and CORS

The server sets security headers, disables API caching (`no-store`), rejects unknown browser origins, and applies a same-origin mutation guard. Configure `CORS_ORIGINS` with exact origins in production. Keep TLS at the proxy and never serve `data/` statically.

## Monitoring

- Watch `/api/health`, process restarts and disk usage in `data/`.
- Review **Audit log** for role changes, content changes, verification updates and moderation actions.
- Review rejected uploads and screening results for abuse patterns.
- No analytics or advertising is enabled by default; do not invent traffic or revenue metrics.

## Upgrades

1. Back up: `npm run db:backup`.
2. Deploy code.
3. Install with the lockfile: `npm install`.
4. Start; additive migrations run automatically.
5. Run `npm run db:integrity`, `npm run lint`, `npm run test`, and smoke-test sign-in, directory, library and uploads.

## Incident checklist

- Compromised account: deactivate it, rotate its password, review audit logs, rotate the bootstrap credentials if still present.
- Malicious upload: quarantine/unpublish, preserve the file hash, review the review trail, block the source at the proxy if needed.
- Data corruption: stop writes, restore the latest verified backup, run integrity checks, document the data loss window.
- Secret exposure: rotate the secret in the environment/secret store, restart, and check logs for misuse. Never place secrets in the repository.
