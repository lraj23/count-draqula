import app from "./client.js";
import { getCDraqula, saveState } from "./datahandler.js";
const lraj23UserId = "U0947SL6AKB";
const lraj23BotTestingId = "C09GR27104V";
const msgIsNum = msg => parseInt(msg.split(" - ")[0]).toString() === msg.split(" - ")[0];

app.message("", async ({ message: { text, channel, ts } }) => {
	if (channel !== lraj23BotTestingId) return;
	let CDraqula = getCDraqula();
	const react = async (name, timestamp) => await app.client.reactions.add({ channel, name, timestamp });
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
		await react("bangbang", ts);
	}
	console.log(counted, CDraqula.next);
	saveState(CDraqula);
});

app.action(/^ignore-.+$/, async ({ ack }) => await ack());

app.action("cancel", async ({ ack, respond }) => [await ack(), await respond({ delete_original: true })]);

app.action("confirm", async ({ }) => { });

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