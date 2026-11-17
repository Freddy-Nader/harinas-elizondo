# fork-sync

This branch only holds the workflow that keeps `main` of this fork identical to
https://github.com/ValleryR/harinas-elizondo (`.github/workflows/sync-upstream.yml`).

It is the default branch because GitHub runs scheduled workflows from the default branch.
`main` is a pure mirror of upstream, so Vercel production (which follows `main`) deploys upstream.
Do not commit app code here and do not commit to `main` of this fork.
