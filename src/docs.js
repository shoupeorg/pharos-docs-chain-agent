import { DOC_PAGE, DOCS_MCP_URL } from "./constants.js";
import { createExplanation, inspectCoverage, relevantExcerpt } from "./core.js";
import { withMcp } from "./mcp-client.js";

const textOf = result => String(result?.text ?? result ?? "");
export async function retrieveDocs(request, options = {}) {
  const connector = options.connector || withMcp, retrievedAt = new Date().toISOString();
  return connector({ url: DOCS_MCP_URL, clientName: "pharos-docs-chain-agent", timeoutMs: options.timeoutMs || 35000, attempts: options.attempts || 2 }, async ({ call, tools }) => {
    const names = tools.map(x => x.name), required = ["searchDocumentation", "getPage", "askQuestion"];
    const missingTools = required.filter(x => !names.includes(x));
    if (missingTools.length) throw new Error(`Developer Docs MCP missing: ${missingTools.join(", ")}`);
    const query = `${request.signature} ${request.contract} Chainlink Push Engine Pharos Pacific Mainnet`;
    const search = await call("searchDocumentation", { query });
    const page = await call("getPage", { url: DOC_PAGE });
    const question = `Using only the retrieved Pharos documentation, explain ${request.signature} on ${request.contract}: purpose, parameters, return type, units, and limitations. Begin DOCS_NOT_COVERED if the exact function or address is not documented.`;
    const answer = await call("askQuestion", { question, goal: "Ground a read-only contract call before execution." });
    const pageText = textOf(page), answerText = textOf(answer), coverage = inspectCoverage({ pageText, answer: answerText, request });
    return { endpoint: DOCS_MCP_URL, toolNames: names, retrievedAt, query, search: textOf(search).slice(0, 3500), answer: answerText.slice(0, 5000), sources: [{ title: "Chainlink Push Engine Feeds", url: DOC_PAGE, retrievedAt, excerpt: relevantExcerpt(pageText, request) }], explanation: coverage.covered ? createExplanation(request, retrievedAt) : null, ...coverage };
  });
}
