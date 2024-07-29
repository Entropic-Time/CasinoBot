import {
    BaseMessageOptions,
    DiscordjsError,
    RESTJSONErrorCodes as DiscordjsErrors,
    EmbedBuilder,
    EmojiResolvable,
    Message,
    MessageEditOptions,
    MessageReaction,
    StartThreadOptions,
    TextBasedChannel,
    ThreadChannel,
    User,
} from 'discord.js';

const IGNORED_ERRORS = [
    DiscordjsErrors.UnknownMessage,
    DiscordjsErrors.UnknownChannel,
    DiscordjsErrors.UnknownGuild,
    DiscordjsErrors.UnknownUser,
    DiscordjsErrors.UnknownInteraction,
    DiscordjsErrors.CannotSendMessagesToThisUser, // User blocked bot or DM disabled
    DiscordjsErrors.ReactionWasBlocked, // User blocked bot or DM disabled
    DiscordjsErrors.MaximumActiveThreads,
];

export class MessageUtils {
    public static async send(
        target: User | TextBasedChannel,
        content: string | EmbedBuilder | BaseMessageOptions
    ): Promise<Message> {
        try {
            let options: BaseMessageOptions =
                typeof content === 'string'
                    ? { content }
                    : content instanceof EmbedBuilder
                      ? { embeds: [content] }
                      : content;
            return await target.send(options);
        } catch (error) {
            if (
                error instanceof DiscordjsError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async reply(
        msg: Message,
        content: string | EmbedBuilder | BaseMessageOptions
    ): Promise<Message> {
        try {
            let options: BaseMessageOptions =
                typeof content === 'string'
                    ? { content }
                    : content instanceof EmbedBuilder
                      ? { embeds: [content] }
                      : content;
            return await msg.reply(options);
        } catch (error) {
            if (
                error instanceof DiscordjsError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async edit(
        msg: Message,
        content: string | EmbedBuilder | MessageEditOptions
    ): Promise<Message> {
        try {
            let options: MessageEditOptions =
                typeof content === 'string'
                    ? { content }
                    : content instanceof EmbedBuilder
                      ? { embeds: [content] }
                      : content;
            return await msg.edit(options);
        } catch (error) {
            if (
                error instanceof DiscordjsError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async react(msg: Message, emoji: EmojiResolvable): Promise<MessageReaction> {
        try {
            return await msg.react(emoji);
        } catch (error) {
            if (
                error instanceof DiscordjsError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async pin(msg: Message, pinned: boolean = true): Promise<Message> {
        try {
            return pinned ? await msg.pin() : await msg.unpin();
        } catch (error) {
            if (
                error instanceof DiscordjsError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async startThread(
        msg: Message,
        options: StartThreadOptions
    ): Promise<ThreadChannel> {
        try {
            return await msg.startThread(options);
        } catch (error) {
            if (
                error instanceof DiscordjsError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async delete(msg: Message): Promise<Message> {
        try {
            return await msg.delete();
        } catch (error) {
            if (
                error instanceof DiscordjsError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }
}
