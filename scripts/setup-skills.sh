#!/usr/bin/env sh
# Install playbook agent skills into .agents/skills/
set -e
cd "$(dirname "$0")/.."

npx skills@latest add DietrichGebert/ponytail -y
npx skills@latest add shadcn/improve -y
npx skills@latest add GoogleChrome/modern-web-guidance -y
npx skills@latest add mattpocock/skills -y --skill grill-me grilling grill-with-docs

# .agents/skills is the source of truth; .claude/skills is a relative symlink
# (industry convention - the symlink is committed, so this just refreshes it).
mkdir -p .claude
ln -sfn ../.agents/skills .claude/skills

echo "Skills installed."
