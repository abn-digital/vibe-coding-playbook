import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, it } from "vitest";

const PROJECT_ID = "hike-agentic-playground";
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hasEmulator)("firestore rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(resolve(import.meta.dirname, "firestore.rules"), "utf8"),
        host,
        port: Number(port),
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it("allows owner to write their user doc", async () => {
    const ctx = testEnv.authenticatedContext("user1");
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), "users/user1"), { name: "Ada" }),
    );
  });

  it("denies anonymous write to emailGated collection", async () => {
    const ctx = testEnv.authenticatedContext("anon1", { email: undefined });
    await assertFails(
      setDoc(doc(ctx.firestore(), "emailGated/doc1"), { secret: true }),
    );
  });

  it("allows Google user to write emailGated collection", async () => {
    const ctx = testEnv.authenticatedContext("user2", {
      email: "ada@example.com",
    });
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), "emailGated/doc1"), { secret: true }),
    );
  });
});
