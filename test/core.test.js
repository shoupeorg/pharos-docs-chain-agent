import test from "node:test";
import assert from "node:assert/strict";
import { bindCall, decodeWord, formatFixed, inspectCoverage, isDocsRefusal, normalizeRequest } from "../src/core.js";

const address = "0x1Ed3e8CdC173363593BfAD9bF77aa2A0e7351DB8";
const page = `# Chainlink Push Engine Feeds\n## Common Settings\n| Decimals | 18 |\n## PriceFeed 2.0\nAlways verify that data is fresh. The observation timestamp is not inclusion time.\n## Pacific Mainnet\n| ETH/USD | feed | ${address} |\n## Contract Interface\nfunction latestAnswer() external view returns (int256);\nfunction latestTimestamp() external view returns (uint256);`;

test("validates network, address, and no-argument functions", () => {
  assert.equal(normalizeRequest({network:"Pharos Pacific Mainnet",chainId:"1672",contract:address,signature:"latestAnswer()",args:[]}).chainId,1672);
  assert.throws(()=>normalizeRequest({network:"Pharos Atlantic Testnet",chainId:1672,contract:address,signature:"latestAnswer()",args:[]}),/Only Pharos Pacific/);
  assert.throws(()=>normalizeRequest({network:"Pharos Pacific Mainnet",chainId:1672,contract:"bad",signature:"latestAnswer()",args:[]}),/valid EVM/);
  assert.throws(()=>normalizeRequest({network:"Pharos Pacific Mainnet",chainId:1672,contract:address,signature:"latestAnswer()",args:["1"]}),/take no arguments/);
});
test("normalizes Markdown-escaped documentation refusal",()=>assert.equal(isDocsRefusal("DOCS\\_NOT\\_COVERED"),true));
test("coverage requires exact signature, address, network and limitation",()=>{
  const request={signature:"latestAnswer()",contract:address};
  assert.equal(inspectCoverage({pageText:page,answer:"COVERED",request}).covered,true);
  assert.equal(inspectCoverage({pageText:page,answer:"DOCS\\_NOT\\_COVERED",request}).covered,false);
  assert.equal(inspectCoverage({pageText:page.replace(address,"0x0000000000000000000000000000000000000001"),answer:"COVERED",request}).covered,false);
});
test("binding makes explained and executed function identical",()=>{
  const request={network:"Pharos Pacific Mainnet",chainId:1672,contract:address,signature:"latestTimestamp()",args:[]};
  assert.deepEqual(bindCall(request),{network:request.network,chainId:1672,contract:address,signature:"latestTimestamp()",abi:"function latestTimestamp() view returns (uint256)",arguments:[],calldata:"0x8205bf6a",returnType:"uint256",block:"latest (resolved to a concrete block before eth_call)"});
});
test("ABI decoding preserves uint256 and signed int256 precision",()=>{
  assert.equal(decodeWord(`0x${"0".repeat(63)}a`,"uint256"),"10");
  assert.equal(decodeWord(`0x${"f".repeat(64)}`,"int256"),"-1");
  assert.equal(formatFixed("1234500000000000000",18),"1.2345");
  assert.throws(()=>decodeWord("0x01","uint256"),/Malformed/);
});
