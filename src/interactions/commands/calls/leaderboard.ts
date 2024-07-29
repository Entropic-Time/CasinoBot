import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString, GuildMember } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { UserSchema, UserData } from '../../../schemas/index.js';
import { InteractionUtils, CreditUtils } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';

export class LeaderboardCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['leaderboard'].name];
    public cooldown = new RateLimiter(1, 30000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private readonly SERVER = 'server';

    private userSchema = new UserSchema();

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const { mode, limit } = this.getCommandOptions(intr);
            const usersData = await this.getUsersData(mode, limit, intr);
            const embed = this.createLeaderboardEmbed(usersData);
            await InteractionUtils.send(intr, embed);
        } catch (error) {
            await this.handleError(intr, error);
        }
    }

    private getCommandOptions(intr: ChatInputCommandInteraction): { mode: string | null, limit: number } {
        const mode = intr.options.getString(ChatCommandMetadataArgsRaw['leaderboard'].getOptionNameByKey('mode'));
        const limit = intr.options.getInteger(ChatCommandMetadataArgsRaw['leaderboard'].getOptionNameByKey('limit')) || 10;
        return { mode, limit };
    }

    private async getUsersData(mode: string | null, limit: number, intr: ChatInputCommandInteraction): Promise<UserData[]> {
        let usersData: UserData[];

        if (mode === this.SERVER) {
            usersData = await this.getServerLeaderboard(intr, limit);
        } else {
            usersData = this.userSchema.getLeaderBoardByAll(limit);
        }

        return usersData;
    }

    private async getServerLeaderboard(intr: ChatInputCommandInteraction, limit: number): Promise<UserData[]> {
        const allUsersData = this.userSchema.getLeaderBoardByAll();
        const guildMembers = await intr.guild.members.fetch();
        const memberIds = new Set(guildMembers.map((member: GuildMember) => member.id));
        return allUsersData.filter(user => memberIds.has(user.id)).slice(0, limit);
    }

    private createLeaderboardEmbed(usersData: UserData[]): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Leaderboard')
            .setDescription('Top players by total wealth (balance + bank)');

        usersData.forEach((userData, index) => {
            const value = CreditUtils.formatCredit(userData.balance + userData.bank);
            embed.addFields({ name: `${index + 1}. ${userData.userName}`, value: value, inline: false });
        });

        return embed;
    }

    private async handleError(intr: ChatInputCommandInteraction, error: any): Promise<void> {
        console.error('Error in LeaderboardCommand:', error);
        await InteractionUtils.send(intr, 'An error occurred while fetching the leaderboard.');
    }
}
