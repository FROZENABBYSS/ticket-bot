// Discord Ticket Bot (discord.js v14)
// FIXED VERSION:
// - Proper Slash Commands (/panel, /close)
// - Auto command registration (REST)
// - Fixed interaction system
// - Stable deployment for Railway

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
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
    label: "A - L Vault",
    value: "a-l",
    emoji: "🔵",
    games: [
      { name: "Hogwarts Legacy", tokens: 5 },
      { name: "Hinokami Chronicles 2", tokens: 5 },
    ],
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
  {
    name: "panel",
    description: "Open ticket panel",
  },
  {
    name: "close",
    description: "Close ticket",
  },
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

  // /panel command
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()
        .setTitle("🎮 Game Vault Ticket System")
        .setDescription("Select a category to open a ticket.")
        .setColor(0x6a0dad);

      const menu = new StringSelectMenuBuilder()
        .setCustomId("game_select")
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

    // /close command
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

  // dropdown category
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "game_select") {

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
        .setDescription(`Category: **${selected.label}**`)
        .setColor(0x00ffcc);

      const menu = new StringSelectMenuBuilder()
        .setCustomId("game_choice")
        .setPlaceholder("Select Game")
        .addOptions(
          selected.games.map((g) => ({
            label: `${g.name} - ${g.tokens} Tokens`,
            value: g.name,
          }))
        );

      const row = new ActionRowBuilder().addComponents(menu);

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        content: `Ticket created: ${channel}`,
        ephemeral: true,
      });
    }

    // game selection
    if (interaction.customId === "game_choice") {

      const keys = load(keysFile);
      const cooldowns = load(cooldownFile);

      if (cooldowns[interaction.user.id]) {
        const diff = Date.now() - cooldowns[interaction.user.id];
        const limit = 48 * 60 * 60 * 1000;

        if (diff < limit) {
          return interaction.reply({
            content: "⏳ You are on a 48h cooldown.",
            ephemeral: true,
          });
        }
      }

      keys[interaction.user.id] = keys[interaction.user.id] || [];
      keys[interaction.user.id].push(interaction.values[0]);

      save(keysFile, keys);

      return interaction.reply({
        content: `✅ You claimed **${interaction.values[0]}**`,
        ephemeral: true,
      });
    }
  }
});

client.login(TOKEN);