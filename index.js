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

const gameEmojis = {
  "Hogwarts Legacy": "🪄",
  "Hinokami Chronicles 2": "🔥",
  "Far Cry Primal": "🦴",
  "Resident Evil Requiem": "🧟",
  "Black Myth Wukong": "🐒",
};

// ================= CATEGORY (FIXED MISSING FUNCTION) =================

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

// ================= READY =================

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await deployCommands();
});

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

// ================= PANEL =================

function buildPanelEmbed(c) {
  const totalTokens = games.reduce((sum, g) => sum + g.tokens, 0);

  return new EmbedBuilder()
    .setTitle("✨ Steam Activation Vault")
    .setDescription(`🎯 Select A Game From The Dropdown Below To Activate.

🎟️ Total Tokens In Vault  
${totalTokens} Available  

🕹️ Games Listed  
A-F: ${c[0].games.length} | G-L: ${c[1].games.length} | M-R: ${c[2].games.length} | S-Z: ${c[3].games.length}

🔥 High Demand  
A-F: ${c[0].games.length ? "🟢 Plenty" : "🔴 Empty"} | G-L: ${c[1].games.length ? "🟢 Plenty" : "🔴 Empty"} | M-R: ${c[2].games.length ? "🟢 Plenty" : "🔴 Empty"} | S-Z: ${c[3].games.length ? "🟢 Plenty" : "🔴 Empty"}

━━━━━━━━━━━━━━━━━━
🔥 High demand • 🟢 Plenty • 🟡 Low • 🔴 Empty  
💠 Steam Token Vault • Tokens Regenerate As Stock Is Replenished`)
    .setColor(0x6a0dad);
}

// ================= INTERACTIONS (CRASH FIXED) =================

client.on("interactionCreate", async (interaction) => {
  try {

    const categories = getCategories();

    if (!isEnabled()) return;

    // ================= PANEL =================

    if (interaction.isStringSelectMenu()) {

      // FIX: prevent ticket spam
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
            ],
          },
          {
            id: ACTIVATOR_ROLE_ID,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
            ],
          },
        ],
      });

      // 🔥 YOUR ORIGINAL EMBED (UNCHANGED)
      const embed = new EmbedBuilder()
        .setTitle("SELF ACTIVATIONS - DENUVO ACTIVATION")
        .setDescription(`👋 Welcome ${interaction.user}

Please provide the requested information within **20 minutes**, otherwise the ticket may be automatically closed.

━━━━━━━━━━━━━━━━━━

📂 Category: ${cat.label}

🎮 Available Games:
${cat.games.map(g => `${gameEmojis[g.name] || "🎮"} ${g.name} — ${g.tokens}`).join("\n")}

━━━━━━━━━━━━━━━━━━

📸 REQUIRED:
• Game folder  
• Folder size  
• WUB running  

Wait for assistance.`)
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

        const member = interaction.member;

        await member.roles.add(COOLDOWN_ROLE_ID).catch(() => {});

        setTimeout(async () => {
          try {
            const fresh = await interaction.guild.members.fetch(member.id);
            await fresh.roles.remove(COOLDOWN_ROLE_ID);
          } catch {}
        }, 48 * 60 * 60 * 1000);

        await interaction.reply({
          content: "🔒 Ticket closed.",
          flags: 64,
        });

        setTimeout(() => {
          interaction.channel.delete().catch(() => {});
        }, 3000);
      }
    }

  } catch (err) {
    console.error("Interaction Error:", err);
  }
});

client.login(TOKEN);