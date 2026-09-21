# Public frontend

The public site follows the uploaded final Claude prototype. Existing brand colours and component names are retained. The original logo and public English/Arabic strings were extracted as assets and data; prototype scripts are not executed or embedded.

## Structure

- `src/app/[lang]/layout.tsx`: shared public shell, fonts, document language and direction.
- `src/app/[lang]/page.tsx`: composes the homepage sections.
- `src/app/[lang]/[page]/page.tsx`: allowlisted informational pages, statically generated in both languages.
- `src/components/shared`: individual homepage sections and reusable service/activity cards.
- `src/components/layout/PublicNavbar.tsx`: the only interactive component; handles mobile navigation.
- `src/i18n`: typed public dictionaries; locale is in the URL.
- `src/features/public`: informational page composition and sample activity records.

Root and previous public URLs redirect to English. The language switch preserves the current page and reloads the document so `html lang` and `dir` update correctly. Unknown languages and page names return 404.

Impact figures and activities are explicitly sample content. Contact, donation, volunteer submission, and staff authentication integrations are pending. These pages do not accept personal information, show invented account details, or simulate successful submissions.

Run `npm run dev` for local development, `npm run lint` for linting, and `npm run build` for production compilation and TypeScript validation. Inter and Cairo are self-hosted by Next.js; the initial build needs access to Google Fonts.
