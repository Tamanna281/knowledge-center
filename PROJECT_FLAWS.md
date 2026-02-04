# Project Flaws & Risks Tracker

This document lists the critical flaws currently present in the project. These must be addressed to ensure system stability and security.

## 1. Security Flaws
| Flaw | Description | Impact |
| :--- | :--- | :--- |
| **Verification Bypass** | `emailVerified`, `phoneVerified`, and `isActive` are hardcoded to `true` during signup. | **CRITICAL**: No identity verification; anyone can sign up. |
| **Insecure Middleware** | Middleware parses JWTs manually without verifying the digital signature. | **CRITICAL**: Users can easily forge "ADMIN" tokens. |
| **Hardcoded Secret** | Token signing falls back to `'supersecretkey'` if ENV is missing. | **HIGH**: Predictable tokens in production. |
| **Missing CSRF** | Sensitive POST actions lack explicit CSRF protection. | **MEDIUM**: Vulnerable to cross-site request forgery. |

## 2. Technical & Logic Flaws
| Flaw | Description | Impact |
| :--- | :--- | :--- |
| **Infinite Recursion** | `getErrorMessage` function calls itself when an error occurs. | **CRITICAL**: Server crashes/DoS on auth errors. |
| **Version Anomaly** | `package.json` uses non-existent versions (e.g., zod v4, bcrypt v6). | **HIGH**: Build instability and potential NPM resolution errors. |
| **Duplicate Schema** | Redundant Prisma schema exists in the `merge/` folder. | **HIGH**: Risk of data and logic out-of-sync. |
| **Strict Mode Disabled**| `strict: false` in `tsconfig.json`. | **MEDIUM**: Silent type errors leading to runtime bugs. |

## 3. Configuration Flaws
| Flaw | Description | Impact |
| :--- | :--- | :--- |
| **Missing .env.example**| No template for required environment variables. | **MEDIUM**: Difficult setup and onboarding. |
| **Dual DB Layers** | Mock in-memory DB and Prisma PostgreSQL conflict. | **MEDIUM**: Maintenance confusion. |
| **Windows Scripts** | `.bat` files are not usable for Linux/macOS developers. | **LOW**: Developer experience hurdle. |

> [!CAUTION]
> The **Infinite Recursion** bug is the most immediate risk to application availability.
