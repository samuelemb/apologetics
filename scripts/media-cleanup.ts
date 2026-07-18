import { prisma } from "@/lib/prisma";
import { cleanupStaleMediaAssets } from "@/services/media.service";

async function main() {
  const knownArguments = new Set(["--dry-run"]);
  const unknownArguments = process.argv
    .slice(2)
    .filter((value) => !knownArguments.has(value));

  if (unknownArguments.length > 0) {
    console.error(`Unknown argument: ${unknownArguments.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const dryRun = process.argv.includes("--dry-run");

  try {
    const result = await cleanupStaleMediaAssets({ dryRun });
    console.log(
      JSON.stringify(
        {
          mode: result.dryRun ? "dry-run" : "execute",
          candidates: result.candidates,
          deleted: result.deleted,
          failed: result.failed,
        },
        null,
        2,
      ),
    );
    if (result.failed > 0) process.exitCode = 1;
  } catch {
    console.error("Media cleanup could not be completed.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
