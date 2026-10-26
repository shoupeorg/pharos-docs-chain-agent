export const ENGINE_VERSION = "docs-chain-agent/1.0.0";
export const DOCS_MCP_URL = "https://docs.pharos.xyz/~gitbook/mcp";
export const CHAIN_MCP_URL = "https://mcp.pharos.xyz/mcp";
export const DOC_PAGE = "https://docs.pharos.xyz/tooling-and-infrastructure/oracles/chainlink-pe";
export const NETWORK = { name: "Pharos Pacific Mainnet", chainId: 1672 };
export const FEEDS = {
  eth: { label: "ETH/USD", address: "0x1Ed3e8CdC173363593BfAD9bF77aa2A0e7351DB8" },
  btc: { label: "BTC/USD", address: "0x8b5DB228Fbccf588f08B073C235254aCb6791D36" },
  pros: { label: "PROS/USD", address: "0x371Ed36aEe5bFFbED1A2aa9b7deD7F4EB30F5466" }
};
export const FUNCTIONS = {
  "latestAnswer()": { selector: "0x50d25bcd", returnType: "int256", units: "USD with 18 decimals", purpose: "Returns the feed's latest observed price." },
  "latestTimestamp()": { selector: "0x8205bf6a", returnType: "uint256", units: "Unix seconds", purpose: "Returns the observation timestamp associated with the latest answer." },
  "getFeedId()": { selector: "0xb633620c", returnType: "bytes32", units: "32-byte feed identifier", purpose: "Returns the feed ID associated with the proxy." }
};
