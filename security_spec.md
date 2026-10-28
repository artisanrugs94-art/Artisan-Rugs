# Kazumi Rugs — Firestore Zero-Trust Security Specification (Phase 0)

## 1. Data Invariants
1. **Default-Deny Catch-All**: No unlisted collection or subcollection is ever readable or writable (`allow read, write: if false`).
2. **Verified Admin RBAC**: Admin access requires either the verified bootstrapped owner (`email_verified == true && email == 'artisanrugs94@gmail.com'`) or an explicit document in `/admins/{uid}` with `email_verified == true`. Staff role (`role == 'staff'`) cannot access `/finances` or `/settings` or `/private_settings`.
3. **Private Settings Isolation**: `/private_settings/{docId}` has `allow read: if false;` so secret API keys are strictly unreadable from any client SDK.
4. **PII Split & Ownership**: `/orders/{orderId}` and `/customers/{customerId}` contain PII and are readable strictly by the verified owner (`request.auth.uid`) or an admin. Public order lookup uses `/orderTracking/{trackingKey}` (`allow get` only by exact composite key, `allow list` restricted to admins).
5. **Relational Master Gate**: Subcollection `/conversations/{conversationId}/messages/{messageId}` verifies ownership of the parent `/conversations/{conversationId}` document via `get()` on every access, and `/reviews` verifies `/products/{productId}` via `exists()` on creation.
6. **Strict Schema & Temporal Integrity**: Every `create` enforces `hasAll` + `hasOnly` keys, bounded string/array `.size()`, valid regex IDs (`isValidId`), and `createdAt == request.time`. Every `update` wraps `isValid[Entity](incoming())`, enforces immutable `createdAt`, requires `updatedAt == request.time`, locks terminal states unless admin, and restricts changed fields via `affectedKeys().hasOnly()`.
7. **Zero Query Delegation**: No `allow list: if isSignedIn();` exists anywhere. Every `allow list` enforces `resource.data` predicates (`status == 'active'`, `customerId == request.auth.uid`, etc.) or `isBootstrappedOwner()`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Product**: Authenticated user sends valid product fields + `"isFeaturedHack": true` -> Rejected by `hasOnly` + admin gate.
2. **Unverified Admin Email Spoof**: Attacker signs up with unverified email `artisanrugs94@gmail.com` (`email_verified: false`) and attempts to write `/products/prod_1` -> Rejected by `isVerifiedUser()`.
3. **Self-Assigned Admin Privilege**: Verified user attempts `setDoc('/admins/attacker_uid', { role: 'owner', ... })` -> Rejected because only `isBootstrappedOwner()` can write `/admins`.
4. **PII Order Scrape (`list` / `get`)**: Authenticated user `uid_b` attempts to `get` `/orders/ord_a` owned by `uid_a` or `list` all `/orders` -> Rejected by `resource.data.customerId == request.auth.uid`.
5. **Order Status Self-Elevation**: Guest or customer creates `/orders/ord_1` with `paymentStatus: 'Paid'` and `status: 'Delivered'` -> Rejected (`status` on client create must be `'New'` or `'Awaiting price confirmation'`, and `paymentStatus` cannot be forged to `'Refunded'`).
6. **Customer Spend/Notes Tampering**: Customer updates `/customers/uid_a` changing `totalSpentBase: 999999` or `notes: 'VIP'` -> Rejected by action-based `affectedKeys().hasOnly(...)` excluding RBAC/system fields.
7. **Coupon Enumeration**: Guest attempts `getDocs(collection(db, 'coupons'))` -> Rejected (`allow list` restricted to admin; guests can only `get` a known coupon code).
8. **Private Settings Exfiltration**: Admin or attacker attempts `getDoc(doc(db, 'private_settings', 'payments'))` -> Rejected (`allow read: if false`).
9. **ID Poisoning / DoW**: Attacker attempts to create `/subscribers/` with a 2,000-character document ID or 50,000-char email -> Rejected by `isValidId` (`<= 128`) and `.size() <= 254`.
10. **Orphaned Review Creation**: Verified user creates a review referencing nonexistent `productId: 'ghost_999'` or already `status: 'approved'` -> Rejected (`exists(/products/...)` and `status == 'pending'` enforced).
11. **Cross-Thread Message Injection**: Verified user `uid_b` posts a message inside `/conversations/conv_a/messages/msg_1` belonging to `uid_a` -> Rejected by Master Gate `get(/conversations/conv_a).data.customerId == request.auth.uid`.
12. **Client Timestamp Forgery**: Verified user creates a review with `createdAt` set to year 2020 -> Rejected by `incoming().createdAt == request.time`.
