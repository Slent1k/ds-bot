const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } = require('discord.js');
const express = require('express');

// --- 1. Настройки (Замени значения в кавычках на свои, если они отличаются) ---
const TOKEN = process.env.TOKEN; // или ваш токен строкой, если не используете .env
const REGISTER_CHANNEL_ID = 'I1532669609059291166';
const UNREGISTERED_ROLE_ID = '1533152280113582304';
const REGISTERED_ROLE_ID = '1533152064257921235'; 

// --- 2. Веб-сервер для поддержания жизни на Render ---
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('сервер запущен для Render'));
app.listen(PORT, () => console.log(`🌐 сервер запущен на порту ${PORT}`));

// --- 3. Инициализация клиента Discord ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- 4. Событие при запуске бота ---
client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Бот запущен как ${c.user.tag}`);

    try {
        const channel = await client.channels.fetch(REGISTER_CHANNEL_ID);
        if (!channel) {
            console.log('❌ Канал регистрации не найден! Проверьте REGISTER_CHANNEL_ID');
            return;
        }

        // Проверяем последние 10 сообщений в канале
        const messages = await channel.messages.fetch({ limit: 10 });
        const existingButtonMessage = messages.find(m => m.author.id === client.user.id && m.components.length > 0);

        // Отправляем кнопку ТОЛЬКО если её ещё нет в канале
        if (!existingButtonMessage) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_register')
                    .setLabel('Регистрация')
                    .setEmoji('🎣')
                    .setStyle(ButtonStyle.Primary)
            );

            await channel.send({
                content: 'Для получения доступа к серверу нажмите кнопку ниже:',
                components: [row]
            });
            console.log('📌 Сообщение с кнопкой впервые создано в канале.');
        } else {
            console.log('Кнопка уже есть в канале. Создание пропущено.');
        }
    } catch (err) {
        console.error('❌ Ошибка при инициализации кнопки:', err);
    }
});

// --- 5. Обработка взаимодействия (Кнопка и Модалка) ---
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // --- А) Нажатие на кнопку «Регистрация» ---
        if (interaction.isButton() && interaction.customId === 'btn_register') {
            const modal = new ModalBuilder()
                .setCustomId('modal_register')
                .setTitle('Регистрация на сервере');

            const realNameInput = new TextInputBuilder()
                .setCustomId('realName')
                .setLabel('Имя в реале')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Например: Александр')
                .setRequired(true);

            const gameNickInput = new TextInputBuilder()
                .setCustomId('gameNick')
                .setLabel('Ник в рыбалке')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Например: f1ros')
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(realNameInput);
            const secondActionRow = new ActionRowBuilder().addComponents(gameNickInput);

            modal.addComponents(firstActionRow, secondActionRow);

            await interaction.showModal(modal);
        }

        // --- Б) Отправка формы (Modal Submit) ---
        if (interaction.isModalSubmit() && interaction.customId === 'modal_register') {
            // Отвечаем Discord, чтобы сообщение не вешалось в "замыслилась"
            await interaction.deferReply({ ephemeral: true });

            const realName = interaction.fields.getTextInputValue('realName');
            const gameNick = interaction.fields.getTextInputValue('gameNick');
            const member = interaction.member;

            // 1. Изменение никнейма (пропускаем овнера сервера, так как боту запрещено менять ему ник)
            if (interaction.guild.ownerId !== member.id) {
                try {
                    await member.setNickname(`${realName} | ${gameNick}`);
                } catch (nickErr) {
                    console.log(`⚠️ не удалось сменить ник пользователю ${member.user.tag}:`, nickErr.message);
                }
            }

            // 2. Выдача роли зарегистрированного
            if (REGISTERED_ROLE_ID) {
                await member.roles.add(REGISTERED_ROLE_ID);
            }

            // 3. Удаление роли незарегистрированного (если она была)
            if (UNREGISTERED_ROLE_ID && member.roles.cache.has(UNREGISTERED_ROLE_ID)) {
                await member.roles.remove(UNREGISTERED_ROLE_ID);
            }

            // 4. Личное подтверждение (КНОПКИ В КАНАЛ НЕ ОТПРАВЛЯЕМ!)
            await interaction.followUp({
                content: `✅ **Регистрация успешно завершена!**\nвaш новый ник: **${realName} | ${gameNick}**`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('❌ Ошибка при обработке взаимодействия:', error);

        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({
                content: '❌ Произошла ошибка при обработке данных. Обратитесь к администратору.',
                ephemeral: true
            }).catch(() => {});
        }
    }
});

client.login(TOKEN);