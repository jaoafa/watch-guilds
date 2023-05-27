import { ClientEvents, Sticker } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'

export class DiscordStickerCreateEvent extends BaseDiscordEvent {
  get eventName(): keyof ClientEvents {
    return 'stickerCreate'
  }

  async execute(sticker: Sticker) {
    const logger = Logger.configure('Discord.onStickerCreate')
    const guild = sticker.guild
    if (!guild) return

    const server = new WatchGuildServer(guild)
    const channelId = server.getChannelId('notifier-sticker')
    if (!server.isRegistered() || channelId === null) {
      return
    }
    const channel = guild.channels.cache.get(channelId)
    if (!channel || !channel.isTextBased()) {
      return
    }
    const user = await sticker.fetchUser()
    const author = user
      ? {
          name: `${user.username}#${user.discriminator}`,
          url: `https://discord.com/users/${user.id}`,
          icon_url: user.avatarURL() ?? user.defaultAvatarURL,
        }
      : undefined

    logger.info(
      `🆕 Sticker created: ${sticker.name} (${sticker.id}) in ${guild.name} (${guild.id})`
    )

    await channel.send({
      embeds: [
        {
          title: `:new:NEW STICKER : \`${sticker.name}\``,
          thumbnail: {
            url: sticker.url,
          },
          fields: [
            {
              name: 'Description',
              value: sticker.description ?? '',
            },
            {
              name: 'Emoji',
              value: `:${sticker.tags}:`,
              inline: true,
            },
            {
              name: 'Format',
              value: this.getStickerFormatType(sticker.format),
              inline: true,
            },
          ],
          author,
          color: 0x00_ff_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  }

  getStickerFormatType(format: number): string {
    switch (format) {
      case 1: {
        return 'PNG'
      }
      case 2: {
        return 'APNG'
      }
      case 3: {
        return 'Lottie'
      }
      case 4: {
        return 'GIF'
      }
      default: {
        return 'Unknown'
      }
    }
  }
}
