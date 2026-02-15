# SafeAgent - AI Guardrails Platform

## Product Overview

**SafeAgent** is an AI guardrails platform that helps developers add safety layers to their AI applications. It detects and prevents harmful outputs, protects against prompt injection, and ensures compliance.

## Target Customers

- **Primary:** B2B SaaS companies building AI products
- **Secondary:** Enterprises with AI compliance requirements
- **ICP:** Engineering teams at companies with 10-100 developers

## Core Features

### 1. Jailbreak Detection (P0)
Detect prompt injection attempts and malicious inputs.

- Pattern-based detection
- Heuristic analysis
- ML model (optional v2)

### 2. PII Detection (P0)
Detect and redact personally identifiable information in AI outputs.

- Regex pattern matching
- NLP-based detection
- Automatic redaction

### 3. API Gateway (P1)
RESTful API for integrating guardrails.

- REST API specification
- OAuth authentication
- Rate limiting

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind
- **Backend:** Node.js, Express
- **Database:** PostgreSQL, Prisma
- **AI:** OpenAI, Claude APIs for detection

## MVP Scope

### Phase 1 (v1.0)
- [ ] Jailbreak detection API
- [ ] PII detection API  
- [ ] Basic dashboard
- [ ] REST API with auth

### Phase 2 (v1.1)
- [ ] Real-time monitoring
- [ ] Custom rules
- [ ] Analytics

## Pricing (MVP)

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 1k requests/month |
| Pro | $49/mo | 100k requests |
| Enterprise | Custom | Unlimited |

## Success Metrics

- Number of active API users
- Requests processed
- Detection accuracy rate

---

*Last Updated: 2026-02-15*
*Asana Project: 1213287696255155*
*GitHub: https://github.com/startupbuilders777-beep/safeagent*
