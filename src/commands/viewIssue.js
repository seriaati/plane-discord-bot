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

// Helper function to get state or priority color
const getIssueColor = (issue) => {
  // First try to use state color
  if (issue.state_detail?.color) {
    return parseInt(issue.state_detail.color.replace("#", ""), 16);
  }
  // Fallback to priority color
  return getPriorityColor(issue.priority);
};

const formatDescription = (description) => {
  if (!description) return "";
  const trimmed = description.trim();
  return trimmed ? `>>> ${trimmed}` : "";
};

const getIssueUrl = (workspaceSlug, projectId, issueId) => {
  return `https://app.plane.so/${workspaceSlug}/projects/${projectId}/issues/${issueId}`;
};

const formatLabels = (labels) => {
  if (!labels || labels.length === 0) return [];

  return labels.map((label) => {
    const colorInt = label.color
      ? parseInt(label.color.replace("#", ""), 16)
      : 0x6b7280;
    return {
      name: "🏷️",
      value: `\`${label.name}\``,
      inline: true,
      color: colorInt,
    };
  });
};

const formatAttachments = (attachments) => {
  if (!attachments || attachments.length === 0) return "No attachments";

  const otherAttachments = [];

  attachments.forEach((attachment) => {
    const icon = getFileIcon(attachment.attributes.name);
    const size = formatFileSize(attachment.attributes.size);
    otherAttachments.push({
      name: attachment.attributes.name,
      url: `https://api.plane.so/api/assets/v2/workspaces/${planeService.config.WORKSPACE_SLUG}/projects/${planeService.config.PROJECT_ID}/issues/${attachment.issue}/attachments/${attachment.id}`,
      size: size,
      icon: icon,
    });
  });

  const parts = [];

  // Format non-image attachments as links with icons
  if (otherAttachments.length > 0) {
    parts.push(
      otherAttachments
        .map(
          (file) => `${file.icon} [${file.name}](${file.url}) (${file.size})`
        )
        .join("\n")
    );
  }

  return {
    text: parts.join("\n") || "No attachments",
  };
};

const getFileIcon = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  const icons = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    ppt: "📊",
    pptx: "📊",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    zip: "📦",
    rar: "📦",
    txt: "📝",
  };
  return icons[ext] || "📎";
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const formatMetadata = (issue) => {
  const parts = [];
  if (issue.created_at) {
    parts.push(`📅 Created: ${formatDate(issue.created_at)}`);
  }
  if (issue.updated_at && issue.updated_at !== issue.created_at) {
    parts.push(`🔄 Updated: ${formatDate(issue.updated_at)}`);
  }
  return parts.join(" • ");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("view-issue")
    .setDescription("View details of a specific issue")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("The sequence ID of the issue (e.g., PROJ-123)")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const sequenceId = interaction.options.getString("id").toUpperCase();
      const issue = await planeService.getIssueBySequenceId(sequenceId);

      const issueUrl = getIssueUrl(
        planeService.config.WORKSPACE_SLUG,
        planeService.config.PROJECT_ID,
        issue.id
      );

      // Main embed with issue details
      const mainEmbed = new EmbedBuilder()
        .setTitle(`${issue.formatted_id} ${issue.name || "Untitled Issue"}`)
        .setURL(issueUrl)
        .setColor(getIssueColor(issue))
        .setFooter({ text: formatMetadata(issue) })
        .setTimestamp();

      // Add description if exists
      if (issue.description) {
        mainEmbed.setDescription(formatDescription(issue.description));
      }

      // Status section
      mainEmbed.addFields({
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
      });

      const embeds = [mainEmbed];

      // Handle attachments
      if (issue.attachments?.length > 0) {
        const { text } = formatAttachments(issue.attachments);

        // Add non-image attachments as field
        if (text !== "No attachments") {
          mainEmbed.addFields({
            name: "📁 Attachments",
            value: text,
            inline: false,
          });
        }
      }

      // Quick actions
      mainEmbed.addFields({
        name: "🔗 Quick Actions",
        value: `[View in Plane](${issueUrl})`,
        inline: false,
      });

      // Add label embeds if present
      if (issue.label_details?.length > 0) {
        const labelFields = formatLabels(issue.label_details);
        // Group labels in a single embed
        const labelsEmbed = new EmbedBuilder()
          .setColor(0x6b7280)
          .setTitle("Labels");

        labelFields.forEach((field) => {
          labelsEmbed.addFields({
            name: field.name,
            value: field.value,
            inline: true,
          });
        });

        embeds.push(labelsEmbed);
      }

      await interaction.editReply({ embeds });
    } catch (error) {
      console.error("Error in viewIssue:", error);
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription(
          "Failed to fetch issue. Please check if the issue ID is correct and try again."
        )
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
