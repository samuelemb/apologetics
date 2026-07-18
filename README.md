# APOLOGETICS መፅሔት

Islamic news and publishing platform built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Auth.js, Zod, React Hook Form, shadcn/ui, and Lucide React.

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set the required local environment values:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
AUTH_SECRET="generate-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SEED_ADMIN_PASSWORD="use-a-local-development-password"
UPLOADTHING_TOKEN="copy-the-server-token-from-uploadthing"
```

`AUTH_SECRET`, `NEXTAUTH_URL`, and `SEED_ADMIN_PASSWORD` are server-only
values. `NEXTAUTH_URL` is the canonical origin Auth.js uses for callbacks and
must match the deployed application origin. Never prefix secrets with
`NEXT_PUBLIC_` or commit real values.

Run the development server:

```bash
npm run dev
```

Run checks:

```bash
npm run test:auth
npm run test:news
npm run test:event
npm run test:magazine
npm run test:category
npm run test:tag
npm run test:user
npm run test:message
npm run test:media
npm run lint
npx tsc --noEmit
npm run build
```

## Database

Configure PostgreSQL in `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

Useful Prisma commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
npm run db:seed
```

## Development Seed

The seed creates clearly fake development data, including a super administrator and editor.

Set a local-only seed password before running the seed:

```bash
SEED_ADMIN_PASSWORD="use-a-local-development-password"
npm run db:seed
```

Development login emails created by the seed:

- `admin@example.test`
- `editor@example.test`

Both users receive the password from `SEED_ADMIN_PASSWORD`. Do not use a production password.

## Admin Authentication

Start the development server and open `http://localhost:3000/admin/login`:

```bash
npm run dev
```

Development accounts:

- Super admin: `admin@example.test`
- Editor: `editor@example.test`

Use the password from your local `SEED_ADMIN_PASSWORD` value. The password is
not displayed by the application or stored in documentation. Only active users
with an admin role can sign in. Successful login redirects to `/admin`; signing
out redirects to `/admin/login`.

## Development User Administration

`SUPER_ADMIN` and `ADMIN` users can access `/admin/users` according to the
role-target policy documented in `docs/ARCHITECTURE.md`. Creating an `ACTIVE`
user requires a temporary password, which is validated server-side and stored
only as a bcrypt hash. Creating an `INVITED` user stores only a hash of a random
server-generated unusable secret because the current schema requires
`passwordHash`.

Invitation emails and invitation acceptance are not implemented yet. Invited
accounts cannot sign in or be activated through general editing. Password reset
and general password changes also remain deferred to a future security phase.

## Development Contact Message Administration

Active `SUPER_ADMIN` and `ADMIN` users can access `/admin/messages`. The
listing uses server-side search, status and received-date filters, sorting,
pagination, and database-derived workflow counts. Full message text, sender
phone values, and private admin notes are loaded only on the protected detail
route.

Administrators can explicitly mark messages as read or replied, archive them,
mark them as spam, restore them, and maintain plain-text internal notes. Only a
super administrator can permanently delete a message, and only after it is
archived or marked as spam. Every mutation is authorized against the actor's
current database state and writes a privacy-safe transactional audit record.

Email sending is not implemented. Marking a message as replied records that an
administrator handled the response outside the application; the detail page
provides a `mailto:` link only.

## Media Uploads

Create an UploadThing application and set its current server token in `.env`:

```bash
UPLOADTHING_TOKEN="your-server-token"
```

The token is server-only and must never use a `NEXT_PUBLIC_` prefix. News,
Event, and Magazine covers accept one JPEG, PNG, or WebP image up to 8 MB.
Magazine issues accept one PDF up to 50 MB. Upload middleware rechecks the
current database user, application validation checks MIME, extension, size,
and leading file bytes, and completed uploads remain pending until a content
transaction attaches them.

Run the focused media suite and inspect or clean abandoned uploads with:

```bash
npm run test:media
npm run media:cleanup -- --dry-run
npm run media:cleanup
```

Pending uploads become cleanup candidates after 24 hours. Failed remote
deletions remain `ORPHANED` and are retried by later cleanup runs. The command
never processes attached assets or external URL-only files. A standalone Media
Library is intentionally not implemented.

## Project Structure

```text
src/
  app/
    (public)/
    admin/
    api/
    layout.tsx
    globals.css
  components/
    public/
    admin/
    ui/
  lib/
  services/
  schemas/
  types/
  config/
prisma/
  schema.prisma
  seed.ts
docs/
  ARCHITECTURE.md
  DATABASE_SCHEMA.md
```

## Phase Notes

Phase 13 includes credentials-based admin authentication with fresh protected-route
status checks, centralized permissions, the temporary protected admin shell, and
complete News, Event, Magazine, Category, Tag, Users, and Contact Messages
administration plus protected UploadThing image/PDF uploads with tracked asset
lifecycle and cleanup. Public content rendering, the PDF reader, a standalone
Media Library, the final dashboard design,
password recovery, invitation delivery, public registration, and scheduled
publishing workers remain deferred.
