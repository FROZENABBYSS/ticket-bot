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

const cooldownFile = "cooldowns.json";
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

// ================= VAULT DATA =================

const games = [
  { name: "Hogwarts Legacy", tokens: 5 },
  { name: "Hinokami Chronicles 2", tokens: 5 },
  { name: "Far Cry Primal", tokens: 10 },
  { name: "Resident Evil Requiem", tokens: 20 },
  { name: "Black Myth Wukong", tokens: 20 },
];

// ================= AUTO CATEGORY SORT =================

function getCategories() {
  const af = [], gl = [], mr = [], sz = [];

  for (const g of games) {
    const first = g.name[0].toLowerCase();

    if (first >= "a" && first <= "f") af.push(g);
    else if (first >= "g" && first <= "l") gl.push(g);
    else if (first >= "m" && first <= "r") mr.push(g);
    else sz.push(g);
  }

  return [
    { label: "🎮 A-F", value: "af", games: af },
    { label: "🎮 G-L", value: "gl", games: gl },
    { label: "🎮 M-R", value: "mr", games: mr },
    { label: "🎮 S-Z", value: "sz", games: sz },
  ];
}

// ================= FILE HELPERS =================

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

// ================= SYSTEM STATE =================

function isEnabled() {
  const data = load(systemFile);
  return data.enabled !== false;
}

// ================= SLASH COMMANDS =================

const commands = [
  {
    name: "panel",
    description: "Control Steam Vault system",
    options: [
      {
        name: "mode",
        type: 3,
        description: "enable / disable / send",
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

  console.log("Slash commands deployed");
}

// ================= READY =================

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await deployCommands();
});

// ================= PANEL EMBED =================

function buildPanelEmbed(categories) {
  return new EmbedBuilder()
    .setTitle("✨ Steam Activation Vault")
    .setDescription(
`🎟️ Total Tokens In Vault  
0 Available  

🎮 Games Listed  
A-F: ${categories[0].games.length} | G-L: ${categories[1].games.length} | M-R: ${categories[2].games.length} | S-Z: ${categories[3].games.length}

🔥 High Demand  
A-F: ${categories[0].games.length ? "🟢 Plenty" : "🔴 Empty"} | G-L: ${categories[1].games.length ? "🟢 Plenty" : "🔴 Empty"} | M-R: ${categories[2].games.length ? "🟢 Plenty" : "🔴 Empty"} | S-Z: ${categories[3].games.length ? "🟢 Plenty" : "🔴 Empty"}

━━━━━━━━━━━━━━━━━━
🔥 High demand • 🟢 Plenty • 🟡 Low (≤10) • 🔴 Empty  
• Steam Token Vault • Tokens Regenerate As Stock Is Replenished`
    )
    .setColor(0x6a0dad);
}

// ================= TRANSCRIPT (UPGRADED HTML) =================

async function generateTranscript(channel, user) {
  let messages = [];
  let lastId;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
    if (fetched.size === 0) break;

    messages = messages.concat(Array.from(fetched.values()));
    lastId = fetched.last().id;
  }

  messages.reverse();

  const ticketNumber = Math.floor(Math.random() * 1000);
  const createdAt = new Date(messages[0]?.createdTimestamp || Date.now());
  const closedAt = new Date();

  const duration = Math.floor((closedAt - createdAt) / 60000);

  let messageHTML = "";

  for (const m of messages) {
    const time = new Date(m.createdTimestamp).toLocaleString();
    messageHTML += `
      <div class="msg">
        <span class="time">[${time}]</span>
        <span class="user">${m.author.tag}:</span>
        <span class="content">${m.content || "(no text)"}</span>
      </div>
    `;
  }

  const html = `
  <html>
  <head>
    <title>Transcript</title>
    <style>
      body { font-family: Arial; background: #111; color: #eee; padding: 20px; }
      .header { margin-bottom: 20px; }
      .msg { margin-bottom: 8px; }
      .time { color: #888; }
      .user { color: #00ffcc; font-weight: bold; }
    </style>
  </head>
  <body>

  <div class="header">
  <h2>📄 Auto-Generated Transcript</h2>
  <p>Transcript automatically generated for ticket #${ticketNumber}</p>

  <p>🎫 Ticket #${ticketNumber} • Created by ${user.tag} • ${messages.length} messages</p>
  <p>⏱️ Duration: ${duration} minutes • Status: Closed (Auto-transcript)</p>
  <p>🏷️ Subject: 🎟️ ACTIVATION</p>
  <p>📅 Generated ${new Date().toLocaleString()}</p>
  </div>

  <hr/>

  ${messageHTML}

  </body>
  </html>
  `;

  const fileName = `ticket-${ticketNumber}-transcript.html`;
  fs.writeFileSync(fileName, html);

  return fileName;
}

// ================= INTERACTIONS =================

client.on("interactionCreate", async (interaction) => {

  const categories = getCategories();

  // ===== SLASH COMMAND =====
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "panel") {
      const mode = interaction.options.getString("mode");
      const system = load(systemFile);

      if (mode === "enable") {
        system.enabled = true;
        save(systemFile, system);
        return interaction.reply({ content: "✅ Panel system enabled", ephemeral: true });
      }

      if (mode === "disable") {
        system.enabled = false;
        save(systemFile, system);
        return interaction.reply({ content: "❌ Panel system disabled", ephemeral: true });
      }

      if (mode === "send") {
        const embed = buildPanelEmbed(categories);

        const menu = new StringSelectMenuBuilder()
          .setCustomId("category_select")
          .setPlaceholder("Select Vault Category")
          .addOptions(categories.map(c => ({ label: c.label, value: c.value })));

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.channel.send({ embeds: [embed], components: [row] });

        return interaction.reply({ content: "✅ Panel sent", ephemeral: true });
      }
    }
  }

  if (!isEnabled()) return;

  // ===== CATEGORY SELECT =====
  if (interaction.isStringSelectMenu()) {

    const cat = categories.find(c => c.value === interaction.values[0]);
    if (!cat) return;

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    const gamesText = cat.games.map(g => `🎮 ${g.name} — ${g.tokens} Tokens`).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Opened")
      .setDescription(
`Category: ${cat.label}

🎮 Available Games:
${gamesText}

━━━━━━━━━━━━━━━━━━
📌 Requirements:
• Screenshot of game folder (WUB enabled)
• Game properties screenshot required
• Clean game files (NO SteamTools)
• WAIT FOR ASSISTANCE`
      )
      .setColor(0x00ffcc);

    const closeBtn = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeBtn);

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: `Ticket opened: ${channel}`, ephemeral: true });
  }

  // ===== CLOSE BUTTON =====
  if (interaction.isButton()) {

    if (interaction.customId === "close_ticket") {

      const member = interaction.member;

      const file = await generateTranscript(interaction.channel, interaction.user);

      await interaction.reply({
        content: "🔒 Ticket closing... Transcript generated.",
        ephemeral: true,
      });

      await interaction.user.send({
        content: "📄 Your ticket transcript:",
        files: [file],
      }).catch(() => {});

      await member.roles.add(COOLDOWN_ROLE_ID).catch(() => {});

      setTimeout(() => {
        member.roles.remove(COOLDOWN_ROLE_ID).catch(() => {});
      }, 48 * 60 * 60 * 1000);

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 3000);
    }
  }
});

client.login(TOKEN);