import app from "./client.js";
import { getCDraqula, saveState } from "./datahandler.js";
const lraj23UserId = "U0947SL6AKB";
const lraj23BotTestingId = "C09GR27104V";
const msgIsNum = msg => (msg ? parseInt(msg.split(" - ")[0]).toString() === msg.split(" - ")[0] : false);
const numInMsg = msg => msgIsNum(msg) ? parseInt(msg.split(" - ")[0]) : NaN;

app.message("", async ({ message: { text, user, channel, ts } }) => {
	if (channel !== lraj23BotTestingId) return;
	let CDraqula = getCDraqula();
	const react = async (name, timestamp) => {
		try {
			await app.client.reactions.add({ channel, name, timestamp });
		} catch (e) {
			console.error(e.data.error);
		}
	};
	const unreact = async (name, timestamp) => {
		try {
			await app.client.reactions.remove({ channel, name, timestamp });
		} catch (e) {
			console.error(e.data.error);
		}
	};
	if (!msgIsNum(text)) {
		console.log("not a number!");
		return await react("very-mad", ts);
	}
	const counted = parseInt(text.split(" - ")[0]);
	if (counted === CDraqula.next) {
		console.log("correct!");
		CDraqula.next++;
		await react("white_check_mark", ts);
	} else {
		console.log("wrong...");
		let pastMessages = (await app.client.conversations.history({
			channel,
			latest: ts,
			oldest: ts - 20000,
			limit: 50
		})).messages.filter(msg => msgIsNum(msg.text));
		let isCorrect = [true];
		for (let i = 0; i < pastMessages.length; i++) {
			if (numInMsg(pastMessages[i].text) + 1 === CDraqula.next) {
				isCorrect[1] = i;
				break;
			}
			if (numInMsg(pastMessages[i].text) + 1 !== counted - i) {
				isCorrect[0] = false;
				break;
			}
		}
		if (counted !== CDraqula.next + isCorrect[1]) isCorrect = [false];
		if (isCorrect[0]) {
			for (let i = 0; i < isCorrect[i]; i++) {
				let msg = pastMessages[i];
				if (i > isCorrect[1]) return;
				await react("white_check_mark", msg.ts);
				await unreact("bangbang", msg.ts);
				CDraqula.next++;
			}
			await react("white_check_mark", ts);
			CDraqula.next++;
		} else {
			await react("bangbang", ts);
			await app.client.chat.postEphemeral({ channel, user, text: "That's the wrong number... It should be " + CDraqula.next });
		}
	}
	console.log(counted, CDraqula.next);
	saveState(CDraqula);
});

app.action("override", async ({ ack, respond }) => [await ack(), await respond({
	text: "Choose a number to set it to:",
	blocks: [
		{
			type: "input",
			element: {
				type: "plain_text_input",
				action_id: "ignore-override",
				placeholder: {
					type: "plain_text",
					text: "The NEXT number to start counting"
				}
			},
			label: {
				type: "plain_text",
				text: "Choose a number to set the counting to:",
				emoji: true
			},
			optional: false
		},
		{
			type: "actions",
			elements: [
				{
					type: "button",
					text: {
						type: "plain_text",
						text: ":x: Cancel",
						emoji: true
					},
					value: "cancel",
					action_id: "cancel"
				},
				{
					type: "button",
					text: {
						type: "plain_text",
						text: ":white_check_mark: Go!",
						emoji: true
					},
					value: "confirm",
					action_id: "confirm"
				}
			]
		}
	]
})]);

app.action(/^ignore-.+$/, async ({ ack }) => await ack());

app.action("cancel", async ({ ack, respond }) => [await ack(), await respond({ delete_original: true })]);

app.action("confirm", async ({ ack, respond, body: { state: { values }, user: { id: uId }, channel: { id: cId } } }) => {
	await ack();
	console.log(values);
	let CDraqula = getCDraqula();
	const warn = async msg => await app.client.chat.postEphemeral({
		channel: cId,
		user: uId,
		text: msg,
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: msg
				},
				accessory: {
					type: "button",
					text: {
						type: "plain_text",
						text: "Close"
					},
					action_id: "cancel"
				}
			}
		],
	});
	if (Object.entries(values).length === 0) return await warn("Enter a whole number!!");
	let override = Object.entries(values).find(info => info[1]["ignore-override"])[1]["ignore-override"].value;

	if (override !== parseInt(override).toString()) return await warn("Enter, precisely, a whole number.");
	override = parseInt(override);
	if (override <= 0) return await warn("Really? You have to restart at at least 1.");
	CDraqula.next = override;

	await respond("Success! Continue counting from " + override + "...");
	await app.client.chat.postMessage({
		channel: cId,
		text: "The next number was overriden by <@" + uId + ">! Continue counting with " + override + "..."
	});
	saveState(CDraqula);
});

app.command("/cdraqula-admin", async ({ ack, body: { user_id }, respond }) => {
	await ack();
	let CDraqula = getCDraqula();
	await respond(CDraqula.admins.includes(user_id) ? {
		text: "Admin panel:",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "Admin panel:"
				}
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":count-draqula: Override counting number"
						},
						action_id: "override"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":heavy_plus_sign: Add admin"
						},
						action_id: "add-admin"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":adminabooz: Remove admin"
						},
						action_id: "remove-admin"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":x: Cancel"
						},
						action_id: "cancel"
					}
				]
			}
		]
	} : {
		text: "You aren't an admin, so you can't access the admin panel. However, you can still request the admins to override the number:",
		blocks: [
			{
				type: "input",
				element: {
					type: "plain_text_input",
					action_id: "ignore-request-override",
					placeholder: {
						type: "plain_text",
						text: "The NEXT number to start counting"
					}
				},
				label: {
					type: "plain_text",
					text: "You aren't an admin (" + CDraqula.admins.map(admin => "<@" + admin + ">").join(", ") + "), so you can't access the admin panel. However, you can still request the admins to override the number:",
					emoji: true
				},
				optional: false
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":x: Cancel",
							emoji: true
						},
						value: "cancel",
						action_id: "cancel"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":white_check_mark: Go!",
							emoji: true
						},
						value: "confirm",
						action_id: "confirm-request-override"
					}
				]
			}
		]
	});
});

app.action("add-admin", async ({ ack }) => await ack());

app.action("remove-admin", async ({ ack }) => await ack());

app.action("confirm-request-override", async ({ ack, respond, body: { state: { values }, user: { id: uId }, channel: { id: cId } } }) => {
	await ack();
	console.log(values);
	const CDraqula = getCDraqula();
	const warn = async msg => await app.client.chat.postEphemeral({
		channel: cId,
		user: uId,
		text: msg,
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: msg
				},
				accessory: {
					type: "button",
					text: {
						type: "plain_text",
						text: "Close"
					},
					action_id: "cancel"
				}
			}
		],
	});
	if (Object.entries(values).length === 0) return await warn("Enter a whole number!!");
	let override = Object.entries(values).find(info => info[1]["ignore-request-override"])[1]["ignore-request-override"].value;

	if (override !== parseInt(override).toString()) return await warn("Enter, precisely, a whole number.");
	override = parseInt(override);
	if (override <= 0) return await warn("Really? You have to restart at at least 1.");

	await respond("Success! All the admins have been pinged.");
	await app.client.chat.postMessage({
		channel: cId,
		text: "<@" + uId + "> has requested the admins (" + CDraqula.admins.map(admin => "<@" + admin + ">").join(", ") + ") to override the number to " + override + ".",
	});
});

app.command("/cdraqula-help", async ({ ack, respond, payload: { user_id } }) => [await ack(), await respond("This bot helps you count in #counttoamillion and more! _More to be written eventually..._"), user_id === lraj23UserId ? await respond("Test but only for <@" + lraj23UserId + ">. If you aren't him and you see this message, DM him IMMEDIATELY about this!") : null]);

app.message(/secret button/i, async ({ message: { channel, user, thread_ts, ts } }) => await app.client.chat.postEphemeral({
	channel, user,
	text: "<@" + user + "> mentioned the secret button! Here it is:",
	thread_ts: ((thread_ts == ts) ? undefined : thread_ts),
	blocks: [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: "<@" + user + "> mentioned the secret button! Here it is:"
			}
		},
		{
			type: "actions",
			elements: [
				{
					type: "button",
					text: {
						type: "plain_text",
						text: "Secret Button"
					},
					action_id: "button_click"
				}
			]
		}
	]
}));

app.action("button_click", async ({ body: { channel: { id: cId }, user: { id: uId }, container: { thread_ts } }, ack }) => [await ack(), await app.client.chat.postEphemeral({
	channel: cId,
	user: uId,
	text: "You found the secret button. Here it is again.",
	thread_ts,
	blocks: [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: "You found the secret button. Here it is again."
			}
		},
		{
			type: "actions",
			elements: [
				{
					type: "button",
					text: {
						type: "plain_text",
						text: "Secret Button"
					},
					action_id: "button_click"
				}
			]
		}
	]
})]);