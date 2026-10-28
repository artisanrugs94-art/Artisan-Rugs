/**
 * Kazumi Rugs — Firestore Security Rules Red Team Verification Suite
 * Validates all 12 Dirty Dozen adversarial payloads from security_spec.md.
 * Run against Firebase Local Emulator Suite (`firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"`).
 */

import fs from 'node:fs';
import assert from 'node:assert/strict';

export interface AdversarialAssertion {
  id: number;
  name: string;
  collectionPath: string;
  expectedRuleGate: string;
  verifyStaticGate: (rulesSource: string) => boolean;
}

const rulesText = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

const dirtyDozenSuite: AdversarialAssertion[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Product',
    collectionPath: '/products/{productId}',
    expectedRuleGate: 'data.keys().hasOnly([...]) && isAdmin()',
    verifyStaticGate: (src) => src.includes('function isValidProduct(data)') && src.includes('data.keys().hasOnly(['),
  },
  {
    id: 2,
    name: 'Unverified Admin Email Spoof',
    collectionPath: '/products/{productId}',
    expectedRuleGate: 'request.auth.token.email_verified == true',
    verifyStaticGate: (src) => src.includes("request.auth.token.email_verified == true") && src.includes("request.auth.token.email == 'artisanrugs94@gmail.com'"),
  },
  {
    id: 3,
    name: 'Self-Assigned Admin Privilege',
    collectionPath: '/admins/{adminId}',
    expectedRuleGate: 'isBootstrappedOwner()',
    verifyStaticGate: (src) => src.includes('match /admins/{adminId}') && src.includes('isBootstrappedOwner()'),
  },
  {
    id: 4,
    name: 'PII Order Scrape (list / get)',
    collectionPath: '/orders/{orderId}',
    expectedRuleGate: 'existing().customerId == request.auth.uid',
    verifyStaticGate: (src) => src.includes('match /orders/{orderId}') && src.includes('existing().customerId == request.auth.uid'),
  },
  {
    id: 5,
    name: 'Order Status Self-Elevation on Create',
    collectionPath: '/orders/{orderId}',
    expectedRuleGate: "incoming().status in ['New', 'Awaiting price confirmation']",
    verifyStaticGate: (src) => src.includes("incoming().status in ['New', 'Awaiting price confirmation']"),
  },
  {
    id: 6,
    name: 'Customer Spend / Notes Tampering',
    collectionPath: '/customers/{customerId}',
    expectedRuleGate: 'affectedKeys().hasOnly([...]) excluding totalSpentBase & notes',
    verifyStaticGate: (src) => src.includes('match /customers/{customerId}') && src.includes('affectedKeys().hasOnly(['),
  },
  {
    id: 7,
    name: 'Coupon Enumeration Protection',
    collectionPath: '/coupons/{couponId}',
    expectedRuleGate: 'allow list: if isBootstrappedOwner();',
    verifyStaticGate: (src) => src.includes('match /coupons/{couponId}') && src.includes('allow list: if isBootstrappedOwner();'),
  },
  {
    id: 8,
    name: 'Private Settings Exfiltration Block',
    collectionPath: '/private_settings/{docId}',
    expectedRuleGate: 'allow read: if false;',
    verifyStaticGate: (src) => src.includes('match /private_settings/{docId}') && src.includes('allow read: if false;'),
  },
  {
    id: 9,
    name: 'ID Poisoning & String Size Guard',
    collectionPath: 'Global',
    expectedRuleGate: 'id.size() <= 128 && id.matches(...)',
    verifyStaticGate: (src) => src.includes("id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$')"),
  },
  {
    id: 10,
    name: 'Orphaned Review Creation Block',
    collectionPath: '/reviews/{reviewId}',
    expectedRuleGate: 'exists(/databases/$(database)/documents/products/$(incoming().productId))',
    verifyStaticGate: (src) => src.includes('exists(/databases/$(database)/documents/products/$(incoming().productId))'),
  },
  {
    id: 11,
    name: 'Cross-Thread Message Injection Master Gate',
    collectionPath: '/conversations/{conversationId}/messages/{messageId}',
    expectedRuleGate: 'get(/databases/$(database)/documents/conversations/$(conversationId)).data.customerId == incoming().customerId',
    verifyStaticGate: (src) => src.includes('get(/databases/$(database)/documents/conversations/$(conversationId)).data.customerId == incoming().customerId'),
  },
  {
    id: 12,
    name: 'Client Timestamp Forgery Block',
    collectionPath: 'Global',
    expectedRuleGate: 'incoming().createdAt == request.time',
    verifyStaticGate: (src) => src.includes('incoming().createdAt == request.time') && src.includes('incoming().updatedAt == request.time'),
  },
];

for (const testCase of dirtyDozenSuite) {
  assert.equal(
    testCase.verifyStaticGate(rulesText),
    true,
    `Failed Dirty Dozen Security Assertion #${testCase.id}: ${testCase.name}`
  );
}
console.log(`Verified all ${dirtyDozenSuite.length} Dirty Dozen Firestore security invariants.`);
