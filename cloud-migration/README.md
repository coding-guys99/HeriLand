# HeriLand Supabase Cloud Beta

## Current status (2026-11-22)
- **Created:** dedicated Supabase Free project `HeriLand` in E-Link, Singapore (`kojhcaiyhuoovytmbtga`).
- **Applied:** 11-table RLS schema, tightened media ownership & save policies, performance indexes.
- **Seeded:** 9 public/demo cultural guides, 48 demo community posts and 56 demo media references.
- **Verified:** 9/48/56 counts; anonymous GET 200; anonymous post INSERT 401; Security Advisor 0 warnings; Cloud UI Explore rendered in headless Edge.
- **GitHub staging:** `coding-guys99/HeriLand` branch `supabase-cloud-beta` including `supabase-api.js`.
- **Live Vercel:** `https://heriland-wxdc.vercel.app/` remains previous read-only version until registration and RLS end-to-end testing passes.

## Architecture
Static Vercel frontend -> browser Supabase REST API / Auth / Storage -> dedicated Postgres with RLS.

Store only metadata, posts, likes, comments, profiles and object paths in PostgreSQL.
Store actual uploaded files in Supabase Storage bucket `heriland-media`.
Do not upload local `data/kamek.sqlite3` or user sessions to GitHub.
Do not use Supabase service_role / secret in browser. The key in `supabase-api.js` is a public anon API key.

## Deployment & follow-up required
1. Configure Auth URL settings on Supabase for `https://heriland-wxdc.vercel.app` (Site URL and allowed Redirect URLs). Test a real confirmation email before public registration.
2. Create User A and User B test accounts with verified emails and test: login persistence, profile creation, post/media ownership, save/like/comment/follow and cross-user access denial.
3. Test upload MIME, size and malicious object path; handle orphaned objects and cleanup on post deletion.
4. Add anti-spam, moderation workflow, email throttling, and abuse reports before launch. Notifications are not implemented on cloud beta.
5. Review performance: current API adapter does multiple REST calls per post feed; optimize with a constrained view/RPC after real traffic emerges.
6. Check the beta branch deployment and only then promote the branch to `main`. Keep the read-only version available for rollback.
7. Keep SQLite backup locally; legacy local user passwords are **not** migrated. Real users must sign up for cloud accounts.

## Source & changes
- `001_schema.sql` — baseline schema, originally executed as `initial_heriland_schema`.
- Follow-up policies and indexes were applied separately as `tighten_owner_media_and_saves` and `add_heriland_fk_indexes`.
- `seed_demo.sql` — repeatable demonstration content seed (not genuine community users).

Status: Schema and public read path tested. **Not yet production-ready for user registration and multi-user writes.**
