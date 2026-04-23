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

const systemFile = "system.json";

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

// ================= FILE =================

function load(file) {
  try {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return {};
  }
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function isEnabled() {
  const data = load(systemFile);
  return data.enabled !== false;
}

// ================= SLASH =================

const commands = [
  {
    name: "panel",
    description: "Control Steam Vault system",
    options: [
      {
        name: "mode",
        description: "enable / disable / send",
        type: 3,
        required: true,
        choices: [
          { name: "enable", value: "enable" },
          { name: "disable", value: "disable" },
          { name: "send", value: "send" },
        ],
      },
    ],
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

// ================= PANEL =================

function buildPanelEmbed(c) {
  return new EmbedBuilder()
    .setTitle("✨ Steam Activation Vault")
    .setDescription(
`Select A Game From The Dropdown Below To Activate.

🎟️ Total Tokens In Vault  
0 Available  

🎮 Games Listed  
A-F: ${c[0].games.length} | G-L: ${c[1].games.length} | M-R: ${c[2].games.length} | S-Z: ${c[3].games.length}

🔥 High Demand  
A-F: ${c[0].games.length ? "🟢 Plenty" : "🔴 Empty"} | G-L: ${c[1].games.length ? "🟢 Plenty" : "🔴 Empty"} | M-R: ${c[2].games.length ? "🟢 Plenty" : "🔴 Empty"} | S-Z: ${c[3].games.length ? "🟢 Plenty" : "🔴 Empty"}

━━━━━━━━━━━━━━━━━━
🔥 High demand • 🟢 Plenty • 🟡 Low • 🔴 Empty  
• Steam Token Vault • Tokens Regenerate As Stock Is Replenished`
    )
    .setColor(0x6a0dad);
}

// ================= TRANSCRIPT =================

async function generateTranscript(channel, user) {
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
Created by: ${user.tag}
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

  if (interaction.isChatInputCommand()) {
    const mode = interaction.options.getString("mode");
    const sys = load(systemFile);

    if (mode === "enable") {
      sys.enabled = true;
      save(systemFile, sys);
      return interaction.reply({ content: "✅ Enabled", flags: 64 });
    }

    if (mode === "disable") {
      sys.enabled = false;
      save(systemFile, sys);
      return interaction.reply({ content: "❌ Disabled", flags: 64 });
    }

    if (mode === "send") {
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
  }

  if (!isEnabled()) return;

  if (interaction.isStringSelectMenu()) {

    const cat = categories.find(c => c.value === interaction.values[0]);

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Opened")
      .setDescription(`Category: ${cat.label}

🎮 Available Games:
${cat.games.map(g => `🎮 ${g.name} — ${g.tokens}`).join("\n")}

━━━━━━━━━━━━━━━━━━
📌 Requirements:
• Screenshot of game folder (WUB enabled)
• Game properties screenshot required
• Clean game files (NO SteamTools)
• WAIT FOR ASSISTANCE`)
      .setColor(0x00ffcc);

    const btn = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger);

    await channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)],
    });

    return interaction.reply({
      content: `Ticket opened: ${channel}`,
      flags: 64,
    });
  }

  if (interaction.isButton()) {

    if (interaction.customId === "close_ticket") {

      const member = interaction.member;
      const data = await generateTranscript(interaction.channel, interaction.user);
      const transcriptChannel = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID);

      const embed = new EmbedBuilder()
        .setTitle("📄 Auto-Generated Transcript")
        .setDescription(`Transcript automatically generated for ticket #${data.ticketNumber}

🎫 Ticket #${data.ticketNumber} • Created by ${interaction.user} • ${data.messages} messages  
⏱️ Duration: ${data.duration} minutes • Status: Closed (Auto-transcript)  
🏷️ Subject: 🎟️ ACTIVATION  
📅 Generated ${new Date().toLocaleString()}`)
        .setColor(0x2b2d31);

      await transcriptChannel.send({
        embeds: [embed],
        files: [data.fileName],
      });

      await interaction.reply({
        content: "🔒 Ticket closed. Transcript saved.",
        flags: 64,
      });

      await member.roles.add(COOLDOWN_ROLE_ID).catch(() => {});

      setTimeout(() => {
        member.roles.remove(COOLDOWN_ROLE_ID).catch(() => {});
      }, 48 * 60 * 60 * 1000);

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 4000);
    }
  }
});

client.login(TOKEN);