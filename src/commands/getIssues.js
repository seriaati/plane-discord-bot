const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const planeService = require("../services/planeApi");
const { formatDate } = require("../utils");

// Helper functions
const getPriorityColor = (priority) => {
  const colors = {
    urgent: 0xdc2626, // Bright Red
    high: 0xea580c, // Bright Orange
    medium: 0xca8a04, // Golden Yellow
    low: 0x16a34a, // Green
  };
  return colors[priority?.toLowerCase()] || 0x6b7280; // Default gray
};

const getPriorityEmoji = (priority) => {
  const emojis = {
    urgent: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🟢",
    none: "⚪",
  };
  return emojis[priority?.toLowerCase()] || emojis.none;
};

const getStateEmoji = (group) => {
  const emojis = {
    backlog: "📋",
    unstarted: "⭕",
    started: "▶️",
    completed: "✅",
    cancelled: "❌",
    duplicate: "🔄",
  };
  return emojis[group?.toLowerCase()] || "❔";
};

const formatState = (state, group) => {
  if (!state) return "Unknown";
  const emoji = getStateEmoji(group);
  const formattedState =
    state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
  return `${emoji} ${formattedState}`;
};

const formatDescription = (description) => {
  if (!description) return "";
  const trimmed = description.trim();
  if (trimmed.length > 100) {
    return `>>> ${trimmed.substring(0, 97)}...`;
  }
  return trimmed ? `>>> ${trimmed}` : "";
};

const getIssueUrl = (workspaceSlug, projectId, issueId) => {
  return `https://app.plane.so/${workspaceSlug}/projects/${projectId}/issues/${issueId}`;
};

const formatLabels = (labels) => {
  if (!labels || labels.length === 0) return "No labels";
  return labels.map((label) => `\`${label.name}\``).join(" ");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("get-issues")
    .setDescription("Get issues from Plane")
    .addStringOption((option) =>
      option
        .setName("state")
        .setDescription("Filter by state name (e.g., Backlog, In Progress)")
    )
    .addStringOption((option) =>
      option
        .setName("priority")
        .setDescription("Filter by priority level")
        .addChoices(
          { name: "🔴 Urgent", value: "urgent" },
          { name: "🟠 High", value: "high" },
          { name: "🟡 Medium", value: "medium" },
          { name: "🟢 Low", value: "low" }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const filters = {};
      const state = interaction.options.getString("state");
      const priority = interaction.options.getString("priority");

      if (state) filters.state = state;
      if (priority) filters.priority = priority;

      const issues = await planeService.getAllIssues(filters);

      if (!issues.results || issues.results.length === 0) {
        const noIssuesEmbed = new EmbedBuilder()
          .setTitle("📋 No Issues Found")
          .setDescription(
            "No issues found matching the criteria.\n\n" +
              (state || priority ? "**Applied Filters:**\n" : "") +
              (state ? `• State: ${state}\n` : "") +
              (priority
                ? `• Priority: ${getPriorityEmoji(
                    priority
                  )} ${priority.toUpperCase()}\n`
                : "")
          )
          .setColor(0x6b7280)
          .setTimestamp();

        await interaction.editReply({ embeds: [noIssuesEmbed] });
        return;
      }

      // Create summary embed
      const summaryEmbed = new EmbedBuilder()
        .setTitle("📋 Issue List")
        .setColor(0x0ea5e9)
        .setDescription(
          `Found ${issues.results.length} issue${
            issues.results.length === 1 ? "" : "s"
          }` +
            (state || priority ? "\n\n**Applied Filters:**\n" : "") +
            (state ? `• State: ${state}\n` : "") +
            (priority
              ? `• Priority: ${getPriorityEmoji(
                  priority
                )} ${priority.toUpperCase()}\n`
              : "")
        )
        .setTimestamp();

      // Create issue embeds
      const issueEmbeds = issues.results.slice(0, 10).map((issue) => {
        const issueUrl = getIssueUrl(
          planeService.config.WORKSPACE_SLUG,
          planeService.config.PROJECT_ID,
          issue.id
        );

        return new EmbedBuilder()
          .setColor(getPriorityColor(issue.priority))
          .setTitle(`${issue.formatted_id} ${issue.name || "Untitled Issue"}`)
          .setURL(issueUrl)
          .setDescription(formatDescription(issue.description))
          .addFields(
            {
              name: "Status",
              value: [
                `**Priority:** ${getPriorityEmoji(issue.priority)} ${
                  issue.priority?.toUpperCase() || "None"
                }`,
                `**State:** ${formatState(
                  issue.state_detail?.name,
                  issue.state_detail?.group
                )}`,
              ].join("\n"),
              inline: false,
            },
            {
              name: "Labels",
              value: formatLabels(issue.label_details),
              inline: true,
            },
            {
              name: "Created",
              value: formatDate(issue.created_at),
              inline: true,
            }
          );
      });

      // Add pagination info if needed
      if (issues.results.length > 10) {
        summaryEmbed.setFooter({
          text: `Showing 10 of ${issues.results.length} issues`,
        });
      }

      // Send all embeds
      await interaction.editReply({
        embeds: [summaryEmbed, ...issueEmbeds],
      });
    } catch (error) {
      console.error("Error in getIssues:", error);
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription("Failed to fetch issues. Please try again later.")
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
