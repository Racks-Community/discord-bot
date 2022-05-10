const { secretToken, logChannel, serverId, forbiddenNicks, tooMuchConnections, minutesForArrayClean, captchas, captchaEmbed, maxAttemps } = require('../config/config.json');
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_WEBHOOKS, Intents.FLAGS.DIRECT_MESSAGES], partials: ["CHANNEL"] });

function log(message) {
    client.guilds.cache.get(serverId).channels.cache.get(logChannel).send(message);
}

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
  }

let captchaUsers = {}

function sendCaptcha(memberGuild, time) {
    let captcha = captchas[getRndInteger(0, captchas.length)]
    let embed = captchaEmbed;
    embed.image.url = captcha.image;

    captchaUsers[memberGuild.id] = { code: captcha.code, attemps: 0 };

    memberGuild.createDM().then(channel => {
        channel.send({ embeds: [embed] });
        setTimeout(async () => {
            if (memberGuild.id in captchaUsers) {
                const channel = await memberGuild.createDM()
                await sendKickMessage("No has superado el captcha a tiempo, entra e intentalo de nuevo.", channel);

                delete captchaUsers[memberGuild.id];

                memberGuild.kick("No has superado el captcha");
                log(`${memberGuild.user.username} expulsado por no completar el captcha a tiempo`)
            }
        }, time * 60000)
    })
}

async function sendKickMessage(message, channel) {
    await channel.send({ embeds: [{
        "title": "Expulsión",
        "color": 16731473,
        "description": message,
        "timestamp": "",
        "author": {
            "name": "Mr. Crypto",
            "url": "https://metaverse.racksmafia.com/"
        },
        "footer": {
            "text": "Nunca te vamos a solicitar tu frase semilla o vinculaciones de cartera através de DM sin que lo solicites, siempre comprueba que el bot sea el mismo que esta presente en el servidor Oficial, incluido el #1234"
        },
        "fields": []
    }] });
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('userUpdate', (oldUser, newUser) => {
    console.log(newUser.username);
    if (newUser.username != oldUser.username) {
        forbiddenNicks.forEach(async nick => {
            if (newUser.username.toLowerCase().includes(nick.toLowerCase())) {

                const guild = await client.guilds.fetch(serverId);
                const member = await guild.members.fetch("973541612116389898");
                const channel = await member.createDM()
                await sendKickMessage("Tu nombre no está permitido en el servidor.", channel)

                member.kick()

                log(`${newUser.username} ha sido kickeado`)
            }
        });
    }
})

let joinedUsers = []

client.on('guildMemberAdd', (guildMember) => {
    let kicked = false;
    forbiddenNicks.forEach(async nick => {
        if (guildMember.user.username.toLowerCase().includes(nick.toLowerCase())) {

            const channel = await guildMember.createDM()
            await sendKickMessage("Tu nombre no está permitido en el servidor.", channel)

            guildMember.kick("Tu nombre no esta permitido");
            log(`${guildMember.user.username} ha sido kickeado`);

            kicked = true;
        }
    })
    if (!kicked) {
        joinedUsers.push(guildMember);
        if (joinedUsers.length >= tooMuchConnections) {
            joinedUsers.forEach(user => {
                sendCaptcha(user, 1);
            })
        }
    }
});

client.on('messageCreate', message => {
    if (message.guildId == null) {
        const authorId = message.author.id;
        if (authorId in captchaUsers) {
            if (message.content == captchaUsers[authorId].code) {

                delete captchaUsers[authorId];

                try {
                    message.react("✅")
                    message.reply("Correcto!, Gracias por tu comprensión");
                } catch(e) {};

                log(`Captcha **superado** de ${message.author.username}`);
            } else {
                if (captchaUsers[authorId].attemps >= maxAttemps) {

                    try {
                        message.reply("Intentos máximos superados");
                    } catch(e) {};

                    delete captchaUsers[authorId];

                    client.guilds.cache.get(serverId).members.fetch(authorId).then(member => member.kick());
                    log(`Captcha **incorrecto** de ${message.author.username}, intentos superados`);
                } else {
                    try {
                        message.reply("El código es incorrecto, intentalo de nuevo");
                    } catch(e) {};
                    log(`Captcha **incorrecto** de ${message.author.username}, intento ${captchaUsers[authorId].attemps}`);
                    captchaUsers[authorId].attemps += 1;
                }
            }
        }
    }
})

setInterval(() => {
    joinedUsers = []
}, minutesForArrayClean * 60000)

client.login(secretToken)