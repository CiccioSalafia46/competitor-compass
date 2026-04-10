import type { GeneratedReportPayload, ReportRunRecord } from "./reports.ts";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPrintMarkup(payload: GeneratedReportPayload) {
  const sections = payload.sections
    .map((section) => {
      const metrics = section.metrics?.length
        ? `
          <div class="metrics">
            ${section.metrics
              .map(
                (metric) => `
                <div class="metric">
                  <div class="metric-label">${escapeHtml(metric.label)}</div>
                  <div class="metric-value">${escapeHtml(metric.value)}</div>
                  ${metric.detail ? `<div class="metric-detail">${escapeHtml(metric.detail)}</div>` : ""}
                </div>`,
              )
              .join("")}
          </div>`
        : "";

      const callouts = section.callouts?.length
        ? `
          <div class="callouts">
            ${section.callouts
              .map(
                (callout) => `
                <div class="callout callout-${callout.tone ?? "neutral"}">
                  <h4>${escapeHtml(callout.title)}</h4>
                  <p>${escapeHtml(callout.body)}</p>
                </div>`,
              )
              .join("")}
          </div>`
        : "";

      const bullets = section.bullets?.length
        ? `
          <ul class="bullets">
            ${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>`
        : "";

      const table = section.table
        ? `
          <table>
            <thead>
              <tr>${section.table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${section.table.rows
                .map(
                  (row) => `
                    <tr>
                      ${section.table?.columns
                        .map((column) => `<td>${escapeHtml(String(row[column] ?? ""))}</td>`)
                        .join("")}
                    </tr>`,
                )
                .join("")}
            </tbody>
          </table>`
        : "";

      return `
        <section>
          <h3>${escapeHtml(section.title)}</h3>
          <p class="section-summary">${escapeHtml(section.summary)}</p>
          ${metrics}
          ${callouts}
          ${bullets}
          ${table}
        </section>
      `;
    })
    .join("");

  const insights = payload.insights.length
    ? `
      <section>
        <h3>Prioritized insights</h3>
        <div class="insights">
          ${payload.insights
            .map(
              (insight) => `
                <div class="insight">
                  <div class="insight-meta">${escapeHtml(insight.priorityLevel.toUpperCase())} · ${escapeHtml(insight.impactArea)}</div>
                  <h4>${escapeHtml(insight.title)}</h4>
                  <p>${escapeHtml(insight.takeaway)}</p>
                </div>`,
            )
            .join("")}
        </div>
      </section>`
    : "";

  const actions = payload.actions.length
    ? `
      <section>
        <h3>Recommended actions</h3>
        <ol class="actions">
          ${payload.actions
            .map(
              (action) => `
                <li>
                  <strong>${escapeHtml(action.title)}</strong>
                  <span>${escapeHtml(action.detail)}</span>
                </li>`,
            )
            .join("")}
        </ol>
      </section>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(payload.title)}</title>
        <style>
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            color: #111827;
            margin: 0;
            background: #f8fafc;
          }
          .page {
            max-width: 1040px;
            margin: 0 auto;
            padding: 32px;
            background: white;
          }
          h1, h2, h3, h4, p {
            margin: 0;
          }
          header {
            padding-bottom: 24px;
            border-bottom: 1px solid #e5e7eb;
          }
          .subtitle {
            margin-top: 12px;
            color: #4b5563;
            line-height: 1.6;
          }
          .summary-grid {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: 24px;
          }
          .summary-card,
          .metric,
          .callout,
          .insight {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 16px;
            background: #fff;
          }
          section {
            margin-top: 28px;
          }
          .section-summary {
            margin-top: 8px;
            color: #4b5563;
            line-height: 1.6;
          }
          .metrics {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 16px;
          }
          .metric-label,
          .insight-meta {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .metric-value {
            margin-top: 6px;
            font-size: 24px;
            font-weight: 700;
          }
          .metric-detail {
            margin-top: 6px;
            color: #4b5563;
            font-size: 13px;
          }
          .callouts,
          .insights {
            display: grid;
            gap: 12px;
            margin-top: 16px;
          }
          .callout-warning {
            border-color: #f59e0b;
            background: #fffbeb;
          }
          .callout-positive {
            border-color: #10b981;
            background: #ecfdf5;
          }
          .bullets,
          .actions {
            margin-top: 16px;
            padding-left: 20px;
            color: #374151;
          }
          .bullets li,
          .actions li {
            margin-top: 10px;
            line-height: 1.6;
          }
          .actions li span {
            display: block;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          th, td {
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
            padding: 10px 8px;
            font-size: 14px;
          }
          th {
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 11px;
          }
          @media print {
            body {
              background: white;
            }
            .page {
              padding: 0;
            }
          }
        </style>
        <script>window.addEventListener('load', function() { window.print(); });</script>
      </head>
      <body>
        <div class="page">
          <header>
            <h1>${escapeHtml(payload.title)}</h1>
            <p class="subtitle">${escapeHtml(payload.subtitle)}</p>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="insight-meta">What changed</div>
                <p class="subtitle">${escapeHtml(payload.summary.whatChanged)}</p>
              </div>
              <div class="summary-card">
                <div class="insight-meta">What matters</div>
                <p class="subtitle">${escapeHtml(payload.summary.whatMatters)}</p>
              </div>
            </div>
          </header>
          ${sections}
          ${insights}
          ${actions}
        </div>
      </body>
    </html>
  `;
}

export function downloadReportJson(report: ReportRunRecord) {
  if (!report.payload) {
    return;
  }

  const blob = new Blob([JSON.stringify(report.payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.title.replaceAll(/\s+/g, "-").toLowerCase()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function printReport(payload: GeneratedReportPayload) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
  if (!popup) {
    throw new Error("Unable to open print window. Check your popup settings and retry.");
  }

  popup.document.open();
  popup.document.write(buildPrintMarkup(payload));
  popup.document.close();
  popup.focus();
}
