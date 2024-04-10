# KDE Activity Script Installer

[Iron Oxide Labs LLC](https://www.ironoxidelabs.com) presents the [KDE Activity Script Installer](https://www.npmjs.com/package/kas-installer) or "kas-installer" for short. The kas-installer was developed to simplify the management of scripts for the lifecycle events in KDE Activities. The kas-installer automates the process of searching for scripts in a designated folder and copying them to the paths used by KDE Activities. This enables KDE Activities to use them based on the assigned activity name and lifecycle events. Here's how it works:

1. **Script Matching**: The installer matches the name of the activity and the lifecycle event to the name of the script you provide.

2. **Querying KDE**: It then queries KDE to retrieve the unique IDs of the named activities.

3. **Copying Scripts**: Once the IDs are obtained, the installer copies your scripts to the paths expected by KDE, making them available for the specified activities and events.

## Prerequisites

1. qdbus: `sudo apt install qtchooser`

## Installation

You can install the kas-installer globally using npm with the following command:

```bash
npm install -g kas-installer

Make sure that all prequisites are already installed before using it.
```

## Script Naming Convention

To match script files to KDE activities and lifecycle events, kas-installer follows a strict file naming convention. The script file name is expected to include the KDE activity name in lowercase, with special characters removed, spaces replaced by dashes, followed by a dash and the name of the lifecycle event.

For example:

-   If you have a KDE Activity called "Filing Taxes & Accounting" and you want a script to run when that activity is started, you should name your script: `filing-taxes-accounting-started.sh`
-   For a script to run when the activity is stopped, the filename should be: `filing-taxes-accounting-stopped.sh`
-   Similarly, for other lifecycle events, follow the pattern: `activity-name-lifecycle-event.sh`

## Basic Usage

### Installing Scripts

To install scripts located in the "~/KDE Activity Scripts/" folder, simply run the following command:

```bash
kas-installer -s "~/KDE Activity Scripts/"
```

### Dry Run (No Changes)

If you want to perform a dry run without making any changes to the file system, add the `-n` flag like this:

```bash
kas-installer -n -s "~/KDE Activity Scripts/"
```

### Integration with Node.js Projects

For Node.js projects, you can place your scripts in the "./src/scripts" folder and add the following configuration to your `package.json` file:

```json
{
	"scripts": {
		"start": "kas-installer -d"
	}
}
```

Now, you can simply run the following command to install your scripts after making updates:

```bash
npm run start
```

### Automatic Uninstallation of Old Scripts

If you have outdated scripts that you wish to remove in the future, you can do so by adding the `-d` flag during the next run of kas-installer. For example:

```bash
kas-installer -d [other options...]
```

This will remove the old scripts while installing the new ones.

## Example Node.js

[Node Project Example](./example/node-project-example)

## Links

-   NPM Package: https://www.npmjs.com/package/kas-installer
-   Iron Oxide Labs LLC: https://www.ironoxidelabs.com
