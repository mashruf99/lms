# Learning Management System - Junior Software Engineer Project Round

# LMS — Learning Management System

A role-based Learning Management System built with **Next.js** (frontend) and **Strapi** (backend/CMS), per the Junior Software Engineer project spec.

**Live app:** `https://learningmanagementsystem-self.vercel.app`
**Live API:** `https://lms-production-63d2.up.railway.app`
**Repo:** `https://github.com/mashruf99/lms`

---

## Tech Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind) | Vercel |
| Backend / CMS | Strapi 5 (TypeScript) | Railway |
| Database | SQLite (local dev) / PostgreSQL (production) | Railway (managed) |

---

## Project Structure

```
lms/
├── lms_frontend/     # Next.js app
└── lms_backend/      # Strapi app
```

Both folders are part of one Git repo. Each is deployed independently — Vercel builds only `lms_frontend/`, Railway builds only `lms_backend/`.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or v22/v24 (Active/Maintenance LTS) — install via [nvm](https://github.com/nvm-sh/nvm) if you don't have it
- npm (comes with Node)
- Git

Check versions:
```bash
node -v
npm -v
```

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/mashruf99/lms.git
cd lms
```

### 2. Backend setup (Strapi)

```bash
cd lms_backend
npm install
```

Create a `.env` file in `lms_backend/` (copy from `.env.example` if present) with at minimum:

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=generateRandomKey1,generateRandomKey2
API_TOKEN_SALT=generateRandomKey
ADMIN_JWT_SECRET=generateRandomKey
JWT_SECRET=generateRandomKey
TRANSFER_TOKEN_SALT=generateRandomKey
ENCRYPTION_KEY=generateRandomKey
```

Generate each random value with:
```bash
openssl rand -base64 32
```

No `DATABASE_CLIENT` variable is needed locally — Strapi defaults to SQLite (`.tmp/data.db`), created automatically on first run. Production uses `DATABASE_CLIENT=postgres` with a `DATABASE_URL` set separately in Railway.

Start the backend:
```bash
npm run develop
```

Strapi will be available at `http://localhost:1337`. On first run, it'll prompt you to create an admin panel account at `http://localhost:1337/admin` — this is separate from app users (students/instructors/etc.), and is only for managing content types, roles, and permissions.

### 3. Backend — one-time role & permission setup

The four app roles (Admin, Content Manager, Instructor, Student) and their permissions are **not** stored in code — they live in the database and must be configured manually per environment:

1. Go to `http://localhost:1337/admin` → **Settings → Users & Permissions Plugin → Roles**
2. Create 4 roles: `Admin`, `Content Manager`, `Instructor`, `Student`
3. For each role, enable the relevant permission checkboxes per content type (Course, Lesson, Enrollment, Lesson-progress, Quiz, Question, Quiz-result, Blog-post) matching the permission matrix in the project spec
4. Also enable, per role: **Profile → me**, and the relevant custom actions (**Enrollment → myEnrollments**, **Lesson-progress → myProgress/markComplete**, **Quiz-result → submit/myResults**, **Course-progress → forCourse**, **Stats → overview** — Admin/CM/Instructor only where applicable)
5. On the **Admin** role specifically, also enable **User → find/findOne/update/me** and **Role → find** (needed for the in-app user role management screen)
6. On the **Public** role, enable **Auth → register/connect** and **Blog-post → find/findOne** (needed for signup/login and public blog reading)

### 4. Frontend setup (Next.js)

```bash
cd ../lms_frontend
npm install
```

Create `.env.local` in `lms_frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:1337
```

Start the frontend:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 5. Create test accounts

Sign up through the app UI (`http://localhost:3000/signup`) for each role you want to test. New signups default to Strapi's built-in "Authenticated" role with no app permissions — an existing Admin must promote them via **Admin Dashboard → Manage Users** (`/admin/users` in the app), or manually via Strapi's Content Manager → User → set the Role field.

To bootstrap your very first Admin account (since no Admin exists yet), sign up normally, then set that user's role to `Admin` directly through Strapi's Content Manager (`http://localhost:1337/admin` → Content Manager → User).

---

## Running Both Together

You'll need two terminals:
```bash
# Terminal 1
cd lms_backend && npm run develop

# Terminal 2
cd lms_frontend && npm run dev
```

Frontend: `http://localhost:3000`
Backend admin: `http://localhost:1337/admin`

---

## Completed Features

### Core features
-  Authentication (signup/login/logout) with JWT stored in an httpOnly cookie
-  Role-based access control — enforced on the backend via Strapi permissions + custom ownership policies, not just hidden UI
-  Course management — Admin/Content Manager (any course), Instructor (own courses only)
-  Lesson management — title, text content, video URL (YouTube or direct file), image URL, ordering
-  Course enrollment (Student) with duplicate-enrollment prevention
-  Sequential lesson viewing with rendered video/image embeds

### Differentiator features
-  **Progress tracking** — per-student, per-course, persisted in the database, accurate percentage computed live
-  **Quiz with auto-grading** — server-side scoring only, one attempt per student per quiz, enrollment required to submit
-  **Admin panel** — user list with role management, platform stats dashboard (users by role, total courses/enrollments/lessons/quizzes/blog posts)
-  **Blog** — Content Manager/Admin can write, edit, publish/unpublish; public can read only published posts

### Additional UX
- Landing page for logged-out visitors (About + link to public blog)
- Logged-in users are redirected away from `/login`, `/signup`, and the landing page
- Role-aware navigation with a visible logout button
- Staff-facing "Student Progress" view per course (completion % per enrolled student)

---

## Known Limitations

- Quiz question options and correct answers are returned to the client when displaying a quiz (needed to render the questions) — a production-grade version would strip the correct-answer field from the payload sent to students taking the quiz, and only use it server-side during grading.
- No password reset / email confirmation flow implemented (not required by the spec).
- Local dev database is SQLite; if `lms_backend/.tmp/` is deleted, all local test data (users, roles, courses) is lost — the schema/code is unaffected since it's version-controlled, but roles and test accounts must be recreated per the setup steps above.

---

## Deployment Notes

- **Vercel**: root directory set to `lms_frontend`. Environment variable `NEXT_PUBLIC_API_URL` points to the Railway backend URL.
- **Railway**: root directory set to `lms_backend`. Connected to a managed PostgreSQL instance via `DATABASE_URL` (referenced from the Postgres service). Additional required environment variables: `DATABASE_CLIENT=postgres`, `DATABASE_SSL=true`, `DATABASE_SSL_REJECT_UNAUTHORIZED=false`, `NODE_ENV=production`, plus the same secret keys listed in the local `.env` section above (generated separately for production, not reused from local).
- CORS on the backend (`lms_backend/config/middlewares.ts`) explicitly whitelists the Vercel production domain and `http://localhost:3000` for local development.
