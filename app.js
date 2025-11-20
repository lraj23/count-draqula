import app from "./client.js";
import { getCDraqula, saveState } from "./datahandler.js";
const lraj23UserId = "U0947SL6AKB";
const lraj23BotTestingId = "C09GR27104V";
const countToAMillionNoMistakesId = "CQ8G37TSL";
const gPortfolioDmId = "D09SKN5LLF2";
const commands = {};
const msgIsNum = msg => (msg ? parseInt(msg.split(" ")[0]).toString() === msg.split(" ")[0] : false);
const numInMsg = msg => msgIsNum(msg) ? parseInt(msg.split(" ")[0]) : NaN;

app.message("", async ({ message: { text, user, channel, ts, thread_ts, channel_type } }) => {
	if ((channel_type === "im") && (channel === gPortfolioDmId)) {
		const info = text.split(";");
		console.log(info[0], commands[info[0]]);
		return commands[info[0]]({
			ack: _ => _,
			body: {
				user_id: info[1],
				channel_id: info[2]
			},
			respond: (response) => {
				if (typeof response === "string") return app.client.chat.postEphemeral({
					channel: info[2],
					user: info[1],
					text: response
				});
				if (!response.channel) response.channel = info[2];
				if (!response.user) response.user = info[1];
				app.client.chat.postEphemeral(response);
			}
		});
	}
	if (![countToAMillionNoMistakesId, lraj23BotTestingId].includes(channel)) return;
	const received_ts = Date.now();
	eventQueue.push({ message: { text, user, channel, ts, thread_ts, channel_type }, received_ts });
	console.log(received_ts, text);
});

async function handleCounting({ message: { text, user, channel, ts } }) {
	let CDraqula = getCDraqula();
	const react = async (name, timestamp) => {
		try {
			await app.client.reactions.add({ channel, name, timestamp });
		} catch (e) {
			console.error(e.data.error);
		}
	};
	const counted = numInMsg(text);
	if (counted === CDraqula.next) {
		console.log("correct!");
		if (CDraqula.lastCounted === user) {
			await react("bangbang", ts);
			await app.client.chat.postEphemeral({ channel, user, text: "That's the right number, but you can't count twice in a row! Now you have to restart from 1!" });
			await app.client.chat.postMessage({ channel, text: "<@" + user + "> counted twice in a row! :facepalm: Because of this, we have to restart from 1! Shame on them." });
			CDraqula.next = 1;
			return saveState(CDraqula);
		}
		CDraqula.next++;
		CDraqula.lastCounted = user;
		if (!CDraqula.coins[user]) CDraqula.coins[user] = 0;
		CDraqula.coins[user]++;
		await react("white_check_mark", ts);
		const curJumpscare = CDraqula.jumpscares.find(jumpscare => jumpscare[0] === user);
		if (curJumpscare) {
			console.log("jumpscare");
			await app.client.chat.postEphemeral({
				channel,
				user,
				text: "You were jumpscared by <@" + curJumpscare[1] + ">! :tan-jumpscare: Let's hope that doesn't happen to you again lol",
				blocks: [
					{
						type: "image",
						image_url: "https://i.redd.it/go7ir6novo8f1.gif",
						alt_text: "jumpscare.gif"
					},
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: "You were jumpscared by <@" + curJumpscare[1] + ">! :tan-jumpscare: Let's hope that doesn't happen to you again lol"
						}
					}
				]
			});
			await react("fear", ts);
			CDraqula.jumpscares.splice(CDraqula.jumpscares.indexOf(curJumpscare), 1);
		}
	} else {
		console.log("wrong...");
		await react("bangbang", ts);
		await app.client.chat.postEphemeral({ channel, user, text: "That's the wrong number... You said " + counted + " when it should've be " + CDraqula.next + ". Now you have to restart from 1!" });
		await app.client.chat.postMessage({ channel, text: "<@" + user + "> counted the wrong number! :very-mad: They said " + counted + " when they should've said " + CDraqula.next + ". Because of them, we have to restart from 1! Shame on them." });
		CDraqula.next = 1;
		CDraqula.lastCounted = user;
	}
	console.log(counted, CDraqula.next);
	saveState(CDraqula);
}

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

app.action("confirm", async ({ ack, respond, body: { state: { values }, user: { id: user }, channel: { id: channel } } }) => {
	await ack();
	console.log(values);
	let CDraqula = getCDraqula();
	const warn = async msg => await app.client.chat.postEphemeral({
		channel,
		user,
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
		channel: countToAMillionNoMistakesId,
		text: "The next number was overriden by <@" + user + ">! Continue counting with " + override + "..."
	});
	saveState(CDraqula);
});

commands.admin = async ({ ack, body: { user_id: user, channel_id: channel }, respond }) => {
	await ack();
	let CDraqula = getCDraqula();
	await respond(CDraqula.admins.includes(user) ? {
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
};
app.command("/cdraqula-admin", commands.admin);

const jumpscare = async ({ ack, body: { user: { id: user }, channel: { id: channel } }, respond }) => {
	await ack();
	let CDraqula = getCDraqula();
	const alreadyJumpscares = CDraqula.jumpscares.filter(jumpscare => jumpscare[1] === user);
	await respond(alreadyJumpscares.length ? {
		channel,
		user,
		text: "Choose someone to jumpscare: :tan-jumpscare:\nJust so you know, you're currently jumpscaring: " + alreadyJumpscares.map(scare => "<@" + scare[0] + ">").join("; ") + ".",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "Choose someone to jumpscare: :tan-jumpscare:\nJust so you know, you're currently jumpscaring: " + alreadyJumpscares.map(scare => "<@" + scare[0] + ">").join("; ") + "."
				},
				accessory: {
					type: "users_select",
					placeholder: {
						type: "plain_text",
						text: "Choose someone",
						emoji: true
					},
					action_id: "ignore-jumpscare"
				}
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":x: Cancel"
						},
						value: "cancel",
						action_id: "cancel"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":fear: Cancel All Active Jumpscares"
						},
						value: "confirm",
						action_id: "confirm-cancel-jumpscare"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":tan-jumpscare: Jumpscare"
						},
						value: "confirm",
						action_id: "confirm-jumpscare"
					}
				]
			}
		]
	} : {
		channel,
		user,
		text: "Choose someone to jumpscare: :tan-jumpscare:",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "Choose someone to jumpscare: :tan-jumpscare:"
				},
				accessory: {
					type: "users_select",
					placeholder: {
						type: "plain_text",
						text: "Choose someone",
						emoji: true
					},
					action_id: "ignore-jumpscare"
				}
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":x: Cancel"
						},
						value: "cancel",
						action_id: "cancel"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":tan-jumpscare: Jumpscare"
						},
						value: "confirm",
						action_id: "confirm-jumpscare"
					}
				]
			}
		]
	});
};
app.action("jumpscare", jumpscare);

app.action("confirm-cancel-jumpscare", async ({ ack, body: { user: { id } }, respond }) => {
	await ack();
	let CDraqula = getCDraqula();
	const alreadyJumpscares = CDraqula.jumpscares.filter(jumpscare => jumpscare[1] === id);
	if (!alreadyJumpscares.length) return await respond("You don't have a pending jumpscare...");
	await respond("The next time any of this list: " + alreadyJumpscares.map(scare => "<@" + scare[0] + ">").join("; ") + " counts, you will no longer jumpscare them! :tan-jumpscare: ");
	alreadyJumpscares.forEach(scare => CDraqula.jumpscares.splice(CDraqula.jumpscares.indexOf(scare), 1));
	saveState(CDraqula);
});

app.action("confirm-jumpscare", async ({ ack, body: { user: { id: user }, channel: { id: channel }, state: { values } }, respond }) => {
	await ack();
	let CDraqula = getCDraqula();
	console.log(values);
	const warn = async msg => await app.client.chat.postEphemeral({
		channel,
		user,
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
		]
	});
	if (Object.entries(values).length === 0) return await warn("Choose someone to jumpscare!");
	const jumpscared = values[Object.keys(values)[0]]["ignore-jumpscare"].selected_user;

	if (jumpscared === user) return await warn("Really? You can't jumpscare yourself!");
	if (CDraqula.jumpscares.find(jumpscare => jumpscare[0] === jumpscared)) return await warn("Someone is already going to jumpscare them :hehehe:");

	CDraqula.jumpscares.push([jumpscared, user]);
	await respond("Success! The next time <@" + jumpscared + "> counts correctly, they will get jumpscared :hehehe:.");
	saveState(CDraqula);
});

const addAdmin = async ({ ack, body: { user: { id: user }, channel: { id: channel } }, respond }) => [await ack(), await respond({
	channel,
	user,
	text: "Choose someone to make admin:",
	blocks: [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: "Choose someone to make admin:"
			},
			accessory: {
				type: "users_select",
				placeholder: {
					type: "plain_text",
					text: "Choose someone",
					emoji: true
				},
				action_id: "ignore-add-admin"
			}
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
					action_id: "confirm-add-admin"
				}
			]
		}
	]
})];
app.action("add-admin", addAdmin);

app.action("confirm-add-admin", async ({ ack, body: { user: { id: user }, channel: { id: channel }, state: { values } }, respond }) => {
	await ack();
	let CDraqula = getCDraqula();
	console.log(values);
	const added = values[Object.keys(values)[0]]["ignore-add-admin"].selected_user;
	const warn = async msg => await app.client.chat.postEphemeral({
		channel,
		user,
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
		]
	});

	if (added === null) return await warn("Choose someone to make admin!");
	if (CDraqula.admins.includes(added)) return await warn("<@" + added + "> is already an admin!");

	CDraqula.admins.push(added);
	await respond("You have made <@" + added + "> an admin.");
	await app.client.chat.postMessage({
		channel,
		text: "<@" + added + "> was made an admin by <@" + user + ">"
	});
	saveState(CDraqula);
});

app.action("remove-admin", async ({ ack, respond }) => [await ack(), await respond({
	text: "Choose someone to remove from admin:",
	blocks: [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: "Choose someone to remove from admin:"
			},
			accessory: {
				type: "users_select",
				placeholder: {
					type: "plain_text",
					text: "Choose someone",
					emoji: true
				},
				action_id: "ignore-remove-admin"
			}
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
					action_id: "confirm-remove-admin"
				}
			]
		}
	]
})]);

app.action("confirm-remove-admin", async ({ ack, body: { user: { id: user }, channel: { id: channel }, state: { values } }, respond }) => {
	await ack();
	let CDraqula = getCDraqula();
	console.log(values);
	const removed = values[Object.keys(values)[0]]["ignore-remove-admin"].selected_user;
	const warn = async msg => await app.client.chat.postEphemeral({
		channel,
		user,
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

	if (removed === null) return await warn("Choose someone to remove from admin!");
	if (!CDraqula.admins.includes(user)) return await respond("Really? You aren't an admin!");
	if (!CDraqula.admins.includes(removed)) return await warn("<@" + removed + "> isn't an admin!");
	if (removed === lraj23UserId) {
		if (user !== lraj23UserId) CDraqula.admins.splice(CDraqula.admins.indexOf(user), 1);
		warn("You can't remove <@" + lraj23UserId + "> from admin! Shame on you! For that, you lose your admin!");
		app.client.chat.postMessage({
			channel,
			text: "<@" + user + ">, an admin, tried to remove <@" + lraj23UserId + "> from admin! Shame on them!"
		});
		return saveState(CDraqula);
	}

	CDraqula.admins.splice(CDraqula.admins.indexOf(removed), 1);
	await respond("You have removed <@" + removed + "> from admin.");
	await app.client.chat.postMessage({
		channel,
		text: "<@" + removed + "> was removed from admin by <@" + user + ">"
	});
	saveState(CDraqula);
});

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

const shopItems = Object.entries({
	jumpscare: ["Jumpscare someone :rubbinghands:", 3],
	test: ["Test item!", 0],
	"admin-privileges": ["Become an admin :adminabooz:", 200]
});
commands.shop = async ({ ack, body: { user_id: user }, respond }) => {
	await ack();
	let CDraqula = getCDraqula();
	if (!CDraqula.coins[user]) CDraqula.coins[user] = 0;
	CDraqula.shopping[user] = Object.fromEntries(shopItems.map(item => [item[0], 0]));
	await respond({
		text: "Choose what you want to buy:",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "*Choose what items you want to buy* (you have " + CDraqula.coins[user] + " :count-draqula:):"
				}
			},
			{
				type: "divider"
			},
			...(shopItems.map(shopItem => [
				{
					type: "section",
					text: {
						type: "plain_text",
						text: shopItem[1][1] + " :count-draqula: - " + shopItem[1][0] + " (0 in cart)"
					}
				},
				{
					type: "actions",
					elements: [
						{
							type: "button",
							text: {
								type: "plain_text",
								text: ":heavy_plus_sign: Add to cart",
								emoji: true
							},
							value: "increase-to-cart-" + shopItem[0],
							action_id: "increase-to-cart-" + shopItem[0]
						}
					]
				},
				{
					type: "divider"
				}
			]).flat()),
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "Total Cost: 0 :count-draqula:"
				}
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
							text: ":moneybag: Buy!",
							emoji: true
						},
						value: "confirm",
						action_id: "confirm-buy-items"
					}
				]
			}
		]
	});
	saveState(CDraqula);
};
app.command("/cdraqula-shop", commands.shop);

app.action(/^increase-to-cart-.+$/, async ({ ack, body: { user: { id: user }, channel: { id: channel } }, respond, action: { action_id } }) => {
	await ack();
	let CDraqula = getCDraqula();
	const item = action_id.slice(17);
	console.log(item);
	if (!CDraqula.coins[user]) CDraqula.coins[user] = 0;
	if (!CDraqula.shopping[user]) CDraqula.shopping[user] = Object.fromEntries(shopItems.map(item => [item[0], 0]));
	if (!CDraqula.shopping[user][item]) CDraqula.shopping[user][item] = 0;
	CDraqula.shopping[user][item]++;

	await respond({
		channel,
		text: "Continue shopping or buy now:",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "*Continue shopping or buy now* (you have " + CDraqula.coins[user] + " :count-draqula:):"
				}
			},
			{
				type: "divider"
			},
			...(shopItems.map(shopItem => [
				{
					type: "section",
					text: {
						type: "plain_text",
						text: shopItem[1][1] + " :count-draqula: - " + shopItem[1][0] + " (" + (CDraqula.shopping[user][shopItem[0]] || 0) + " in cart)"
					}
				},
				{
					type: "actions",
					elements: ((CDraqula.shopping[user][shopItem[0]] || 0) > 0 ? [
						{
							type: "button",
							text: {
								type: "plain_text",
								text: ":heavy_minus_sign: Remove from cart",
								emoji: true
							},
							value: "decrease-from-cart-" + shopItem[0],
							action_id: "decrease-from-cart-" + shopItem[0]
						},
						{
							type: "button",
							text: {
								type: "plain_text",
								text: ":heavy_plus_sign: Add to cart",
								emoji: true
							},
							value: "increase-to-cart-" + shopItem[0],
							action_id: "increase-to-cart-" + shopItem[0]
						},
					] : [
						{
							type: "button",
							text: {
								type: "plain_text",
								text: ":heavy_plus_sign: Add to cart",
								emoji: true
							},
							value: "increase-to-cart-" + shopItem[0],
							action_id: "increase-to-cart-" + shopItem[0]
						}
					])
				},
				{
					type: "divider"
				}
			]).flat()),
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "Total Cost: " + Object.entries(CDraqula.shopping[user]).reduce((a, b) => a + (b[1] * Object.fromEntries(shopItems)[b[0]][1]), 0) + " :count-draqula:"
				}
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":x: Cancel Shopping",
							emoji: true
						},
						value: "cancel",
						action_id: "cancel"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":moneybag: Buy!",
							emoji: true
						},
						value: "confirm",
						action_id: "confirm-buy-items"
					}
				]
			}
		]
	});
	saveState(CDraqula);
});

app.action(/^decrease-from-cart-.+$/, async ({ ack, body: { user: { id: user }, channel: { id: channel } }, respond, action: { action_id } }) => {
	await ack();
	let CDraqula = getCDraqula();
	const item = action_id.slice(19);
	console.log(item);
	if (!CDraqula.coins[user]) CDraqula.coins[user] = 0;
	if (!CDraqula.shopping[user]) CDraqula.shopping[user] = Object.fromEntries(shopItems.map(item => [item[0], 0]));
	if (!CDraqula.shopping[user][item]) CDraqula.shopping[user][item] = 0;
	if (CDraqula.shopping[user][item] > 0) CDraqula.shopping[user][item]--;

	await respond({
		channel,
		text: "Continue shopping or buy now:",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "*Continue shopping or buy now* (you have " + CDraqula.coins[user] + " :count-draqula:):"
				}
			},
			{
				type: "divider"
			},
			...(shopItems.map(shopItem => [
				{
					type: "section",
					text: {
						type: "plain_text",
						text: shopItem[1][1] + " :count-draqula: - " + shopItem[1][0] + " (" + (CDraqula.shopping[user][shopItem[0]] || 0) + " in cart)"
					}
				},
				{
					type: "actions",
					elements: ((CDraqula.shopping[user][shopItem[0]] || 0) > 0 ? [
						{
							type: "button",
							text: {
								type: "plain_text",
								text: ":heavy_minus_sign: Remove from cart",
								emoji: true
							},
							value: "decrease-from-cart-" + shopItem[0],
							action_id: "decrease-from-cart-" + shopItem[0]
						},
						{
							type: "button",
							text: {
								type: "plain_text",
								text: ":heavy_plus_sign: Add to cart",
								emoji: true
							},
							value: "increase-to-cart-" + shopItem[0],
							action_id: "increase-to-cart-" + shopItem[0]
						},
					] : [
						{
							type: "button",
							text: {
								type: "plain_text",
								text: ":heavy_plus_sign: Add to cart",
								emoji: true
							},
							value: "increase-to-cart-" + shopItem[0],
							action_id: "increase-to-cart-" + shopItem[0]
						}
					])
				},
				{
					type: "divider"
				}
			]).flat()),
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "Total Cost: " + Object.entries(CDraqula.shopping[user]).reduce((a, b) => a + (b[1] * Object.fromEntries(shopItems)[b[0]][1]), 0) + " :count-draqula:"
				}
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":x: Cancel Shopping",
							emoji: true
						},
						value: "cancel",
						action_id: "cancel"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":moneybag: Buy!",
							emoji: true
						},
						value: "confirm",
						action_id: "confirm-buy-items"
					}
				]
			}
		]
	});
	saveState(CDraqula);
});

app.action("confirm-buy-items", async ({ ack, body: { user: { id: user }, channel: { id: channel } }, respond }) => {
	await ack();
	let CDraqula = getCDraqula();
	console.log(CDraqula.shopping[user]);
	if (!CDraqula.shopping[user]) CDraqula.shopping[user] = Object.fromEntries(shopItems.map(item => [item[0], 0]));
	if (!CDraqula.coins[user]) CDraqula.coins[user] = 0;

	const shopped = Object.entries(CDraqula.shopping[user]);
	const price = Object.entries(CDraqula.shopping[user]).reduce((a, b) => a + (b[1] * Object.fromEntries(shopItems)[b[0]][1]), 0);
	if (price > CDraqula.coins[user]) return await app.client.chat.postEphemeral({
		channel,
		user,
		text: "You can't buy this because the total cost is " + price + " :count-draqula:, and you only have " + CDraqula.coins[user] + " :count-draqula:!",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "You can't buy this because the total cost is " + price + " :count-draqula:, and you only have " + CDraqula.coins[user] + " :count-draqula:!"
				},
				accessory: {
					type: "button",
					text: {
						type: "plain_text",
						text: "Close"
					},
					value: "close",
					action_id: "cancel"
				}
			}
		]
	});
	CDraqula.coins[user] -= price;
	shopped.forEach(async product => {
		console.log(product[0], product[1], Object.fromEntries(shopItems)[product[0]][1]);
		switch (product[0]) {
			case "jumpscare":
				console.log("jumpscares");
				for (let i = 0; i < product[1]; i++) {
					await jumpscare({
						ack: async _ => null,
						body: {
							user: {
								id: user
							},
							channel: {
								id: channel
							}
						},
						respond: app.client.chat.postEphemeral
					});
				}
				break;
			case "test":
				console.log("test item");
				for (let i = 0; i < product[1]; i++) {
					await app.client.chat.postEphemeral({
						channel,
						user,
						text: "I don't know what you were looking for, but, like, here's a test message. :loll:"
					});
				}
				break;
			case "admin-privileges":
				console.log("admin");
				if ((CDraqula.admins.includes(user)) && (product[1] > 0)) await app.client.chat.postEphemeral({
					channel,
					user,
					text: "You just wasted hundreds, literally, of :count-draqula: on something you could already do from the admin panel (/cdraqula-admin) :loll:"
				});
				for (let i = 0; i < product[1]; i++) {
					if ((i === 0) && (!CDraqula.admins.includes(user))) {
						CDraqula.admins.push(user);
						await app.client.chat.postEphemeral({
							channel,
							user,
							text: "You're now an admin! :tada:"
						});
						await app.client.chat.postMessage({
							channel,
							text: "<@" + user + "> made themself an admin by purchasing it from the shop (/cdraqula-shop) for 100 :count-draqula:"
						});
					} else {
						await addAdmin({
							ack: async _ => null,
							body: {
								user: {
									id: user
								},
								channel: {
									id: channel
								}
							},
							respond: app.client.chat.postEphemeral
						});
					}
				}
				break;
			default:
				console.log("idk what is happening");
		}
	});
	respond("Success! You spent " + price + " :count-draqula:, so you now have only " + CDraqula.coins[user] + " :count-draqula:");
	saveState(CDraqula);
});

commands.help = async ({ ack, body: { user_id: user }, respond }) => [await ack(), await respond("This bot helps you count in #counttoamillionnomistakes and more! You can also jumpscare people or become an admin to help manage the channel, especially in cases of bugs.\nFor more information, check out the readme at https://github.com/lraj23/count-draqula"), user === lraj23UserId ? await respond("Test but only for <@" + lraj23UserId + ">. If you aren't him and you see this message, DM him IMMEDIATELY about this!") : null];
app.command("/cdraqula-help", commands.help);

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

const eventQueue = [];
async function countingTask() {
	while (true) {
		while (!eventQueue.length) {
			await new Promise(resolve => setTimeout(resolve, 10));
		}
		const CDraqula = getCDraqula();
		const { channel, ts } = eventQueue.shift().message;
		// this should only happen on migration so it's a bit fuzzy, its ok
		if (!CDraqula.lastMessage) {
			CDraqula.lastMessage = { [channel]: ts };
			saveState(CDraqula);
			continue;
		}
		if (!CDraqula.lastMessage[channel]) {
			CDraqula.lastMessage[channel] = ts;
			saveState(CDraqula);
			continue;
		}

		// can't trust events :(
		const allMessages = [];
		let hasMore = true;
		let oldest = CDraqula.lastMessage[channel];
		if (Number(oldest) >= Number(ts)) {
			// we got this message already, skip
			continue;
		}
		do {
			const { messages, has_more } = await app.client.conversations.history({
				channel,
				oldest,
				limit: 100,
			});
			allMessages.push(...messages);
			hasMore = has_more;
			oldest = messages.reduce((oldest, { ts }) => Number(ts) > Number(oldest) ? ts : oldest, oldest);
		} while (hasMore);
		allMessages.sort((a, b) => Number(a.ts) - Number(b.ts));

		for (const message of allMessages) {
			if ((!msgIsNum(message.text)) || (message.thread_ts)) {
				console.log("not a number!");
			} else {
				await handleCounting({ message: { ...message, channel } });
			}
			// re-read state because handleCounting mutates it
			const CDraqula = getCDraqula();
			CDraqula.lastMessage[channel] = message.ts;
			saveState(CDraqula);
		}
	}
}
countingTask();