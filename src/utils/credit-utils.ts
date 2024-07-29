export enum AmountValidationResult {
    VALID,
    INVALID,
    INSUFFICIENT_FUNDS
}

export class CreditUtils {
    public static parseCredit(num: string, account: string | number): number | null {
        const MULTIPLIERS = {
            k: 1e3,
            m: 1e6,
            b: 1e9
        } as const;

        type Multiplier = keyof typeof MULTIPLIERS;

        if (num == null) {
            return null;
        }

        if (num.toLowerCase().includes("all")) {
            return this.scientificToDecimal(account);
        }

        if (num.slice(-1) === '%') {
            const percentageValue = parseFloat(num.slice(0, -1));
            if (isNaN(percentageValue)) {
                return null;
            }
            return percentageValue * 0.01 * this.scientificToDecimal(account);
        }

        if (!isNaN(Number(num))) {
            return this.scientificToDecimal(num);
        }

        const definingSymbol = num.slice(-1).toLowerCase() as Multiplier;
        const baseValue = num.slice(0, -1);

        const parsedBaseValue = parseFloat(baseValue);
        if (isNaN(parsedBaseValue)) {
            return null;
        }

        if (definingSymbol in MULTIPLIERS) {
            return parsedBaseValue * MULTIPLIERS[definingSymbol];
        }

        return null;
    }

    public static scientificToDecimal(value: string | number): number {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return Number(numValue.toFixed(20));
    }

    public static validateAmount(amount: number | null, accountAmount: number): AmountValidationResult {
        if (amount === null || isNaN(amount) || !isFinite(amount) || amount <= 0) {
            return AmountValidationResult.INVALID;
        }
        if (amount > accountAmount) {
            return AmountValidationResult.INSUFFICIENT_FUNDS;
        }
        return AmountValidationResult.VALID;
    }

    public static getValidationMessage(result: AmountValidationResult, amount: number | string | null): string {
        switch (result) {
            case AmountValidationResult.VALID:
                return "Valid";
            case AmountValidationResult.INVALID:
                return `Invalid argument: ${amount}`;
            case AmountValidationResult.INSUFFICIENT_FUNDS:
                return `Insufficient funds for transaction: ${amount}`;
        }
    }

    public static formatCredit(amount: number): string {
        if (amount >= 1e6 || amount <= -1e6) {
            return amount.toExponential(2);
        }
    
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }


}