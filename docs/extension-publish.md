# Chrome Web Store publish

TiltCheck install CTAs read a single listing URL from env. Until the extension is published, every install button routes to the web setup page at `/extension`.

## Environment variable

Set on **web** (Railway) and optionally at **extension build** time:

```bash
NEXT_PUBLIC_CHROME_WEB_STORE_URL=https://chromewebstore.google.com/detail/tiltcheck/EXTENSION_ID
```

| When set | Behavior |
|----------|----------|
| **Unset or empty** | Nav install icon, hero CTAs, and `/extension` primary button → `/extension` with unpacked install steps |
| **Set** | Install CTAs open the Chrome Web Store listing; `/extension` shows “Install from Chrome Web Store” |

Extension **side panel** (v2.4+, Chrome 114+) opens docked on icon click like Trust Wallet. Footer link uses:

```bash
EXTENSION_CWS_URL=https://chromewebstore.google.com/detail/tiltcheck/EXTENSION_ID
# or inherit from NEXT_PUBLIC_CHROME_WEB_STORE_URL during build
```

Do **not** commit a fake extension ID — leave defaults empty until the listing exists.

## Publish checklist

1. **Build** the extension against the target API/web URLs:

   ```bash
   EXTENSION_API_URL=https://api.tiltcheck.me \
   EXTENSION_WEB_URL=https://tiltcheck.me \
   NEXT_PUBLIC_CHROME_WEB_STORE_URL= \
   pnpm --filter @tiltcheck/extension build
   ```

2. **Zip** `apps/extension/dist` for upload (manifest + bundled JS + `sidepanel.html`).

3. **Chrome Web Store Developer Dashboard** — create item, upload zip, fill listing copy, privacy, screenshots.

4. After approval, set `NEXT_PUBLIC_CHROME_WEB_STORE_URL` on Railway **web** and rebuild **web** + **extension** with the live detail URL.

5. Redeploy web so `NEXT_PUBLIC_*` is inlined at build time.

See also [deploy.md](./deploy.md) for Railway service env matrix.
