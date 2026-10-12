# Putting the app online

The site is deployed by **Cloudflare Pages**, built from this private repo,
and put behind **Cloudflare Access** so only people on the list can open it.

## Why not GitHub Pages

Pages cannot serve a private repo on the Free plan, and even on Pro the
published site is public to anyone with the URL - access-restricted Pages is
an Enterprise feature.

That matters more here than it looks. The app's login is client-side and the
question bank is plain static JSON, so on any public host anyone can fetch
`/data/act/questions.json` directly without ever meeting the login screen.
The gate has to be in front of the whole site, not inside the app.

Netlify and Vercel both do site-wide passwords, but only on their paid tiers
(about $19-20 a month). Cloudflare Access does the same job free for up to 50
users, and allow-lists people by email instead of sharing one password.

## Setting it up (once)

1. **Cloudflare dashboard -> Workers & Pages -> Create -> Pages -> Connect to
   Git.** Authorise GitHub and pick `sat-ai-final`.

2. Build settings:

   | Field | Value |
   | --- | --- |
   | Production branch | `main` |
   | Build command | `npm ci --prefix apps/web && npm run build --prefix apps/web` |
   | Build output directory | `apps/web/dist` |

   Nothing else. `prebuild` runs `tools/stage_public_data.py`, so the ACT and
   SAT data is regenerated on every deploy - an edit on the ACT side reaches
   the site without anyone staging it by hand.

3. If the build cannot find `python3`, add an environment variable
   `PYTHON_VERSION` = `3.12`.

4. **Zero Trust -> Access -> Applications -> Add an application -> Self-hosted.**
   Point it at the `*.pages.dev` domain the deploy gives you. Add one policy:
   *Allow*, with the rule **Emails** and the addresses of whoever should get
   in. They receive a one-time code to sign in.

## Supabase

Accounts and teacher codes need these in **Pages -> Settings -> Environment
variables**, or the deployed app runs in local mode and accounts live in one
browser:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The anon key is designed to be public and is safe in the client; it is the
row-level security policies in `supabase/teacher_codes.sql` that keep the
codes private, so run that SQL before relying on it.
