// ONLY MODIFIED PARTS ARE MARKED WITH 🔥

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

// ================= TRANSCRIPT =================

// 🔥 ADDED creator + closer
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

  let content = `📄 Auto-Generated Transcript

Ticket #${ticketNumber}
Created by: ${creator.tag}
Closed by: ${closer.tag}
Messages: ${messages.length}

━━━━━━━━━━━━━━━━━━

`;

  for (const m of messages) {
    content += `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || "(no text)"}\n`;
  }

  const fileName = `ticket-${ticketNumber}-transcript.txt`;
  fs.writeFileSync(fileName, content);

  return { fileName, ticketNumber, messages: messages.length };
}

// ================= INTERACTIONS =================

client.on("interactionCreate", async (interaction) => {

  const categories = getCategories();

  if (!isEnabled()) return;

  if (interaction.isStringSelectMenu()) {

    // 🔥 COOLDOWN CHECK
    if (interaction.member.roles.cache.has(COOLDOWN_ROLE_ID)) {
      return interaction.reply({
        content: "⏳ You are on cooldown. Try again later.",
        flags: 64,
      });
    }

    // 🔥 PREVENT MULTIPLE TICKETS
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

      // 🔥 FIX VISIBILITY
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
      .setTitle("SELF ACTIVATIONS - DENUVO ACTIVATIONS") // 🔥 TITLE FIX
      .setDescription(`👋 Welcome ${interaction.user}

Please provide the requested information within **20 minutes**, otherwise the ticket may be automatically closed.

━━━━━━━━━━━━━━━━━━

📸 **REQUIRED SCREENSHOTS**
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

  if (interaction.isButton()) {

    if (interaction.customId === "close_ticket") {

      const member = interaction.member;

      // 🔥 GET CREATOR FROM CHANNEL NAME
      const creatorId = interaction.channel.name.split("-")[1];
      const creator = await interaction.guild.members.fetch(creatorId).catch(() => interaction.user);

      const data = await generateTranscript(
        interaction.channel,
        creator.user,
        interaction.user
      );

      const transcriptChannel = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID);

      await transcriptChannel.send({
        files: [data.fileName],
      });

      // 🔥 ADD COOLDOWN ROLE TO CREATOR
      await creator.roles.add(COOLDOWN_ROLE_ID).catch(() => {});

      // 🔥 REMOVE AFTER 48H
      setTimeout(() => {
        creator.roles.remove(COOLDOWN_ROLE_ID).catch(() => {});
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