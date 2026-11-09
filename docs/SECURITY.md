# Security Notes

This document describes controls that are implemented and residual risks. It is not a claim of penetration-test certification.

## Authentication and sessions

- Passwords are hashed with Node's `scrypt` using a per-user random salt and constant-time comparison. Plaintext passwords are never stored.
- Sessions are opaque random bearer tokens. The database stores only a SHA-256 hash of each token, so a database leak does not directly yield usable sessions.
- Session expiry is enforced server-side (`SESSION_DAYS`). Account deletion and password changes revoke sessions as implemented in the auth routes.
- Login, registration, upload and complaint endpoints are rate-limited per IP.
- Role and active status are loaded from the database on each authenticated request; the client cannot grant itself a role.

## Authorisation

Five roles are enforced by middleware on the server:

- `super_admin`, `admin`, `academic_editor`, `academic_reviewer`, `regular_user`.
- Content writes require editor-level roles; destructive deletes require administrator roles.
- User role changes require super administrator; the last active super administrator cannot be removed or deactivated.
- Saved items and reading lists are scoped to the authenticated `user_id`.
- Downloads of community PDFs require `status = published`.

## Input and database safety

- Request bodies are validated with Zod schemas and explicit enums/limits.
- SQL uses bound parameters. The admin content API uses a fixed table/column allow-list; arbitrary table or column names are never accepted from the client.
- Identifiers are parsed as positive integers and rejected early.
- JSON fields are size-limited by the request body limit and parsed defensively.
- Errors are normalized so SQL statements, file paths and stack traces are not returned to clients.

## Upload security

- Visitor submissions do not require an account but do require a copyright declaration and a valid academic classification.
- Checks include extension, claimed MIME type, `%PDF-` signature, structural markers, size limit, and rejection of active content (`/JavaScript`, `/Launch`, `/OpenAction`, `/AA`, embedded files and similar markers).
- Files are stored under generated names in `data/uploads/quarantine/`, outside the static web root. Uploaded files are never executed or served inline.
- SHA-256 is computed for duplicate detection; duplicates are rejected.
- Approved files move to `data/uploads/approved/` but remain downloadable only through an access-controlled route for published records.
- A moderation action trail and audit log record every transition, reviewer and note.
- Complaints are accepted publicly, rate-limited, and resolved by reviewers.

## Web protections

- Security headers (including frame denial, `nosniff`, referrer policy and a restrictive permissions policy) are set by dependency-free middleware.
- API responses use `Cache-Control: no-store`.
- CORS uses an exact allow-list. Unknown browser origins are rejected.
- State-changing requests require a same-origin request or an allowed origin.
- React escapes rendered content by default; the application does not inject untrusted HTML.
- No secrets are read by the frontend. Only `VITE_*` public values may reach the browser.

## Privacy

- No advertising, Firebase or analytics is enabled by default.
- No visitor counts, revenue or engagement statistics are fabricated.
- Account deletion is available; the last super administrator cannot delete their account.
- Backups and the database contain personal data (emails, names, submission contact details) and must be access-controlled and retained only as long as needed.

## Residual risks and operational requirements

- **In-memory rate limits** reset on restart and are per process. Use a shared limiter for multi-instance deployments.
- **No email verification or password reset email** is configured, because no mail provider is activated. Administrators must provision accounts/passwords through a trusted channel. Adding a provider requires configuration and testing.
- **PDF structural parsing is heuristic**, not a full antivirus/CDR pipeline. For high-risk environments, add an out-of-band malware scanner and sandbox before approval.
- **PostgreSQL migration is untested at runtime**; validate before production.
- **TLS terminates at the proxy.** Do not expose port 3000 directly to the internet.
- **`TRUST_PROXY`** must only be enabled behind a proxy that sanitizes forwarding headers, otherwise IP-based limits can be spoofed.
- **Android** was not built or device-tested here; review network security configuration and signing before release.
- A professional penetration test and dependency audit are still recommended before public launch.

## Reporting a vulnerability

Do not open a public issue containing exploit details or personal data. Contact MTA TECHNOLOGIES through the project's private security channel and include reproduction steps, affected version and impact. Never include real credentials, user data or a working exploit against a production deployment.
