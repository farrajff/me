# Firestore Security Specification

## 1. Data Invariants
1. Public visitors can only read `/site/public` and active `/links/{linkId}` (`isActive == true`). Hidden links (`isActive == false`) are strictly restricted to verified admins.
2. `/site/security` (containing the encrypted secondary editing password hash) is strictly restricted to verified admins (`isAdmin()`).
3. Only verified admins (`request.auth != null && request.auth.token.email_verified == true && (request.auth.token.email == 'gate1425@gmail.com' || exists(/databases/$(database)/documents/admins/$(request.auth.uid)))`) can create, update, or delete `/site/public`, `/site/security`, and `/links/{linkId}`.
4. Click events (`/clickEvents/{eventId}`) and page views (`/pageViews/{viewId}`) are strictly append-only (`allow update: if false`), bounded in size, validated against `request.time`, and `clickEvents` require `exists(/databases/$(database)/documents/links/$(incoming().linkId))`. Only admins may read or delete analytics events.
5. Every document ID variable (`linkId`, `eventId`, `viewId`, `userId`) is validated with `isValidId()` (`^[a-zA-Z0-9_\-]+$` and length <= 128).
6. All string fields enforce explicit `.size()` boundaries and enums are strictly allowlisted.

## 2. Adversarial "Dirty Dozen" Payloads
1. Unauthenticated write to `/site/public` -> `PERMISSION_DENIED`
2. Unverified-email token attempting write to `/links/lnk-1` -> `PERMISSION_DENIED`
3. Unauthenticated read of `/site/security` -> `PERMISSION_DENIED`
4. Unauthenticated `get` or `list` of inactive link (`isActive: false`) -> `PERMISSION_DENIED`
5. Shadow field injection (`isVerified: true`) on `/links/lnk-1` create -> `PERMISSION_DENIED`
6. Oversized `bio` string (> 260 chars) on `/site/public` -> `PERMISSION_DENIED`
7. Spoofed `createdAt` timestamp (not equal to `request.time`) on `/links/lnk-1` -> `PERMISSION_DENIED`
8. Mutating `createdAt` during `/links/lnk-1` update -> `PERMISSION_DENIED`
9. Creating `/clickEvents/ev-1` referencing a non-existent `linkId` -> `PERMISSION_DENIED`
10. Updating or deleting `/clickEvents/ev-1` as a non-admin -> `PERMISSION_DENIED`
11. Reading `/clickEvents` or `/pageViews` as a non-admin -> `PERMISSION_DENIED`
12. Poisoned document ID (`../../etc/passwd` or > 128 chars) on `/clickEvents/{eventId}` -> `PERMISSION_DENIED`
