import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { EventData } from '../../../models/internal-models.js';
import { InteractionUtils } from '../../../utils/index.js';
import { ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';
import { ReportSchema } from '../../../schemas/index.js';

export class ReportStatusCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['status'].name];
    public cooldown = new RateLimiter(1, 60000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private reportSchema: ReportSchema;

    constructor() {
        this.reportSchema = new ReportSchema();
    }

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const reportId = intr.options.getInteger(ChatCommandMetadataArgsRaw['status'].getOptionNameByKey('id'));

            if (reportId) {
                await this.handleSingleReport(intr, reportId);
            } else {
                await this.handleAllUserReports(intr);
            }
        } catch (error) {
            console.error('Error in ReportStatusCommand:', error);
            await InteractionUtils.send(intr, 'An error occurred while fetching the report status. Please try again later.');
        }
    }

    private async handleSingleReport(intr: ChatInputCommandInteraction, reportId: number): Promise<void> {
        const report = this.reportSchema.getReportById(reportId);

        if (!report) {
            await InteractionUtils.send(intr, 'No report found with the given ID.');
            return;
        }

        if (report.userId !== intr.user.id) {
            await InteractionUtils.send(intr, 'You do not have permission to view this report.');
            return;
        }

        const embed = this.createReportEmbed(report);
        await InteractionUtils.send(intr, { embeds: [embed], ephemeral: true });
    }

    private async handleAllUserReports(intr: ChatInputCommandInteraction): Promise<void> {
        const reports = this.reportSchema.getReportsByUserId(intr.user.id);

        if (reports.length === 0) {
            await InteractionUtils.send(intr, 'You have no reports.');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Your Reports')
            .setDescription('Here are all your reports:');

        reports.forEach(report => {
            embed.addFields({
                name: `Report ID: ${report.id}`,
                value: `Type: ${report.type}\nStatus: ${report.status}\nCreated: ${new Date(report.createdAt).toLocaleString()}`
            });
        });

        await InteractionUtils.send(intr, { embeds: [embed], ephemeral: true });
    }

    private createReportEmbed(report: any): EmbedBuilder {
        return new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Report Status')
            .addFields(
                { name: 'Report ID', value: report.id.toString(), inline: true },
                { name: 'Type', value: report.type, inline: true },
                { name: 'Status', value: report.status, inline: true },
                { name: 'Created At', value: new Date(report.createdAt).toLocaleString(), inline: true },
                { name: 'Last Updated', value: new Date(report.updatedAt).toLocaleString(), inline: true }
            );
    }
}
