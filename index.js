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

const categories = [
  {
    label: "🎮 A-F",
    value: "af",
    games: [
      { name: "Hogwarts Legacy", tokens: 5 },
      { name: "Hinokami Chronicles 2", tokens: 5 },
    ],
  },
  {
    label: "🎮 F-M",
    value: "fm",
    games: [{ name: "Far Cry Primal", tokens: 10 }],
  },
  {
    label: "🎮 M-S",
    value: "ms",
    games: [{ name: "Resident Evil Requiem", tokens: 20 }],
  },
  {
    label: "🎮 S-Y",
    value: "sy",
    games: [{ name: "Black Myth Wukong", tokens: 20 }],
  },
];

// ================= FILE HELPERS =================

function load(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ================= PANEL STATE =================

function isEnabled() {
  const data = load(systemFile);
  return data.enabled !== false; // default ON
}

// ================= SLASH COMMANDS =================

const commands = [
  {
    name: "panel",
    description: "Enable or disable ticket panel",
    options: [
      {
        name: "mode",
        type: 3,
        description: "enable or disable",
        required: true,
        choices: [
          { name: "enable", value: "enable" },
          { name: "disable", value: "disable" },
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

// ================= INTERACTIONS =================

client.on("interactionCreate", async (interaction) => {

  // ================= PANEL CONTROL =================
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "panel") {
      const mode = interaction.options.getString("mode");

      const system = load(systemFile);

      if (mode === "enable") {
        system.enabled = true;
        save(systemFile, system);

        const embed = new EmbedBuilder()
          .setTitle("✅ Panel Enabled")
          .setDescription("Ticket system is now ACTIVE.")
          .setColor(0x00ffcc);

        await interaction.reply({ embeds: [embed] });

        setTimeout(() => {
          interaction.deleteReply().catch(() => {});
        }, 5000);

        return;
      }

      if (mode === "disable") {
        system.enabled = false;
        save(systemFile, system);

        const embed = new EmbedBuilder()
          .setTitle("❌ Panel Disabled")
          .setDescription("Ticket system is now OFF.")
          .setColor(0xff0000);

        await interaction.reply({ embeds: [embed] });

        setTimeout(() => {
          interaction.deleteReply().catch(() => {});
        }, 5000);

        return;
      }
    }
  }

  // BLOCK IF DISABLED
  if (!isEnabled()) return;

  // ================= CATEGORY SELECT =================

  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "category_select") {

      const cat = categories.find(c => c.value === interaction.values[0]);

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
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
            ],
          },
        ],
      });

      const gamesText = cat.games
        .map(g => `🎮 ${g.name} — ${g.tokens} Tokens`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket Opened")
        .setDescription(
`Category: ${cat.label}

🎮 Games:
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

      return interaction.reply({
        content: `Ticket opened: ${channel}`,
        ephemeral: true,
      });
    }
  }

  // ================= CLOSE BUTTON =================

  if (interaction.isButton()) {

    if (interaction.customId === "close_ticket") {

      const cooldowns = load(cooldownFile);

      cooldowns[interaction.user.id] = Date.now();
      save(cooldownFile, cooldowns);

      const member = interaction.member;
      await member.roles.add(COOLDOWN_ROLE_ID);

      setTimeout(() => {
        member.roles.remove(COOLDOWN_ROLE_ID);
      }, 48 * 60 * 60 * 1000);

      await interaction.reply("🔒 Ticket closed.");

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 3000);
    }
  }
});

client.login(TOKEN);