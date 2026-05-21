# BUG-002 Fix Verification

**Date**: 2026-05-21  
**Bug**: `GET /api/specialists/:id` returned a weaker response shape than `GET /api/specialists`  
**File fixed**: `src/app/api/specialists/[id]/route.ts`

---

## Test counts

| State | Tests | Pass | Fail |
|-------|-------|------|------|
| Before (BUG-001 closed) | 84 | 84 | 0 |
| After adding failing tests (Phase 2) | 88 | 86 | **2** |
| After fix (Phase 3) | 88 | 88 | 0 |

---

## Diff summary

### `src/app/api/specialists/[id]/route.ts` — GET handler

**Added** `deriveSpecialistType` helper (copy of the same function in `route.ts`).

**Expanded** Prisma `include` block:
```diff
- include: { user: { select: { firstName: true, lastName: true, email: true } } },
+ include: {
+   user: { select: { firstName: true, lastName: true, email: true } },
+   services: { where: { isActive: true }, select: { serviceId: true } },
+ },
```

**Added** 5 missing fields to the return object:
```diff
+ userId: specialist.userId,
+ sortOrder: specialist.sortOrder,
+ createdAt: specialist.createdAt,
+ allowedServiceIds: specialist.services.map((ss) => ss.serviceId),
+ specialistType: deriveSpecialistType(specialist.specialization),
```

**Fixed** field order to match list endpoint (status was out of alphabetical/logical position).

No extra DB queries — all data comes from the single `findUniqueOrThrow` with expanded `include`.

---

## Frontend consumers of `GET /api/specialists/:id`

**Current consumers**: **none**.

The only call to `/api/specialists/${id}` in the codebase is a **PATCH** request in  
`src/app/(dashboard)/specialists/page.tsx:71` (status toggle). No frontend code  
currently calls the GET variant of this endpoint.

This means the weak shape caused no visible user-facing bugs today, but would break  
any future specialist detail page or edit form that fetches individual specialists.

---

## Notes on `deriveSpecialistType` duplication

The helper is now defined in both `route.ts` (list/create) and `[id]/route.ts` (detail/patch).  
A shared utility (`src/app/api/specialists/_shared.ts`) would be the clean solution,  
but the task constraints required touching only `[id]/route.ts`. Extraction is a  
low-risk follow-up that can be batched with the next route change.
