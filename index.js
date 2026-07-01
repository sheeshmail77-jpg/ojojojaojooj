// bot/index.js — discord.js v14 whitelist management bot
const {
  Client, GatewayIntentBits, SlashCommandBuilder,
  REST, Routes, EmbedBuilder, PermissionFlagsBits,
} = require("discord.js");
const path  = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// ── Inline API helper (talks to the backend) ──────────────
const BASE = process.env.BASE_URL || "http://localhost:3000";

// We need an owner JWT for protected routes — store it and refresh when needed
let _ownerToken = null;
async function getToken() {
  if (_ownerToken) return _ownerToken;
  const res = await fetch(`${BASE}/api/owner/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.OWNER_USERNAME,
      password: process.env.OWNER_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error("Bot login failed — check OWNER_USERNAME / OWNER_PASSWORD in .env");
  const d = await res.json();
  _ownerToken = d.token;
  // Clear after 11 hours so it auto-refreshes before expiry
  setTimeout(() => { _ownerToken = null; }, 11 * 60 * 60 * 1000);
  return _ownerToken;
}

async function api(method, endpoint, body) {
  const token = await getToken();
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data;
}

// ── Command definitions ───────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName("whitelist-add")
    .setDescription("Add a user to the whitelist and generate their key")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("user").setDescription("Discord user").setRequired(true))
    .addStringOption(o => o.setName("role").setDescription("Role level").addChoices(
      { name:"user",  value:"user"  },
      { name:"vip",   value:"vip"   },
      { name:"admin", value:"admin" },
    )),

  new SlashCommandBuilder()
    .setName("whitelist-remove")
    .setDescription("Remove a user from the whitelist")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("user").setDescription("Discord user").setRequired(true)),

  new SlashCommandBuilder()
    .setName("whitelist-toggle")
    .setDescription("Enable or disable a user's whitelist access")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("user").setDescription("Discord user").setRequired(true))
    .addBooleanOption(o => o.setName("enabled").setDescription("true = enable, false = disable").setRequired(true)),

  new SlashCommandBuilder()
    .setName("whitelist-list")
    .setDescription("Show all whitelisted users")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("reset-hwid")
    .setDescription("Reset a user's HWID lock")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("user").setDescription("Discord user").setRequired(true)),

  new SlashCommandBuilder()
    .setName("mykey")
    .setDescription("Get your own auth key (DM'd privately)"),

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("DM the user the panel loadstring to execute in-game")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("user").setDescription("User to send panel to").setRequired(true)),
];

// ── Register slash commands ───────────────────────────────
async function registerCommands() {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  try {
    console.log("[Bot] Registering slash commands…");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID || "YOUR_CLIENT_ID",
        process.env.DISCORD_GUILD_ID,
      ),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log("[Bot] Commands registered ✓");
  } catch (e) {
    console.error("[Bot] Command registration failed:", e.message);
  }
}

// ── Client ────────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  registerCommands();
});

// ── Helper: success/error embeds ──────────────────────────
const ok  = (title, desc) => new EmbedBuilder().setColor(0x10b981).setTitle(`✅ ${title}`).setDescription(desc).setTimestamp();
const err = (title, desc) => new EmbedBuilder().setColor(0xef4444).setTitle(`❌ ${title}`).setDescription(desc).setTimestamp();
const inf = (title, desc) => new EmbedBuilder().setColor(0x7c3aed).setTitle(`🔐 ${title}`).setDescription(desc).setTimestamp();

// ── Interaction handler ───────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply({ ephemeral: true });

  const { commandName } = interaction;

  try {
    // ──────────────────────────────────────────────────────
    if (commandName === "whitelist-add") {
      const target = interaction.options.getUser("user");
      const role   = interaction.options.getString("role") || "user";
      const data   = await api("POST", "/api/whitelist/add", {
        discord_id: target.id,
        username:   target.username,
        role,
      });
      const embed = ok("User Added", `**${target.username}** has been whitelisted.`)
        .addFields(
          { name:"Key",  value:`\`${data.user.key}\``, inline:false },
          { name:"Role", value:role, inline:true },
        );
      // Assign Discord role if configured
      if (process.env.DISCORD_MEMBER_ROLE_ID) {
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (member) await member.roles.add(process.env.DISCORD_MEMBER_ROLE_ID).catch(() => {});
      }
      // DM the user their key
      await target.send({
        embeds: [inf("Your Auth Key", [
          `You've been whitelisted on **${interaction.guild.name}**!`,
          ``,
          `**Your Key:**`,
          `\`\`\`${data.user.key}\`\`\``,
          `Keep this private — it's linked to your device on first use.`,
        ].join("\n"))],
      }).catch(() => {});

      await interaction.editReply({ embeds:[embed] });
    }

    // ──────────────────────────────────────────────────────
    else if (commandName === "whitelist-remove") {
      const target = interaction.options.getUser("user");
      await api("DELETE", "/api/whitelist/delete", { discord_id: target.id });
      if (process.env.DISCORD_MEMBER_ROLE_ID) {
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (member) await member.roles.remove(process.env.DISCORD_MEMBER_ROLE_ID).catch(() => {});
      }
      await interaction.editReply({ embeds:[ok("User Removed", `**${target.username}** has been removed.`)] });
    }

    // ──────────────────────────────────────────────────────
    else if (commandName === "whitelist-toggle") {
      const target  = interaction.options.getUser("user");
      const enabled = interaction.options.getBoolean("enabled");
      await api("PATCH", "/api/whitelist/toggle", { discord_id: target.id, whitelisted: enabled });
      await interaction.editReply({ embeds:[ok("Updated", `**${target.username}** is now **${enabled?"enabled":"disabled"}**.`)] });
    }

    // ──────────────────────────────────────────────────────
    else if (commandName === "whitelist-list") {
      const users = await api("GET", "/api/whitelist");
      const active = users.filter(u => u.whitelisted);
      const lines  = active.slice(0,20).map((u,i) =>
        `\`${i+1}.\` **${u.username}** — \`${u.key.slice(0,14)}…\` ${u.hwid?"🔒":"🔓"}`
      ).join("\n") || "_No users yet_";
      await interaction.editReply({ embeds:[
        inf(`Whitelist (${active.length} active)`, lines)
          .setFooter({ text: users.length > 20 ? `Showing 20 of ${active.length}` : "" })
      ]});
    }

    // ──────────────────────────────────────────────────────
    else if (commandName === "reset-hwid") {
      const target = interaction.options.getUser("user");
      await api("POST", "/api/hwid/reset-owner", { discord_id: target.id });
      await target.send({ embeds:[inf("HWID Reset", "Your HWID has been reset. The next game launch will bind your new device.")] }).catch(()=>{});
      await interaction.editReply({ embeds:[ok("HWID Reset", `Reset HWID for **${target.username}**.`)] });
    }

    // ──────────────────────────────────────────────────────
    else if (commandName === "mykey") {
      // Fetch the user's own key
      const users = await api("GET", "/api/whitelist");
      const me    = users.find(u => u.discord_id === interaction.user.id);
      if (!me || !me.whitelisted) {
        return interaction.editReply({ embeds:[err("Not Whitelisted", "You are not on the whitelist.")] });
      }
      await interaction.user.send({ embeds:[inf("Your Auth Key", [
        `**Key:** \`${me.key}\``,
        `**HWID Status:** ${me.hwid ? "🔒 Bound" : "🔓 Not bound yet"}`,
        ``,
        `Use this key in the in-game panel. Keep it private!`,
      ].join("\n"))] }).catch(()=>{});
      await interaction.editReply({ embeds:[ok("Key Sent", "Your key has been DM'd to you.")] });
    }

    // ──────────────────────────────────────────────────────
    else if (commandName === "setup") {
      const target = interaction.options.getUser("user");
      const loadstring = [
        "```lua",
        `-- AuthSystem Panel Loader`,
        `-- Run this in your executor`,
        `loadstring(game:HttpGet("${BASE}/panel.lua"))()`,
        "```",
      ].join("\n");
      await target.send({ embeds:[inf("Panel Loader", [
        "Here is your panel loader. Run it in your executor:",
        loadstring,
        `> Have your key ready when the panel opens.`,
      ].join("\n\n"))] }).catch(() => {});
      await interaction.editReply({ embeds:[ok("Sent", `Panel loader DM'd to **${target.username}**.`)] });
    }

  } catch (e) {
    console.error(`[Bot] ${commandName} error:`, e.message);
    await interaction.editReply({ embeds:[err("Error", e.message)] }).catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
