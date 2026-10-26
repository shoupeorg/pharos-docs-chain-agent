import { mkdir, writeFile, copyFile, readFile } from "node:fs/promises";
import { runComposed } from "../src/engine.js";
import { withMcp } from "../src/mcp-client.js";
import { CHAIN_MCP_URL, DOCS_MCP_URL, ENGINE_VERSION } from "../src/constants.js";

const cases = [
  ["eth-latest-answer", { network:"Pharos Pacific Mainnet", chainId:1672, contract:"0x1Ed3e8CdC173363593BfAD9bF77aa2A0e7351DB8", signature:"latestAnswer()", args:[] }, "INTERPRETED"],
  ["btc-latest-timestamp", { network:"Pharos Pacific Mainnet", chainId:1672, contract:"0x8b5DB228Fbccf588f08B073C235254aCb6791D36", signature:"latestTimestamp()", args:[] }, "INTERPRETED"],
  ["unsupported-refusal", { network:"Pharos Pacific Mainnet", chainId:1672, contract:"0x1Ed3e8CdC173363593BfAD9bF77aa2A0e7351DB8", signature:"unsupportedFunction()", args:[] }, "DOCS_NOT_COVERED"]
];
await mkdir("evidence",{recursive:true}); await mkdir("public/evidence",{recursive:true});
try { await readFile("evidence/mcp-schemas-v1.json"); } catch { const schemas={};for (const [name,url] of [["docs",DOCS_MCP_URL],["chain",CHAIN_MCP_URL]]) schemas[name]=await withMcp({url,clientName:"pharos-docs-chain-evidence",timeoutMs:30000,attempts:2},async({tools})=>tools.map(({name,description,inputSchema})=>({name,description,inputSchema})));await writeFile("evidence/mcp-schemas-v1.json",JSON.stringify({capturedAt:new Date().toISOString(),endpoints:{docs:DOCS_MCP_URL,chain:CHAIN_MCP_URL},schemas},null,2)); }
const runs=[];
for(const [name,input,expected] of cases){const file=`v1-live-${name}.json`;let evidence;try{evidence=JSON.parse(await readFile(`evidence/${file}`,"utf8"));}catch{const result=await runComposed(input);if(result.status!==expected)throw new Error(`${name}: expected ${expected}, received ${result.status}`);if(expected==="DOCS_NOT_COVERED"&&result.chainCallCount!==0)throw new Error("Unsupported request called Chain MCP.");evidence={evidenceVersion:"1",label:"REAL LIVE MCP EVIDENCE",capturedAt:new Date().toISOString(),input,result};await writeFile(`evidence/${file}`,JSON.stringify(evidence,null,2));}const result=evidence.result;runs.push({name,file,status:result.status,docsSources:result.docs.sources?.length||0,chainCallCount:result.chainCallCount,blockNumber:result.chain?.blockNumber||null,rawOutput:result.chain?.rawOutput||null});}
const manifest={evidenceVersion:"1",engineVersion:ENGINE_VERSION,capturedAt:new Date().toISOString(),readOnly:true,endpoints:{docs:DOCS_MCP_URL,chain:CHAIN_MCP_URL},runs};await writeFile("evidence/manifest.json",JSON.stringify(manifest,null,2));
for(const file of ["mcp-schemas-v1.json","manifest.json",...runs.map(x=>x.file)])await copyFile(`evidence/${file}`,`public/evidence/${file}`);
console.log(JSON.stringify(manifest,null,2));
