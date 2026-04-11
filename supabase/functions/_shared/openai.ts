export type OpenAiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAiChatCompletionOptions = {
  modelCandidates: string[];
  messages: OpenAiChatMessage[];
  temperature?: number;
  tools?: unknown[];
  toolChoice?: unknown;
  responseFormat?: unknown;
  maxCompletionTokens?: number;
  clientRequestId?: string;
};

type OpenAiSuccess = {
  ok: true;
  data: unknown;
  model: string;
  requestId?: string | null;
};

type OpenAiFailure = {
  ok: false;
  status: number;
  errorText: string;
  model: string;
  requestId?: string | null;
};

export type OpenAiChatCompletionResult = OpenAiSuccess | OpenAiFailure;

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const MODEL_FALLBACK_PATTERN = /(model|does not exist|unsupported|not found|access denied|permission)/i;

// Hard timeout per request — keeps edge functions well under the 150 s wall-clock
// limit even when OpenAI is slow or rate-limiting.
const OPENAI_REQUEST_TIMEOUT_MS = 90_000;

function getOpenAiHeaders(clientRequestId?: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const projectId = Deno.env.get("OPENAI_PROJECT_ID");
  if (projectId) {
    headers["OpenAI-Project"] = projectId;
  }

  const organizationId = Deno.env.get("OPENAI_ORGANIZATION_ID");
  if (organizationId) {
    headers["OpenAI-Organization"] = organizationId;
  }

  if (clientRequestId) {
    headers["X-Client-Request-Id"] = clientRequestId;
  }

  return headers;
}

export async function createOpenAiChatCompletion(
  options: OpenAiChatCompletionOptions,
): Promise<OpenAiChatCompletionResult> {
  const headers = getOpenAiHeaders(options.clientRequestId);

  for (let index = 0; index < options.modelCandidates.length; index += 1) {
    const model = options.modelCandidates[index];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.2,
          ...(options.tools ? { tools: options.tools } : {}),
          ...(options.toolChoice ? { tool_choice: options.toolChoice } : {}),
          ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
          ...(options.maxCompletionTokens ? { max_completion_tokens: options.maxCompletionTokens } : {}),
        }),
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const isTimeout =
        fetchError instanceof DOMException && fetchError.name === "AbortError";
      return {
        ok: false,
        status: isTimeout ? 504 : 500,
        errorText: isTimeout
          ? `OpenAI request timed out after ${OPENAI_REQUEST_TIMEOUT_MS / 1000}s`
          : String(fetchError),
        model,
        requestId: null,
      };
    }
    clearTimeout(timeoutId);

    const requestId = response.headers.get("x-request-id");

    if (response.ok) {
      return {
        ok: true,
        data: await response.json(),
        model,
        requestId,
      };
    }

    const errorText = await response.text();
    const shouldFallbackModel =
      index < options.modelCandidates.length - 1 &&
      (
        ((response.status === 400 || response.status === 404) &&
          MODEL_FALLBACK_PATTERN.test(errorText)) ||
        response.status === 429
      );

    if (shouldFallbackModel) {
      continue;
    }

    return {
      ok: false,
      status: response.status,
      errorText,
      model,
      requestId,
    };
  }

  return {
    ok: false,
    status: 500,
    errorText: "OpenAI request failed before a model could be selected.",
    model: options.modelCandidates[0] ?? "unknown",
    requestId: null,
  };
}
