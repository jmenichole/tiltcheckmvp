import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
const apiUrl = (process.env.TILTCHECK_API_URL ?? process.env.API_URL ?? '').replace(/\/$/, '');
const statusBearer = process.env.TILTCHECK_STATUS_BEARER ?? '';

if (!token) {
  console.warn('DISCORD_BOT_TOKEN not set — bot will not start.');
  process.exit(0);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('vault')
    .setDescription('Vault commands')
    .addSubcommand((sub) => sub.setName('status').setDescription('Show vault rules from TiltCheck API')),
].map((c) => c.toJSON());

async function registerCommands() {
  const appId = client.application?.id;
  if (!appId) return;
  const rest = new REST({ version: '10' }).setToken(token!);
  await rest.put(Routes.applicationCommands(appId), { body: commands });
}

async function fetchVaultStatus(): Promise<string> {
  if (!apiUrl) {
    return 'Set `TILTCHECK_API_URL` on the bot service to read vault rules from v2 API.';
  }
  if (!statusBearer) {
    return (
      'Vault status needs `TILTCHECK_STATUS_BEARER` (session JWT for a linked user). ' +
      'Otherwise use the web dashboard at /dashboard.'
    );
  }
  try {
    const res = await fetch(`${apiUrl}/vault`, {
      headers: { Authorization: `Bearer ${statusBearer}` },
    });
    if (!res.ok) {
      return `API returned ${res.status}. Re-login on web and refresh the bearer token if expired.`;
    }
    const data = (await res.json()) as { rules?: Array<{ ruleType: string; enabled: boolean; config?: unknown }> };
    const rules = data.rules ?? [];
    if (rules.length === 0) {
      return 'No vault rules configured. Add a session cap in the dashboard.';
    }
    return rules
      .map((r) => `• ${r.ruleType} — ${r.enabled ? 'on' : 'off'} ${JSON.stringify(r.config ?? {})}`)
      .join('\n');
  } catch (err) {
    return `Failed to reach API: ${err instanceof Error ? err.message : 'unknown error'}`;
  }
}

client.once('ready', async () => {
  console.log(`Discord bot logged in as ${client.user?.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'vault' && interaction.options.getSubcommand() === 'status') {
    const content = await fetchVaultStatus();
    await interaction.reply({ content, ephemeral: true });
  }
});

client.login(token);
