import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../../../models/internal-models.js';
import { UserSchema } from '../../../schemas/index.js';
import { InteractionUtils, CreditUtils, GameUtils, GameResult, ClientUtils, AmountValidationResult } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';
import { OptionType } from '../../../enums/common.js';

export class BlackJackCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['blackjack'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private deck: GameUtils;
    private bet: number;
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
        const betString = intr.options.getString(ChatCommandMetadataArgsRaw['blackjack'].getOptionNameByKey('bet'));
        this.userSchema = new UserSchema();
        this.userData = this.userSchema.getOrCreateUserData(intr.user.id, intr.user.username);

        const validationResult = this.validateAndSetBet(betString);
        if (validationResult !== AmountValidationResult.VALID) {
            await this.sendValidationErrorMessage(intr, validationResult);
            this.bet = 0;
            return;
        }

        this.setupDeck(intr);
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

    private setupDeck(intr: ChatInputCommandInteraction): void {
        this.userData.balance -= this.bet;
        this.userSchema.setUserData(this.userData);
        this.deck = new GameUtils();
        this.deck.initGame([{ username: intr.user.username, bot: false, id: intr.user.id }, { username: "Dealer", bot: true, id: "dealer" }]);
        this.deck.shuffle();
        this.deck.dealHands(2);
    }

    private async sendInitialGameState(intr: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setDescription(`Blackjack Match Started by: ${intr.user}`)
            .addFields({ name: "Bet", value: this.bet.toString() })
            .setFooter({ text: "Multiplayer disabled for now." });
        await InteractionUtils.send(intr, embed);
    }

    private async playGame(intr: ChatInputCommandInteraction): Promise<void> {
        const buttons = this.createGameButtons();

        while (true) {
            const gameState = this.getGameState(intr);
            await this.updateGameEmbed(intr, gameState, buttons);

            if (this.isGameOver(gameState.playerValue)) {
                return this.endGame(intr, this.determineResult(gameState.playerValue));
            }

            const action = await this.awaitPlayerAction(intr, buttons);
            if (action === PlayerAction.STAND || action === PlayerAction.TIMEOUT) break;
            this.deck.hit(intr.user.id);
        }

        this.playDealerTurn();
        return this.endGame(intr);
    }

    private createGameButtons(): ActionRowBuilder<ButtonBuilder> {
        const hitButton = new ButtonBuilder()
            .setCustomId(PlayerAction.HIT)
            .setLabel('Hit')
            .setStyle(ButtonStyle.Success);

        const standButton = new ButtonBuilder()
            .setCustomId(PlayerAction.STAND)
            .setLabel('Stand')
            .setStyle(ButtonStyle.Danger);

        return new ActionRowBuilder<ButtonBuilder>().addComponents(hitButton, standButton);
    }

    private getGameState(intr: ChatInputCommandInteraction): { playerValue: number, dealerValue: number, playerHand: string, dealerHand: string } {
        return {
            playerValue: this.deck.getBlackjackValue(intr.user.id),
            dealerValue: this.deck.getBlackjackValue("dealer"),
            playerHand: this.deck.getCardsAsString(intr.user.id),
            dealerHand: this.deck.getCardsAsString("dealer", "🂠")
        };
    }

    private async updateGameEmbed(intr: ChatInputCommandInteraction, gameState: any, buttons: ActionRowBuilder<ButtonBuilder>): Promise<void> {
        const embed = new EmbedBuilder()
            .setDescription(`Blackjack Match between ${intr.user} and Dealer`)
            .addFields(
                { name: "Your Hand", value: gameState.playerHand },
                { name: "Your Value", value: gameState.playerValue.toString() },
                { name: "Dealer's Hand", value: gameState.dealerHand },
                { name: "Dealer's Value", value: "?" }
            )
            .setFooter({ text: `Use: [Hit] or [Stand] below` });

        await intr.editReply({ embeds: [embed], components: [buttons] });
    }

    private isGameOver(playerValue: number): boolean {
        return playerValue >= 21;
    }

    private determineResult(playerValue: number): [GameResult, string] {
        if (playerValue === 21) return [GameResult.WIN, "Blackjack! You win!"];
        if (playerValue > 21) return [GameResult.LOSS, "Bust! You lose."];
        return [GameResult.CONTINUE, ""];
    }

    private async awaitPlayerAction(intr: ChatInputCommandInteraction, buttons: ActionRowBuilder<ButtonBuilder>): Promise<PlayerAction> {
        try {
            const response = await intr.channel?.awaitMessageComponent({
                filter: i => i.user.id === intr.user.id && (i.customId === PlayerAction.HIT || i.customId === PlayerAction.STAND),
                time: 30000,
            });

            if (!response) return PlayerAction.TIMEOUT;

            await response.deferUpdate();
            return response.customId as PlayerAction;
        } catch (error) {
            console.error('Error in button interaction:', error);
            this.refundBet();
            await this.endGame(intr, [GameResult.ERROR, "Game ended due to an error. Refunded credits."]);
            return PlayerAction.TIMEOUT;
        }
    }

    private playDealerTurn(): void {
        while (this.deck.getBlackjackValue("dealer") < 17) {
            this.deck.hit("dealer");
        }
    }

    private async endGame(intr: ChatInputCommandInteraction, result?: [GameResult, string]): Promise<void> {
        const gameState = this.getGameState(intr);
        result = result || this.determineWinner(gameState.playerValue, gameState.dealerValue);

        this.updateUserBalance(result[0]);
        const embed = this.createFinalEmbed(gameState, result);

        await intr.editReply({ embeds: [embed], components: [] });
    }

    private determineWinner(playerValue: number, dealerValue: number): [GameResult, string] {
        if (dealerValue > 21) return [GameResult.WIN, "Dealer busts! You win!"];
        if (playerValue > dealerValue) return [GameResult.WIN, "You win!"];
        if (playerValue < dealerValue) return [GameResult.LOSS, "Dealer wins. You lose!"];
        return [GameResult.TIE, "It's a tie!"];
    }

    private createFinalEmbed(gameState: any, result: [GameResult, string]): EmbedBuilder {
        return new EmbedBuilder()
            .setDescription(`Blackjack Match Result`)
            .addFields(
                { name: "Your Hand", value: gameState.playerHand },
                { name: "Your Value", value: gameState.playerValue.toString() },
                { name: "Dealer's Hand", value: this.deck.getCardsAsString("dealer") },
                { name: "Dealer's Value", value: gameState.dealerValue.toString() },
                { name: "Result", value: result[1] }
            );
    }

    private updateUserBalance(result: GameResult): void {
        if (result === GameResult.WIN) {
            this.userData.balance += this.bet * 2;
        } else if (result === GameResult.TIE) {
            this.userData.balance += this.bet;
        }
        this.userSchema.setUserData(this.userData);
    }

    private refundBet(): void {
        this.userData.balance += this.bet;
        this.userSchema.setUserData(this.userData);
    }

    private async handleError(intr: ChatInputCommandInteraction, error: any): Promise<void> {
        console.error('Error in BlackJackCommand:', error);
        await InteractionUtils.send(intr, 'An error occurred while playing Blackjack.');
    }
}

enum PlayerAction {
    HIT = 'hit',
    STAND = 'stand',
    TIMEOUT = 'timeout'
}