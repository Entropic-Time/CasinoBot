import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { GlobalSettingsSchema } from '../../../schemas/index.js';
import { InteractionUtils } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';

export class InterestCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['interest'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private globalSettings: GlobalSettingsSchema;

    constructor() {
        this.globalSettings = new GlobalSettingsSchema();
    }

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const interestRate = this.getInterestRate();
            const embed = this.createInterestEmbed(interestRate);
            await InteractionUtils.send(intr, embed);
        } catch (error) {
            await this.handleError(intr, error);
        }
    }

    private getInterestRate(): number {
        const interestRateString = this.globalSettings.getSetting('LAST_INTEREST_RATE');
        return interestRateString ? parseFloat(interestRateString) : 1;
    }

    private createInterestEmbed(interestRate: number): EmbedBuilder {
        return new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Current Interest Rate')
            .setDescription(`The current daily interest rate is: ${this.formatInterestRate(interestRate)}`)
            .setFooter({ text: 'This rate is applied daily to your bank balance.' });
    }

    private formatInterestRate(interestRate: number): string {
        return `${((interestRate - 1) * 100).toFixed(2)}%`;
    }

    private async handleError(intr: ChatInputCommandInteraction, error: any): Promise<void> {
        console.error('Error in InterestCommand:', error);
        await InteractionUtils.send(intr, 'An error occurred while fetching the interest rate.');
    }
}
