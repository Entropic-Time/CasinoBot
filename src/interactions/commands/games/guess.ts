import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { UserSchema } from '../../../schemas/index.js';
import { InteractionUtils, CreditUtils, GameResult, AmountValidationResult } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';

export class GuessCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['guess'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private bet: number;
    private userGuess: number | string;
    private userSchema: UserSchema;
    private userData: any;

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            await this.initializeGame(intr);
            if (this.bet === 0) return;
            await this.playGame(intr);
        } catch (error) {
            await this.handleError(intr, error);
        }
    }

    private async initializeGame(intr: ChatInputCommandInteraction): Promise<void> {
        const betKey = ChatCommandMetadataArgsRaw['guess'].getOptionNameByKey('bet');
        const guessKey = ChatCommandMetadataArgsRaw['guess'].getOptionNameByKey('guess');

        const betString = intr.options.getString(betKey);
        const guessString = intr.options.getString(guessKey);

        this.userSchema = new UserSchema();
        this.userData = this.userSchema.getOrCreateUserData(intr.user.id, intr.user.username);

        const validationResult = this.validateAndSetBet(betString);
        if (validationResult !== AmountValidationResult.VALID) {
            await this.sendValidationErrorMessage(intr, validationResult);
            this.bet = 0;
            return;
        }

        if (!guessString) {
            await this.sendMissingGuessMessage(intr);
            this.bet = 0;
            return;
        }

        if (guessString.toLowerCase() === 'odd' || guessString.toLowerCase() === 'even') {
            this.userGuess = guessString.toLowerCase();
        } else {
            this.userGuess = parseInt(guessString, 10);
            if (isNaN(this.userGuess) || this.userGuess < 1 || this.userGuess > 10) {
                await this.sendInvalidGuessMessage(intr);
                this.bet = 0;
                return;
            }
        }

        await this.sendInitialGameState(intr);
    }

    private validateAndSetBet(betString: string): AmountValidationResult {
        this.bet = CreditUtils.parseCredit(betString, this.userData.balance);
        return CreditUtils.validateAmount(this.bet, this.userData.balance);
    }

    private async sendValidationErrorMessage(intr: ChatInputCommandInteraction, validationResult: AmountValidationResult): Promise<void> {
        const errorMessage = CreditUtils.getValidationMessage(validationResult, this.bet);
        const embed = new EmbedBuilder()
            .setDescription(`Account Holder: ${intr.user}`)
            .addFields({ name: "Failure", value: errorMessage });
        await InteractionUtils.send(intr, { embeds: [embed] });
    }

    private async sendMissingGuessMessage(intr: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setDescription(`Account Holder: ${intr.user}`)
            .addFields({ name: "Failure", value: "Please provide a guess along with your bet." });
        await InteractionUtils.send(intr, { embeds: [embed] });
    }

    private async sendInvalidGuessMessage(intr: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setDescription(`Account Holder: ${intr.user}`)
            .addFields({ name: "Failure", value: "Invalid guess. Please enter a number between 1 and 10, or 'odd' or 'even'." });
        await InteractionUtils.send(intr, { embeds: [embed] });
    }

    private async sendInitialGameState(intr: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setDescription(`Guess Game Started by: ${intr.user}`)
            .addFields({ name: "Bet", value: CreditUtils.formatCredit(this.bet) })
            .setFooter({ text: typeof this.userGuess === 'string' ? 
                "Guessing odd or even" : 
                "Guess a number between 1 and 10" });
        await InteractionUtils.send(intr, { embeds: [embed] });
    }

    private async playGame(intr: ChatInputCommandInteraction): Promise<void> {
        const result = this.generateRandomNumber(10);
        await this.endGame(intr, this.determineResult(result));
    }

    private generateRandomNumber(limit: number): number {
        return Math.floor(Math.random() * limit) + 1;
    }

    private determineResult(result: number): [GameResult, string] {
        if (typeof this.userGuess === 'string') {
            // Odd/Even guess
            const isEven = result % 2 === 0;
            if ((this.userGuess === 'even' && isEven) || (this.userGuess === 'odd' && !isEven)) {
                return [GameResult.WIN, `The number was ${result}. You guessed ${this.userGuess} correctly! You win!`];
            } else {
                return [GameResult.LOSS, `The number was ${result}. You guessed ${this.userGuess}, which is incorrect. You lose.`];
            }
        } else {
            // Number guess
            if (this.userGuess === result) {
                return [GameResult.WIN, `The number was ${result}. You guessed correctly! You win!`];
            } else {
                return [GameResult.LOSS, `The number was ${result}. You guessed incorrectly. You lose.`];
            }
        }
    }

    private async endGame(intr: ChatInputCommandInteraction, result: [GameResult, string]): Promise<void> {
        let multiplier = 2;
        if (typeof this.userGuess === 'string')
            multiplier = this.generateRandomNumber(10);

        this.updateUserBalance(result[0], multiplier);
        const embed = this.createFinalEmbed(result, multiplier);

        await InteractionUtils.send(intr, { embeds: [embed] });
    }

    private createFinalEmbed(result: [GameResult, string], multiplier: number): EmbedBuilder {
        return new EmbedBuilder()
            .setDescription(`Guess Game Result`)
            .addFields(
                { name: "Result", value: result[1] },
                { name: "Bet", value: CreditUtils.formatCredit(this.bet) },
                { name: "Multiplier", value: multiplier.toString() },
                { name: "Balance", value: CreditUtils.formatCredit(this.userData.balance) }
            );
    }

    private updateUserBalance(result: GameResult, multiplier: number): void {
        if (result === GameResult.WIN) {
            this.userData.balance += this.bet * multiplier;
        } else if (result === GameResult.LOSS) {
            this.userData.balance -= this.bet;
        }
        this.userSchema.setUserData(this.userData);
    }

    private async handleError(intr: ChatInputCommandInteraction, error: any): Promise<void> {
        console.error('Error in GuessCommand:', error);
        await InteractionUtils.send(intr, 'An error occurred while playing Guess.');
    }
}
