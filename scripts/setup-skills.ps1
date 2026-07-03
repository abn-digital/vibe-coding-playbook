# Install agent skills (run from playbook repo root)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

npx skills@latest add DietrichGebert/ponytail -y
npx skills@latest add shadcn/improve -y
npx skills@latest add GoogleChrome/modern-web-guidance -y
npx skills@latest add mattpocock/skills -y --skill grill-me grilling grill-with-docs

# .agents/skills is the source of truth; .claude/skills should be a relative
# symlink to it. Fallback: plain copy when symlinks are unsupported
# (Windows without Developer Mode).
if (-not (Test-Path .claude)) { New-Item -ItemType Directory -Path .claude | Out-Null }
$existing = Get-Item .claude\skills -Force -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    $existing.Delete()  # removes the link only, never the target
  } else {
    Remove-Item .claude\skills -Recurse -Force
  }
}
# mklink from inside .claude keeps the target relative (PS New-Item would
# resolve it to an absolute, machine-specific path).
Push-Location .claude
cmd /c mklink /D skills ..\.agents\skills 2>$null | Out-Null
Pop-Location
if (-not (Test-Path .claude\skills)) {
  Copy-Item .agents\skills .claude\skills -Recurse
  Write-Warning "Symlinks unsupported (enable Developer Mode) - copied instead; rerun this script after skill updates."
}

Write-Host "Skills installed."
