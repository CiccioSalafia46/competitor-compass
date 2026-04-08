import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useWorkspace } from "@/hooks/useWorkspace";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useRoles", () => ({
  useRoles: vi.fn(),
}));

vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspace: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseRoles = vi.mocked(useRoles);
const mockedUseWorkspace = vi.mocked(useWorkspace);

function renderGuard({
  minimumRole = "viewer",
  requireVerified = false,
}: {
  minimumRole?: "viewer" | "analyst" | "admin";
  requireVerified?: boolean;
} = {}) {
  return render(
    <MemoryRouter
      initialEntries={["/protected"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/auth" element={<div>auth-screen</div>} />
        <Route path="/settings" element={<div>settings-screen</div>} />
        <Route path="/dashboard" element={<div>dashboard-screen</div>} />
        <Route path="/onboarding" element={<div>onboarding-screen</div>} />
        <Route
          path="/protected"
          element={
            <RouteGuard minimumRole={minimumRole} requireVerified={requireVerified}>
              <div>protected-screen</div>
            </RouteGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RouteGuard", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
    mockedUseRoles.mockReset();
    mockedUseRoles.mockReturnValue({
      loading: false,
      hasRole: () => true,
    } as never);
    mockedUseWorkspace.mockReturnValue({
      loading: false,
      currentWorkspace: { id: "workspace-1" },
    } as never);
  });

  it("redirects unauthenticated users to auth", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
    } as never);

    renderGuard();

    expect(screen.getByText("auth-screen")).toBeInTheDocument();
  });

  it("redirects unverified users when verification is required", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "user-1", email_confirmed_at: null },
      loading: false,
    } as never);

    renderGuard({ requireVerified: true });

    expect(screen.getByText("settings-screen")).toBeInTheDocument();
  });

  it("redirects users without the required role", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "user-1", email_confirmed_at: "2026-04-05T10:00:00.000Z" },
      loading: false,
    } as never);
    mockedUseRoles.mockReturnValue({
      loading: false,
      hasRole: (role: string) => role === "viewer",
    } as never);

    renderGuard({ minimumRole: "admin" });

    expect(screen.getByText("dashboard-screen")).toBeInTheDocument();
  });

  it("renders protected content when the user is allowed", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "user-1", email_confirmed_at: "2026-04-05T10:00:00.000Z" },
      loading: false,
    } as never);
    mockedUseRoles.mockReturnValue({
      loading: false,
      hasRole: (role: string) => role === "viewer" || role === "analyst",
    } as never);

    renderGuard({ minimumRole: "analyst", requireVerified: true });

    expect(screen.getByText("protected-screen")).toBeInTheDocument();
  });
});
