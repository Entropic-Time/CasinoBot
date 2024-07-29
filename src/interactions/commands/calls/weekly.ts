import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString, User } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { UserSchema, UserData } from '../../../schemas/index.js';
import { InteractionUtils, CreditUtils } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Static = require('../../../../config/static.json');

export class WeeklyCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['weekly'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private static readonly WEEKLY_REWARD = Static.weekly;
    private static readonly REQUIRED_DAILIES = 7;
    private userSchema = new UserSchema();

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const userData = this.getUserData(intr.user);
            const embed = this.createEmbed(intr.user.toString(), userData);
            await InteractionUtils.send(intr, embed);
        } catch (error) {
            await this.handleError(intr, error);
        }
    }

    private getUserData(user: User): UserData {
        return this.userSchema.getOrCreateUserData(user.id, user.username);
    }

    private createEmbed(userMention: string, userData: UserData): EmbedBuilder {
        const embed = new EmbedBuilder().setDescription(`Account Holder: ${userMention}`);

        if (this.canCollectWeekly(userData)) {
            this.collectWeeklyReward(userData);
            this.addCollectedFields(embed, userData);
        } else {
            this.addNotCollectedFields(embed, userData);
        }

        return embed;
    }

    private canCollectWeekly(userData: UserData): boolean {
        return userData.dailiesCollected >= WeeklyCommand.REQUIRED_DAILIES;
    }

    private collectWeeklyReward(userData: UserData): void {
        userData.dailiesCollected = 0;
        userData.balance += (WeeklyCommand.WEEKLY_REWARD * userData.level);
        this.userSchema.setUserData(userData);
    }

    private addCollectedFields(embed: EmbedBuilder, userData: UserData): void {
        embed.addFields([
            {
                name: "Weekly Collected",
                value: `You have collected your weekly reward!`,
            },
            {
                name: "Balance",
                value: CreditUtils.formatCredit(userData.balance),
            }
        ]);
    }

    private addNotCollectedFields(embed: EmbedBuilder, userData: UserData): void {
        embed.addFields([
            {
                name: "Weekly Condition Not Satisfied",
                value: `Need ${WeeklyCommand.REQUIRED_DAILIES - userData.dailiesCollected} more daily redemptions`,
            }
        ]);
    }

    private async handleError(intr: ChatInputCommandInteraction, error: any): Promise<void> {
        console.error('Error in WeeklyCommand:', error);
        await InteractionUtils.send(intr, 'An error occurred while processing your weekly reward.');
    }
}
