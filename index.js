require("dotenv").config();

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

// ===== НАЛАШТУВАННЯ =====
const unverifiedRole = "1533152280113582304"; // Не зареєстрований
const fishermanRole = "1533152064257921235";  // Рибачок
const registerChannel = "1532669609059291166"; // Канал реєстрації
// =====================

client.once("ready", async () => {
    console.log(`✅ Бот запущено: ${client.user.tag}`);

    try {
        const channel = await client.channels.fetch(registerChannel);

        if (!channel) {
            console.log("❌ Канал реєстрації не знайдено");
            return;
        }

        // Перевіряємо, чи немає вже кнопки в каналі
        const messages = await channel.messages.fetch({ limit: 10 });
        const hasButton = messages.some(msg => msg.author.id === client.user.id && msg.components.length > 0);

        if (!hasButton) {
            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("register")
                    .setLabel("🎣 Реєстрація")
                    .setStyle(ButtonStyle.Primary)
            );

            await channel.send({
                content: "Для отримання доступу до сервера натисніть кнопку нижче:",
                components: [button]
            });

            console.log("✅ Кнопку успішно відправлено");
        } else {
            console.log("ℹ️ Кнопка реєстрації вже є в каналі");
        }

    } catch (err) {
        console.log("❌ Помилка відправки кнопки:", err.message);
    }
});

// Роль при вході
client.on("guildMemberAdd", async member => {
    try {
        const role = member.guild.roles.cache.get(unverifiedRole);
        if (role) await member.roles.add(role);
    } catch (err) {
        console.log("❌ Помилка видачі початкової ролі:", err.message);
    }
});

client.on("interactionCreate", async interaction => {
    // Відкриття модалки
    if (interaction.isButton() && interaction.customId === "register") {
        const modal = new ModalBuilder()
            .setCustomId("registerForm")
            .setTitle("Реєстрація");

        const nameInput = new TextInputBuilder()
            .setCustomId("name")
            .setLabel("Ваше ім'я")
            .setPlaceholder("Олександр")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const nickInput = new TextInputBuilder()
            .setCustomId("gameNick")
            .setLabel("Нік у Русской Рыбалке 4")
            .setPlaceholder("Slent1k")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(nickInput)
        );

        await interaction.showModal(modal);
    }

    // Обробка форми
    if (interaction.isModalSubmit() && interaction.customId === "registerForm") {
        const username = interaction.fields.getTextInputValue("name");
        const gameNick = interaction.fields.getTextInputValue("gameNick");

        try {
            const role = interaction.guild.roles.cache.get(fishermanRole);

            if (!role) {
                return interaction.reply({
                    content: "❌ Роль 'Рибачок' не знайдена",
                    ephemeral: true
                });
            }

            // Зміна нікнейму (якщо це не власник)
            if (interaction.member.id !== interaction.guild.ownerId) {
                try {
                    await interaction.member.setNickname(`${username} | ${gameNick}`);
                } catch (err) {
                    console.log("⚠️ Нік не змінено:", err.message);
                }
            }

            // Зміна ролей
            try {
                await interaction.member.roles.remove(unverifiedRole);
            } catch (err) {
                console.log("⚠️ Стару роль не знято:", err.message);
            }

            await interaction.member.roles.add(role);

            await interaction.reply({
                content: "✅ Реєстрацію успішно завершено!",
                ephemeral: true
            });

        } catch (err) {
            console.log("❌ Помилка реєстрації:", err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ Помилка: ${err.message}`,
                    ephemeral: true
                });
            }
        }
    }
});

client.login(process.env.TOKEN);