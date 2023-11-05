import path from "path";
import { promises as fs } from "fs";

export enum Event {
	activated = "activated",
	deactivated = "deactivated",
	started = "started",
	stopped = "stopped",
}

export type ActivityNameIdMap = Map<string, string>;

export const parseActivityData = (activityData: string): ActivityNameIdMap =>
	activityData
		// remove leading and trailing characters
		.replace(/[^{]+{/, "")
		.replace(/}\]/, "")
		// separate terms
		.split("], [")
		// strip brackets
		.map((s) => s.replace(/[\[\]]/g, ""))
		// extract Activity name and id
		.flatMap((s) => [
			...s.matchAll(/^[^"]*"(?<id>[^"]+)", "(?<name>[^"]+)"/g),
		])
		.reduce((a, match) => {
			const { id, name } = match.groups as any;
			// convert name to valid characters
			a.set(name.toLowerCase().replace(/([^a-z]| )+/g, "-"), id);
			return a;
		}, new Map<string, string>());

export const getScriptFileActivityName = (
	filename: string,
	event: Event
): string | null => {
	const postfix = `-${Event[event]}.sh`;
	return filename.endsWith(postfix)
		? filename.slice(0, -postfix.length)
		: null;
};

export const uninstallOldScripts = async (
	activitiesConfigFolder: string,
	newlyInstalledScripts: Set<string>,
	dryRun: boolean,
	installedScriptFilename: string
): Promise<void> => {
	const processDirectory = async (
		directoryPath: string,
		currentDepth: number
	): Promise<void> => {
		if (currentDepth > 2) {
			return;
		}
		const files = await fs.readdir(directoryPath);
		for (const filename of files) {
			const filePath = path.join(directoryPath, filename);
			const stat = await fs.stat(filePath);

			if (stat.isDirectory()) {
				await processDirectory(filePath, currentDepth + 1);
			} else if (
				!newlyInstalledScripts.has(filePath) &&
				filename === installedScriptFilename
			) {
				if (!dryRun) {
					await fs.unlink(filePath);
				}
				console.log(
					`${dryRun ? "Would delete" : "Deleted"} file: ${filePath}`
				);
			}
		}
	};
	await processDirectory(activitiesConfigFolder, 0);
};

export const copyScriptsForEvents = async (
	activityNameIdMap: ActivityNameIdMap,
	activitiesConfigFolder: string,
	scriptsPath: string,
	dryRun: boolean,
	installedScriptFilename: string
): Promise<Set<string>> => {
	const installedScripts = new Set<string>();
	await Promise.all(
		(
			await fs.readdir(scriptsPath)
		).map(async (filename) => {
			const filePath = path.join(scriptsPath, filename);
			const script = await fs.readFile(filePath, "utf8");

			await Promise.all(
				(Object.values(Event) as Event[]).map(async (event) => {
					const activityName = getScriptFileActivityName(
						filename,
						event
					);
					if (activityName) {
						const activityId = activityNameIdMap.get(activityName);
						if (activityId) {
							const destinationDir = path.join(
								activitiesConfigFolder,
								activityId,
								event
							);
							const destinationPath = path.join(
								destinationDir,
								installedScriptFilename
							);
							console.log(
								`${
									dryRun ? "Would copy" : "Copying"
								} ${filePath} to ${destinationPath}`
							);
							try {
								await fs.access(destinationDir);
							} catch {
								if (!dryRun) {
									await fs.mkdir(destinationDir, {
										recursive: true,
									});
								}
							}
							if (!dryRun) {
								await fs.writeFile(destinationPath, script);
								await fs.chmod(destinationPath, 0o755);
							}
							installedScripts.add(destinationPath);
						}
					}
				})
			);
		})
	);
	return installedScripts;
};
