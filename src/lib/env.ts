type ClientEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseProjectId?: string;
};

type EnvSource = Record<string, unknown>;

function readString(source: EnvSource, key: string, required = true) {
  const value = source[key];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (!required) {
    return undefined;
  }

  throw new Error(
    `Missing required environment variable "${key}". Check your Vite env configuration before starting the app.`,
  );
}

export function parseClientEnv(source: EnvSource): ClientEnv {
  return {
    supabaseUrl: readString(source, "VITE_SUPABASE_URL"),
    supabasePublishableKey: readString(source, "VITE_SUPABASE_PUBLISHABLE_KEY"),
    supabaseProjectId: readString(source, "VITE_SUPABASE_PROJECT_ID", false),
  };
}

export const clientEnv = parseClientEnv(import.meta.env as EnvSource);
