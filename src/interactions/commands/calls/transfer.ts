import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString, User } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { UserSchema, UserData } from '../../../schemas/index.js';
import { InteractionUtils, CreditUtils, AmountValidationResult } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';
import { OptionType } from '../../../enums/common.js';

export class TransferCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['transfer'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private userSchema = new UserSchema();

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const { targetUser, amountString } = this.getCommandOptions(intr);
            if (!targetUser || !amountString) {
                await InteractionUtils.send(intr, 'Invalid command usage. Please specify a target user and an amount.');
                return;
            }

            const { userData, targetUserData } = await this.getUsersData(intr.user, targetUser);
            const transferResult = await this.processTransfer(userData, targetUserData, amountString);
            const embed = this.createResultEmbed(intr.user, targetUser, transferResult);

            await InteractionUtils.send(intr, embed);
        } catch (error) {
            console.error('Error in TransferCommand:', error);
            await InteractionUtils.send(intr, 'An error occurred while processing the transfer.');
        }
    }

    private getCommandOptions(intr: ChatInputCommandInteraction): { targetUser: User | null, amountString: string | null } {
        const targetUser = intr.options.getUser(ChatCommandMetadataArgsRaw['transfer'].getOptionNameByKey('user'));
        const amountString = intr.options.getString(ChatCommandMetadataArgsRaw['transfer'].getOptionNameByKey('amount'));
        return { targetUser, amountString };
    }

    private async getUsersData(sender: User, recipient: User): Promise<{ userData: UserData; targetUserData: UserData; }> {
        const userData = this.userSchema.getOrCreateUserData(sender.id, sender.username);
        const targetUserData = this.userSchema.getOrCreateUserData(recipient.id, recipient.username);
        return { userData, targetUserData };
    }

    private async processTransfer(userData: UserData, targetUserData: UserData, amountString: string): Promise<TransferResult> {
        const amount = CreditUtils.parseCredit(amountString, userData.balance);
        const validationResult = CreditUtils.validateAmount(amount, userData.balance);

        if (validationResult === AmountValidationResult.VALID) {
            userData.balance -= amount;
            targetUserData.balance += amount;
            this.userSchema.setUserData(userData);
            this.userSchema.setUserData(targetUserData);
            return { success: true, amount, message: `Amount: ${CreditUtils.formatCredit(amount)}` };
        } else {
            return { success: false, amount, message: CreditUtils.getValidationMessage(validationResult, amount) };
        }
    }

    private createResultEmbed(sender: User, recipient: User, result: TransferResult): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setColor(result.success ? '#00ff00' : '#ff0000')
            .setTitle('Transfer Result')
            .setDescription(`From: ${sender.username} To: ${recipient.username}`);

        embed.addFields({
            name: result.success ? "Success" : "Failure",
            value: result.message
        });

        return embed;
    }
}

interface TransferResult {
    success: boolean;
    amount: number;
    message: string;
}
