const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } = require('discord.js');
const express = require('express');

const TOKEN = process.env.TOKEN; 
const REGISTER_CHANNEL_ID = '1532669609059291166';
const UNREGISTERED_ROLE_ID = '1533152280113582304';
const REGISTERED_ROLE_ID = '1533152064257921235'; 

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('Server is alive'));
app.listen(PORT, () => console.log('Web server started'));

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (c) => {
    console.log(`Bot started as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isButton() && interaction.customId === 'btn_register') {
            const modal = new ModalBuilder()
                .setCustomId('modal_register')
                .setTitle('Server Registration');

            const realNameInput = new TextInputBuilder()
                .setCustomId('realName')
                .setLabel('Real Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const gameNickInput = new TextInputBuilder()
                .setCustomId('gameNick')
                .setLabel('Game Nickname')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(realNameInput),
                new ActionRowBuilder().addComponents(gameNickInput)
            );

            await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'modal_register') {
            await interaction.deferReply({ ephemeral: true });

            const realName = interaction.fields.getTextInputValue('realName');
            const gameNick = interaction.fields.getTextInputValue('gameNick');
            const member = interaction.member;

            if (interaction.guild.ownerId !== member.id) {
                try {
                    await member.setNickname(`${realName} | ${gameNick}`);
                } catch (e) {}
            }

            if (REGISTERED_ROLE_ID) await member.roles.add(REGISTERED_ROLE_ID);
            if (UNREGISTERED_ROLE_ID && member.roles.cache.has(UNREGISTERED_ROLE_ID)) {
                await member.roles.remove(UNREGISTERED_ROLE_ID);
            }

            await interaction.followUp({
                content: `Registration completed! Your new nickname: ${realName} | ${gameNick}`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error(error);
    }
});

client.login(TOKEN);