# HuDa Web Quran — Video Pipeline Safety & Approval Gates

- Strict 16-State Lifecycle: Every clip must progress sequentially through the reconciled 16 explicit states:
  1. `CLIP_PLAN_PENDING_APPROVAL`
  2. `IMAGE_GENERATION_PENDING`
  3. `IMAGE_HUMAN_REVIEW_PENDING`
  4. `VIDEO_GENERATION_PENDING_APPROVAL`
  5. `VIDEO_GENERATING`
  6. `VIDEO_HUMAN_REVIEW_PENDING`
  7. `LOCAL_STAGING_PENDING`
  8. `LOCAL_QA_PENDING`
  9. `GIT_COMMIT_PENDING`
  10. `PUSH_PENDING`
  11. `PR_PENDING`
  12. `PR_REVIEW_PENDING`
  13. `MERGE_PENDING_APPROVAL`
  14. `PRODUCTION_DEPLOYMENT_PENDING_APPROVAL`
  15. `LIVE_VERIFICATION_PENDING`
  16. `COMPLETED`
- Decoupled Human Approval Gates: Plan approval, image approval, video generation authorization, final video review, PR merge approval, and production deployment authorization MUST remain separate, non-fungible human decisions.
- Budget Floor Invariant: The ₹600.00 INR hard-stop reserve floor in `VIDEO_BUDGET_LEDGER.json` must NEVER be breached.
- Quran Verse Integrity Invariant: Always extract authoritative verse text from local `public/data/quran-verses/<surah>.json`. Never alter Arabic text, never fabricate translations, and never skip verses or create unapproved overlaps.
- Operation Polling Resumption: Before creating any paid generation request, check if an operation ID is already active in the state. If active, resume polling instead of submitting a duplicate paid request.
- Production Isolation Invariant: Never modify production manifests (`videoManifest.ts`), upload to Cloudflare R2, or deploy to Vercel during planning, preview, mock, or local staging phases.
