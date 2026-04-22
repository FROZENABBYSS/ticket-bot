const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField
} = require('discord.js');

const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ❌ REMOVED HARD-CODED TOKEN
const CATEGORY_ID = "1490727532763414561";
const STAFF_ROLE_ID = "1490945882667876402";

// ---------------- SAFE KEYS ----------------
function loadKeys() {
  try {
    return JSON.parse(fs.readFileSync('./keys.json', 'utf8'));
  } catch {
    return {
      "A-F": [],
      "G-L": [],
      "M-R": [],
      "S-Z": []
    };
  }
}

function saveKeys(data) {
  fs.writeFileSync('./keys.json', JSON.stringify(data, null, 2));
}

// ---------------- STATUS SYSTEM ----------------
function getStatus(count) {
  if (count === 0) return "🔴 Empty";
  if (count <= 10) return "🟡 Low (≤10)";
  if (count <= 25) return "🟢 Plenty";
  return "🔥 High Demand";
}

// ---------------- BOT ----------------
client.on("interactionCreate", async (interaction) => {

  // ================= VAULT COMMAND =================
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "vault") {

      await interaction.deferReply();

      const data = loadKeys();

      const a = data["A-F"]?.length || 0;
      const g = data["G-L"]?.length || 0;
      const m = data["M-R"]?.length || 0;
      const s = data["S-Z"]?.length || 0;

      const total = a + g + m + s;

      const embed = new EmbedBuilder()
        .setTitle("✨ Steam Activation Vault")
        .setDescription(`
🎟️ Total Tokens In Vault  
\`${total} Available\`

🎮 Games Listed  
A-F: ${a} | G-L: ${g} | M-R: ${m} | S-Z: ${s}

🔥 High Demand  
A-F: ${getStatus(a)} | G-L: ${getStatus(g)} | M-R: ${getStatus(m)} | S-Z: ${getStatus(s)}

━━━━━━━━━━━━━━━━━━
🔥 High demand • 🟢 Plenty • 🟡 Low (≤10) • 🔴 Empty
• Steam Token Vault • Tokens Regenerate As Stock Is Replenished
        `)
        .setColor("#5865F2");

      const makeMenu = (id, label, count) =>
        new StringSelectMenuBuilder()
          .setCustomId(id)
          .setPlaceholder(`${label} (${count})`)
          .addOptions([{ label: `${label} Vault`, value: id }]);

      const rows = [
        new ActionRowBuilder().addComponents(makeMenu("A-F", "A - F", a)),
        new ActionRowBuilder().addComponents(makeMenu("G-L", "G - L", g)),
        new ActionRowBuilder().addComponents(makeMenu("M-R", "M - R", m)),
        new ActionRowBuilder().addComponents(makeMenu("S-Z", "S - Z", s))
      ];

      await interaction.editReply({
        embeds: [embed],
        components: rows
      });
    }
  }

  // ================= DROPDOWN =================
  if (!interaction.isStringSelectMenu()) return;

  const category = interaction.customId;
  const data = loadKeys();

  if (!data[category]) {
    return interaction.reply({
      content: "❌ Invalid category",
      ephemeral: true
    });
  }

  if (data[category].length === 0) {
    return interaction.reply({
      content: "🔴 This vault is empty!",
      ephemeral: true
    });
  }

  const key = data[category].shift();
  saveKeys(data);

  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: CATEGORY_ID,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ],
      },
      {
        id: STAFF_ROLE_ID,
        allow: [PermissionsBitField.Flags.ViewChannel]
      }
    ],
  });

  await channel.send({
    content: `🎟️ <@${interaction.user.id}>\n🔑 \`${key}\``
  });

  await channel.send({
    content: `📌 **Ticket Instructions**

✔ Must have clean game files installed  
✔ Provide screenshot of game folder  
✔ Enable WUB in game properties  
✔ Wait for staff assistance  

━━━━━━━━━━━━━━━━━━
Please do not spam or resend requests.`
  });

  await interaction.reply({
    content: `✅ Ticket created: ${channel}`,
    ephemeral: true
  });
});

// ---------------- READY ----------------
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.application.commands.set([
    {
      name: "vault",
      description: "Open Steam Activation Vault"
    }
  ]);

  console.log("System Ready!");
});

// ---------------- LOGIN ----------------
client.login(process.env.TOKEN);