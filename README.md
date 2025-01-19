# Plane Discord Bot

A Discord bot that integrates with [Plane](https://plane.so), an open-source project planning tool. This bot allows you to manage Plane issues directly from Discord with rich visual embeds and interactive features.

## About Plane

[Plane](https://plane.so) is a comprehensive project planning platform that offers:

- Real-time issue tracking and project management
- Customizable workflows and states
- Rich API integration capabilities
- Open-source flexibility
- Modern and intuitive interface

This Discord bot leverages Plane's powerful API to bring project management directly into your Discord server.

## Features

- Create new issues with title, description, and priority
- List issues with filtering by state and priority
- View detailed issue information with rich embeds
- Color-coded priority levels
- Support for issue labels and attachments
- Automatic state tracking
- Beautiful Discord embeds with formatted descriptions
- Direct integration with Plane's API

## Prerequisites

- Node.js v16.9.0 or higher
- A Discord bot token and application
- A [Plane](https://plane.so) account with API access
  - Workspace created
  - Project set up
  - API key generated

## Setup

1. Clone the repository

```bash
git clone <repository-url>
cd plane-discord-bot
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables
   Create a `.env` file in the root directory with the following variables:

```env
DISCORD_TOKEN=your_discord_bot_token
PLANE_API_KEY=your_plane_api_key        # Generate from Plane settings
WORKSPACE_SLUG=your_workspace_slug      # Found in Plane workspace URL
PROJECT_ID=your_project_id             # Found in Plane project settings
CLIENT_ID=your_discord_client_id
```

4. Deploy slash commands

```bash
npm run deploy
```

5. Start the bot

```bash
npm start
```

## Available Commands

### `/create-issue`

Create a new issue in Plane

- Options:
  - `title` (required): Issue title
  - `description` (required): Issue description
  - `priority` (required): Priority level
    - Low
    - Medium
    - High
    - Urgent

### `/get-issues`

List issues with optional filters

- Options:
  - `state`: Filter by state name (e.g., Backlog, In Progress, Done)
  - `priority`: Filter by priority level
    - Low
    - Medium
    - High
    - Urgent

### `/view-issue`

View detailed information about a specific issue

- Options:
  - `id` (required): The sequence ID of the issue (e.g., PROJ-123)

## Visual Features

- Priority-based color coding:

  - Urgent: Bright Red (#DC2626)
  - High: Bright Orange (#EA580C)
  - Medium: Golden Yellow (#CA8A04)
  - Low: Green (#16A34A)
  - None: Gray (#6B7280)

- Rich embeds with:
  - Issue title and ID
  - Formatted description
  - State information with Plane's workflow states
  - Priority level
  - Labels
  - Creation date
  - Direct link to Plane issue
  - Attachment information

## Integration Details

The bot integrates with Plane using their REST API:

- Automatic state synchronization
- Real-time issue creation and updates
- Support for Plane's custom states and workflows
- Direct links to Plane's web interface
- Cached state and label information for better performance

## Development

For development with hot-reloading:

```bash
npm run dev
```

## Scripts

- `npm start`: Start the bot
- `npm run dev`: Start with nodemon for development
- `npm run deploy`: Deploy slash commands to Discord

## Project Structure

```
plane-discord-bot/
├── src/
│   ├── commands/          # Discord slash commands
│   │   ├── createIssue.js
│   │   ├── getIssues.js
│   │   └── viewIssue.js
│   ├── config/           # Configuration management
│   │   └── config.js
│   ├── services/         # API services
│   │   └── planeApi.js   # Plane API integration
│   └── index.js          # Main bot file
├── .env                  # Environment variables
└── package.json
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Links

- [Plane Website](https://plane.so)
- [Plane API Documentation](https://developers.plane.so)
- [Discord.js Documentation](https://discord.js.org)
