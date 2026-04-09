import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRoles, rolesQueryKey, workspaceRolesQueryKey } from "@/hooks/useRoles";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: vi.fn() }));
// Prevent the Supabase client from initialising in the test environment.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseWorkspace = vi.mocked(useWorkspace);

const USER_ID = "user-abc";
const WORKSPACE_ID = "ws-xyz";
const OWNER_ID = "owner-111";

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

// ─── Query key factories ──────────────────────────────────────────────────────

describe("rolesQueryKey", () => {
  it("includes userId and workspaceId", () => {
    expect(rolesQueryKey("u1", "w1")).toEqual(["roles", "u1", "w1"]);
  });

  it("handles null values", () => {
    expect(rolesQueryKey(null, null)).toEqual(["roles", null, null]);
  });
});

describe("workspaceRolesQueryKey", () => {
  it("includes workspaceId", () => {
    expect(workspaceRolesQueryKey("w1")).toEqual(["workspace-roles", "w1"]);
  });
});

// ─── useRoles — derived RBAC flags ───────────────────────────────────────────

describe("useRoles", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    mockedUseAuth.mockReturnValue({
      user: { id: USER_ID, email_confirmed_at: "2026-01-01" },
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    } as never);
    mockedUseWorkspace.mockReturnValue({
      currentWorkspace: { id: WORKSPACE_ID, owner_id: OWNER_ID },
      workspaces: [],
      loading: false,
      error: null,
      setCurrentWorkspace: vi.fn(),
      createWorkspace: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  function seedCache(overrides: Partial<{ userRoles: unknown[]; membershipRole: string | null }> = {}) {
    queryClient.setQueryData(rolesQueryKey(USER_ID, WORKSPACE_ID), {
      userRoles: [],
      membershipRole: null,
      ...overrides,
    });
  }

  it("is not loading when cache is already populated", () => {
    seedCache();
    const { result } = renderHook(() => useRoles(), { wrapper: makeWrapper(queryClient) });
    expect(result.current.loading).toBe(false);
  });

  it("returns loading=false when user or workspace is null (query disabled)", () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: false } as never);
    const { result } = renderHook(() => useRoles(), { wrapper: makeWrapper(queryClient) });
    expect(result.current.loading).toBe(false);
  });

  it("grants admin when user has app role admin", () => {
    seedCache({ userRoles: [{ id: "r1", user_id: USER_ID, workspace_id: WORKSPACE_ID, role: "admin", created_at: "" }] });
    const { result } = renderHook(() => useRoles(), { wrapper: makeWrapper(queryClient) });
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isAnalyst).toBe(true);
    expect(result.current.isViewer).toBe(true);
  });

  it("grants analyst capabilities but not admin", () => {
    seedCache({ userRoles: [{ id: "r1", user_id: USER_ID, workspace_id: WORKSPACE_ID, role: "analyst", created_at: "" }] });
    const { result } = renderHook(() => useRoles(), { wrapper: makeWrapper(queryClient) });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAnalyst).toBe(true);
    expect(result.current.canAnalyze).toBe(true);
    expect(result.current.canManageWorkspace).toBe(false);
  });

  it("grants viewer access via membership role member", () => {
    seedCache({ membershipRole: "member" });
    const { result } = renderHook(() => useRoles(), { wrapper: makeWrapper(queryClient) });
    expect(result.current.isViewer).toBe(true);
    expect(result.current.isAnalyst).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("grants admin via workspace membership role owner", () => {
    seedCache({ membershipRole: "owner" });
    const { result } = renderHook(() => useRoles(), { wrapper: makeWrapper(queryClient) });
    expect(result.current.isAdmin).toBe(true);
  });

  it("grants admin when user is the workspace owner", () => {
    mockedUseWorkspace.mockReturnValue({
      currentWorkspace: { id: WORKSPACE_ID, owner_id: USER_ID },
      workspaces: [],
      loading: false,
      error: null,
      setCurrentWorkspace: vi.fn(),
      createWorkspace: vi.fn(),
      refetch: vi.fn(),
    } as never);
    seedCache({ userRoles: [], membershipRole: null });
    const { result } = renderHook(() => useRoles(), { wrapper: makeWrapper(queryClient) });
    expect(result.current.isAdmin).toBe(true);
  });

  it("hasRole returns correct values", () => {
    seedCache({ userRoles: [{ id: "r1", user_id: USER_ID, workspace_id: WORKSPACE_ID, role: "analyst", created_at: "" }] });
    const { result } = renderHook(() => useRoles(), { wrapper: makeWrapper(queryClient) });
    expect(result.current.hasRole("analyst")).toBe(true);
    expect(result.current.hasRole("admin")).toBe(false);
    expect(result.current.hasRole("viewer")).toBe(true); // analyst implies viewer
  });

  it("returns empty roles array when cache has no data", () => {
    // No seedCache call — query will be in pending state (not fetching because test env)
    const { result } = renderHook(() => useRoles(), { wrapper: makeWrapper(queryClient) });
    expect(result.current.roles).toEqual([]);
  });
});
