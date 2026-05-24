# Shante Lyur OS — Claude Instructions

## After Every Change

After every task that modifies files, ALWAYS end the response with run instructions in this exact format:

```
## Run Instructions

git pull origin claude/salon-booking-system-ErCHR
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue   ← only if .next cache needs clearing
npm install                                                         ← only if package.json changed
npx prisma db push                                                  ← only if schema.prisma changed
npx prisma db seed                                                  ← only if seed data changed
npm run dev

Open: http://localhost:3000/dashboard
Test: [what specifically to test for this change]
```

Only include the steps that are actually needed for the specific change.
The user is on **Windows PowerShell** — all commands must be PowerShell-compatible.

## Project Context

- **Stack**: Next.js 14 App Router, TypeScript, Prisma 5, PostgreSQL
- **Branch**: `claude/salon-booking-system-ErCHR`
- **User OS**: Windows, PowerShell
- **Theme**: Luxury dark CRM with champagne/gold branding
- **PostCSS config**: `postcss.config.js` must exist at project root — it was previously missing and caused a full CSS regression
- **Key files**: `tailwind.config.ts`, `postcss.config.js`, `src/app/globals.css`, `src/contexts/language.tsx`
