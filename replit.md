# Apple Store

A responsive Apple-products storefront with MongoDB-backed products, a persistent shopping bag, customer accounts, and protected order history.

## Stack and standing requirements

- The user explicitly chose the attached skill's **Next.js App Router, TypeScript, Tailwind, MongoDB Atlas, and Mongoose** stack instead of the starter React/Vite/PostgreSQL stack.
- The user requested local authentication: bcryptjs password hashing and JWT sessions in httpOnly cookies. Do not migrate this app to a third-party login service without asking.
- Preserve the approved clean, minimalist Apple-inspired storefront design across all new screens.
- Products must come from MongoDB, not hardcoded frontend arrays.
- Stripe checkout is the later phase in the supplied skill. The current bag makes no purchase or payment claim.

## Run and operate

- `pnpm --filter @workspace/apple-store run dev` — Next.js development server, using the artifact-provided `PORT`.
- `pnpm --filter @workspace/apple-store run typecheck` — check application types.
- `pnpm --filter @workspace/apple-store run seed` — idempotently seed the three sample products into MongoDB.
- `pnpm --filter @workspace/apple-store run build` / `run serve` — production Next.js build and server.
- Required server-only Replit Secrets: `MONGODB_URI`, `JWT_SECRET`.

## Where things live

- `artifacts/apple-store/app/` — Next.js pages and API route handlers.
- `artifacts/apple-store/components/` — storefront components and cart/account state.
- `artifacts/apple-store/src/lib/` — MongoDB connection reuse and JWT helpers.
- `artifacts/apple-store/src/models/` — Mongoose User, Product, and Order models.
- `artifacts/apple-store/scripts/seed.ts` — sample catalog data.
- `artifacts/apple-store/public/products/` — generated product artwork.

## Runtime notes

- This artifact runs a dynamic Next.js server, not a Vite/static SPA.
- The unused starter API service has been moved off `/api` so it cannot intercept the storefront's Next.js API handlers.
- The Next.js development origin allowlist includes the local screenshot host and Replit preview domains.
- Secrets are server-only. Never return password hashes or use credentials in client components.
