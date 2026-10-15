---
name: Next.js preview origins
description: Development-origin checks when running Next.js through Replit's preview proxy
---

Allow the preview and local screenshot hosts in Next.js development origins when configuring a custom Next.js artifact.

**Why:** Recent Next.js development servers reject cross-origin development resources behind the proxy; the screenshot browser can show server-rendered loading placeholders while hydration is blocked.

**How to apply:** Preserve the development-origin allowance when updating the Next.js runtime or preview setup. This is a development setting, not a production CORS policy.
