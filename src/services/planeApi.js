const axios = require("axios");
const config = require("../config/config");

/**
 * @typedef {Object} PlaneIssue
 * @property {string} id
 * @property {string} name
 * @property {string} description_html
 * @property {string} description_stripped
 * @property {string} priority
 * @property {string} state
 * @property {string[]} labels
 * @property {string} created_at
 * @property {string} updated_at
 * @property {number} sequence_id
 */

/**
 * @typedef {Object} PlaneAttachment
 * @property {string} id
 * @property {Object} attributes
 * @property {string} attributes.name
 * @property {number} attributes.size
 * @property {string} attributes.type
 */

/**
 * @typedef {Object} PlaneResponse
 * @property {number} total_count
 * @property {string} next_cursor
 * @property {string} prev_cursor
 * @property {boolean} next_page_results
 * @property {boolean} prev_page_results
 * @property {number} count
 * @property {number} total_pages
 * @property {number} total_results
 * @property {PlaneIssue[]} results
 */

/**
 * @typedef {Object} PlaneProject
 * @property {string} id
 * @property {string} identifier
 * @property {string} name
 */

const planeApi = axios.create({
  baseURL: "https://api.plane.so/api/v1",
  headers: {
    "X-API-Key": config.PLANE_API_KEY,
    "Content-Type": "application/json",
  },
});

class PlaneService {
  constructor() {
    this.config = {
      WORKSPACE_SLUG: config.WORKSPACE_SLUG,
      PROJECT_ID: config.PROJECT_ID,
    };
    this.statesCache = null;
    this.labelsCache = null;
    this.projectCache = null;
  }

  async getStates() {
    if (this.statesCache) {
      return this.statesCache;
    }

    try {
      const response = await planeApi.get(
        `/workspaces/${config.WORKSPACE_SLUG}/projects/${config.PROJECT_ID}/states/`
      );

      if (!response.data || !response.data.results) {
        console.error("Invalid states response:", response.data);
        return {};
      }

      this.statesCache = response.data.results.reduce((acc, state) => {
        acc[state.id] = {
          name: state.name,
          color: state.color,
          group: state.group,
          sequence: state.sequence,
          description: state.description,
          is_default: state.default,
        };
        return acc;
      }, {});
      return this.statesCache;
    } catch (error) {
      console.error(
        "Error fetching states:",
        error?.response?.data || error.message
      );
      return {};
    }
  }

  async getLabels() {
    if (this.labelsCache) {
      return this.labelsCache;
    }

    try {
      const response = await planeApi.get(
        `/workspaces/${config.WORKSPACE_SLUG}/projects/${config.PROJECT_ID}/labels`
      );
      if (!response.data || !response.data.results) {
        console.error("Invalid labels response:", response.data);
        return {};
      }
      this.labelsCache = response.data.results.reduce((acc, label) => {
        acc[label.id] = {
          name: label.name,
          color: label.color,
        };
        return acc;
      }, {});
      return this.labelsCache;
    } catch (error) {
      console.error(
        "Error fetching labels:",
        error?.response?.data || error.message
      );
      return {};
    }
  }

  /**
   * Get project details
   * @returns {Promise<PlaneProject>}
   */
  async getProjectDetails() {
    if (this.projectCache) {
      return this.projectCache;
    }

    try {
      const response = await planeApi.get(
        `/workspaces/${config.WORKSPACE_SLUG}/projects/${config.PROJECT_ID}/`
      );
      this.projectCache = response.data;
      return this.projectCache;
    } catch (error) {
      console.error(
        "Error fetching project:",
        error?.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Format issue ID with project identifier
   * @param {number} sequenceId
   * @returns {Promise<string>}
   */
  async formatIssueId(sequenceId) {
    const project = await this.getProjectDetails();
    return `${project.identifier}-${sequenceId}`;
  }

  /**
   * Format the issue data with additional details
   * @param {PlaneIssue} issue
   * @param {Object} states
   * @param {Object} labels
   * @returns {Object}
   */
  formatIssueData(issue, states, labels) {
    return {
      ...issue,
      state_detail: states[issue.state] || {
        name: "Unknown",
        group: "Unknown",
      },
      label_details: issue.labels
        .map((id) => labels[id])
        .filter((label) => label),
      description: issue.description_stripped || issue.description_html || "",
    };
  }

  async getAllIssues(filters = {}) {
    try {
      const [states, labels, project] = await Promise.all([
        this.getStates(),
        this.getLabels(),
        this.getProjectDetails(),
      ]);

      const queryParams = new URLSearchParams({
        per_page: "10", // Maximum allowed
        ...filters,
      });
      // Add filters if provided
      if (filters.state)
        queryParams.append("state__name__icontains", filters.state);
      if (filters.priority) queryParams.append("priority", filters.priority);

      // Add sorting
      queryParams.append("order_by", "-created_at"); // Sort by creation date, newest first

      const response = await planeApi.get(
        `/workspaces/${config.WORKSPACE_SLUG}/projects/${
          config.PROJECT_ID
        }/issues/?${queryParams.toString()}`
      );

      if (!response.data || !Array.isArray(response.data.results)) {
        return [];
      }

      const enhancedResults = response.data.results.map((issue) => ({
        ...this.formatIssueData(issue, states, labels, project),
        formatted_id: `${project.identifier}-${issue.sequence_id}`,
      }));

      return {
        ...response.data,
        results: enhancedResults,
      };
    } catch (error) {
      console.error(
        "Error fetching all issues:",
        error?.response?.data || error.message
      );
      return [];
    }
  }

  async createIssue(title, description, priority) {
    try {
      const response = await planeApi.post(
        `/workspaces/${config.WORKSPACE_SLUG}/projects/${config.PROJECT_ID}/issues/`,
        {
          name: title,
          description,
          priority,
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error creating issue:",
        error?.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Get a single issue by ID
   * @param {string} issueId
   * @returns {Promise<Object>}
   */
  async getIssueById(issueId) {
    try {
      const [issue, states, labels, attachments] = await Promise.all([
        planeApi.get(
          `/workspaces/${config.WORKSPACE_SLUG}/projects/${config.PROJECT_ID}/issues/${issueId}/`
        ),
        this.getStates(),
        this.getLabels(),
        this.getIssueAttachments(issueId),
      ]);

      return {
        ...this.formatIssueData(issue.data, states, labels),
        attachments: attachments,
      };
    } catch (error) {
      console.error(
        "Error fetching issue:",
        error?.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Get issue attachments
   * @param {string} issueId
   * @returns {Promise<PlaneAttachment[]>}
   */
  async getIssueAttachments(issueId) {
    try {
      const response = await planeApi.get(
        `/workspaces/${config.WORKSPACE_SLUG}/projects/${config.PROJECT_ID}/issues/${issueId}/issue-attachments/`
      );

      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(
        "Error fetching attachments:",
        error?.response?.data || error.message
      );
      return [];
    }
  }

  /**
   * Get issue by sequence ID
   * @param {string} sequenceId
   * @returns {Promise<Object>}
   */
  async getIssueBySequenceId(sequenceId) {
    try {
      const [issue, states, labels, project] = await Promise.all([
        planeApi.get(
          `/workspaces/${config.WORKSPACE_SLUG}/issues/${sequenceId}/`
        ),
        this.getStates(),
        this.getLabels(),
        this.getProjectDetails(),
      ]);
      const attachments = await this.getIssueAttachments(issue.data.id);
      return {
        ...this.formatIssueData(issue.data, states, labels),
        attachments: attachments,
        formatted_id: `${project.identifier}-${issue.data.sequence_id}`,
      };
    } catch (error) {
      console.error(
        "Error fetching issue:",
        error?.response?.data || error.message
      );
      throw error;
    }
  }
}

module.exports = new PlaneService();
