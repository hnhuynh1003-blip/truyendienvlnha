# DUDU Studio V52 — intentionally manual and restricted Cloud Functions deploy.
# Run from an up-to-date checkout of GitHub main on Windows PowerShell:
#   .\scripts\deploy-economy-v52.ps1            # only preflight
#   .\scripts\deploy-economy-v52.ps1 -Deploy    # deploy after explicit confirmations
# Never put Firebase tokens, service account JSON or API secrets into this file.
param([switch]$Deploy)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$projectId = 'truyendienvl'
$only = 'functions:duduEconomyStatus,functions:duduEconomyDailyCheckIn,functions:duduEconomyPurchase'
Push-Location $root
try {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is required. Clone the current repository main before running this script.'
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js 22 is required.'
  }
  $major = [int](& node -p 'process.versions.node.split(".")[0]')
  if ($major -ne 22) { throw "This project requires Node.js 22; found major version $major." }
  if (-not (Test-Path (Join-Path $root 'firebase.json'))) {
    throw 'firebase.json not found; do not deploy from the wrong folder.'
  }
  $branch = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw "Only the main branch is accepted; found: $branch." }
  & git fetch origin main --quiet
  if ($LASTEXITCODE -ne 0) { throw 'Unable to verify remote main. Stop before deploy.' }
  $head = (& git rev-parse HEAD).Trim()
  $remote = (& git rev-parse origin/main).Trim()
  if ($head -ne $remote) { throw 'Local main differs from origin/main. Pull or freshly clone the repository.' }
  $dirty = & git status --porcelain
  if ($dirty) { throw 'Working tree has uncommitted changes. Stop before deploying.' }
  $source = Get-Content (Join-Path $root 'functions/index.js') -Raw
  foreach ($name in @('duduEconomyStatus','duduEconomyDailyCheckIn','duduEconomyPurchase')) {
    if (-not $source.Contains("exports.$name=onCall(")) {
      throw "Required callable not found: $name."
    }
  }
  if (-not $source.Contains("enforceAppCheck:true") -or
      -not $source.Contains("snap.data()?.enabled===true&&snap.data()?.schemaVersion===52")) {
    throw 'App Check or the V52 server-side feature gate has changed. Review before deployment.'
  }
  & node --check functions/index.js
  if ($LASTEXITCODE -ne 0) { throw 'Function syntax validation failed.' }
  $tests = @(Get-ChildItem (Join-Path $root 'functions/tests') -Filter '*.test.cjs' |
    ForEach-Object { $_.FullName })
  if (-not $tests.Count) { throw 'No server tests found.' }
  & node --test @tests
  if ($LASTEXITCODE -ne 0) { throw 'Server tests failed; deploy cancelled.' }
  Write-Host "Preflight OK — current main $head" -ForegroundColor Green
  Write-Host "Target project: $projectId"
  Write-Host "Only deploy: $only"
  Write-Host 'Rules, Authentication settings, Hosting and production economy enablement will NOT be changed.'
  if (-not $Deploy) {
    Write-Host 'Dry-run only. To initiate the Firebase deployment, rerun with -Deploy.'
    return
  }
  Write-Host 'Confirm in Firebase Console: the project uses Blaze billing, and system_config/economy_v52 is absent or has enabled=false.'
  $billing = Read-Host 'Type BLAZE to confirm project billing'
  if ($billing -cne 'BLAZE') { throw 'Blaze plan not confirmed; stopped safely.' }
  $gate = Read-Host 'Type DISABLED to confirm the live economy gate is OFF'
  if ($gate -cne 'DISABLED') { throw 'The economy gate must remain disabled; stopped safely.' }
  if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw 'npx is required. Install Node.js 22 with npm.'
  }
  & npx --yes firebase-tools@latest projects:list
  if ($LASTEXITCODE -ne 0) {
    throw 'Firebase CLI is not authenticated. Run: npx --yes firebase-tools@latest login'
  }
  $confirmation = Read-Host "Type $projectId to approve deploying only these three Functions"
  if ($confirmation -cne $projectId) { throw 'Project ID confirmation failed. Deployment cancelled.' }
  & npx --yes firebase-tools@latest deploy --only $only --project $projectId
  if ($LASTEXITCODE -ne 0) { throw 'Firebase deploy failed. Check CLI output; no claim of success.' }
  Write-Host 'Deploy command completed. Verify the three names in Firebase Console > Functions; keep economy gate OFF.' -ForegroundColor Green
}
finally { Pop-Location }
