import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { EventData } from '../../../models/internal-models.js';
import { InteractionUtils } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';
import { ReportSchema } from '../../../schemas/index.js';

export class ReportCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['report'].name];
    public cooldown = new RateLimiter(1, 300000); // 5 minutes cooldown
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private reportSchema: ReportSchema;

    constructor() {
        this.reportSchema = new ReportSchema();
    }

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const type = intr.options.getString(ChatCommandMetadataArgsRaw['report'].getOptionNameByKey('type'));
            const description = intr.options.getString(ChatCommandMetadataArgsRaw['report'].getOptionNameByKey('description'));

            const reportData = {
                userId: intr.user.id,
                type: type,
                description: description,
                status: 'Open',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            this.reportSchema.createReport(reportData);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Report Submitted')
                .setDescription('Thank you for your report.')
                .addFields(
                    { name: 'Type', value: type, inline: true },
                    { name: 'Status', value: 'Open', inline: true }
                )
                .setFooter({ text: `You can check the status of your report using ${ChatCommandMetadataArgsRaw['status'].name}` });

            await InteractionUtils.send(intr, { embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error in ReportCommand:', error);
            await InteractionUtils.send(intr, 'An error occurred while submitting your report. Please try again later.');
        }
    }
}
