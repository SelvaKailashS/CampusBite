# CampusBite 🍔

CampusBite is a campus food-ordering web app built for **Nehru Institute of Engineering & Technology**, letting students browse menus and place food orders online.

**Live demo:** [campus-bite-iota.vercel.app](https://campus-bite-iota.vercel.app)

> Note: This repository's `README.md` was empty at the time of writing. The details below are inferred from the project's file structure, `package.json`, and deployment config — please adjust anything that doesn't match your intended description.

## Tech Stack

- **Frontend:** React 19 + Vite 7 + TypeScript
- **Styling:** Tailwind CSS 4 (`@tailwindcss/vite`)
- **Backend:** API routes (`/api`) with Prisma ORM (`@prisma/client`)
- **Auth:** JSON Web Tokens (`jsonwebtoken`) + password hashing (`bcryptjs`)
- **Utilities:** `clsx`, `tailwind-merge`
- **Deployment:** Vercel (`vercel.json`), single-file build via `vite-plugin-singlefile`

## Project Structure

```
CampusBite/
├── api/            # Backend/serverless API routes
├── lib/            # Shared library/helper code
├── prisma/         # Prisma schema, migrations, and seed script
├── public/logos/   # Static assets (logos, images)
├── src/            # React frontend source
├── index.html      # App entry point
├── vite.config.ts  # Vite configuration
├── vercel.json     # Vercel deployment configuration
└── tsconfig.json   # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- A database supported by Prisma (check `prisma/schema.prisma` for the configured provider)

### Installation

```bash
git clone https://github.com/SelvaKailashS/CampusBite.git
cd CampusBite
npm install
```

Installing dependencies automatically runs `prisma generate` via the `postinstall` script.

### Environment Variables

Create a `.env` file in the project root with your database connection string and any secrets required by the API (e.g. `DATABASE_URL`, JWT secret). Check `prisma/schema.prisma` and the `api/` and `lib/` folders for the exact variable names expected.

### Database Setup

```bash
npx prisma migrate dev   # or prisma db push, depending on your workflow
npm run seed              # populate initial data
```

### Development

```bash
npm run dev
```

This starts the Vite dev server (default: `http://localhost:5173`).

### Build & Preview

```bash
npm run build     # runs `prisma generate && vite build`
npm run preview   # preview the production build locally
```

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run preview` | Preview the production build |
| `npm run seed` | Run the Prisma database seed script |

## Deployment

The project includes a `vercel.json`, indicating it's configured for deployment on [Vercel](https://vercel.com). Push to the connected branch or run `vercel deploy` to publish.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to the branch and open a pull request

## License

No license file was found in the repository. Add a `LICENSE` file if you'd like to specify usage terms.
