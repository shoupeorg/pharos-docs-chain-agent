import { CHAIN_MCP_URL, ENGINE_VERSION, NETWORK } from "./constants.js";
import { bindCall, interpret, normalizeRequest } from "./core.js";
import { retrieveDocs } from "./docs.js";
import { withMcp } from "./mcp-client.js";

const unwrap = value => value?.result ?? value?.code ?? value?.latestBlock ?? value;
const iso = () => new Date().toISOString();
export async function runComposed(input, options = {}) {
  const startedAt = iso(), trace = [], request = normalizeRequest(input);
  const docs = await (options.retrieveDocs || retrieveDocs)(request, options.docsOptions);
  trace.push({ order: 1, stage: "FETCHING_DOCS", service: "Developer Docs MCP", tools: ["searchDocumentation", "getPage", "askQuestion"], arguments: { signature: request.signature, contract: request.contract }, startedAt, finishedAt: iso(), status: docs.covered ? "EXPLAINED" : "DOCS_NOT_COVERED" });
  if (!docs.covered) return { engineVersion: ENGINE_VERSION, status: "DOCS_NOT_COVERED", request, docs, binding: null, chain: null, interpretation: null, trace, chainCallCount: 0, createdAt: startedAt, completedAt: iso() };
  const binding = bindCall(request);
  const connector = options.chainConnector || withMcp;
  return connector({ url: CHAIN_MCP_URL, clientName: "pharos-docs-chain-agent", timeoutMs: options.timeoutMs || 30000, attempts: options.attempts || 2 }, async ({ call, tools }) => {
    const names = tools.map(x => x.name), required = ["get_chain_info", "get_code", "eth_call"];
    const missing = required.filter(x => !names.includes(x)); if (missing.length) throw new Error(`Pharos Chain MCP missing: ${missing.join(", ")}`);
    const chainStarted = iso(), info = await call("get_chain_info", {});
    if (Number(info.chainId) !== NETWORK.chainId || info.chainIdMatches === false) throw new Error(`CHAIN_MISMATCH: expected ${NETWORK.chainId}, received ${info.chainId}.`);
    const block = String(info.latestBlock), code = unwrap(await call("get_code", { address: request.contract, block }));
    if (!/^0x[0-9a-fA-F]+$/.test(String(code)) || code === "0x") throw new Error("MISSING_CODE: no deployed bytecode at the pinned block.");
    const output = unwrap(await call("eth_call", { transaction: { to: request.contract, data: binding.calldata }, block }));
    const observedAt = iso(), interpretation = interpret({ request, raw: output, blockNumber: block, observedAt });
    trace.push({ order: 2, stage: "READING_CHAIN", service: "Pharos Chain MCP", tools: ["get_chain_info", "get_code", "eth_call"], arguments: { contract: request.contract, calldata: binding.calldata, block }, startedAt: chainStarted, finishedAt: observedAt, status: "INTERPRETED" });
    return { engineVersion: ENGINE_VERSION, status: "INTERPRETED", request, docs, binding: { ...binding, block }, chain: { endpoint: CHAIN_MCP_URL, chainId: Number(info.chainId), blockSemantics: "PINNED", blockNumber: block, bytecodePresent: true, rawOutput: output, observedAt }, interpretation, trace, chainCallCount: 3, createdAt: startedAt, completedAt: iso() };
  });
}
