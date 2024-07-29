import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { UserSchema } from '../../../schemas/index.js';
import { InteractionUtils, CreditUtils, GameResult, AmountValidationResult } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';
import { OptionType } from '../../../enums/common.js';

enum CoinSide {
    HEADS = 'heads',
    TAILS = 'tails'
}

enum PlayerAction {
    HEADS = 'heads',
    TAILS = 'tails',
    TIMEOUT = 'timeout'
}

export class CoinFlipCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['coinflip'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private bet: number;
    private userSchema: UserSchema;
    private userData: any;

    private readonly animation = "https://media.giphy.com/media/emGbMgsWA97wrRwGi5/giphy.gif";
    private readonly heads = "https://i.imgur.com/hIxW3tL.png";
    private readonly tails = "https://i.imgur.com/JErDQuL.png";

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            await this.initializeGame(intr);
            if (this.bet === 0) return; // Bet validation failed
            await this.playGame(intr);
        } catch (error) {
            await this.handleError(intr, error);
        }
    }

    private async initializeGame(intr: ChatInputCommandInteraction): Promise<void> {
        const betString = intr.options.getString(ChatCommandMetadataArgsRaw['coinflip'].getOptionNameByKey('bet'));
        this.userSchema = new UserSchema();
        this.userData = await this.userSchema.getOrCreateUserData(intr.user.id, intr.user.username);

        const validationResult = this.validateAndSetBet(betString);
        if (validationResult !== AmountValidationResult.VALID) {
            await this.sendValidationErrorMessage(intr, validationResult);
            this.bet = 0;
            return;
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
        await InteractionUtils.send(intr, embed);
    }

    private async sendInitialGameState(intr: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setDescription(`Coin Flip Game Started by: ${intr.user}`)
            .addFields({ name: "Bet", value: CreditUtils.formatCredit(this.bet) })
            .setFooter({ text: "Choose Heads or Tails" });
        await InteractionUtils.send(intr, embed);
    }

    private async playGame(intr: ChatInputCommandInteraction): Promise<void> {
        const buttons = this.createGameButtons();
        const gameEmbed = await this.createGameEmbed(intr);

        const playerChoice = await this.awaitPlayerAction(intr, buttons, gameEmbed);
        if (playerChoice === PlayerAction.TIMEOUT) {
            this.refundBet();
            await this.endGame(intr, [GameResult.ERROR, "Time's up! Bet refunded.", null]);
            return;
        }

        const result = this.flipCoin();
        await this.endGame(intr, this.determineResult(playerChoice, result));
    }

    private createGameButtons(): ActionRowBuilder<ButtonBuilder> {
        const headsButton = new ButtonBuilder()
            .setCustomId(PlayerAction.HEADS)
            .setLabel('Heads')
            .setStyle(ButtonStyle.Primary);

        const tailsButton = new ButtonBuilder()
            .setCustomId(PlayerAction.TAILS)
            .setLabel('Tails')
            .setStyle(ButtonStyle.Primary);

        return new ActionRowBuilder<ButtonBuilder>().addComponents(headsButton, tailsButton);
    }

    private async createGameEmbed(intr: ChatInputCommandInteraction): Promise<EmbedBuilder> {
        return new EmbedBuilder()
            .setDescription(`${intr.user}, choose Heads or Tails`)
            .setThumbnail(this.animation)
            .addFields(
                { name: "Bet", value: CreditUtils.formatCredit(this.bet) },
                { name: "Your Balance", value: CreditUtils.formatCredit(this.userData.balance) }
            )
            .setFooter({ text: `You have 30 seconds to choose` });
    }

    private async awaitPlayerAction(intr: ChatInputCommandInteraction, buttons: ActionRowBuilder<ButtonBuilder>, embed: EmbedBuilder): Promise<PlayerAction> {
        await intr.editReply({ embeds: [embed], components: [buttons] });

        try {
            const response = await intr.channel?.awaitMessageComponent({
                filter: i => i.user.id === intr.user.id && (i.customId === PlayerAction.HEADS || i.customId === PlayerAction.TAILS),
                time: 30000,
            });

            if (!response) return PlayerAction.TIMEOUT;

            await response.deferUpdate();
            return response.customId as PlayerAction;
        } catch (error) {
            console.error('Error in button interaction:', error);
            return PlayerAction.TIMEOUT;
        }
    }

    private flipCoin(): CoinSide {
        return Math.random() < 0.5 ? CoinSide.HEADS : CoinSide.TAILS;
    }

    private determineResult(playerChoice: PlayerAction, result: CoinSide): [GameResult, string, string] {
        if (playerChoice === PlayerAction.TIMEOUT) {
            return [GameResult.ERROR, "Time's up! Bet refunded.", this.animation];
        }

        if (playerChoice === PlayerAction.HEADS && result === CoinSide.HEADS) {
            return [GameResult.WIN, `The coin landed on ${result}. You win!`, this.heads];
        } else if (playerChoice === PlayerAction.TAILS && result === CoinSide.TAILS) {
            return [GameResult.WIN, `The coin landed on ${result}. You win!`, this.tails];
        } else {
            return [GameResult.LOSS, `The coin landed on ${result}. You lose.`, (playerChoice === PlayerAction.HEADS) ? this.tails : this.heads];
        }
    }


    private async endGame(intr: ChatInputCommandInteraction, result: [GameResult, string, string]): Promise<void> {
        this.updateUserBalance(result[0]);
        const embed = this.createFinalEmbed(result);

        await intr.editReply({ embeds: [embed], components: [] });
    }

    private createFinalEmbed(result: [GameResult, string, string]): EmbedBuilder {
        return new EmbedBuilder()
            .setDescription(`Coin Flip Result`)
            .setThumbnail(result[2])
            .addFields(
                { name: "Result", value: result[1] },
                { name: "Bet", value: CreditUtils.formatCredit(this.bet) },
                { name: "New Balance", value: CreditUtils.formatCredit(this.userData.balance) }
            );
    }

    private updateUserBalance(result: GameResult): void {
        if (result === GameResult.WIN) {
            this.userData.balance += this.bet;
        } else if (result === GameResult.LOSS) {
            this.userData.balance -= this.bet;
        }
        this.userSchema.setUserData(this.userData);
    }

    private refundBet(): void {
        this.userData.balance += this.bet;
        this.userSchema.setUserData(this.userData);
    }

    private async handleError(intr: ChatInputCommandInteraction, error: any): Promise<void> {
        console.error('Error in CoinFlipCommand:', error);
        await InteractionUtils.send(intr, 'An error occurred while playing Coin Flip.');
    }
}
