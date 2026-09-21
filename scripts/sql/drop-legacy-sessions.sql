-- Phase 6 of docs/PORT-PLAN.md: the SvelteKit-era `sessions` table.
-- Better Auth keeps its sessions in `session`; nothing has read this one
-- since PR #223. Run against production by hand, never through db:push.
drop table if exists sessions;
