const { spawn } = require("node:child_process");
const { resolve } = require("node:path");

const MAX_ATTEMPTS = 3;
const BUILD_TIMEOUT_MS = 60000;
const RETRY_DELAY_MS = 1200;

const tscEntrypoint = resolve(
	process.cwd(),
	"node_modules",
	"typescript",
	"bin",
	"tsc",
);

function wait(ms) {
	return new Promise((resolveDelay) => {
		setTimeout(resolveDelay, ms);
	});
}

function runBuildAttempt(attemptNumber) {
	return new Promise((resolveAttempt) => {
		const startTs = Date.now();
		const args = [tscEntrypoint, "-p", "tsconfig.electron.json"];
		const child = spawn(process.execPath, args, {
			stdio: "inherit",
			windowsHide: true,
		});

		let finished = false;
		const timeout = setTimeout(() => {
			if (finished) {
				return;
			}
			finished = true;
			child.kill("SIGTERM");
			resolveAttempt({
				ok: false,
				timedOut: true,
				durationMs: Date.now() - startTs,
				exitCode: null,
			});
		}, BUILD_TIMEOUT_MS);

		child.on("exit", (code) => {
			if (finished) {
				return;
			}
			finished = true;
			clearTimeout(timeout);
			resolveAttempt({
				ok: code === 0,
				timedOut: false,
				durationMs: Date.now() - startTs,
				exitCode: code,
			});
		});

		child.on("error", () => {
			if (finished) {
				return;
			}
			finished = true;
			clearTimeout(timeout);
			resolveAttempt({
				ok: false,
				timedOut: false,
				durationMs: Date.now() - startTs,
				exitCode: null,
			});
		});

		console.log(
			`[build:electron] Attempt ${attemptNumber}/${MAX_ATTEMPTS}: compiling Electron TypeScript...`,
		);
	});
}

async function main() {
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		const result = await runBuildAttempt(attempt);
		if (result.ok) {
			console.log(
				`[build:electron] Build finished in ${result.durationMs}ms (attempt ${attempt}).`,
			);
			process.exit(0);
		}

		const reason = result.timedOut
			? `timed out after ${BUILD_TIMEOUT_MS}ms`
			: `failed with exit code ${result.exitCode}`;

		if (attempt < MAX_ATTEMPTS) {
			console.warn(
				`[build:electron] Attempt ${attempt} ${reason}; retrying in ${RETRY_DELAY_MS}ms...`,
			);
			await wait(RETRY_DELAY_MS);
			continue;
		}

		console.error(
			`[build:electron] Attempt ${attempt} ${reason}; no retries left.`,
		);
		process.exit(1);
	}
}

main();
