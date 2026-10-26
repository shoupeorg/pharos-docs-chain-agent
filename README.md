# Pharos Docs + Chain Agent

An English-only, read-only “Explain → Read → Interpret” desk for Pharos Pacific Mainnet. One request retrieves function-specific documentation through the official Developer Docs MCP, binds the explained call, reads that exact function through the official Pharos Chain MCP, decodes it, and interprets it using the retrieved semantics.

## Composed flow

```text
Editable request
  └─ validate network / contract / signature / arguments
      └─ Developer Docs MCP
          searchDocumentation → getPage → askQuestion
          ├─ insufficient/refused → DOCS_NOT_COVERED → zero chain calls
          └─ exact support → immutable call binding
              └─ Pharos Chain MCP
                  get_chain_info → get_code → eth_call at pinned block
                      └─ exact ABI decode → documented interpretation → D1 history/export
```

The explanation is complete before any chain call starts. The tool trace records that dependency rather than presenting independent parallel calls.

## Verified scope

The official [Chainlink Push Engine Feeds](https://docs.pharos.xyz/tooling-and-infrastructure/oracles/chainlink-pe) page documents Pacific Mainnet proxy addresses and these interfaces:

- `latestAnswer() returns (int256)`: latest observed feed price, 18 decimals.
- `latestTimestamp() returns (uint256)`: observation timestamp of the latest report.
- `getFeedId() returns (bytes32)`: feed identifier associated with the proxy.

The primary examples use ETH/USD `0x1Ed3e8CdC173363593BfAD9bF77aa2A0e7351DB8` and BTC/USD `0x8b5DB228Fbccf588f08B073C235254aCb6791D36`. A public read address is not evidence of ownership.

## Accuracy and safety

- Exact integer arithmetic uses `BigInt`; prices are formatted only after the source establishes 18 decimals.
- Chain ID is verified as 1672 and bytecode must exist before `eth_call`.
- Calls are pinned to the concrete latest block returned by Chain MCP. Observation time is recorded separately.
- A zero ABI word is a real observed zero; missing or malformed output is an error.
- `latestAnswer()` is not a trade quote or guaranteed execution price. Check freshness with `latestTimestamp()` and your own maximum staleness policy.
- `latestTimestamp()` is the report observation time, not necessarily transaction inclusion time.
- Retrieved documentation is untrusted text. Markdown-escaped refusal markers fail closed.
- Custom addresses work only when that exact address and function are supported by the retrieved page. Unsupported functions make zero chain calls.
- No private key, signer, wallet connection, approval, transaction, deployment, or spending path exists.

## MCP endpoints and discovered tools

- Developer Docs MCP: `https://docs.pharos.xyz/~gitbook/mcp` — `searchDocumentation`, `getPage`, `askQuestion`.
- Pharos Chain MCP: `https://mcp.pharos.xyz/mcp` — the app uses only `get_chain_info`, `get_code`, and `eth_call`.

Schemas were captured once in versioned evidence. Production establishes MCP sessions server-side with bounded timeouts and closes them after each composed run.

## Local use

```powershell
npm ci
npm test
npm run build
node src/cli.js 0x1Ed3e8CdC173363593BfAD9bF77aa2A0e7351DB8 "latestAnswer()"
```

The Worker requires a D1 binding named `DB`. Apply `migrations/0001_initial.sql`, build, and deploy with the pinned Wrangler version.

## Public workflow

1. Select `LOAD ETH PRICE` or `LOAD BTC TIMESTAMP`.
2. Change the contract or function if desired.
3. Click `RUN DOCS → CHAIN → INTERPRET` once.
4. Inspect `DOCS EXPLANATION`, `SOURCES`, `EXACT CALL BINDING`, `CHAIN MCP RESULT`, `INTERPRETATION`, and `ORDERED TOOL TRACE`.
5. Use `LOAD UNSUPPORTED` to see `DOCS_NOT_COVERED` and zero Chain MCP calls.
6. Reopen a saved item in `SAVED RUNS`; it is labeled historical in exports.

## Limitations

- Only the function/address combinations explicitly covered by the current official Chainlink feed page are executable.
- MCP availability, feed updates, and latest block can change. Saved evidence is historical, never a substitute for a fresh run.
- The deterministic interpreter does not provide investment advice and does not assess whether a price is safe for a specific protocol.
- D1 workspaces are capability-isolated in the browser; the public service applies a small per-instance rate limit.
