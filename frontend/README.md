This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Staff login at `/en/login` and `/ar/login` connects to Django through server actions. Start the backend on port 8000 first (see `../backend/README.md`). Set `DJANGO_API_URL` in `.env.local` if the backend uses another address; never prefix this setting with `NEXT_PUBLIC_`. Tokens are stored in HttpOnly cookies with automatic refresh rotation. Successful login opens the bilingual staff portal with scoped dashboard, Missions, actual staff participation, Super Admin staff accounts and role-restricted vehicle records. Arabic uses a right-to-left layout. The public site remains at `/en` and `/ar`.

See [the milestone guide](../docs/milestone-one.md) for workflow rules, verification and deferred scope. Use `127.0.0.1` consistently when testing login locally so cookies remain on the same host.

Run `npm test`, `npm run lint`, and `npm run build` to verify authentication, code checks, and the production build. If a stale global npm shim fails on Windows, use `& 'C:/Program Files/nodejs/npm.cmd' run dev` (or the corresponding npm command).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
