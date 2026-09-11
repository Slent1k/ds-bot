require("dotenv").config();
const http = require("http");

// Простой веб-сервер, чтобы Render видел открытый порт и не выдавал ошибку
http.createServer((req, res) => {
    res.write("Bot is running!");
    res.end();
}).listen(process.env.PORT || 3000, () => {
    console.log("🌐 Веб-сервер запущен для Render");
});

const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ===== НАСТРОЙКИ =====
const unverifiedRole = "1533152280113582304"; // Не зарегистрирован
const fishermanRole = "1533152064257921235";  // Рыбачок
const registerChannel = "1532669609059291166"; // Канал регистрации
// =====================

client.once("ready", async () => {
    console.log(`✅ Бот запущен: ${client.user.tag}`);

    try {
        const channel = await client.channels.fetch(registerChannel);

        if (!channel) {
            console.log("❌ Канал регистрации не найден");
            return;
        }

        // Удаляем старые сообщения бота в канале, чтобы кнопка всегда была актуальной
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessages = messages.filter(msg => msg.author.id === client.user.id);
        
        for (const msg of botMessages.values()) {
            await msg.delete().catch(() => {});
        }

        // Отправляем новую кнопку
        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("register")
                .setLabel("🎣 Регистрация")
                .setStyle(ButtonStyle.Primary)
        );

        await channel.send({
            content: "Для получения доступа к серверу нажмите кнопку ниже:",
            components: [button]
        });

        console.log("✅ Новая кнопка успешно отправлена");

    } catch (err) {
        console.log("❌ Ошибка отправки кнопки:", err.message);
    }
});

// Выдача начальной роли при входе на сервер
client.on("guildMemberAdd", async member => {
    try {
        const role = member.guild.roles.cache.get(unverifiedRole);
        if (role) await member.roles.add(role);
    } catch (err) {
        console.log("❌ Ошибка выдачи начальной роли:", err.message);
    }
});

// Обработка взаимодействия с кнопкой и формой
client.on("interactionCreate", async interaction => {
    // Открытие модального окна
    if (interaction.isButton() && interaction.customId === "register") {
        try {
            const modal = new ModalBuilder()
                .setCustomId("registerForm")
                .setTitle("Регистрация");

            const nameInput = new TextInputBuilder()
                .setCustomId("name")
                .setLabel("Ваше имя")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const nickInput = new TextInputBuilder()
                .setCustomId("gameNick")
                .setLabel("Ник в Русской Рыбалке 4")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(nickInput)
            );

            await interaction.showModal(modal);
        } catch (err) {
            console.log("⚠️ Ошибка открытия модалки (задержка Discord):", err.message);
        }
    }

    // Обработка отправки формы
    if (interaction.isModalSubmit() && interaction.customId === "registerForm") {
        const username = interaction.fields.getTextInputValue("name");
        const gameNick = interaction.fields.getTextInputValue("gameNick");

        try {
            const role = interaction.guild.roles.cache.get(fishermanRole);

            if (!role) {
                return await interaction.reply({
                    content: "❌ Роль 'Рыбачок' не найдена",
                    ephemeral: true
                }).catch(() => {});
            }

            // Изменение никнейма (если это не владелец)
            if (interaction.member.id !== interaction.guild.ownerId) {
                try {
                    await interaction.member.setNickname(`${username} | ${gameNick}`);
                } catch (err) {
                    console.log("⚠️ Ник не изменен:", err.message);
                }
            }

            // Изменение ролей
            try {
                await interaction.member.roles.remove(unverifiedRole);
            } catch (err) {
                console.log("⚠️ Старая роль не снята:", err.message);
            }

            await interaction.member.roles.add(role);

            await interaction.reply({
                content: "✅ Регистрация успешно завершена!",
                ephemeral: true
            }).catch(() => {});

        } catch (err) {
            console.log("❌ Ошибка регистрации:", err.message);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ Ошибка: ${err.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
});

client.login(process.env.TOKEN);