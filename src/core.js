import { DOC_PAGE, FEEDS, FUNCTIONS, NETWORK } from "./constants.js";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const REFUSAL = /\bDOCS[_\\]+NOT[_\\]+COVERED\b/i;
export const normalizeMarkdown = value => String(value ?? "").replace(/\\([\\`*_{}\[\]()#+.!|>-])/g, "$1");
export const isDocsRefusal = value => REFUSAL.test(String(value ?? "")) || /\b(?:unsupported|not documented|insufficient documentation)\b/i.test(normalizeMarkdown(value));

export function normalizeRequest(input) {
  const network = String(input.network || "").trim();
  const chainId = Number(input.chainId);
  const contract = String(input.contract || "").trim();
  const signature = String(input.signature || "").trim();
  const args = Array.isArray(input.args) ? input.args : [];
  if (network !== NETWORK.name || chainId !== NETWORK.chainId) throw new Error("Only Pharos Pacific Mainnet (chain ID 1672) is supported.");
  if (!ADDRESS.test(contract)) throw new Error("Contract must be a valid EVM address.");
  if (args.length) throw new Error("The supported functions take no arguments.");
  return { network, chainId, contract, signature, args };
}

export function inspectCoverage({ pageText, answer, request }) {
  const text = normalizeMarkdown(pageText);
  const fn = FUNCTIONS[request.signature];
  const exactSignature = fn && new RegExp(`function\\s+${request.signature.replace(/[()]/g, m => `\\${m}`)}[\\s\\S]{0,80}returns\\s*\\(\\s*${fn.returnType}`, "i").test(text);
  const contractListed = new RegExp(request.contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text);
  const pacific = /##\s+Pacific Mainnet/i.test(text);
  const limitations = /always verify[^\n]*fresh|observation timestamp|18\s*\|/i.test(text);
  const refused = isDocsRefusal(answer);
  const missing = [];
  if (!fn) missing.push("supported canonical function signature");
  if (!exactSignature) missing.push("exact function signature and return type");
  if (!contractListed) missing.push("Pacific deployed contract address");
  if (!pacific) missing.push("Pacific network section");
  if (!limitations) missing.push("source limitations/units");
  return { covered: !refused && missing.length === 0, refused, missing };
}

export function relevantExcerpt(pageText, request) {
  const text = normalizeMarkdown(pageText).replace(/\r/g, "");
  const sections = [];
  for (const marker of ["## Overview", "## Common Settings", "## PriceFeed 2.0", "## Pacific Mainnet", "## Contract Interface"]) {
    const start = text.indexOf(marker);
    if (start < 0) continue;
    const end = text.indexOf("\n## ", start + marker.length);
    let section = text.slice(start, end < 0 ? text.length : end).trim();
    if (marker === "## Pacific Mainnet") section = section.split("\n## Atlantic")[0];
    sections.push(section);
  }
  return sections.join("\n\n").slice(0, 14000);
}

export function bindCall(request) {
  const fn = FUNCTIONS[request.signature];
  if (!fn) return null;
  return { network: request.network, chainId: request.chainId, contract: request.contract, signature: request.signature, abi: `function ${request.signature} view returns (${fn.returnType})`, arguments: [], calldata: fn.selector, returnType: fn.returnType, block: "latest (resolved to a concrete block before eth_call)" };
}

export function decodeWord(raw, type) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(String(raw))) throw new Error("Malformed 32-byte ABI output.");
  const unsigned = BigInt(raw);
  if (type === "bytes32") return raw.toLowerCase();
  if (type === "uint256") return unsigned.toString();
  if (type === "int256") return (unsigned >= (1n << 255n) ? unsigned - (1n << 256n) : unsigned).toString();
  throw new Error("Unsupported return type.");
}

export function formatFixed(raw, decimals) {
  const value = BigInt(raw), negative = value < 0n, abs = negative ? -value : value, unit = 10n ** BigInt(decimals);
  const fraction = (abs % unit).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${abs / unit}${fraction ? `.${fraction}` : ""}`;
}

export function interpret({ request, raw, blockNumber, observedAt }) {
  const fn = FUNCTIONS[request.signature], decoded = decodeWord(raw, fn.returnType);
  if (request.signature === "latestAnswer()") return { decoded, readable: `${formatFixed(decoded, 18)} USD`, meaning: `The ${feedLabel(request.contract)} proxy reported this latest observed price. The value is a read-only observation, not a trade quote or guaranteed execution price.`, units: fn.units, freshness: "Use latestTimestamp() and an application-specific staleness limit before relying on the price.", blockNumber, observedAt };
  if (request.signature === "latestTimestamp()") return { decoded, readable: new Date(Number(BigInt(decoded)) * 1000).toISOString(), meaning: `This is the ${feedLabel(request.contract)} observation time, not necessarily the transaction inclusion time.`, units: fn.units, blockNumber, observedAt };
  return { decoded, readable: decoded, meaning: `This is the documented feed identifier for ${feedLabel(request.contract)}.`, units: fn.units, blockNumber, observedAt };
}

export function feedLabel(address) { return Object.values(FEEDS).find(x => x.address.toLowerCase() === String(address).toLowerCase())?.label || "custom documented feed"; }

export function createExplanation(request, retrievedAt) {
  const fn = FUNCTIONS[request.signature];
  return { signature: request.signature, purpose: fn.purpose, parameters: [], returnType: fn.returnType, units: fn.units, limitations: request.signature === "latestAnswer()" ? ["The feed uses 18 decimals.", "Freshness must be checked with latestTimestamp().", "The value is an observation, not guaranteed execution."] : request.signature === "latestTimestamp()" ? ["The timestamp is the report observation time, not transaction inclusion time."] : ["The result identifies the feed and is not a price."], sourceUrl: DOC_PAGE, tool: "Developer Docs MCP / getPage + askQuestion", retrievedAt };
}
