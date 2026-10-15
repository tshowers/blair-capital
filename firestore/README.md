# Performance data (Firestore)

The site is **hosted** in `taliferro-de66f` (site `blair-capital`), but its quarterly
performance data and staff logins live in **`blaircapital-prod`**. That keeps Blair's
security rules out of the shared Taliferro project.

- Public site reads `performance/*` (anyone can read).
- `/admin/` lets staff publish. Writes require a Firebase Auth login **and** an `admins/{uid}` doc.

## Deploy the rules

Rules are project-wide. Before the first deploy, copy the rules currently live in
`blaircapital-prod` (Console → Firestore → Rules) into the bottom of `firestore.rules`,
so other Blair apps keep working. Then, from this folder:

```sh
firebase deploy --only firestore:rules   # .firebaserc here pins blaircapital-prod
```

Never add `"firestore"` to `../firebase.json`: that file deploys to `taliferro-de66f`.

## Add a staff member

1. Console → `blaircapital-prod` → Authentication → Add user (email + temporary password).
2. Copy their **User UID**.
3. Firestore → collection `admins` → add document with ID = that UID (any field, e.g. `name: "Lester Blair"`).

To remove access, delete their `admins` doc (and optionally disable the user).

## Seed / fix data

Sign in at `/admin/` and publish. Each quarter is one doc, ID `YYYY-Qn`:
`{ year, q, bcm, dow, sp500, sp400, nasdaq, updatedAt, updatedBy }` (returns in percent, 13.1 = +13.1%).

The latest quarter is also hard-coded in `public/index.html` (and `FALLBACK` in
`public/js/performance.js`) so numbers show instantly; Firestore overwrites them on load.
Updating those is optional and only matters if Firestore is unreachable.
