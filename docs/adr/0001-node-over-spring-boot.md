# ADR 0001 — Node.js/Express backend, not Spring Boot

**Status:** accepted · 2026-08-16

## Context

trackify's backend could plausibly be Spring Boot (Java/Kotlin) or Node.js.
The question was raised explicitly at project start.

## Decision

Node.js 22 + Express + Prisma.

## Reasons

1. **One language across the stack.** The frontend, Capacitor tooling, the
   Prisma schema, and the shared Zod contracts are all TypeScript. A JVM
   backend forks the codebase into two toolchains, two dependency ecosystems,
   and two mental models for a team of one-to-few.
2. **This workload is I/O glue, not compute.** Webhook ingestion, Plaid
   calls, Postgres queries, FCM pushes — Node's async model fits exactly;
   nothing here needs the JVM's threading or throughput profile.
3. **Cloud Run economics.** Scale-to-zero is a stated requirement. The Node
   image cold-starts in the hundreds of milliseconds at ~512 MB; Spring Boot
   cold starts are multi-second at higher memory unless you take on GraalVM
   native-image complexity — a poor trade for a webhook-driven app that idles
   most of the day.
4. **Stack continuity with the existing loupe services.** The house patterns
   being reused (response envelope, secret-manager-below-env config,
   write-on-read snapshots) port naturally; the TS/React conventions come
   straight from loupe-web.

## When to revisit

Adopt a JVM (or Go) service *alongside* — not instead of — this API if a
component emerges with sustained CPU-bound load (large-scale statement
rendering, analytics batch jobs) or a hard requirement on a JVM-only
library. The envelope contract makes adding a second service cheap; nothing
about this decision is one-way.
