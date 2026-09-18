/**
 * Runs a command against a throwaway Neon branch.
 *
 *   tsx scripts/e2e-db.ts -- playwright test
 *
 * Creates a branch off the project's default branch, exposes its connection
 * string as DATABASE_URL to the child process, and deletes the branch
 * afterwards — including when the command fails or is interrupted.
 *
 * A Neon branch is a copy-on-write clone, so it arrives with the schema and
 * data already in place; no migration step is needed.
 *
 * Set TEST_DATABASE_URL to skip Neon entirely and run against that database
 * instead. Nothing is created or deleted in that mode.
 */
import { spawn } from "child_process";

const API = "https://console.neon.tech/api/v2";

type Branch = { id: string; name: string };

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

async function neon<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = env("NEON_API_KEY");
  if (!key) throw new Error("NEON_API_KEY is not set");

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Neon ${init.method ?? "GET"} ${path} failed: ${res.status} ${body}`);
    (err as Error & { body?: string }).body = body;
    throw err;
  }
  return (await res.json()) as T;
}

/**
 * A project-scoped key cannot list projects, but Neon's refusal names the
 * project the key is bound to — which is exactly the id we need.
 */
function projectIdFromScopeError(err: unknown): string | undefined {
  const body = (err as Error & { body?: string })?.body;
  if (!body) return undefined;

  // The quotes are JSON-escaped in the raw body, so read the decoded message.
  let message = body;
  try {
    const parsed = JSON.parse(body) as { message?: string };
    if (parsed.message) message = parsed.message;
  } catch {
    // not JSON — fall through and match the raw text
  }

  return message.match(/subject_project_id:\s*\\?"([^"\\]+)/)?.[1];
}

async function resolveProjectId(): Promise<string> {
  const explicit = env("NEON_PROJECT_ID");
  if (explicit) return explicit;

  // A project-scoped key may not be allowed to list projects at all.
  let projects: { id: string; name: string }[];
  try {
    ({ projects } = await neon<{ projects: { id: string; name: string }[] }>("/projects"));
  } catch (err) {
    const scoped = projectIdFromScopeError(err);
    if (scoped) return scoped;

    throw new Error(
      "Could not list Neon projects to discover the project id. If you are using a " +
        "project-scoped API key, set NEON_PROJECT_ID explicitly — it is on the project's " +
        `Settings page in the Neon console.\n\nUnderlying error: ${
          err instanceof Error ? err.message : String(err)
        }`
    );
  }

  if (projects.length === 1) return projects[0].id;

  throw new Error(
    `NEON_PROJECT_ID is not set and the API key can see ${projects.length} projects ` +
      `(${projects.map((p) => p.name).join(", ")}). Set NEON_PROJECT_ID explicitly.`
  );
}

async function createBranch(projectId: string): Promise<{ branch: Branch; uri: string }> {
  const name = `e2e-${Date.now()}`;
  const body = JSON.stringify({
    branch: { name },
    endpoints: [{ type: "read_write" }],
  });

  const out = await neon<{ branch: Branch; connection_uris: { connection_uri: string }[] }>(
    `/projects/${projectId}/branches`,
    { method: "POST", body }
  );

  const uri = out.connection_uris?.[0]?.connection_uri;
  if (!uri) throw new Error(`Neon created branch ${out.branch.id} but returned no connection URI`);

  return { branch: out.branch, uri };
}

async function deleteBranch(projectId: string, branchId: string): Promise<void> {
  await neon(`/projects/${projectId}/branches/${branchId}`, { method: "DELETE" });
}

function runCommand(argv: string[], databaseUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    child.on("exit", (code, signal) => resolve(signal ? 1 : code ?? 0));
    child.on("error", (err) => {
      console.error(err);
      resolve(1);
    });
  });
}

async function main() {
  const sep = process.argv.indexOf("--");
  const argv = sep === -1 ? [] : process.argv.slice(sep + 1);
  if (argv.length === 0) {
    console.error("Usage: tsx scripts/e2e-db.ts -- <command> [args...]");
    process.exit(2);
  }

  const override = env("TEST_DATABASE_URL");
  if (override) {
    console.log("Using TEST_DATABASE_URL; not creating a Neon branch.");
    process.exit(await runCommand(argv, override));
  }

  if (!env("NEON_API_KEY")) {
    throw new Error(
      "NEON_API_KEY is not set.\n" +
        "Add it to .env (it is gitignored) or export it, or set TEST_DATABASE_URL to " +
        "run against an existing database instead."
    );
  }

  const projectId = await resolveProjectId();
  const { branch, uri } = await createBranch(projectId);
  console.log(`Created Neon branch ${branch.name} (${branch.id})`);

  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      await deleteBranch(projectId, branch.id);
      console.log(`Deleted Neon branch ${branch.name}`);
    } catch (err) {
      console.error(`FAILED to delete Neon branch ${branch.name} (${branch.id}) — delete it manually.`);
      console.error(err);
    }
  };

  // Ctrl-C and SIGTERM must not leak a branch.
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, async () => {
      await cleanup();
      process.exit(130);
    });
  }

  let code = 1;
  try {
    code = await runCommand(argv, uri);
  } finally {
    await cleanup();
  }
  process.exit(code);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
