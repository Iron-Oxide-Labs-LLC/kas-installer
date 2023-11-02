import mockFs from "mock-fs";
import fs from "fs";
import {
	getScriptFileActivityName,
	parseActivityData,
	copyScriptsForEvents,
	Event,
	uninstallOldScripts,
} from "./lib";
import path from "path";

const installedScriptFilename = "kas-script.sh";

describe("parseActivityData", () => {
	const mockActivityIdMap = new Map<string, string>([
		["activity-a", "some-id-a"],
		["activity-b", "some-id-b"],
		["long-named-activity", "some-id-d"],
		["filing-taxes-accounting", "some-id-e"],
	]);
	it("should parse activity data correctly", () => {
		const sampleData = `[Argument: a(ssssi) {[Argument: (ssssi) "some-id-a", "Activity A", "Ignore this", "ignore", 2], [Argument: (ssssi) "some-id-b", "activity B", "Stuff", "otherstuff", 13], [Argument: (ssssi) "some-id-d", "Long Named Activity", "Stuff", "otherstuff", 1], [Argument: (ssssi) "some-id-e", "Filing Taxes & Accounting", "Taxes", "taxes", 2]}]`;
		const expected = mockActivityIdMap;
		const result = parseActivityData(sampleData);
		expect(result).toEqual(expected);
	});
});

describe("getScriptFileActivityName", () => {
	describe("should return null if the file name doesn't match the event postfix", () => {
		const expected = null;
		it("no event postfix", () => {
			const filename = "activity-a.sh";
			const event = Event.activated;
			const result = getScriptFileActivityName(filename, event);
			expect(result).toEqual(expected);
		});
		it("wrong event prefix", () => {
			const filename = "activity-a-deactivated.sh";
			const event = Event.activated;
			const result = getScriptFileActivityName(filename, event);
			expect(result).toEqual(expected);
		});
		it("no file extension", () => {
			const filename = "activity-a-activated";
			const event = Event.activated;
			const result = getScriptFileActivityName(filename, event);
			expect(result).toEqual(expected);
		});
	});
	describe("should return filename without postfix if the file name matches the event", () => {
		const expected = "activity-a";
		it("activated event", () => {
			const filename = "activity-a-activated.sh";
			const event = Event.activated;
			const result = getScriptFileActivityName(filename, event);
			expect(result).toEqual(expected);
		});
		it("deactivated event", () => {
			const filename = "activity-a-deactivated.sh";
			const event = Event.deactivated;
			const result = getScriptFileActivityName(filename, event);
			expect(result).toEqual(expected);
		});
		it("started event", () => {
			const filename = "activity-a-started.sh";
			const event = Event.started;
			const result = getScriptFileActivityName(filename, event);
			expect(result).toEqual(expected);
		});
		it("stopped event", () => {
			const filename = "activity-a-stopped.sh";
			const event = Event.stopped;
			const result = getScriptFileActivityName(filename, event);
			expect(result).toEqual(expected);
		});
		it("long named activity event", () => {
			const filename = "ring-a-round-the-rosey-started.sh";
			const event = Event.started;
			const result = getScriptFileActivityName(filename, event);
			expect(result).toEqual("ring-a-round-the-rosey");
		});
	});
});

describe("copyScriptsForEvents", () => {
	const mockActivityIdMap = new Map<string, string>([
		["activity-a", "some-id-a"],
		["activity-b", "some-id-b"],
		["long-named-activity", "some-id-d"],
	]);
	const activitiesConfigFolder = "/activities/scripts";
	const scriptsPath = "/src/scripts";
	const mockFolders = {
		[activitiesConfigFolder]: {
			"some-id-a": {},
			"some-id-b": {},
		},
	};
	const plentyOfFilesMockFS = {
		[scriptsPath]: {
			"activity-a-activated.sh": "Activity A activated",
			"activity-a-error.sh": "Activity A error",
			"activity-b-activated.sh": "Activity B activated",
			"activity-b-stopped.sh": "Activity B stopped",
			"activity-b-error.sh": "Activity B error",
			"activity-b.sh": "Activity B nothing",
			"activity-c-started.sh": "Activity C started",
			"long-named-activity-started.sh": "Activity D started",
		},
		...mockFolders,
	};
	let log: jest.SpyInstance<
		void,
		[message?: any, ...optionalParams: any[]],
		any
	>;
	beforeEach(() => {
		log = jest.spyOn(console, "log").mockImplementation(() => {});
	});
	afterEach(() => {
		log.mockReset();
	});
	describe("not a dry run", () => {
		let installedScripts: Set<string>;
		afterEach(() => {
			mockFs.restore();
			installedScripts = new Set<string>();
		});
		const doCopyScriptsForEvents = () => {
			installedScripts = copyScriptsForEvents(
				mockActivityIdMap,
				activitiesConfigFolder,
				scriptsPath,
				false,
				installedScriptFilename
			);
		};
		it("no files", () => {
			mockFs({
				[scriptsPath]: {},
				...mockFolders,
			});
			doCopyScriptsForEvents();
			const activatedActivityAFolder = path.join(
				activitiesConfigFolder,
				"some-id-a",
				"activated"
			);
			const result = fs.existsSync(activatedActivityAFolder)
				? fs.readdirSync(activatedActivityAFolder).length
				: 0;
			expect(result).toEqual(0);
		});
		describe("plenty of files", () => {
			beforeEach(() => {
				mockFs(plentyOfFilesMockFS);
				doCopyScriptsForEvents();
			});
			it("valid files copied", () => {
				expect(
					fs.readFileSync(
						"/activities/scripts/some-id-a/activated/kas-script.sh",
						"utf8"
					)
				).toEqual("Activity A activated");
				expect(
					fs.readFileSync(
						"/activities/scripts/some-id-b/activated/kas-script.sh",
						"utf8"
					)
				).toEqual("Activity B activated");
				expect(
					fs.readFileSync(
						"/activities/scripts/some-id-b/stopped/kas-script.sh",
						"utf8"
					)
				).toEqual("Activity B stopped");
				expect(
					fs.readFileSync(
						"/activities/scripts/some-id-d/started/kas-script.sh",
						"utf8"
					)
				).toEqual("Activity D started");
			});
			it("invalid files skipped", () => {
				expect(
					fs.existsSync(
						"/activities/scripts/some-id-a/error/kas-script.sh"
					)
				).toEqual(false);
				expect(
					fs.existsSync(
						"/activities/scripts/some-id-b/error/kas-script.sh"
					)
				).toEqual(false);
				expect(
					fs.existsSync("/activities/scripts/some-id-b/kas-script.sh")
				).toEqual(false);
				expect(
					fs.existsSync(
						"/activities/scripts/some-id-a/started/kas-script.sh"
					)
				).toEqual(false);
				expect(
					fs.existsSync(
						"/activities/scripts/some-id-b/started/kas-script.sh"
					)
				).toEqual(false);
				expect(
					fs.existsSync(
						"/activities/scripts/some-id-c/started/kas-script.sh"
					)
				).toEqual(false);
			});
			it("Verify installed scripts set", () => {
				expect(installedScripts.size).toEqual(4);
				expect(installedScripts).toContain(
					"/activities/scripts/some-id-a/activated/kas-script.sh"
				);
				expect(installedScripts).toContain(
					"/activities/scripts/some-id-b/activated/kas-script.sh"
				);
				expect(installedScripts).toContain(
					"/activities/scripts/some-id-b/stopped/kas-script.sh"
				);
				expect(installedScripts).toContain(
					"/activities/scripts/some-id-d/started/kas-script.sh"
				);
			});
			it("Console log shows correct messages", () => {
				expect(log).toHaveBeenCalledWith(
					"Copying /src/scripts/activity-a-activated.sh to /activities/scripts/some-id-a/activated/kas-script.sh"
				);
				expect(log).toHaveBeenCalledWith(
					"Copying /src/scripts/activity-b-stopped.sh to /activities/scripts/some-id-b/stopped/kas-script.sh"
				);
			});
		});
	});
	describe("dry run", () => {
		it("copy some files", () => {
			mockFs(plentyOfFilesMockFS);
			const installedScripts = copyScriptsForEvents(
				mockActivityIdMap,
				activitiesConfigFolder,
				scriptsPath,
				true,
				installedScriptFilename
			);
			expect(installedScripts.size).toEqual(4);
			expect(installedScripts).toContain(
				"/activities/scripts/some-id-a/activated/kas-script.sh"
			);
			expect(
				fs.existsSync(
					"/activities/scripts/some-id-a/activated/kas-script.sh"
				)
			).toEqual(false);
			expect(log).toHaveBeenCalledWith(
				"Would copy /src/scripts/activity-a-activated.sh to /activities/scripts/some-id-a/activated/kas-script.sh"
			);
			expect(log).toHaveBeenCalledWith(
				"Would copy /src/scripts/activity-b-stopped.sh to /activities/scripts/some-id-b/stopped/kas-script.sh"
			);
		});
	});
});

describe("uninstallOldScripts", () => {
	const activitiesConfigFolder = "/activities/scripts";
	const allScripts = [
		"/activities/scripts/some-id-a/activated/kas-script.sh",
		"/activities/scripts/some-id-b/stopped/kas-script.sh",
		"/activities/scripts/some-id-c/started/kas-script.sh",
	];
	let log: jest.SpyInstance<
		void,
		[message?: any, ...optionalParams: any[]],
		any
	>;
	afterEach(() => {
		log.mockReset();
		mockFs.restore();
	});
	beforeEach(() => {
		log = jest.spyOn(console, "log").mockImplementation(() => {});
		mockFs({
			[activitiesConfigFolder]: {
				"some-id-a": {
					activated: {
						"kas-script.sh": "Activated A",
						skip_this: {
							"kas-script.sh": "This file should not be deleted",
						},
						".hidden": {
							activated: {
								"kas-script.sh":
									"This file should definately not be deleted",
							},
						},
					},
				},
				"some-id-b": {
					stopped: {
						"kas-script.sh": "Stopped B",
					},
				},
				"some-id-c": {
					started: {
						"kas-script.sh": "Started C",
					},
				},
			},
		});
	});
	describe("uninstall files", () => {
		it("uninstall everything", () => {
			uninstallOldScripts(
				activitiesConfigFolder,
				new Set([]),
				false,
				installedScriptFilename
			);
			allScripts.forEach((p) => {
				expect(fs.existsSync(p)).toEqual(false);
			});
		});
		it("uninstall some", () => {
			uninstallOldScripts(
				activitiesConfigFolder,
				new Set([
					"/activities/scripts/some-id-c/started/kas-script.sh",
				]),
				false,
				installedScriptFilename
			);
			[
				[
					"/activities/scripts/some-id-a/activated/kas-script.sh",
					false,
				],
				["/activities/scripts/some-id-b/stopped/kas-script.sh", false],
				["/activities/scripts/some-id-c/started/kas-script.sh", true],
			].forEach(([p, shouldExist]) => {
				expect(fs.existsSync(p as string)).toEqual(
					shouldExist as boolean
				);
			});
		});
		it("uninstall none", () => {
			uninstallOldScripts(
				activitiesConfigFolder,
				new Set(allScripts),
				false,
				installedScriptFilename
			);
			allScripts.forEach((p) => {
				expect(fs.existsSync(p)).toEqual(true);
			});
		});
		it("verify console log output", () => {
			uninstallOldScripts(
				activitiesConfigFolder,
				new Set([
					"/activities/scripts/some-id-c/started/kas-script.sh",
				]),
				false,
				installedScriptFilename
			);
			expect(log).toHaveBeenCalledWith(
				"Deleted file: /activities/scripts/some-id-a/activated/kas-script.sh"
			);
		});
	});
	describe("ignore nested folders", () => {
		afterEach(() => {
			[
				"/activities/scripts/some-id-a/activated/skip_this/kas-script.sh",
				"/activities/scripts/some-id-a/activated/.hidden/activated/kas-script.sh",
			].forEach((p) => {
				expect(fs.existsSync(p)).toEqual(true);
			});
		});
		it("uninstall everything", () => {
			uninstallOldScripts(
				activitiesConfigFolder,
				new Set([]),
				false,
				installedScriptFilename
			);
		});
		it("uninstall some", () => {
			uninstallOldScripts(
				activitiesConfigFolder,
				new Set([
					"/activities/scripts/some-id-c/started/kas-script.sh",
				]),
				false,
				installedScriptFilename
			);
		});
		it("uninstall none", () => {
			uninstallOldScripts(
				activitiesConfigFolder,
				new Set(allScripts),
				false,
				installedScriptFilename
			);
		});
	});
	describe("dry run", () => {
		it("uninstall some", () => {
			uninstallOldScripts(
				activitiesConfigFolder,
				new Set([
					"/activities/scripts/some-id-c/started/kas-script.sh",
				]),
				true,
				installedScriptFilename
			);
			expect(log).toHaveBeenCalledWith(
				"Would delete file: /activities/scripts/some-id-a/activated/kas-script.sh"
			);
			expect(
				fs.existsSync(
					"/activities/scripts/some-id-a/activated/kas-script.sh"
				)
			).toEqual(true);
		});
	});
});
