# APOLOGETICS መፅሔት Architecture

## Scope

This project is a Next.js App Router application for an Islamic news and publishing platform. Phase 13 adds protected UploadThing image and PDF uploads to the existing content administration while keeping the final public frontend, PDF reader, standalone Media Library, and generated visual design out of scope.

## Application Areas

- Public website: homepage, news, events, magazine, search, about, and contact routes under `src/app/(public)`.
- Admin dashboard: login under `src/app/admin/login`, a responsive protected shell, real dashboard totals, and News, Event, Magazine, Category, Tag, and Users management in the `src/app/admin/(protected)` route group.
- API layer: the Auth.js route handler lives under `src/app/api/auth`; the UploadThing App Router handler lives under `src/app/api/uploadthing`; content and taxonomy mutations use CSRF-protected Server Actions.

## Data Layer

- Prisma schema lives in `prisma/schema.prisma`.
- Generated Prisma Client is output to `src/generated/prisma`.
- The reusable Prisma singleton lives in `src/lib/prisma.ts` and avoids extra clients during Next.js development hot reload.
- Future repository modules should live under `src/services` or a dedicated `src/repositories` folder if query complexity grows.

## Validation And Forms

- Zod schemas should live under `src/schemas`.
- React Hook Form integrations should stay close to form components, with shared form helpers placed under `src/components` or `src/lib`.
- Server-side validation should reuse the same Zod schemas before writing to Prisma.

## Server Actions And Services

- News Server Actions live beside the protected news routes. They authenticate, validate with Zod, call the service layer, map internal failures to safe messages, and revalidate affected routes.
- `src/services/news.service.ts` owns news queries, taxonomy validation, stored-record ownership checks, field-by-field Prisma writes, slug conflict handling, and join-row cleanup.
- Event Server Actions follow the same boundary beside the protected event routes. `src/services/event.service.ts` owns Event queries, status and ownership enforcement, taxonomy checks, explicit Prisma writes, slug conflict handling, and EventTag cleanup.
- Magazine Server Actions follow the same boundary beside the protected magazine routes. `src/services/magazine.service.ts` owns listing queries, status and ownership enforcement, taxonomy checks, explicit Prisma writes, slug and issue-number conflict handling, and MagazineIssueTag cleanup.
- Category and Tag Server Actions live beside their protected routes. `src/services/category.service.ts` and `src/services/tag.service.ts` own validated listing queries, relation counts, explicit writes, uniqueness handling, activation, and deletion safety. Every taxonomy service entry point used by administration verifies the actor role again.
- Users Server Actions live beside the protected Users routes. `src/services/user.service.ts` owns safe listing projections, fresh actor/target lookups, password hashing, explicit writes, active-super-admin invariants, and transactional audit logging. `src/lib/user-policy.ts` owns pure role-target decisions, and `src/schemas/user.ts` owns create, edit, and listing validation.
- The browser never supplies an author ID. Creation derives ownership from the authenticated session, and updates preserve the existing author relationship.
- Future route handlers should stay thin: parse input, authorize, call service functions, and return typed responses.

## News Workflow

- Listing filters and pagination parameters are validated by `newsQuerySchema`. The current implementation uses server-side page pagination with a fixed page size and filtered totals.
- Create and edit forms share `newsFormSchema` in the browser and Server Actions. The service maps only approved fields to Prisma.
- Active categories and tags are loaded from the database and validated again before mutation.
- Empty slugs are generated from titles; database uniqueness remains the final concurrency-safe constraint.
- `PUBLISHED` defaults an empty published date to the current time.
- `SCHEDULED` requires a future UTC date. Its date is cleared when status changes away from scheduled.
- `ARCHIVED` preserves the original published date where available.
- Automated scheduled publishing is not implemented. A future worker must atomically publish due records and record audit events.

## Event Workflow

- `src/schemas/event.ts` validates form values and listing query parameters. `src/lib/event-policy.ts` maps Event operations and all existing `EventStatus` values to the centralized content permissions.
- The listing uses validated server-side page pagination with a fixed page size. It supports title search, status, category, and attendance-mode filters plus created-date and start-date sorting.
- Create and edit use one React Hook Form component and validate the same Zod schema again in Server Actions. The service derives `authorId` from the session actor and never accepts it as form input.
- Only active `EVENT` or `GENERAL` categories and active tags are offered and accepted. Database uniqueness remains the concurrency-safe authority for slugs.
- Event start time is required. End time must be later than start time, registration deadline cannot be later than start time, and capacity must be a positive integer.
- Online events require a valid online URL. Physical events require a location, and an online URL is discarded for physical events.
- HTML `datetime-local` values are labeled and treated as UTC. The schema accepts minute-precision values, appends `Z` before conversion to `Date`, and edit forms convert stored dates back with `toISOString().slice(0, 16)`. Admin listing dates are also formatted in UTC, avoiding implicit browser-local/database-UTC comparisons.
- `PUBLISHED` defaults an empty published date to the current UTC instant. `SCHEDULED` requires a future UTC publication date and clears it when status changes. `ARCHIVED` and `CANCELLED` preserve an existing publication date.
- Super admins and admins have full Event access including deletion. Editors can create, edit, publish, schedule, archive, and cancel but cannot delete. Authors can create drafts and edit only their own events; service mutation checks prevent publishing, scheduling, cross-author edits, and deletion.
- Automated scheduled Event publishing remains deferred. A future worker must atomically publish due records and record audit events.

## Magazine Workflow

- `src/schemas/magazine.ts` validates create/edit values and listing query parameters. Numeric file-size and page-count inputs remain strings in the browser, then are validated against PostgreSQL `Int` bounds and normalized before service writes.
- The listing uses validated server-side page pagination with a fixed page size. It supports title search, status, category, and featured-state filters plus created-date and publication-date sorting.
- Create and edit use one React Hook Form component and validate the same Zod schema again in Server Actions. The service derives `authorId` from the authenticated actor and never accepts ownership or counters from form input.
- Only active `MAGAZINE` or `GENERAL` categories and active tags are offered and accepted. Slug and issue number conflicts are mapped to separate safe field errors while database uniqueness remains the concurrency-safe authority.
- Title and issue number are required. A Magazine issue must have either a tracked PDF asset or an external HTTP(S) PDF URL. External PDFs require a file name; tracked PDF name and size are copied from trusted `MediaAsset` metadata. Description remains optional, covers require alt text, optional external PDF size must be non-negative, optional page count must be positive, and published issues require a valid publication date.
- Publication dates use an HTML date value and are stored at UTC midnight. Listing and edit conversions explicitly use UTC so the date does not shift with the browser or server timezone.
- `MagazineIssue` has no `scheduledFor` field. `SCHEDULED` remains available for read-only listing compatibility with the shared enum but is rejected by validation and policy for all Magazine mutations. No schema field or scheduling worker was invented.
- Super admins and admins have full Magazine access including deletion. Editors can create, edit, publish, and archive but cannot delete. Authors can create drafts and edit only their own draft issues; service mutation checks prevent publishing, archiving, cross-author edits, editing non-drafts, and deletion.
- `viewCount` and `downloadCount` are selected for listings but omitted from create/edit schemas and explicit Prisma update data. They remain server-owned and unchanged during ordinary edits.
- Existing remote HTTP(S) cover and PDF URLs remain supported. Provider-backed records additionally store asset relations while retaining the existing URL and descriptive fields for future public rendering. The public PDF reader remains deferred.

## Category And Tag Workflow

- Category and Tag listings use validated server-side pagination, name-or-slug search, active-state filters, and created-date or alphabetical sorting. Category adds a `CategoryType` filter; Tag adds used and unused filters.
- Usage counts are selected with Prisma relation `_count` in the listing query. Category counts use `NewsArticle`, `Event`, and `MagazineIssue` relations. Tag counts use the three explicit join-model relations. No counters are stored and no per-row N+1 queries are issued.
- Empty slugs are generated from normalized names. User-edited slugs are validated in the browser and Server Action, while PostgreSQL uniqueness is the concurrency-safe authority. Prisma errors are mapped to safe slug field errors.
- Super admins and admins can create, edit, activate, deactivate, and permanently delete unused taxonomy. Editors can create, edit, activate, and deactivate, but cannot permanently delete. Authors cannot access taxonomy administration pages or administrative taxonomy services.
- Permanent deletion runs in a serializable transaction. The service rejects deletion when any content or join relation exists and directs the administrator to deactivate instead. It never detaches taxonomy and never deletes content.
- Deactivation only changes `isActive`. New News, Event, and Magazine forms load active options only. Existing edit forms additionally load their currently associated inactive values and label them `(inactive)`.
- Content update services accept an inactive category or tag only when that exact association already exists on the record. Saving can retain or remove it, but cannot attach a different inactive value. This prevents edit forms from silently dropping historical taxonomy while keeping inactive taxonomy unavailable for new associations.
- Taxonomy mutations revalidate the taxonomy pages plus affected News, Event, and Magazine create and edit routes.

## User Administration Workflow

- The Users listing validates page, search, role, status, and sort query parameters before querying PostgreSQL. It uses server-side pagination, safe field projections that omit `passwordHash`, and database-derived totals for all, active, suspended, and invited users.
- `SUPER_ADMIN` can create and manage every role. `ADMIN` can create, edit, suspend, reactivate, and permanently delete only `EDITOR` and `AUTHOR` accounts. `EDITOR` and `AUTHOR` cannot access Users administration. Navigation visibility mirrors this policy, while pages, Server Actions, and service mutations enforce it independently.
- Service mutations re-read the current database state of the actor and target inside serializable transactions. Session role/status values are never the sole authority for user-management writes.
- Active-user creation requires a temporary password of at least 12 characters containing uppercase, lowercase, and numeric characters. bcryptjs hashes it with 12 rounds; plain-text passwords are never stored, logged, audited, redirected, or returned.
- Invited-user creation sends no email. Because `User.passwordHash` is required, the server generates a cryptographically random unusable secret and stores only its bcrypt hash. Invited accounts remain ineligible for login, and status transitions to active are blocked until a future invitation/password-setup flow exists. Direct creation as `SUSPENDED` is not supported.
- General edits include only name, normalized email, optional HTTP(S) image URL, role, and status. They never select or accept `passwordHash`, and Prisma preserves `passwordHash`, `lastLoginAt`, and `createdAt`. Invited accounts cannot be activated through the edit form.
- Users cannot suspend, delete, or change their own role. Active-super-admin counts are checked transactionally so suspending, demoting, or deleting an account can never leave the application without an active `SUPER_ADMIN`. Only another `SUPER_ADMIN` can modify a super administrator.
- Suspension is the preferred reversible operation. The fresh protected-route guard checks database role and status on every request, so a newly suspended user loses protected admin access on the next request even when an older JWT remains unexpired. Reactivation restores access for otherwise eligible roles.
- Permanent deletion is limited to policy-manageable targets and requires explicit UI confirmation with name and email. `NewsArticle`, `Event`, and `MagazineIssue` use `onDelete: SetNull`, so authored content remains and becomes unassigned. Audit history also remains valid through its nullable actor relation.
- `USER_CREATED`, `USER_UPDATED`, `USER_SUSPENDED`, `USER_REACTIVATED`, `USER_ROLE_CHANGED`, and `USER_DELETED` entries are written in the same transaction as their associated mutation. Metadata contains only safe target and transition details; credentials and secrets are excluded.
- Invitation email delivery, invitation acceptance, password setup, and password reset are deferred to a future security phase.

## Contact Message Administration Workflow

- `/admin/messages` and `/admin/messages/[id]` are protected administration
  routes available only to active `SUPER_ADMIN` and `ADMIN` users. Navigation,
  page boundaries, Server Actions, and service methods enforce the same policy.
  Service operations resolve the acting user's current role and status from
  PostgreSQL instead of trusting session claims alone.
- Listing query parameters are validated with Zod before use. Search covers
  sender name, email, and subject; optional status and inclusive received-date
  filters, three sorting modes, and server-side pagination are applied by
  Prisma. Summary counts are derived directly from the five workflow statuses.
- Listing projections exclude the full message body, admin notes, and phone
  value. Only a `hasPhone` boolean is returned for the phone column. The full
  private record is selected only for a single protected detail route, rendered
  as escaped plain text without `dangerouslySetInnerHTML`.
- Status changes use explicit operations rather than accepting a generic status
  from the browser. Marking as read sets `readAt`; marking as replied sets
  `repliedAt` and a missing `readAt`; archive and spam preserve message content
  and timestamps; restore returns archived or spam messages to `READ` while
  preserving historical timestamps.
- Admin notes are optional plain text capped at 5,000 characters. They preserve
  internal line breaks, are never rendered publicly, and are not included in
  audit metadata. The detail page keeps the message body in a Server Component;
  only the notes value required by the edit form reaches its Client Component.
- Archiving is preferred to deletion. `ADMIN` cannot permanently delete a
  message. A `SUPER_ADMIN` can delete only an `ARCHIVED` or `SPAM` message after
  an explicit confirmation displaying sender name, email, and subject. The
  deletion affects only the selected Contact Message.
- `CONTACT_MESSAGE_READ`, `CONTACT_MESSAGE_REPLIED`,
  `CONTACT_MESSAGE_ARCHIVED`, `CONTACT_MESSAGE_MARKED_SPAM`,
  `CONTACT_MESSAGE_RESTORED`, `CONTACT_MESSAGE_NOTES_UPDATED`, and
  `CONTACT_MESSAGE_DELETED` audit entries are committed transactionally with
  their mutations. Metadata contains only status transitions or whether notes
  are present; sender identity, contact details, message text, and notes are
  excluded.
- No email is sent by this phase. The protected detail route offers a safe
  `mailto:` link, and `REPLIED` means an administrator confirmed handling the
  response externally. A future public Contact Us phase will validate and
  create `NEW` records through a separate unauthenticated submission boundary.

## Authentication Flow

1. The login form validates email and password shape with the shared Zod schema.
2. Auth.js validates the submitted credentials again on the server.
3. The normalized email is used for a narrow Prisma user query.
4. bcryptjs compares the submitted password with the stored hash. Unknown accounts use a fixed dummy hash so they follow comparable password-check work.
5. Only active users with an allowed admin role receive a session. Failed attempts return the same generic result and never update `lastLoginAt`.
6. A successful attempt updates `lastLoginAt` and returns only safe identity fields to Auth.js.

CSRF handling and credential callback validation are provided by Auth.js. The
application does not expose `passwordHash`, `AUTH_SECRET`, or
`SEED_ADMIN_PASSWORD` to client code.

`NEXTAUTH_URL` defines the canonical Auth.js callback origin. Redirect callbacks
accept relative URLs and same-origin absolute URLs only; invalid or cross-origin
targets fall back to `/admin`.

## Session Strategy

Credentials authentication uses an encrypted, HTTP-only JWT session with an
eight-hour maximum age. The JWT and session contain only the user ID, name,
email, image, role, and status. Protected admin requests resolve the user again
from PostgreSQL and use the current role and status. Production uses secure cookies. Auth.js module
augmentation in `src/types/next-auth.d.ts` defines the custom token and session
fields for TypeScript.

## Admin Route Protection

The `src/app/admin/(protected)/layout.tsx` server layout calls the reusable
`requireAdmin` guard before rendering any protected admin page. The guard uses
the session user ID to load current safe user fields from PostgreSQL and checks
the current role and status. Unauthenticated, deleted, invited, or suspended
sessions redirect to `/admin/login`. The login server page uses the same fresh
lookup before redirecting an eligible user to `/admin`. This avoids loading Prisma
in Edge middleware and preserves all existing `/admin` URLs. Current admin
pages also invoke the guard through a shared protected page component, ensuring
Next.js streaming cannot execute or serialize page content before the layout
redirect is delivered. Future data services must authorize again at their data
access boundary.

## Roles And Permissions

Permission rules are centralized in `src/lib/auth/permissions.ts`:

- `SUPER_ADMIN`: full content, user, and settings access.
- `ADMIN`: content and settings management, including publishing and deletion; can administer only `EDITOR` and `AUTHOR` accounts and cannot modify another `ADMIN` or any `SUPER_ADMIN`.
- `EDITOR`: create, edit, publish, and archive content and create, edit, activate, and deactivate taxonomy; no user management, sensitive settings, or permanent content or taxonomy deletion.
- `AUTHOR`: create content and edit owned content; no publishing, deletion, taxonomy administration, user management, or sensitive settings. Active taxonomy remains readable through content forms.

Server code can use `requireAdmin` or `requireRoles` from
`src/lib/auth/guards.ts`. Future content services must also apply the ownership
and permission helpers at the mutation boundary; route visibility alone is not
authorization.

## Future Authentication Work

- Password reset will use single-use, expiring, hashed tokens delivered by a configured email provider. It is not implemented in this phase.
- Invitation delivery and acceptance will use single-use, expiring, hashed setup tokens. No invitation email or password-setup endpoint exists yet.
- Login rate limiting and security-event monitoring are required before production exposure. They should use a shared backing store appropriate to the deployment topology.
- Public registration, email verification, and social login remain out of scope.

## Media Upload Architecture

- UploadThing 7 App Router routes provide four fixed endpoints: News cover,
  Event cover, Magazine cover, and Magazine PDF. The route runs on Node.js and
  remains callback-reachable at `/api/uploadthing`; upload authorization occurs
  inside each file-route middleware.
- Middleware resolves the current session user again from PostgreSQL, rejects
  inactive or ineligible users, and applies the centralized content-creation
  permission. It enforces one file, exact MIME allowlists, and application size
  limits before upload credentials are issued.
- Cover routes accept JPEG, PNG, and WebP up to 8 MB. The PDF route uses the
  provider's nearest supported 64 MB route ceiling while middleware enforces
  the exact 50 MB application limit. Completion validation checks trusted
  provider metadata and leading JPEG, PNG, WebP, or PDF signature bytes.
- Successful callbacks create a `PENDING` `MediaAsset` with provider key,
  stable public `ufs.sh` URL, safe file metadata, and uploader ownership. The
  callback returns only the asset ID and safe display metadata; browser forms
  never receive the standalone provider key or server token.
- News, Event, and Magazine service transactions load the asset by ID, refresh
  the actor from PostgreSQL, verify kind, status, ownership, and non-reuse, then
  write the content relation and trusted URL metadata while changing the asset
  to `ATTACHED`. Existing external URL-only records bypass this provider
  lifecycle and remain editable.
- Replacement commits the new relation and marks the old tracked asset
  `ORPHANED` in one database transaction. Remote deletion runs only after that
  commit. Success changes the old asset to `DELETED`; failure leaves it
  `ORPHANED` and records a safe audit entry without undoing the content save.
  Permanent content deletion follows the same post-commit cleanup boundary and
  never targets external URL-only files.
- `npm run media:cleanup -- --dry-run` reports unattached `PENDING` files older
  than 24 hours and retryable `ORPHANED` files. `npm run media:cleanup` attempts
  provider deletion one asset at a time, continues after failures, and never
  selects `ATTACHED` assets.
- PostgreSQL and UploadThing cannot share a distributed transaction. Database
  attachment is authoritative; remote deletion is recoverable and audited.
  Public UploadThing files use `https://<APP_ID>.ufs.sh/f/<FILE_KEY>`, and the
  Next.js image allowlist is limited to HTTPS `*.ufs.sh` paths under `/f/`.
- Public content rendering and the Magazine PDF reader remain deferred. Binary
  file contents and UploadThing tokens are never stored in PostgreSQL.

## Deferred Admin Features

- Subscribers Administration, Settings Administration, and Analytics
  Administration are intentionally deferred. Their existing protected routes
  render one shared admin-only Coming Soon state inside the standard admin
  shell; they do not redirect to the public Coming Soon route.
- Existing navigation visibility and section authorization remain in effect.
  Unauthenticated requests still redirect to `/admin/login`, while roles that
  cannot access a section are rejected by the centralized authorization policy.
- These placeholders contain no database services, schemas, mutations, APIs,
  subscriber totals, settings values, analytics data, or charts.

## Current Non-Goals

- Final public and admin UI designs are not implemented yet.
- Password reset, invitation email delivery, invitation acceptance, login rate limiting, public registration, and social login are not implemented yet.
- Public News, Event, and Magazine rendering, rich-text editing, the PDF reader, a standalone Media Library, analytics charts, and scheduled publishing workers are not implemented yet.
