import { STORAGE_KEYS } from "../stellar-constants";
import { LinkedWallet, Delegation, DelegationAuditLog, SessionRecoveryState } from "./types";

export const walletService = {
  getLinkedWallets(): LinkedWallet[] {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(STORAGE_KEYS.LINKED_WALLETS);
    return saved ? JSON.parse(saved) : [];
  },

  saveLinkedWallets(wallets: LinkedWallet[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.LINKED_WALLETS, JSON.stringify(wallets));
  },

  getDelegations(): Delegation[] {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(STORAGE_KEYS.DELEGATIONS);
    return saved ? JSON.parse(saved) : [];
  },

  saveDelegations(delegations: Delegation[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.DELEGATIONS, JSON.stringify(delegations));
  },

  getAuditLogs(): DelegationAuditLog[] {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("stellar_delegation_audit_logs");
    return saved ? JSON.parse(saved) : [];
  },

  addAuditLog(log: Omit<DelegationAuditLog, "id" | "timestamp">) {
    if (typeof window === "undefined") return;
    const logs = this.getAuditLogs();
    const newLog: DelegationAuditLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    logs.push(newLog);
    localStorage.setItem("stellar_delegation_audit_logs", JSON.stringify(logs));
  },

  recoverSession(): SessionRecoveryState | null {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(STORAGE_KEYS.SESSION_RECOVERY);
    return saved ? JSON.parse(saved) : null;
  },

  saveSessionRecovery(state: SessionRecoveryState) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.SESSION_RECOVERY, JSON.stringify(state));
  },

  async revokeSession(): Promise<void> {
    if (typeof window === "undefined") return;

    // Clear local storage associated with wallet sessions
    localStorage.removeItem(STORAGE_KEYS.LINKED_WALLETS);
    localStorage.removeItem(STORAGE_KEYS.DELEGATIONS);
    localStorage.removeItem(STORAGE_KEYS.SESSION_RECOVERY);
    localStorage.removeItem(STORAGE_KEYS.WALLET_ADDRESS);
    localStorage.removeItem(STORAGE_KEYS.WALLET_TYPE);
    localStorage.removeItem(STORAGE_KEYS.WALLET_STATE);

    // Call backend to revoke any active tokens or sessions using retry logic
    const endpoint = '/api/telemetry/session';
    let retries = 3;

    // Attempt to grab token before clearing if needed, dummy used here for testing structure
    const dummyToken = "Bearer DUMMY_TOKEN";

    while (retries > 0) {
      try {
        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'authorization': dummyToken
          }
        });
        if (response.ok || response.status === 401 || response.status === 403) {
          // Success or already unauthorized
          break;
        }
      } catch (error) {
        console.error('Failed to revoke session on backend:', error);
      }
      retries -= 1;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Backoff
      }
    }
  }
};
