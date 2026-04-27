// 🔥 ERROR LOGGING (DO NOT REMOVE)
process.on("unhandledRejection", err => console.error(err));
process.on("uncaughtException", err => console.error(err));

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  REST,
  Routes,
} = require("discord.js");

const fs = require("fs");

// ================= ENV =================

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const TICKET_CATEGORY_ID = "1496520886558261328";
const COOLDOWN_ROLE_ID = "1490210219702091986";
const TRANSCRIPT_CHANNEL_ID = "1490947113939632209";
const ACTIVATOR_ROLE_ID = "1490945882667876402";

// ================= CLIENT =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ================= GAMES =================

const games = [
  { name: "Hogwarts Legacy", tokens: 5 },
  { name: "Hinokami Chronicles 2", tokens: 5 },
  { name: "Far Cry Primal", tokens: 10 },
  { name: "Resident Evil Requiem", tokens: 20 },
  { name: "Black Myth Wukong", tokens: 20 },
];

const gameEmojis = {
  "Hogwarts Legacy": "🪄",
  "Hinokami Chronicles 2": "🔥",
  "Far Cry Primal": "🦴",
  "Resident Evil Requiem": "🧟",
  "Black Myth Wukong": "🐒",
};

// ================= CATEGORY =================

function getCategories() {
  const af = [], gl = [], mr = [], sz = [];

  for (const g of games) {
    const f = g.name[0].toLowerCase();

    if (f >= "a" && f <= "f") af.push(g);
    else if (f >= "g" && f <= "l") gl.push(g);
    else if (f >= "m" && f <= "r") mr.push(g);
    else sz.push(g);
  }

  return [
    { label: "🎮 A-F", value: "af", games: af },
    { label: "🎮 G-L", value: "gl", games: gl },
    { label: "🎮 M-R", value: "mr", games: mr },
    { label: "🎮 S-Z", value: "sz", games: sz },
  ];
}

// ================= PANEL EMBED =================

function buildPanelEmbed(c) {
  const totalTokens = games.reduce((sum, g) => sum + g.tokens, 0);

  return new EmbedBuilder()
    .setTitle("✨ Steam Activation Vault")
    .setDescription(
`🎯 Select A Game From The Dropdown Below To Activate.

🎟️ Total Tokens In Vault
${totalTokens} Available

🕹️ Games Listed
A-F: ${c[0].games.length} | G-L: ${c[1].games.length} | M-R: ${c[2].games.length} | S-Z: ${c[3].games.length}

🔥 High Demand
A-F: ${c[0].games.length ? "🟢 Plenty" : "🔴 Empty"} | G-L: ${c[1].games.length ? "🟢 Plenty" : "🔴 Empty"} | M-R: ${c[2].games.length ? "🟢 Plenty" : "🔴 Empty"} | S-Z: ${c[3].games.length ? "🟢 Plenty" : "🔴 Empty"}

━━━━━━━━━━━━━━━━━━
🔥 High demand • 🟢 Plenty • 🟡 Low • 🔴 Empty
💠 Steam Token Vault • Tokens Regenerate As Stock Is Replenished`
    )
    .setColor(0x6a0dad);
}

// ================= SLASH COMMAND =================

const commands = [
  {
    name: "panel",
    description: "Send the activation panel",
  },
];

async function deployCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands,
  });
  console.log("Commands deployed");
}

// ================= READY =================

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await deployCommands();
});

// ================= TRANSCRIPT =================

async function generateTranscript(channel, creator, closer) {
  let messages = [];
  let lastId;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
    if (!fetched.size) break;

    messages.push(...fetched.values());
    lastId = fetched.last().id;
  }

  messages.reverse();

  const ticketNumber = Math.floor(Math.random() * 1000);
  const duration = Math.floor(
    (Date.now() - (messages[0]?.createdTimestamp || Date.now())) / 60000
  );

  let content = `📄 Auto-Generated Transcript

Ticket #${ticketNumber}
Created by: ${creator.tag}
Closed by: ${closer.tag}
Messages: ${messages.length}
Duration: ${duration} minutes

━━━━━━━━━━━━━━━━━━

`;

  for (const m of messages) {
    content += `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || "(no text)"}\n`;
  }

  const fileName = `ticket-${ticketNumber}-transcript.txt`;
  fs.writeFileSync(fileName, content);

  return { fileName, ticketNumber, messages: messages.length, duration };
}

// ================= INTERACTIONS =================

client.on("interactionCreate", async (interaction) => {

  const categories = getCategories();

  // 🔥 SEND PANEL
  if (interaction.isChatInputCommand()) {
    const embed = buildPanelEmbed(categories);

    const menu = new StringSelectMenuBuilder()
      .setCustomId("category_select")
      .setPlaceholder("Select Vault Category")
      .addOptions(categories.map(c => ({
        label: c.label,
        value: c.value,
      })));

    await interaction.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)],
    });

    return interaction.reply({ content: "✅ Panel sent", flags: 64 });
  }

  // ================= TICKET CREATE =================

  if (interaction.isStringSelectMenu()) {

    if (interaction.member.roles.cache.has(COOLDOWN_ROLE_ID)) {
      return interaction.reply({
        content: "⏳ You are on cooldown. Try again later.",
        flags: 64,
      });
    }

    const existing = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.id}`
    );

    if (existing) {
      return interaction.reply({
        content: `⚠️ You already have a ticket: ${existing}`,
        flags: 64,
      });
    }

    const cat = categories.find(c => c.value === interaction.values[0]);

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle("SELF ACTIVATIONS - DENUVO ACTIVATIONS")
      .setDescription(
`👋 Welcome ${interaction.user}

Please provide the requested information within 20 minutes, otherwise the ticket may be automatically closed.

━━━━━━━━━━━━━━━━━━

📸 REQUIRED SCREENSHOTS
• Game folder  
• Game folder size  
• Windows Update Blocker running  

📎 Example: SCREENSHOT.png

━━━━━━━━━━━━━━━━━━

🛠 WINDOWS UPDATE BLOCKER (REQUIRED)
https://www.sordum.org/downloads/?st-windows-update-blocker

━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANT
Missing information may result in delays or timeout.

━━━━━━━━━━━━━━━━━━

Category: ${cat.label}

🎮 Available Games:
${cat.games.map(g => `${gameEmojis[g.name]} ${g.name} — ${g.tokens}`).join("\n")}`
      )
      .setColor(0x00ffcc);

    const btn = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger);

    await channel.send({
      content: `<@&${ACTIVATOR_ROLE_ID}> , WE NEED ASSISTANCE HERE`,
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)],
    });

    return interaction.reply({
      content: `Ticket opened: ${channel}`,
      flags: 64,
    });
  }

  // ================= CLOSE =================

  if (interaction.isButton()) {

    if (interaction.customId === "close_ticket") {

      const creatorId = interaction.channel.name.split("-")[1];
      const creator = await interaction.guild.members.fetch(creatorId);

      const data = await generateTranscript(
        interaction.channel,
        creator.user,
        interaction.user
      );

      const transcriptChannel = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID);

      await transcriptChannel.send({
        content:
`📄 Auto-Generated Transcript

Ticket #${data.ticketNumber}
Created by: ${creator.user.tag}
Messages: ${data.messages}
Duration: ${data.duration} minutes`,
        files: [data.fileName],
      });

      await transcriptChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("📄 Auto-Generated Transcript")
            .setDescription(
`Transcript automatically generated for ticket #${data.ticketNumber}

🎫 Ticket #${data.ticketNumber} • Created by ${creator} • ${data.messages} messages  
⏱️ Duration: ${data.duration} minutes • Status: Closed (Auto-transcript)  
🏷️ Subject: 🎟️ ACTIVATION  
📅 Generated ${new Date().toLocaleString()}`
            )
            .setColor(0x2b2d31),
        ],
      });

      await creator.roles.add(COOLDOWN_ROLE_ID).catch(console.error);

      setTimeout(() => {
        creator.roles.remove(COOLDOWN_ROLE_ID).catch(console.error);
      }, 48 * 60 * 60 * 1000);

      await interaction.reply({
        content: "🔒 Ticket closed. Transcript saved.",
        flags: 64,
      });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 4000);
    }
  }
});

client.login(TOKEN);