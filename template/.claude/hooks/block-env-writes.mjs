// Blocks agent writes to real env files (hard rule: humans copy them from the
// checked-in examples). .env.schema and *.example stay editable.
let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  let filePath = "";
  try {
    filePath = JSON.parse(input).tool_input?.file_path ?? "";
  } catch {
    process.exit(0);
  }
  const base = filePath.replaceAll("\\", "/").split("/").pop() ?? "";
  if ([".env", ".env.local", "compose.env"].includes(base)) {
    console.error(
      `Blocked write to ${base}: agents never write env files - edit .env.schema (Varlock) or the *.example templates and let the human copy them.`,
    );
    process.exit(2);
  }
});
