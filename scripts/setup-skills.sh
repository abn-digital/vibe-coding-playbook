#!/usr/bin/env sh
# Install playbook agent skills into .agents/skills/
set -e
cd "$(dirname "$0")/.."

npx skills@latest add DietrichGebert/ponytail -y
npx skills@latest add shadcn/improve -y
npx skills@latest add GoogleChrome/modern-web-guidance -y
npx skills@latest add mattpocock/skills -y

# Junction .claude/skills -> .agents/skills (macOS/Linux)
if [ ! -e .claude/skills ]; then
  mkdir -p .claude
  ln -s ../.agents/skills .claude/skills
fi

echo "Skills installed. Run /setup-matt-pocock-skills once per repo."
