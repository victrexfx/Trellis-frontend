# Session Revocation and Security Events

This document details the implementation and operational edge cases for the Stale Session and Token Revocation feature triggered by security events.

## Architecture

The system coordinates session revocation via three main layers:
1. **Security Event Dispatcher (`lib/security/events.ts`)**: Propagates `critical-vulnerability` or `manual-revoke` events across the UI via `dispatchSecurityEvent` and `useSecurityEventSubscription`.
2. **Context Layer (`components/context/StellarWalletProvider.tsx`)**: The UI listens to these events to invoke state cleanup, reset tracked concurrency models, disconnect the current wallet via `@stellar/freighter-api`, and then trigger `walletService.revokeSession()`.
3. **Session Management / Concurrency (`lib/concurrency.ts`)**: Local state invalidation occurs through `invalidateAllVersions()` which resets tracked versions, throwing out local stale edits effectively ending current active processes.
4. **Wallet Service (`lib/wallet/service.ts`)**: Clears keys (`LINKED_WALLETS`, `DELEGATIONS`, `SESSION_RECOVERY`, `WALLET_ADDRESS`, `WALLET_TYPE`, `WALLET_STATE`) and informs the backend.

## Coverage

### Normal Path
Under normal operation, when a security event is triggered:
- Variables in memory are reset.
- Local Storage is cleared entirely of wallet and session configurations.
- An asynchronous `DELETE` call is made to the backend at `/api/telemetry/session` to wipe the session externally, returning a `200 OK`.

### Authorization Path
If a `401 Unauthorized` or `403 Forbidden` response is received:
- The token is already deemed invalid by the backend or the user has insufficient scope.
- The system recognizes this as an effective end to the session, terminates early, and avoids unnecessary network retries.

### Failure and Retry Path
If a `500 Internal Server Error` or a network disconnection occurs during the backend `DELETE` request:
- The `walletService.revokeSession` uses a built-in exponential backoff fallback logic.
- It will attempt the request up to **3 times** with a 500ms delay to account for temporary routing drops or backend stutters.
- If it fails consistently 3 times, it silently swallows the backend error, having already cleared the local context to prevent further use. This ensures users are not stranded in a broken UI state just because the backend is momentarily unavailable.

## Operational Edge Cases & Rollback Behavior

- **Simultaneous Vulnerabilities**: If multiple critical bugs trigger events rapidly, the listener acts idempotently since local storage properties will be `null` and backend retries will hit empty endpoints.
- **Migration Plan for Contracts**: The revocation invalidates only the *session connection* and the UI state variables linking the current wallet. On-chain capabilities, including minting logic in `lib/stellar.ts`, remain untouched. No Soroban contracts need migrating.
- **Rollback Behavior**: Since sessions are completely expunged from the browser locally, the primary "rollback" for a user is simply reconnecting their wallet via Freighter to mint a new token. There is no partial state allowed once a `revokeSession` has run. If backend failed to process but local passed, the user effectively "rolled back" from a logged in state to a fully anonymous guest state.
