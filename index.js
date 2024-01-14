const { Client, Events, GatewayIntentBits, Partials, ActivityType, InteractionType, ButtonBuilder, ButtonStyle, ComponentType, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates], partials: [Partials.Channel],shards:'auto' });
const config = require('./config.json');
const say = require('say');
const { joinVoiceChannel, createAudioResource, playAudioResource, AudioPlayerStatus, createAudioPlayer, NoSubscriberBehavior, getVoiceConnection, VoiceConnection, AudioPlayer, AudioResource,VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path')
const {getWave, getCastList}  = require('./cevioai_com.js');

process.on('unhandledRejection', console.dir);
process.on('uncaughtException', console.dir);

getCastList()

if(!fs.existsSync('./settings.json')){
    fs.writeFileSync('./settings.json',JSON.stringify({}));
    console.log('settings.jsonを作成しました。');
}

const settings = require('./settings.json');

const settingsTemplate = {
    queue : [],
    userSettings : {},
    disconnectFlag : false,
}

const userSettingsTemplate = {
    character : 'さとうささら',
    speed: 1.0,
}

const queueTemplate = {
    text : '',
    userId : '',
    messageId : '',
}

const commands = [
    {
        name: 'join',
        description: 'ボイスチャンネルに参加します。',
        options: [
            {
                name: 'channel',
                description: '参加するボイスチャンネル',
                type: ApplicationCommandOptionType.Channel,
                required: true,
            },
        ],
    },
    {
        name: 'leave',
        description: 'ボイスチャンネルから退出します。',
    },
    {
        name: 'help',
        description: 'ヘルプを表示します。',
    },
    {
        name: 'character',
        description: 'キャラクターを変更します。',
        options: [
            {
                name: 'character',
                description: '変更するキャラクター',
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    {
                        name: 'さとうささら',
                        value: 'さとうささら',
                    },
                ]
            },
        ],
    },
]


client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.application.commands.set(commands);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    await interaction.deferReply();
    if (interaction.commandName === "join") {
        if(interaction.guild.members.me.voice.channelId !== null){
            interaction.editReply('すでに接続しています。');
            return;
        }
        
        const channel = interaction.options.getChannel('channel');
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        connection.on(VoiceConnectionStatus.Ready, async () => {
            interaction.editReply('接続しました。');
            if(!settings[interaction.guildId]){
                settings[interaction.guildId] = settingsTemplate;
            }
            if(settings[interaction.guildId].disconnectFlag){
                settings[interaction.guildId].queue = [];
                settings[interaction.guildId].disconnectFlag = false;
            }
            let connected_voice = queueTemplate;
            connected_voice.text = '接続しました。';
            connected_voice.userId = client.user.id;
            connected_voice.messageId = '00000000';
            settings[interaction.guildId].queue.push(connected_voice);
            if(settings[interaction.guildId].queue.length === 1){
                const connection = getVoiceConnection(interaction.guildId);
                if(connection){
                    const player = connection.state.subscription.player;
                    const queues = settings[interaction.guildId].queue;
                    const queue = queues.shift();
                    if(!settings[interaction.guildId].userSettings[queue.userId]){
                        settings[interaction.guildId].userSettings[queue.userId] = userSettingsTemplate;
                    }
                    const character = settings[interaction.guildId].userSettings[queue.userId].character;
                    const speed = settings[interaction.guildId].userSettings[queue.userId].speed;
                    console.log(character);
                    const stream = fs.createReadStream("./default/connected.wav");
                    const resource = createAudioResource(stream);
                    player.play(resource);
                    player.once(AudioPlayerStatus.Idle, () => {
                        fs.unlink(path.join("./", queue.messageId + '.wav'), (err) => {
                            
                        });
                    })
                }
            }

        });
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            interaction.editReply('切断しました。');
        });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
        connection.subscribe(player);
        player.on(AudioPlayerStatus.Idle, async () => {
            const queues = settings[interaction.guildId].queue;
            if(queues.length > 0){
                const queue = queues.shift();
                if(!settings[interaction.guildId].userSettings[queue.userId]){
                    settings[interaction.guildId].userSettings[queue.userId] = userSettingsTemplate;
                }
                const character = settings[interaction.guildId].userSettings[queue.userId].character;
                const speed = settings[interaction.guildId].userSettings[queue.userId].speed;
                const stream = await getYomiageVoiceStream(queue.text,character,speed,queue.messageId);
                const resource = createAudioResource(stream);
                await player.play(resource);
                player.on(AudioPlayerStatus.Idle, () => {
                    fs.unlink(path.join("./", queue.messageId + '.wav'), (err) => {
                        
                    });
                })
            }
        });
        player.on('error', error => {
            console.error(error);
        });

        
    } else if (interaction.commandName === "leave") {
        const connection = getVoiceConnection(interaction.guildId);
        if(connection){
            bye = queueTemplate;    
            bye.text = 'また呼んでねぇ';
            bye.userId = client.user.id;
            bye.messageId = 'bye';
            settings[interaction.guildId].disconnectFlag = true;
            settings[interaction.guildId].queue = [];
            settings[interaction.guildId].queue.push(bye);
            if(settings[interaction.guildId].queue.length === 1){   
                const connection = getVoiceConnection(interaction.guildId);
                if(connection){
                    const player = connection.state.subscription.player;
                    const queues = settings[interaction.guildId].queue;
                    const queue = queues.shift();
                    if(!settings[interaction.guildId].userSettings[queue.userId]){
                        settings[interaction.guildId].userSettings[queue.userId] = userSettingsTemplate;
                    }
                    const character = settings[interaction.guildId].userSettings[queue.userId].character;
                    const speed = settings[interaction.guildId].userSettings[queue.userId].speed;
                    const stream = fs.createReadStream("./default/bye.wav");
                    const resource = createAudioResource(stream);
                    await player.play(resource);
                    player.once(AudioPlayerStatus.Idle, () => {
                        connection.destroy();
                    }  )
                }
            }
            interaction.editReply('切断しました。');
        }else{
            interaction.editReply('接続していません。');
        }
    } else if (interaction.commandName === "help") {
        const embed = {
            title: 'ヘルプ',
            description: 'ヘルプを表示します。',
            fields: [
                {
                    name: '/join',
                    value: 'ボイスチャンネルに参加します。',
                },
                {
                    name: '/leave',
                    value: 'ボイスチャンネルから退出します。',
                },
                {
                    name: '/character',
                    value: 'キャラクターを変更します。',
                },
            ],
        };
        interaction.editReply({ embeds: [embed] });
    } else if (interaction.commandName === "character") {
        const character = interaction.options.getString('character');
        if(!settings[interaction.guildId]){
            settings[interaction.guildId] = settingsTemplate;
        }
        if(!settings[interaction.guildId].userSettings[interaction.user.id]){
            settings[interaction.guildId].userSettings[interaction.user.id] = userSettingsTemplate;
        }
        settings[interaction.guildId].userSettings[interaction.user.id].character = character;
        interaction.editReply('キャラクターを変更しました。');
    }
        
});

async function getYomiageVoiceStream(text,character,speed,filename){
    return new Promise((resolve, reject) => {
        let voice = getWave(text, character, speed, path.join("./", filename + '.wav'))
            if(!voice){
                reject('voice is false');
            }
            const stream = fs.createReadStream(path.join("./", filename + '.wav'));
            resolve(stream);
    });
}

client.on('messageCreate', async (message) => {
    if(message.author.bot) return;
    if(settings[message.guildId] !== undefined && settings[message.guildId].disconnectFlag === false){
        let queue = settings[message.guildId].queue;
        let queueData = queueTemplate;
        queueData.text = message.content;
        queueData.userId = message.author.id;
        queueData.messageId = message.id;
        queue.push(queueData);
        settings[message.guildId].queue = queue;
        if(settings[message.guildId].queue.length === 1){
            const connection = getVoiceConnection(message.guildId);
            if(connection){
                const player = connection.state.subscription.player;
                const queues = settings[message.guildId].queue;
                const queue = queues.shift();
                if(!settings[message.guildId].userSettings[queue.userId]){
                    settings[message.guildId].userSettings[queue.userId] = userSettingsTemplate;
                }
                const character = settings[message.guildId].userSettings[queue.userId].character;
                const speed = settings[message.guildId].userSettings[queue.userId].speed;
                const stream = await getYomiageVoiceStream(queue.text,character,queue.speed,queue.messageId);
                const resource = createAudioResource(stream);
                player.play(resource);
                player.once(AudioPlayerStatus.Idle, () => {
                    fs.unlink(path.join("./", queue.messageId + '.wav'), (err) => {
                        if (err) throw err;
                    });
                })
            }
        }
    }
});

client.login('MTE3NjgyODI1NjgzMDM2OTc5Mg.GsJ0fS.c81LB5-PaiY6c2sbwoMk20j3mFuIdc91KIOW0Q');