import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString, User } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { UserSchema, UserData } from '../../../schemas/index.js';
import { InteractionUtils, CreditUtils } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';

export class BalanceCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['balance'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private userSchema = new UserSchema();

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const { targetUser, requestUser } = this.getUsers(intr);
            const userData = this.getUserData(targetUser);
            const embed = this.createBalanceEmbed(targetUser, requestUser, userData);

            if (targetUser.id === requestUser.id) {
                await InteractionUtils.send(intr, { embeds: [embed] }, true);
            } else {
                await InteractionUtils.send(intr, embed);
            }
        } catch (error) {
            console.error('Error in BalanceCommand:', error);
            await InteractionUtils.send(intr, 'An error occurred while fetching the balance.');
        }
    }

    private getUsers(intr: ChatInputCommandInteraction): { targetUser: User, requestUser: User } {
        const targetUser = intr.options.getUser(ChatCommandMetadataArgsRaw['balance'].getOptionNameByKey('user')) ?? intr.user;
        return { targetUser, requestUser: intr.user };
    }

    private getUserData(user: User): UserData {
        return this.userSchema.getOrCreateUserData(user.id, user.username);
    }

    private createBalanceEmbed(targetUser: User, requestUser: User, userData: UserData): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Balance Information')
            .setDescription(`Account Holder: ${targetUser}`);

        if (targetUser.id === requestUser.id) {
            this.addOwnBalanceFields(embed, userData);
        } else {
            this.addOtherBalanceFields(embed, userData);
        }

        return embed;
    }

    private addOwnBalanceFields(embed: EmbedBuilder, userData: UserData): void {
        embed.addFields([
            { name: "Balance", value: CreditUtils.formatCredit(userData.balance), inline: true },
            { name: "Bank", value: CreditUtils.formatCredit(userData.bank), inline: true },
            { name: "Level", value: userData.level.toLocaleString(), inline: true }
        ]);
    }

    private addOtherBalanceFields(embed: EmbedBuilder, userData: UserData): void {
        embed.addFields([
            { name: "Balance", value: CreditUtils.formatCredit(userData.balance), inline: true },
            { name: "Level", value: userData.level.toLocaleString(), inline: true }
        ]);
    }
}
