import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

export type QueuedAnalysis = {
  id: string;
  newsletter_entry_id: string;
  workspace_id: string;
  status: string;
};

type EnqueueByEntries = {
  newsletterEntryIds: string[];
  analysisId?: never;
};

type EnqueueByAnalysis = {
  analysisId: string;
  newsletterEntryIds?: never;
};

type EnqueueNewsletterAnalysisInput = EnqueueByEntries | EnqueueByAnalysis;

type EnqueueNewsletterAnalysisResponse = {
  queued: number;
  analyses: QueuedAnalysis[];
  status: "pending";
};

export async function enqueueNewsletterAnalysis(input: EnqueueNewsletterAnalysisInput) {
  return invokeEdgeFunction<EnqueueNewsletterAnalysisResponse>("enqueue-newsletter-analysis", {
    body: input,
  });
}
