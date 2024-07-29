import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString, User } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { UserSchema, UserData } from '../../../schemas/index.js';
import { InteractionUtils, CreditUtils } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';

export class SearchCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['search'].name];
    public cooldown = new RateLimiter(1, 300000); // 5 minutes cooldown
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private userSchema = new UserSchema();

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const userData = this.getUserData(intr.user);
            const searchAmount = this.performSearch(userData);
            const embed = this.createSearchEmbed(intr.user.toString(), searchAmount, userData);
            await InteractionUtils.send(intr, embed);
        } catch (error) {
            await this.handleError(intr, error);
        }
    }

    private getUserData(user: User): UserData {
        return this.userSchema.getOrCreateUserData(user.id, user.username);
    }

    private performSearch(userData: UserData): number {
        const baseAmount = 100;
        const levelMultiplier = 1 + (userData.level * 0.1);
        const luckFactor = userData.luck;

        let searchAmount = Math.floor(baseAmount * levelMultiplier * luckFactor);

        searchAmount = Math.max(10, Math.min(searchAmount, 1000 * userData.level));

        userData.balance += searchAmount;
        this.userSchema.setUserData(userData);

        return searchAmount;
    }

    private createSearchEmbed(userMention: string, searchAmount: number, userData: UserData): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setDescription(`${userMention} searched and found some credits!`)
            .addFields(
                { name: "Amount Found", value: CreditUtils.formatCredit(searchAmount) },
                { name: "Balance", value: CreditUtils.formatCredit(userData.balance) },
                { name: "Level", value: userData.level.toString() }
            );

        this.addFooter(embed, searchAmount);

        return embed;
    }

    private addFooter(embed: EmbedBuilder, searchAmount: number): void {
        if (searchAmount < 50) {
            embed.setFooter({ text: "Better luck next time!" });
        } else if (searchAmount < 200) {
            embed.setFooter({ text: "Not bad! Keep searching!" });
        } else {
            embed.setFooter({ text: "Nice!" });
        }
    }

    private async handleError(intr: ChatInputCommandInteraction, error: any): Promise<void> {
        console.error('Error in SearchCommand:', error);
        await InteractionUtils.send(intr, 'An error occurred while performing the search.');
    }
}
