import {
  FunctionsFetchError,
  FunctionsHttpError,
  type FunctionsInvokeOptions,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = Omit<FunctionsInvokeOptions, "headers"> & {
  headers?: Record<string, string>;
  requireSession?: boolean;
};

async function parseFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context;

    try {
      const payload = await response.clone().json();
      const message =
        (typeof payload?.error === "string" && payload.error) ||
        (typeof payload?.message === "string" && payload.message);

      if (message) {
        return new Error(message);
      }
    } catch {
      // Ignore and fall through to text parsing.
    }

    try {
      const text = (await response.clone().text()).trim();
      if (text) {
        return new Error(text);
      }
    } catch {
      // Ignore and fall through to status-based message.
    }

    return new Error(error.message || `Edge Function failed with status ${response.status}.`);
  }

  if (error instanceof FunctionsFetchError) {
    return new Error("Unable to reach Supabase Edge Function. Refresh the app and try again.");
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Edge Function request failed.");
}

export async function invokeEdgeFunction<T>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (options.requireSession !== false && !accessToken) {
    throw new Error("Session expired. Sign in again and retry.");
  }

  const headers: Record<string, string> = { ...(options.headers || {}) };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    ...options,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });

  if (!error) {
    return data as T;
  }

  throw await parseFunctionError(error);
}
