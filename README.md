# Faculty Feedback System

A web application for managing faculty feedback in an engineering department. It supports role-based access for admins, faculty, and students, and streamlines the full flow from creating feedback forms to viewing detailed reports.

## Core Features

- **Role-based access** for admin, faculty, and students
- **Admin panel** to manage students, faculty, and admin users
- **Feedback form generation**
  - Create theory (division) and lab (batch) feedback forms
  - Generate forms manually or automatically from a timetable PDF
- **Timetable PDF parsing**
  - Upload a timetable PDF and extract subject–faculty mappings
  - Supports theory (e.g. `ML B305 PPM`) and lab (e.g. `B2 ML B307C PPM`) patterns
  - Matches faculty codes to the database and skips unknown codes
- **Feedback collection** from students
- **Reporting**
  - Per-faculty overview (all subjects taught, averages, response counts)
  - Per-form detailed report (parameter-wise averages, comments)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database / ORM**: MySQL (or compatible) with Prisma
- **UI**: React 18, Tailwind CSS
- **Other**: pdf-parse for timetable PDF extraction

## Prerequisites

- Node.js 18 or later
- npm (or pnpm/yarn, if you prefer and configure accordingly)
- MySQL (or a MySQL-compatible database) instance

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Create a `.env.local` file in the project root and set at least your Prisma database URL:

   ```bash
   DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
   ```

   Adjust the URL to match your database credentials.

   If you add or change any other environment variables (for auth, Firebase, etc.), keep them in `.env.local` and do not commit that file.

3. **Set up the database schema**

   Generate the Prisma client and apply migrations:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

   For an existing database in production, use:

   ```bash
   npx prisma migrate deploy
   ```

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Build and Production

Build the application:

```bash
npm run build
```

Start the production server (after building):

```bash
npm start
```

Ensure `DATABASE_URL` and any other required environment variables are set in your production environment.

## Project Scripts

- `npm run dev` – Start Next.js development server
- `npm run build` – Generate Prisma client and build the Next.js app
- `npm start` – Start the production server
- `npm run lint` – Run Next.js ESLint checks

## Notes

- Faculty codes in the timetable are matched case-insensitively against the `faculty` table.
- Timetable parsing only creates forms for known faculty codes; unknown codes are surfaced in the UI as skipped mappings.
