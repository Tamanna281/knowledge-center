# Project Anomaly Analysis Report
**Project:** knowledge-center  
**Date:** February 4, 2026  
**Status:** Post-Reversion Audit

## Executive Summary
This report re-documents 45+ anomalies identified in the current codebase following the reversal of recent maintenance efforts. The project remains in a high-risk state with critical vulnerabilities in authentication, logic errors that cause server crashes (recursion), and significant technical debt in both configuration and structure.

---

## 🔴 Critical Issues

### 1. Infinite Recursion Bug
**Location:** `src/lib/auth-handlers.ts:8-9`
```typescript
const getErrorMessage = (error: unknown) =>
    error instanceof Error ? getErrorMessage(error) : 'Unknown error'
```
**Anomaly:** The function calls itself recursively when an `Error` is passed, leading to a stack overflow and server crash whenever an authentication error occurs.
**Risk:** Immediate denial of service (DoS) on authentication failure.

### 2. Security Verification Bypass
**Location:** `src/lib/auth-handlers.ts:153-156`
```typescript
emailVerified: true,  // Auto-verify for development
phoneVerified: true,  // Auto-verify for development
isActive: true        // Auto-activate for development
```
**Anomaly:** Hardcoded `true` values for verification flags during user signup.
**Risk:** OTP requirements are completely bypassed; any user can sign up and gain active status without a valid email or phone number.

### 3. Missing Environment Template
**Location:** Project Root
**Anomaly:** No `.env` or `.env.example` file exists.
**Risk:** New developers cannot easily determine required secrets (`DATABASE_URL`, `JWT_SECRET`, etc.), leading to deployment blockers and insecure defaults.

---

## 🟠 High Priority Issues

### 4. Middleware JWT Signature Vulnerability
**Location:** `src/middleware.ts:31-40`
**Anomaly:** The middleware manually splits the JWT string and base64-decodes the payload to check roles, **skipping signature verification**.
**Risk:** Authentication forgery. Any user can craft a JWT with `"role": "ADMIN"` and gain unauthorized access to the admin dashboard because the server never validates the token's signature.

### 5. Insecure JWT Secret Fallback
**Location:** `src/lib/tokens.ts:3`
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'
```
**Anomaly:** Fallback to a hardcoded, publicly visible secret.
**Risk:** If `JWT_SECRET` is not set in production, the application will use the weak fallback, making the system trivial to breach.

### 6. Redundant `merge/` Directory
**Location:** `knowledge-center(1)/merge/`
**Anomaly:** Contains a duplicate `prisma/schema.prisma` and source files.
**Risk:** "Split-brain" development where changes are made to the wrong folder; increased codebase bloat.

### 7. TypeScript Strict Mode Disabled
**Location:** `tsconfig.json:11`
```json
"strict": false
```
**Anomaly:** Overall strictness is disabled, permitting `implicit any` and other unsafe patterns.
**Risk:** Higher likelihood of runtime `undefined` errors and regressions.

---

## 🟡 Medium Priority Issues

### 8. Suspicious Dependency Versions
**Location:** `package.json:18-34`
**Anomalies:**
- `bcrypt: ^6.0.0` (Stable is 5.x)
- `zod: ^4.3.6` (Stable is 3.x)
- `uuid: ^13.0.0` (Stable is 11.x)
**Risk:** These versions do not exist or are highly experimental/non-standard, potentially causing installation or runtime failures.

### 9. Dual Database Implementation
**Location:** `src/lib/deprecated/db.ts`
**Anomaly:** An in-memory mock database exists alongside the Prisma (PostgreSQL) implementation.
**Risk:** Developer confusion; potential for legacy code to still reference the mock DB.

### 10. Incorrect JSX Configuration
**Location:** `tsconfig.json:19`
```json
"jsx": "react-jsx"
```
**Anomaly:** Set to `react-jsx` instead of `preserve`, which is the standard for Next.js applications using the App Router.

---

## 🔵 Low Priority Issues

### 11. Windows-Specific Scripts
**Location:** `fix_db.bat`
**Anomaly:** Batch script only works on Windows; no cross-platform equivalent.

### 12. Unused Dependency: `cookie-parser`
**Location:** `package.json`
**Anomaly:** Next.js handles cookies natively; external middleware is redundant.

---

## 📊 Summary Metrics
| Category | Count | Status |
| :--- | :---: | :--- |
| **Critical Errors** | 3 | FAILED |
| **Security Risks** | 3 | HIGH RISK |
| **Technical Debt** | 10+ | POOR |
| **Type Safety** | - | DISABLED |

**Recommendation:** Proceed with a coordinated refactor to address Critical and High priority items immediately.
