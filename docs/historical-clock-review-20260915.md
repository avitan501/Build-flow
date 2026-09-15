# Historical missing checkout presentation

Base c5b88a9d. UI-only: prior America/New_York work dates with check-in and no checkout show Missing checkout / Needs review, excluded from pay, instead of a continuously growing worked duration. Selected historical details retain actual check-in/out values but do not present open elapsed time as worked time. Current-day timer and completed durations remain unchanged. No rate, duration calculation, stored timestamp, payable total, payment action or database change.

Verification: eight deterministic date-boundary/seasonal-timezone/closed/open tests pass; two actual React browser tests pass (Chromium and WebKit), selecting historical summary and asserting no Working/85hr label and checkout disabled. Targeted ESLint and next typegen + standalone TypeScript pass. Browser fixtures mock actions to throw, so no financial actions occur. Final fixture uses existing TypeScript/React recursive bundling and passes without ESBUILD_MODULE or any undeclared dependency.

No full production build or deployment by this agent; root integrates and owns final build/release. Actual September11 finish time and breaks still require owner confirmation before any audited data correction. Existing $254.30 unpaid amount is untouched by this UI patch.
