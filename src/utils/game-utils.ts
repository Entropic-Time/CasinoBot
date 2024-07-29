export class GameUtils {
    private cardDeck: Card[];
    private players: Map<string, { player: Player, hand: Card[] }>;
    private readonly suits: string[];
    private readonly names: string[];

    constructor() {
        this.cardDeck = [];
        this.players = new Map();
        this.suits = ["♥", "♦", "♠", "♣"];
        this.names = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"];
        this.initDeck();
    }

    private initDeck(): void {
        this.cardDeck = this.suits.flatMap(suit =>
            this.names.map(name => {
                const [blackjackValue, warValue] = this.determineValues(name);
                return new Card(name, suit, blackjackValue, warValue);
            })
        );
    }

    private determineValues(name: string): [number, number] {
        const faceCardValues: { [key: string]: [number, number] } = {
            "Ace": [1, 14],
            "Jack": [10, 11],
            "Queen": [10, 12],
            "King": [10, 13]
        };
        return faceCardValues[name] || [parseInt(name), parseInt(name)];
    }

    public shuffle(luck: number = -1, level: number = -1): void {
        //luck affects the first draws
        const useSpecialShuffle = luck >= 1 && level >= 1;
        const possibleAces = useSpecialShuffle ? Math.ceil(level / 10) + 1 : 0;

        for (let i = this.cardDeck.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            if (useSpecialShuffle && this.cardDeck[i].name === "Ace" && possibleAces > 0) {
                j = Math.floor(Math.random() * (this.cardDeck.length / (luck / (level / 2))));
            }
            [this.cardDeck[i], this.cardDeck[j]] = [this.cardDeck[j], this.cardDeck[i]];
        }
    }

    public initGame(players: Player[]): number {
        this.players.clear();
        players.forEach(player => {
            if (player.id) {
                this.players.set(player.id, { player, hand: [] });
            }
        });
        if (this.players.size <= 1) {
            const botPlayer = { username: "Dealer", bot: true, id: "dealer" };
            this.players.set(botPlayer.id, { player: botPlayer, hand: [] });
        }
        return this.cardDeck.length;
    }

    public dealHands(handSize: number): void {
        for (let i = 0; i < handSize; i++) {
            this.players.forEach((playerData) => {
                const card = this.cardDeck.pop();
                if (card) playerData.hand.push(card);
            });
        }
    }

    public hit(playerId: string): Card | undefined {
        const playerData = this.players.get(playerId);
        if (playerData) {
            const card = this.cardDeck.pop();
            if (card) {
                playerData.hand.push(card);
                return card;
            }
        }
        return undefined;
    }

    public getHand(playerId: string): Card[] {
        return this.players.get(playerId)?.hand || [];
    }

    public getCardsAsString(playerId: string, cover: string | null = null): string {
        const hand = this.getHand(playerId);
        return hand.map((card, index) => index > 0 && cover ? cover : card.toString()).join(' ');
    }

    public getCoveredCardsAsString(playerId: string, cover: string): string {
        const hand = this.getHand(playerId);
        return Array(hand.length).fill(cover).join(' ');
    }

    public getBlackjackValue(playerId: string): number {
        const hand = this.getHand(playerId);
        let sum = 0;
        let aces = 0;
    
        for (const card of hand) {
            if (card.name === "Ace")
                aces++;
            sum += card.blackjackValue; //Ace should already be 1
        }
    
        while (aces > 0 && sum + 10 <= 21) {
            sum += 10;
            aces--;
        }
    
        return sum;
    }
    
    public getPlayers(): Player[] {
        return Array.from(this.players.values()).map(data => data.player);
    }

    public getPlayerByID(playerId: string): Player | null {
        return this.players.get(playerId)?.player || null;
    }

    public getRemainingCards(): number {
        return this.cardDeck.length;
    }

    public resetDeck(): void {
        this.initDeck();
    }

    public printGameState(): void {
        console.log("Players:", this.getPlayers().map(p => p.username));
        console.log("Remaining Deck:", this.getRemainingCards());
        this.players.forEach((playerData, playerId) => {
            console.log(`${playerData.player.username}'s hand:`, this.getCardsAsString(playerId));
        });
    }
}

export enum GameResult {
    WIN,
    LOSS,
    TIE,
    ERROR,
    CONTINUE
}

class Card {
    constructor(
        public readonly name: string,
        public readonly suit: string,
        public readonly blackjackValue: number,
        public readonly warValue: number
    ) {}

    toString(): string {
        return `${this.suit}${this.name}`;
    }
}

interface Player {
    username: string;
    bot: boolean;
    id: string;
}
