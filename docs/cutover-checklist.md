# Cutover smoke checklist

- [ ] Home hero CTAs → `/extension` and `/casinos`
- [ ] Casino directory loads; live feed or static fallback
- [ ] Casino slug detail renders pillars
- [ ] Discord login → `/dashboard` with session cookie on web domain
- [ ] Dashboard saves settings via API
- [ ] Extension loads unpacked; demo mode sidebar visible
- [ ] Extension Discord connect opens OAuth (`ext_` state)
- [ ] `/tools/domain-verifier` and `/tools/scan-scams` return JSON
- [ ] CI green on `main`
- [ ] DNS: `tiltcheck.me` → Vercel, `api.tiltcheck.me` → Railway
- [ ] Retire `dashboard.tiltcheck.me` → redirect to `/dashboard`
