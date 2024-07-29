import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString, User } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { UserSchema, UserData } from '../../../schemas/index.js';
import { InteractionUtils, CreditUtils, TimeUtils } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Static = require('../../../../config/static.json');

export class DailyCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['daily'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private userSchema = new UserSchema();
    private static DAILY_REWARD = Static.daily;
    private static DAILY_COOLDOWN = 24 * 60 * 60 * 1000;

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const userData = this.getUserData(intr.user);
            const canCollect = this.canCollectDaily(userData);
            const embed = this.createEmbed(intr.user, userData, canCollect);

            await InteractionUtils.send(intr, embed);
        } catch (error) {
            console.error('Error in DailyCommand:', error);
            await InteractionUtils.send(intr, 'An error occurred while processing your daily reward.');
        }
    }

    private getUserData(user: User): UserData {
        return this.userSchema.getOrCreateUserData(user.id, user.username);
    }

    private canCollectDaily(userData: UserData): boolean {
        const lastCollectTime = new Date(userData.collectDaily).getTime();
        const currentTime = Date.now();
        return currentTime - lastCollectTime >= DailyCommand.DAILY_COOLDOWN;
    }

    private getNextDaily(userData: UserData): string {
        const lastCollectTime = new Date(userData.collectDaily).getTime();
        const nextCollectTime = lastCollectTime + DailyCommand.DAILY_COOLDOWN;
        return TimeUtils.differenceInTime(new Date(), new Date(nextCollectTime));
    }

    private createEmbed(user: User, userData: UserData, canCollect: boolean): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setDescription(`Account Holder: ${user}`)
            .setFooter({ text: "Daily rewards are available every 24 hours" });

        if (canCollect) {
            this.collectDailyReward(userData, embed);
        } else {
            this.alreadyCollected(userData, embed);
        }

        return embed;
    }

    private collectDailyReward(userData: UserData, embed: EmbedBuilder): void {
        userData.collectDaily = new Date().toISOString();
        userData.dailiesCollected += 1;
        userData.balance += (DailyCommand.DAILY_REWARD * userData.level);
        this.userSchema.setUserData(userData);

        embed.addFields([
            { name: "Daily Collected", value: `Next available in 24 hours` },
            { name: "Balance", value: CreditUtils.formatCredit(userData.balance) }
        ]);
    }

    private alreadyCollected(userData: UserData, embed: EmbedBuilder): void {
        const nextTime = this.getNextDaily(userData);
        embed.addFields([
            { name: "Already Collected Daily", value: `Next available ${nextTime}` }
        ]);
    }
}
