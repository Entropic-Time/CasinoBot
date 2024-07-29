import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString, User } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { EventData } from '../../../models/internal-models.js';
import { InteractionUtils, TimeUtils } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Config = require('../../../../config/config.json');
const Package = require('../../../../package.json');

export class InfoCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['info'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private startTime: Date;

    constructor() {
        this.startTime = new Date();
    }

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const embed = await this.createInfoEmbed(intr, data);
            await InteractionUtils.send(intr, { embeds: [embed] });
        } catch (error) {
            console.error('Error in InfoCommand:', error);
            await InteractionUtils.send(intr, 'An error occurred while fetching bot information.');
        }
    }

    private async createInfoEmbed(intr: ChatInputCommandInteraction, data: EventData): Promise<EmbedBuilder> {
        const client = intr.client;
        const owner = (await client.application?.fetch())?.owner;
        const ownerTag = owner ? (owner instanceof User ? owner.tag : owner.name) : Package.author;
        const isOwner:boolean = Config.developers.includes(intr.user.id);

        const [guildCounts, memberCounts] = await Promise.all([
            client.shard.fetchClientValues('guilds.cache.size'),
            client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
        ]);

        const totalGuilds = guildCounts.reduce((acc: number, count: number) => acc + count, 0);
        const totalMembers = memberCounts.reduce((acc: number, count: number) => acc + count, 0);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Casino Bot Information')
            .addFields(
                { name: '**Bot**', value: 'Casino Bot', inline: false },
                { name: 'Version', value: Package.version, inline: true },
                { name: 'Owner', value: ownerTag, inline: true },
                { name: 'Servers', value: totalGuilds.toString(), inline: true },
                { name: 'Uptime', value: TimeUtils.differenceInTime(this.startTime, new Date()), inline: true },
                { name: 'Invite Link', value: `[Click for the invite](${Config.botInvite})`, inline: false },
                { name: 'Support Server', value: `[Click for invite to support server](${Config.supportServerInvite})`, inline: false },
                { name: 'Final Note', value: 'Bot is going through a massive rework so please be patient.', inline: false }
            )
            .setFooter({ text: 'Enjoy!' });
            
            const currentLength = embed.data.fields.length;

            if (intr.guild) {
                embed.spliceFields(0, 0,
                    { name: '**Server**', value: intr.guild?.name ?? 'N/A', inline: false },
                    { name: 'Server Members', value: intr.guild.memberCount.toString(), inline: true },
                    { name: "Server's Prefix", value: 'N/A', inline: true }
                );
                }

            if (isOwner) {
                embed.spliceFields(embed.data.fields.length > currentLength ? 7 : 4, 0, { name: 'Total Members', value: totalMembers.toString(), inline: true });
            }

            return embed;
    }
}
