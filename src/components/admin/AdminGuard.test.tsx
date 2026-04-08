import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdmin";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useAdmin", () => ({
  useAdminCheck: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseAdminCheck = vi.mocked(useAdminCheck);

function renderGuard() {
  return render(
    <MemoryRouter
      initialEntries={["/admin"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/auth" element={<div>auth-screen</div>} />
        <Route path="/dashboard" element={<div>dashboard-screen</div>} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <div>admin-screen</div>
            </AdminGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminGuard", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
    mockedUseAdminCheck.mockReset();
    mockedUseAuth.mockReturnValue({
      user: { id: "user-1" },
      loading: false,
    } as never);
    mockedUseAdminCheck.mockReturnValue({
      isAdmin: true,
      loading: false,
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

  it("redirects non-admin users to the dashboard", () => {
    mockedUseAdminCheck.mockReturnValue({
      isAdmin: false,
      loading: false,
    } as never);

    renderGuard();

    expect(screen.getByText("dashboard-screen")).toBeInTheDocument();
  });

  it("renders admin content when the user is a platform admin", () => {
    renderGuard();

    expect(screen.getByText("admin-screen")).toBeInTheDocument();
  });
});
