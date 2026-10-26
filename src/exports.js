import { ENGINE_VERSION } from "./constants.js";
export const exportJson = run => JSON.stringify({ label: "HISTORICAL SAVED RUN", engineVersion: ENGINE_VERSION, ...run }, null, 2);
export function exportMarkdown(run) {
  const result = run.result || run;
  const out = ["# Pharos Docs + Chain Agent Report", "", "**HISTORICAL SAVED RUN**", "", `- Engine: ${ENGINE_VERSION}`, `- Run: ${run.id || "evidence"}`, `- Status: ${result.status}`, `- Function: ${result.request?.signature || "—"}`, `- Contract: ${result.request?.contract || "—"}`, "", "## Documentation-grounded explanation"];
  const e = result.docs?.explanation;
  if (e) out.push(`- Purpose: ${e.purpose}`, `- Return: ${e.returnType} (${e.units})`, ...e.limitations.map(x => `- Limitation: ${x}`));
  for (const s of result.docs?.sources || []) out.push(`- [${s.title}](${s.url}) — retrieved ${s.retrievedAt}`);
  out.push("", "## Exact call binding", "", "```json", JSON.stringify(result.binding, null, 2), "```", "", "## Chain result and interpretation", "", "```json", JSON.stringify({ chain: result.chain, interpretation: result.interpretation }, null, 2), "```", "", "## Ordered tool trace");
  for (const item of result.trace || []) out.push(`- ${item.order}. ${item.service}: ${item.tools.join(" → ")} — ${item.status}`);
  out.push("", "No signing, broadcasting, approval, or blockchain transaction was performed.");
  return out.join("\n");
}
