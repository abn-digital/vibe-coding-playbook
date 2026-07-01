# Install agent skills (run from playbook repo root)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

npx skills@latest add DietrichGebert/ponytail -y
npx skills@latest add shadcn/improve -y
npx skills@latest add GoogleChrome/modern-web-guidance -y
npx skills@latest add mattpocock/skills -y

if (-not (Test-Path .claude)) { New-Item -ItemType Directory -Path .claude | Out-Null }
if (-not (Test-Path .claude\skills)) {
  cmd /c mklink /J ".claude\skills" ".agents\skills"
}

Write-Host "Skills installed. Run /setup-matt-pocock-skills once per repo."
