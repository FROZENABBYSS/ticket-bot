// Discord Ticket Bot (discord.js v14)
// FINAL CLEAN VERSION (UPDATED)
// - Slash commands (/panel, /close)
// - NO inner game selection (simplified system)
// - Category-based ticket creation only
// - Close button added inside ticket
// - 48h cooldown system fixed
// - Railway stable startup

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

const COOLDOWN_ROLE_ID = "1490210219702091986";

const cooldownFile = "cooldowns.json";
const keysFile = "keys.json";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ================= CATEGORIES =================

const categories = [
  {
    label: "A - F Vault",
    value: "a-f",
    emoji: "🔵",
    games: [
      { name: "Hogwarts Legacy", tokens: 5 },
      { name: "Hinokami Chronicles 2", tokens: 5 },
    ],
  },
  {
    label: "G - L Vault",
    value: "g-l",
    emoji: "🟢",
    games: [],
  },
  {
    label: "M - R Vault",
    value: "m-r",
    emoji: "🟣",
    games: [
      { name: "Resident Evil Requiem", tokens: 20 },
    ],
  },
  {
    label: "S - Z Vault",
    value: "s-z",
    emoji: "🔴",
    games: [
      { name: "Black Myth Wukong", tokens: 20 },
      { name: "Far Cry Primal", tokens: 10 },
    ],
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

// ================= SLASH COMMANDS =================

const commands = [
  { name: "panel", description: "Open ticket panel" },
  { name: "close", description: "Close ticket" },
];

async function deployCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("Slash commands registered.");
}

// ================= READY =================

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await deployCommands();
});

// ================= INTERACTIONS =================

client.on("interactionCreate", async (interaction) => {

  // SLASH COMMANDS
  if (interaction.isChatInputCommand()) {

    // PANEL
    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()
        .setTitle("✨ Steam Activation Vault")
        .setDescription("Select a category to open your ticket.")
        .setColor(0x6a0dad);

      const menu = new StringSelectMenuBuilder()
        .setCustomId("category_select")
        .setPlaceholder("Select Vault Category")
        .addOptions(
          categories.map((c) => ({
            label: c.label,
            value: c.value,
            emoji: c.emoji,
          }))
        );

      const row = new ActionRowBuilder().addComponents(menu);

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // CLOSE (backup slash close)
    if (interaction.commandName === "close") {
      const cooldowns = load(cooldownFile);

      cooldowns[interaction.user.id] = Date.now();
      save(cooldownFile, cooldowns);

      const member = interaction.member;
      await member.roles.add(COOLDOWN_ROLE_ID);

      setTimeout(() => {
        member.roles.remove(COOLDOWN_ROLE_ID);
      }, 48 * 60 * 60 * 1000);

      return interaction.reply("🔒 Ticket closed + 48h cooldown applied.");
    }
  }

  // CATEGORY SELECT
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "category_select") {

      const selected = categories.find(
        (c) => c.value === interaction.values[0]
      );

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
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

      const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket Opened")
        .setDescription(
`Category: **${selected.label}**

━━━━━━━━━━━━━━━━━━
📌 Requirements:
- Screenshot of game folder with WUB enabled
- Game properties screenshot required
- Clean game files (NOT SteamTools)
- Wait for assistance`
        )
        .setColor(0x00ffcc);

      const closeBtn = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(closeBtn);

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        content: `Ticket created: ${channel}`,
        ephemeral: true,
      });
    }
  }

  // CLOSE BUTTON
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