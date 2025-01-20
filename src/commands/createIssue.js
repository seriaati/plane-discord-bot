const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const planeService = require("../services/planeApi");
const logger = require("../utils/logger");
const { formatDate } = require("../utils/utils");

// Import shared helper functions
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

const getPriorityColor = (priority) => {
  const colors = {
    urgent: 0xdc2626, // Bright Red
    high: 0xea580c, // Bright Orange
    medium: 0xca8a04, // Golden Yellow
    low: 0x16a34a, // Green
  };
  return colors[priority?.toLowerCase()] || 0x6b7280; // Default gray
};

const getIssueUrl = (workspaceSlug, projectId, issueId) => {
  return `https://app.plane.so/${workspaceSlug}/projects/${projectId}/issues/${issueId}`;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create-issue")
    .setDescription("Create a new issue in Plane")
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("The title of the issue")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("The description of the issue")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("priority")
        .setDescription("The priority of the issue")
        .setRequired(false)
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
      logger.info("Creating new issue command initiated", {
        user: interaction.user.tag,
        guild: interaction.guild?.name
      });

      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description") || "";
      const priority = interaction.options.getString("priority") || "none";

      logger.debug("Issue creation parameters", {
        title,
        description: description ? "Provided" : "Not provided",
        priority
      });

      // Show progress
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⏳ Creating Issue...")
            .setDescription("Please wait while the issue is being created.")
            .setColor(0xfbbf24)
            .setTimestamp()
        ]
      });

      const issue = await planeService.createIssue(title, description, priority);

      logger.info("Issue created successfully", {
        issueId: issue.id,
        sequenceId: issue.sequence_id
      });

      const issueUrl = getIssueUrl(
        planeService.config.WORKSPACE_SLUG,
        planeService.config.PROJECT_ID,
        issue.id
      );

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Issue Created Successfully")
        .setColor(getPriorityColor(priority))
        .setDescription(`>>> ${title}`)
        .addFields(
          {
            name: "Issue Details",
            value: [
              `**ID:** ${issue.sequence_id}`,
              `**Priority:** ${getPriorityEmoji(
                priority
              )} ${priority.toUpperCase()}`,
              `**Description:** ${description.length > 100
                ? description.substring(0, 97) + "..."
                : description
              }`,
            ].join("\n"),
            inline: false,
          },
          {
            name: "🔗 Quick Actions",
            value: `[View in Plane](${issueUrl})`,
            inline: false,
          }
        )
        .setFooter({ text: `📅 Created: ${formatDate(issue.created_at)}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error("Error creating issue", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Failed to Create Issue")
        .setDescription(error.message || "An unexpected error occurred while creating the issue.")
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
