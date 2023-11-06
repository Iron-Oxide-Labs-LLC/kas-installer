#!/usr/bin/env node
import { execSync } from "child_process";
import path from "path";
import { homedir } from "os";
import { Command } from "commander";

import {
	copyScriptsForEvents,
	parseActivityData,
	uninstallOldScripts,
} from "./lib";
import { version } from "./version";

const program = new Command();
program
	.name("kas-installer")
	.description(
		"KDE Activity Installer copies and deletes scripts used for KDE Activity life-cycle events.\n" +
			"For more details see: https://github.com/Iron-Oxide-Labs-LLC/kas-installer"
	)
	.version(version)
	.option("-d, --delete-old", "Delete old scripts")
	.option(
		"-a, --activities-folder <folder>",
		"KDE Activities config folder (default: ~/.local/share/kactivitymanagerd/activities)"
	)
	.option(
		"-s, --scripts-folder [folder]",
		"Scripts folder (default: ./src/scripts)"
	)
	.option(
		"-i, --install-as [filename]",
		"Filename to assign to installed scripts (default: kas-script.sh)"
	)
	.option(
		"-n, --dry-run",
		"Don’t actually remove or install anything, just show what would be done."
	)
	.parse(process.argv);

const activitiesConfigFolder: string =
	program.opts().activitiesFolder ||
	path.join(homedir(), ".local/share/kactivitymanagerd/activities");
const deleteOld: boolean = program.opts().deleteOld || false;
const scriptsFolder: string =
	program.opts().scriptsFolder || path.join(process.cwd(), "src", "scripts");
const dryRun: boolean = program.opts().dryRun || false;
const installedScriptFilename: string =
	program.opts().installedFilename || "kas-script.sh";

const getRawActivityData = (): string =>
	execSync(
		"qdbus --literal org.kde.ActivityManager /ActivityManager/Activities ListActivitiesWithInformation"
	).toString();

const installedScripts = await copyScriptsForEvents(
	parseActivityData(getRawActivityData()),
	activitiesConfigFolder,
	scriptsFolder,
	dryRun,
	installedScriptFilename
);

if (deleteOld) {
	await uninstallOldScripts(
		activitiesConfigFolder,
		installedScripts,
		dryRun,
		installedScriptFilename
	);
}

console.log("Done!");
