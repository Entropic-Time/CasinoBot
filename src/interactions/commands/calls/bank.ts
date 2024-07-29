import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString, User } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { UserSchema, UserData } from '../../../schemas/index.js';
import { InteractionUtils, CreditUtils, AmountValidationResult } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';

enum BankOperation {
    WITHDRAW = 'Withdraw',
    DEPOSIT = 'Deposit',
    DISPLAY = 'Display'
}

interface OperationResult {
    success: boolean;
    operation: BankOperation;
    amount?: number;
    message: string;
}

export class BankCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['bank'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    private readonly WITHDRAW = 'withdraw';
    private readonly DEPOSIT = 'deposit';

    private userSchema = new UserSchema();

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const { mode, amountString } = this.getCommandOptions(intr);
            const userData = this.getUserData(intr.user);
            const result = await this.processOperation(mode, amountString, userData);
            const embed = this.createResultEmbed(result, userData, intr.user.toString());
            await InteractionUtils.send(intr, embed);
        } catch (error) {
            console.error('Error in BankCommand:', error);
            await InteractionUtils.send(intr, 'An error occurred while processing your bank operation.');
        }
    }

    private getCommandOptions(intr: ChatInputCommandInteraction): { mode: string | null, amountString: string | null } {
        const mode = intr.options.getString(ChatCommandMetadataArgsRaw['bank'].getOptionNameByKey('mode'));
        const amountString = intr.options.getString(ChatCommandMetadataArgsRaw['bank'].getOptionNameByKey('amount'));
        return { mode, amountString };
    }

    private getUserData(user: User): UserData {
        return this.userSchema.getOrCreateUserData(user.id, user.username);
    }

    private async processOperation(mode: string | null, amountString: string | null, userData: UserData): Promise<OperationResult> {
        if ((mode === null) !== (amountString === null)) {
            return  { success: false, operation: BankOperation.DISPLAY, message: 'Missing one of two parameters' };
        } else if (mode === this.WITHDRAW) {
            return this.handleWithdraw(amountString, userData);
        } else if (mode === this.DEPOSIT) {
            return this.handleDeposit(amountString, userData);
        } else {
            return { success: true, operation: BankOperation.DISPLAY, message: 'Showing balance' };
        }
    }

    private async handleWithdraw(amountString: string | null, userData: UserData): Promise<OperationResult> {
        const amount = CreditUtils.parseCredit(amountString, userData.bank);
        const validationResult = CreditUtils.validateAmount(amount, userData.bank);

        if (validationResult === AmountValidationResult.VALID) {
            userData.balance += amount;
            userData.bank -= amount;
            this.userSchema.setUserData(userData);
            return { success: true, operation: BankOperation.WITHDRAW, amount, message: `Withdrawn: ${CreditUtils.formatCredit(amount)}` };
        } else {
            return { success: false, operation: BankOperation.WITHDRAW, message: CreditUtils.getValidationMessage(validationResult, amount) };
        }
    }

    private async handleDeposit(amountString: string | null, userData: UserData): Promise<OperationResult> {
        const amount = CreditUtils.parseCredit(amountString, userData.balance);
        const validationResult = CreditUtils.validateAmount(amount, userData.balance);

        if (validationResult === AmountValidationResult.VALID) {
            userData.balance -= amount;
            userData.bank += amount;
            this.userSchema.setUserData(userData);
            return { success: true, operation: BankOperation.DEPOSIT, amount, message: `Deposited: ${CreditUtils.formatCredit(amount)}` };
        } else {
            return { success: false, operation: BankOperation.DEPOSIT, message: CreditUtils.getValidationMessage(validationResult, amount) };
        }
    }

    private createResultEmbed(result: OperationResult, userData: UserData, userMention: string): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setColor(result.success ? '#00ff00' : '#ff0000')
            .setTitle(`${result.operation} Result`)
            .setDescription(`Account Holder: ${userMention}`)
            .addFields(
                { name: "Balance", value: CreditUtils.formatCredit(userData.balance), inline: true },
                { name: "Bank", value: CreditUtils.formatCredit(userData.bank), inline: true }
            );

        if (result.success) {
            embed.addFields({ name: "Result", value: result.message });
        } else {
            embed.addFields({ name: "Error", value: result.message });
        }

        return embed;
    }
}
