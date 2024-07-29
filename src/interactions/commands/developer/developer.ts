import djs, { ChatInputCommandInteraction, EmbedBuilder, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { EventData } from '../../../models/internal-models.js';
import { InteractionUtils, FormatUtils, ShardUtils } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';
import { createRequire } from 'node:module';
import os from 'node:os';
import typescript from 'typescript';

const require = createRequire(import.meta.url);
let Config = require('../../../../config/config.json');
let TsConfig = require('../../../../tsconfig.json');


export class DeveloperCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['developer'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!Config.developers.includes(intr.user.id)) {
            await InteractionUtils.send(intr, 'This command is only available to bot developers.');
            return;
        }

        const option = intr.options.getString(ChatCommandMetadataArgsRaw['developer'].getOptionNameByKey('option'));

        switch (option) {
            case 'configurations':
                await this.sendConfigurations(intr, data);
                break;
            default:
                await InteractionUtils.send(intr, 'Soon to add more.');
                break;
        }
    }

    private async sendConfigurations(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            let shardCount = intr.client.shard?.count ?? 1;
            let serverCount = await this.getServerCount(intr);

            let memory = process.memoryUsage();

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Developer Configurations')
                .addFields(
                    { name: 'Node Version', value: process.version, inline: true },
                    { name: 'TypeScript Version', value: `v${typescript.version}`, inline: true },
                    { name: 'ES Version', value: TsConfig.compilerOptions.target, inline: true },
                    { name: 'Discord.js Version', value: `v${djs.version}`, inline: true },
                    { name: 'Shard Count', value: shardCount.toLocaleString(), inline: true },
                    { name: 'Server Count', value: serverCount.toLocaleString(), inline: true },
                    { name: 'Servers Per Shard', value: Math.round(serverCount / shardCount).toLocaleString(), inline: true },
                    { name: 'RSS Size', value: FormatUtils.fileSize(memory.rss), inline: true },
                    { name: 'Heap Total Size', value: FormatUtils.fileSize(memory.heapTotal), inline: true },
                    { name: 'Heap Used Size', value: FormatUtils.fileSize(memory.heapUsed), inline: true },
                    { name: 'Hostname', value: os.hostname(), inline: true },
                    { name: 'Shard ID', value: (intr.guild?.shardId ?? 0).toString(), inline: true },
                    { name: 'Server ID', value: intr.guild?.id ?? 'N/A', inline: true },
                    { name: 'Bot ID', value: intr.client.user?.id ?? 'N/A', inline: true },
                    { name: 'User ID', value: intr.user.id, inline: true }
                );

            await InteractionUtils.send(intr, { embeds: [embed] });
        } catch (error) {
            console.error('Error in DeveloperCommand:', error);
            await InteractionUtils.send(intr, 'An error occurred while fetching configurations.');
        }
    }

    private async getServerCount(intr: ChatInputCommandInteraction): Promise<number> {
        if (intr.client.shard) {
            try {
                return await ShardUtils.serverCount(intr.client.shard);
            } catch (error) {
                if (error.name.includes('ShardingInProcess')) {
                    throw new Error('Bot is still starting up. Please try again later.');
                } else {
                    throw error;
                }
            }
        } else {
            return intr.client.guilds.cache.size;
        }
    }
}
