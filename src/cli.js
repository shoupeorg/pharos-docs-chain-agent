#!/usr/bin/env node
import { runComposed } from "./engine.js";
const [contract, signature = "latestAnswer()"] = process.argv.slice(2);
if (!contract) { console.error("Usage: pharos-docs-chain <contract> [latestAnswer()|latestTimestamp()|getFeedId()]"); process.exit(1); }
runComposed({ network: "Pharos Pacific Mainnet", chainId: 1672, contract, signature, args: [] }).then(x => console.log(JSON.stringify(x, null, 2))).catch(e => { console.error(e.message); process.exitCode = 1; });
