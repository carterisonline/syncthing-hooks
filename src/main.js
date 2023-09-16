import { exists } from 'node:fs/promises';
import path from 'node:path';
import {
	configPath,
	displaySyncthingPaths,
	fetchUpdatedFolders,
	initConfig,
} from './lib';
import { spawn } from 'node:child_process';
import chalk from 'chalk';

if (!(await initConfig())) {
	process.exit(1);
}

displaySyncthingPaths();

let lastSeenId = 0;

setInterval(async () => {
	const [updatedLastSeenId, updatedFolders] = await fetchUpdatedFolders(
		lastSeenId
	);

	if (lastSeenId !== 0) {
		for (const folder of updatedFolders) {
			const hookPath = path.join(configPath, folder);
			if (await exists(hookPath)) {
				const hook = spawn(hookPath);

				hook.stdout.on('data', (data) => {
					console.log(
						chalk.yellow(folder),
						chalk.gray('stdout>'),
						data.toString()
					);
				});
			}
		}
	}

	lastSeenId = updatedLastSeenId;
}, 1000);
