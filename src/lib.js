import { WritableStream } from 'htmlparser2/lib/WritableStream';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';

export const configPath = platformConfigPath([
	'SyncthingHooks',
	'Syncthing Hooks',
	'syncthing-hooks',
]);

/**
 * Fetch FolderCompletion events from Syncthing
 * @param {number} lastSeenId
 * @returns {Promise<[number, string[]]>} A list of updated folders
 */
export async function fetchUpdatedFolders(lastSeenId) {
	try {
		const events = await (
			await fetch(
				`${
					process.env.ST_URL ?? 'http://localhost:8384'
				}/rest/events?since=${lastSeenId}`,
				{
					headers: {
						'X-API-Key': process.env.API_KEY ?? 'invalid',
					},
				}
			)
		).json();

		const updatedLastSeenId = events[events.length - 1].id;
		const updatedFolders = events
			.filter((event) => event.type === 'FolderCompletion')
			.map((event) => event.data.folder);

		return [updatedLastSeenId, updatedFolders];
	} catch (e) {
		if (e.name === 'TimeoutError') {
			return [0, []];
		}

		console.error('Failed to fetch updated folders:', e);
	}
}

/**
 * Initialize the config directory
 * @returns {Promise<boolean>}
 */
export async function initConfig() {
	console.info(chalk.bold(chalk.yellow('HELP:')));
	console.info(
		'\t1.',
		chalk.italic(
			'Hooks are executables named after their',
			chalk.yellow('ID') + 's',
			'and are located in the config directory'
		)
	);
	console.info(
		chalk.italic(
			'\t2.',
			'A hook for a folder with an ID of',
			chalk.yellow('abcde-fghij'),
			'would be located at',
			chalk.underline(path.join(configPath, chalk.yellow('abcde-fghij')))
		)
	);

	console.info(
		chalk.italic(
			'\t3.',
			'Hooks can be executables, or executable scripts with a shebang (shell scripts, python, etc)\n\n'
		)
	);
	console.info(
		chalk.gray('Config path is', chalk.underline(configPath), '\n')
	);

	try {
		await mkdir(configPath, { recursive: true });
		return true;
	} catch (e) {
		console.error('Failed to create the config directory:', e);
		return false;
	}
}

export function displaySyncthingPaths() {
	console.info(chalk.bold(chalk.gray('ID\t\tHook?\tPath')));

	const parserStream = new WritableStream({
		onopentag(name, attribs) {
			if (name === 'folder' && attribs.id) {
				const hookExists = existsSync(path.join(configPath, attribs.id))
					? chalk.greenBright('yes')
					: chalk.gray('no');

				console.log(
					`${chalk.yellow(
						attribs.id
					)}\t${hookExists}\t${chalk.underline(
						chalk.cyanBright(attribs.path)
					)}`
				);
			}
		},
	});

	const syncthingConfigPath = path.join(
		platformConfigPath(['Syncthing', 'Syncthing', 'syncthing']),
		'config.xml'
	);

	createReadStream(syncthingConfigPath)
		.pipe(parserStream)
		.on('finish', () => console.log());
}

/**
 * @param {string[]|string} subdir The subdirectories for Windows, macOS, and Linux/Other
 * @returns {string} The path to the config directory for the current platform
 */
function platformConfigPath(subdir) {
	switch (process.platform) {
		case 'win32':
			return path.join(process.env.LOCALAPPDATA, subdir[0]);
		case 'darwin':
			return path.join(
				process.env.HOME,
				'Library/Application Support',
				subdir[1]
			);
		default:
			return path.join(process.env.HOME, '.config', subdir[2]);
	}
}
