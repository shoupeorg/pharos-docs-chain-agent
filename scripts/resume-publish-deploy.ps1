$ErrorActionPreference = 'Stop'
$Project = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Project
$env:XDG_CONFIG_HOME = 'C:\Users\KENAAR\Documents\Codex\2026-10-13\create-a-new-github-repository-named\work\cloudflare-xdg'

function Invoke-Native([scriptblock]$Command, [string]$Label) {
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE" }
}

Write-Host '==> Apply the existing D1 migration' -ForegroundColor Cyan
Invoke-Native { npx wrangler d1 migrations apply pharos-docs-chain-agent --remote } 'D1 migration'
Write-Host '==> Build and deploy once' -ForegroundColor Cyan
Invoke-Native { npm run build } 'Production build'
Invoke-Native { node scripts/deploy-direct.mjs } 'Cloudflare deployment'

Write-Host '==> Verify public UI and API' -ForegroundColor Cyan
$Base = 'https://pharos-docs-chain-agent.shoupeorg.workers.dev'
$Page = Invoke-WebRequest -UseBasicParsing -Uri "$Base/" -TimeoutSec 30
$Meta = Invoke-RestMethod -Uri "$Base/api/meta" -TimeoutSec 30
if ($Page.StatusCode -ne 200 -or $Page.Content -notmatch 'Pharos Docs \+ Chain Agent') { throw 'Public UI verification failed.' }
if ($Meta.engineVersion -ne 'docs-chain-agent/1.0.0' -or $Meta.network.chainId -ne 1672) { throw 'Public API verification failed.' }
Write-Host "PUBLIC UI/API VERIFIED: $Base" -ForegroundColor Green
