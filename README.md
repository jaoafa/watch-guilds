# watch-guilds

Monitoring of emojis, stickers, etc. on the Discord guilds and listing or notifying them in a text channel.

## Features

- **List emojis**: Automatic posting of messages in text channels with a glance at the emoji on that server.
- **Notifier emoji**: Post a notification message when a emoji is added, updated or deleted.
- **Notifier sticker**: Post a notification message when a sticker is added, updated or deleted.
- Human-like emoji sorting using natural order algorithmic sorting (natsort).
- Authority checks during configuration to prevent human error.
- The display language is Japanese only.

## Installation

### Install application

...

## Register Bot and Join the server

...

### Bot Permission

The following permissions must be granted for the Bot as a server:

- Manage emojis and stickers
- View Audit log

In addition, the following permissions must also be granted to the Bot on the channel you set as the posting destination:

- View channel
- Send messages
- Embed links
- Read messages history

### Register commands

- `/watch-guilds register`
- `/watch-guilds set-channel list-emoji <ListEmojiChannel>`
- `/watch-guilds set-channel notifier-emoji <NotifierEmojiChannel>`
- `/watch-guilds set-channel notifier-sticker <NotifierStickerChannel>`
- `/watch-guilds regenerate`

## License

The license for this project is [MIT License](LICENSE).
