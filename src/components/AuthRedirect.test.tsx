import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthRedirect from "@/components/AuthRedirect";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspace: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseWorkspace = vi.mocked(useWorkspace);

function renderAuthRedirect() {
  return render(
    <MemoryRouter
      initialEntries={["/redirect"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/auth" element={<div>auth-screen</div>} />
        <Route path="/onboarding" element={<div>onboarding-screen</div>} />
        <Route path="/dashboard" element={<div>dashboard-screen</div>} />
        <Route path="/redirect" element={<AuthRedirect />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthRedirect", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
    mockedUseWorkspace.mockReset();
    mockedUseAuth.mockReturnValue({
      user: { id: "user-1" },
      loading: false,
    } as never);
    mockedUseWorkspace.mockReturnValue({
      workspaces: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it("redirects to auth when no user exists", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
    } as never);

    renderAuthRedirect();

    expect(screen.getByText("auth-screen")).toBeInTheDocument();
  });

  it("shows a retry state when workspace bootstrap fails", () => {
    const refetch = vi.fn();
    mockedUseWorkspace.mockReturnValue({
      workspaces: [],
      loading: false,
      error: "Failed to load workspaces.",
      refetch,
    } as never);

    renderAuthRedirect();

    expect(screen.getByText("Workspace bootstrap failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("redirects to onboarding when the user has no workspaces", () => {
    renderAuthRedirect();

    expect(screen.getByText("onboarding-screen")).toBeInTheDocument();
  });

  it("redirects to dashboard when workspaces exist", () => {
    mockedUseWorkspace.mockReturnValue({
      workspaces: [{ id: "workspace-1", name: "Acme" }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderAuthRedirect();

    expect(screen.getByText("dashboard-screen")).toBeInTheDocument();
  });
});
