import path from "path";
import fs from "fs";

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

export const uninstallOldScripts = (
	activitiesConfigFolder: string,
	newlyInstalledScripts: Set<string>,
	dryRun: boolean,
	installedScriptFilename: string
) => {
	const processDirectory = (directoryPath: string, currentDepth: number) => {
		if (currentDepth > 2) {
			return;
		}
		fs.readdirSync(directoryPath).forEach((filename) => {
			const filePath = path.join(directoryPath, filename);
			if (fs.statSync(filePath).isDirectory()) {
				processDirectory(filePath, currentDepth + 1);
			} else if (
				!newlyInstalledScripts.has(filePath) &&
				filename === installedScriptFilename
			) {
				if (!dryRun) {
					fs.unlinkSync(filePath);
				}
				console.log(
					`${dryRun ? "Would delete" : "Deleted"} file: ${filePath}`
				);
			}
		});
	};
	processDirectory(activitiesConfigFolder, 0);
};

export const copyScriptsForEvents = (
	activityNameIdMap: ActivityNameIdMap,
	activitiesConfigFolder: string,
	scriptsPath: string,
	dryRun: boolean,
	installedScriptFilename: string
): Set<string> =>
	fs
		.readdirSync(scriptsPath)
		.reduce((installedScripts: Set<string>, filename) => {
			const filePath = path.join(scriptsPath, filename);
			const script = fs.readFileSync(filePath, "utf8");
			[...(Object.values(Event) as Event[])].forEach((event) => {
				const activityName = getScriptFileActivityName(filename, event);
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
						if (!fs.existsSync(destinationDir)) {
							fs.mkdirSync(destinationDir, { recursive: true });
						}
						if (!dryRun) {
							fs.writeFileSync(destinationPath, script);
							fs.chmodSync(destinationPath, 0o755);
						}
						installedScripts.add(destinationPath);
					}
				}
			});
			return installedScripts;
		}, new Set<string>());
