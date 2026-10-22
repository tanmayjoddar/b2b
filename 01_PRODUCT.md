# 01 — Product: Total Idea

## 1. Problem
Launching a physical consumer brand in India is easy until you need a manufacturer. Founders ask 17 people on WhatsApp "do you know a factory?", compare nothing on equal terms, cannot tell real capacity or certifications from claims, and have no protection on samples or payment. Factories with idle capacity are invisible online.

## 2. Solution
A **verified, vertical manufacturing matchmaker**. A brand submits one structured brief. Within ~48 hours it receives 3-5 verified factories with MOQ, certifications, capacity, lead time and quotes. We then help with samples, milestone payments and QC.

Not a directory. Not "Tinder". It is **a trusted sourcing agent with software**.

## 3. USP (what we defend)
Discovery is a commodity (IndiaMART, TradeIndia, WhatsApp). Our edge is **trust + speed**:
1. **Verification as the product** (tiered, honest, auditable).
2. **Brand reviews from real first orders**: the compounding moat.
3. **Brief-to-shortlist speed** (one brief instead of 17 chats).
4. **Deal protection** (sample tracking, milestone payments, inspection) which also keeps deals on-platform.
5. **Vertical depth**: we know the category (formulations, shelf life, packaging, regulatory).

NOT USPs (easy to copy): swipe UI, "AI matching", larger listings.

## 4. Launch vertical
**One vertical, one cluster first.** Default: snacks / nutrition (protein chips, bars, granola) in one region. Skincare is the second candidate. Do not build generic "all manufacturing". Vertical config (attributes, certifications, required docs) must live in data so adding a vertical is configuration, not a rewrite.

## 5. Users and roles
| Role | Who | Core needs |
|---|---|---|
| Brand | D2C founder / product lead | Find reliable factory fast, compare quotes, protect first order |
| Factory | Plant owner / sales manager (often on cheap phone, WhatsApp-first) | Qualified leads, simple quoting, no heavy software |
| Admin | Us (initially founder does everything) | Verify factories, match briefs, monitor orders, resolve disputes |

## 6. Core flows
1. **Factory onboarding**: apply → upload docs (FSSAI, GST, Udyam, certs) → automated format checks → admin verifies against official sources → video audit → tier assigned.
2. **Brief**: brand fills structured form (product type, quantity, target price band, certifications required, packaging, timeline, location preference) → submitted.
3. **Matching** (manual-first): admin shortlists 3-5 factories using filters → brand sees shortlist.
4. **Quote**: factory notified via WhatsApp → submits quote (price/unit, MOQ, lead time, validity) → brand compares side by side.
5. **Sample**: brand requests sample → tracked (requested, dispatched, received, approved/rejected).
6. **Order**: brand accepts quote → order created → milestone payments → production updates → optional inspection → delivery.
7. **Review**: brand reviews factory after completed order (on-time, quality vs sample, communication).

## 7. Verification tiers (shown honestly on profiles)
| Tier | Badge | How |
|---|---|---|
| 1 | Documents Verified | FSSAI (FoSCoS), GST portal, Udyam, ISO/GMP issuer check |
| 2 | Video Verified | Live walkthrough of floor, storage, hygiene; random "show me now" check |
| 3 | Order Proven | Completed orders + positive brand reviews on platform |
| 4 | Inspected | Paid third-party/freelance inspection |

Rules: never display a badge stronger than the check actually performed. Every verification action is audit-logged with who, when, evidence, and source. Verification expires (e.g. licence expiry date triggers re-verification).

## 8. Business model
- **Shortlist fee**: ₹5-10k per brief (validates demand, early revenue).
- **Take rate**: 2-4% on first production order through platform.
- **Factory subscription**: ₹10-30k/yr for verified listing + qualified leads.
- **Inspection add-on**: ₹5-15k per inspection (margin over agency cost).
Estimates are assumptions, to be replaced by real numbers from the first 10 paying brands.

## 9. MVP scope
**In**: auth/roles, factory onboarding + docs + admin verification, brief form, manual matching + shortlist, quote request/response, quote comparison, WhatsApp notifications (start with click-to-chat / manual, API later), basic orders + sample tracking, admin panel.

**Out for now (do NOT build unless asked)**: AI/auto matching, in-platform chat, escrow beyond Razorpay milestone flow, native mobile app, multi-vertical engine UI, public API, marketplace search ranking, subscriptions billing automation.

## 10. Phases
- **Phase 0 (no code, 4-6 weeks)**: Sheet/Airtable + WhatsApp, 15-20 verified factories, sell shortlists to 10 brands. Gate: 10 paying brands or stop/reconsider.
- **Phase 1 (MVP, months 2-4)**: slices 0-4 from `00_README_AI_INDEX.md`.
- **Phase 2 (months 5-9)**: slices 5-7: orders, payments, reviews, inspections.
- **Phase 3**: second vertical, repeat-order tooling, optional mobile PWA/app.

## 11. Success metrics
- Funnel: briefs submitted → shortlists delivered → quotes received → paid orders.
- Time from brief to shortlist (target ≤ 48h).
- Factory response rate and median quote time.
- % of orders completed on-platform (anti-disintermediation).
- Repeat orders per brand (key to take-rate revenue).
- Verified factory count and share with Tier 3+.

## 12. Key risks and mitigations
| Risk | Mitigation |
|---|---|
| Disintermediation | Milestone payments, sample tracking, reviews, inspections |
| Low usage frequency | Repeat-order tools, multiple products per brand, packaging/ingredient add-ons |
| Fake factory claims | Tiered verification, issuer checks, video audit, reviews |
| Supply-side cold start | Manual onboarding in one cluster; get factories via packaging/ingredient vendors |
| Quality incident on a verified factory | Honest badges, dispute process, inspection add-on, terms of service |
| Free infra failure | Off-VM backups, Docker portability, documented restore |

## 13. Non-functional requirements
- Mobile-first, works on slow networks and cheap Android phones.
- English first; Hindi/Bengali-ready (i18n from day one, no hardcoded strings).
- 99% uptime target is fine for MVP; do not promise more.
- Data privacy per India's DPDP Act (consent, minimal collection, deletion path).
- Everything auditable: verification, quotes, order state changes, payments.

## 14. Open decisions (human must decide)
- Launch vertical and cluster.
- Legal entity, terms of service, dispute policy, who bears QC cost.
- WhatsApp provider (direct Meta Cloud API vs BSP) and when to switch from manual.
- Whether to take payments in-platform at launch or only shortlist fees.
