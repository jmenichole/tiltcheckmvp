import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.warn('DISCORD_BOT_TOKEN not set — bot will not start.');
  process.exit(0);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('vault')
    .setDescription('Vault commands')
    .addSubcommand((sub) => sub.setName('status').setDescription('Show vault status placeholder')),
].map((c) => c.toJSON());

async function registerCommands() {
  const appId = client.application?.id;
  if (!appId) return;
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationCommands(appId), { body: commands });
}

client.once('ready', async () => {
  console.log(`Discord bot logged in as ${client.user?.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'vault' && interaction.options.getSubcommand() === 'status') {
    await interaction.reply({
      content: 'Vault status: stub (connect web dashboard for rules).',
      ephemeral: true,
    });
  }
});

client.login(token);
