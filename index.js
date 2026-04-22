// Discord Ticket Bot (discord.js v14)
// Features:
// - Dropdown ticket categories (A-Z vault style)
// - Token pricing system
// - Ticket creation system
// - 48h cooldown after closing ticket
// - Role reward after ticket close

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ================= CONFIG =================

const TOKEN = process.env.TOKEN;

// role given after ticket close (limited role)
const COOLDOWN_ROLE_ID = "1490210219702091986";

// cooldown tracking file
const cooldownFile = "cooldowns.json";
const keysFile = "keys.json";

// ================= DATA =================

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

// ================= HELPERS =================

function loadCooldowns() {
  if (!fs.existsSync(cooldownFile)) return {};
  return JSON.parse(fs.readFileSync(cooldownFile));
}

function saveCooldowns(data) {
  fs.writeFileSync(cooldownFile, JSON.stringify(data, null, 2));
}

function loadKeys() {
  if (!fs.existsSync(keysFile)) return {};
  return JSON.parse(fs.readFileSync(keysFile));
}

function saveKeys(data) {
  fs.writeFileSync(keysFile, JSON.stringify(data, null, 2));
}

// ================= BOT READY =================

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= TICKET PANEL =================

client.on("messageCreate", async (message) => {
  if (message.content === "/panel") {

    const embed = new EmbedBuilder()
      .setTitle("🎮 Game Vault Ticket System")
      .setDescription("Select a category to open a ticket and claim your game.")
      .setColor(0x6a0dad);

    const menu = new StringSelectMenuBuilder()
      .setCustomId("game_select")
      .setPlaceholder("Select a Vault Category")
      .addOptions(
        categories.map((c) => ({
          label: c.label,
          value: c.value,
          emoji: c.emoji,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

// ================= INTERACTIONS =================

client.on("interactionCreate", async (interaction) => {

  // dropdown
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "game_select") {

      const selected = categories.find(c => c.value === interaction.values[0]);

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
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
        ],
      });

      const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket Opened")
        .setDescription(`Category: **${selected.label}**\nChoose your game below.`)
        .setColor(0x00ffcc);

      const gameMenu = new StringSelectMenuBuilder()
        .setCustomId("game_choice")
        .setPlaceholder("Select Game")
        .addOptions(
          selected.games.map(g => ({
            label: `${g.name} - ${g.tokens} Tokens`,
            value: g.name,
          }))
        );

      const row = new ActionRowBuilder().addComponents(gameMenu);

      await channel.send({ embeds: [embed], components: [row] });

      await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }

    // game selection
    if (interaction.customId === "game_choice") {

      const gameName = interaction.values[0];
      const keys = loadKeys();

      const cooldowns = loadCooldowns();

      if (cooldowns[interaction.user.id]) {
        const diff = Date.now() - cooldowns[interaction.user.id];
        const days = 48 * 60 * 60 * 1000;

        if (diff < days) {
          return interaction.reply({ content: "⏳ You are on a 48h cooldown.", ephemeral: true });
        }
      }

      keys[interaction.user.id] = keys[interaction.user.id] || [];
      keys[interaction.user.id].push(gameName);

      saveKeys(keys);

      await interaction.reply({
        content: `✅ You claimed **${gameName}**! Staff will process it soon.`,
        ephemeral: true,
      });
    }
  }

  // close ticket system
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "close") {

      const userId = interaction.user.id;
      const cooldowns = loadCooldowns();

      cooldowns[userId] = Date.now();
      saveCooldowns(cooldowns);

      const member = interaction.member;
      await member.roles.add(COOLDOWN_ROLE_ID);

      setTimeout(() => {
        member.roles.remove(COOLDOWN_ROLE_ID);
      }, 48 * 60 * 60 * 1000);

      await interaction.reply("🔒 Ticket closed + cooldown applied (48h)");
    }
  }
});

client.login(TOKEN);
