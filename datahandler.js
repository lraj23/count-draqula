import fs from "node:fs";
import { join } from "node:path";

const dataFile = "cdraqula.json";
const dataFilePath = join(import.meta.dirname, dataFile);
let CDraqula = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const logStream = fs.createWriteStream(join(import.meta.dirname, "updates.log"), {
	"flags": "a",
});

function getUserAt(text) {
	text = text.trim();
	let targetId = text.match(/<@([A-Z0-9]+?)\|.+?>/);
	let targetName;
	if (targetId) {
		targetId = targetId[1];
		targetName = text.match(/<@[A-Z0-9]+?\|(.+?)>/)[1];
		return [targetId, targetName];
	}
	return [null, null];
}

function log(message) {
	const now = new Date();
	let timecode = "["
		+ now.getFullYear()
		+ "_"
		+ shortMonths[now.getMonth()]
		+ "_"
		+ pad0(now.getDate())
		+ ", "
		+ pad0(now.getHours())
		+ ":"
		+ pad0(now.getMinutes())
		+ ":"
		+ pad0(now.getSeconds())
		+ "."
		+ pad0(now.getMilliseconds(), 3)
		+ "] ";
	if (typeof message === "object") message = JSON.stringify(message);
	console.log(timecode + message);
	logStream.write(timecode + message + "\n");
}

async function logInteraction(interaction) {
	const user = "<@" + interaction.payload.user_id || interaction.body.user.id || "<no id>" + "|" + interaction.payload.user_name || interaction.body.user.name || "<no name>"
		+ "> ";
	const channel = interaction.payload.channel_name || interaction.body.channel.name || "<no channel>";

	if (interaction.command) {
		log("[" + channel + "] " + user + " ran command " + interaction.command.command + " ");
	} else {
		log("Unknown interaction logged: " + JSON.stringify(interaction, null, "\t") + " ");
	}
}

function getCDraqula() {
	return cloneObj(CDraqula);
}

function saveState(data) {
	CDraqula = cloneObj(data);

	let saveObj = cloneObj(data);
	delete saveObj.debug;
	saveObj.debug = {
		"lastUpdated": Date.now(),
		"lastUpdatedReadable": new Date().toString(),
	};
	fs.writeFileSync(dataFilePath, JSON.stringify(saveObj, null, "\t"));
}

function pad0(string, length) {
	return string.toString().padStart(length || 2, "0");
}

// cloneObj function taken from https://stackoverflow.com/a/7574273
function cloneObj(obj) {
	if (obj == null || typeof (obj) != "object") {
		return obj;
	}

	let clone = new obj.constructor();
	for (let key in obj) {
		if (obj.hasOwnProperty(key)) {
			clone[key] = cloneObj(obj[key]);
		}
	}

	return clone;
}

export {
	saveState,
	getCDraqula,
	logInteraction,
	getUserAt,
};