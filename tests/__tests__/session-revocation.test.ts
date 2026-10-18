import { walletService } from "../../lib/wallet/service";
import { STORAGE_KEYS } from "../../lib/stellar-constants";

// Mock the global fetch
const originalFetch = global.fetch;

describe("Session Revocation", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Setup some dummy data in localStorage
    localStorage.setItem(STORAGE_KEYS.LINKED_WALLETS, "[]");
    localStorage.setItem(STORAGE_KEYS.DELEGATIONS, "[]");
    localStorage.setItem(STORAGE_KEYS.SESSION_RECOVERY, "{}");
    localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, "G1234567890");
    localStorage.setItem(STORAGE_KEYS.WALLET_TYPE, "freighter");
    localStorage.setItem(STORAGE_KEYS.WALLET_STATE, "{}");

    // Setup fetch mock
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("should clear all related local storage keys on revoke", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    });

    await walletService.revokeSession();

    expect(localStorage.getItem(STORAGE_KEYS.LINKED_WALLETS)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.DELEGATIONS)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SESSION_RECOVERY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.WALLET_TYPE)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.WALLET_STATE)).toBeNull();
  });

  it("should successfully call the backend to revoke on normal path", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    });

    await walletService.revokeSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/telemetry/session", { method: "DELETE", headers: { authorization: "Bearer DUMMY_TOKEN" } });
  });

  it("should retry on network failure/500 error up to 3 times", async () => {
    // Mock the fetch to fail 3 times
    fetchMock
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockRejectedValueOnce(new Error("Network Error"));

    await walletService.revokeSession();

    // Since we retry 3 times initially
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("should stop retrying if backend returns 401 Unauthorized", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await walletService.revokeSession();

    // Should only call once because it immediately breaks out of retry loop for 401
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should stop retrying if backend returns 403 Forbidden", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await walletService.revokeSession();

    // Should only call once because it immediately breaks out of retry loop for 403
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
