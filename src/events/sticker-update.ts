import { AuditLogEvent, ClientEvents, Sticker, User } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'

export class DiscordStickerUpdateEvent extends BaseDiscordEvent {
  get eventName(): keyof ClientEvents {
    return 'stickerUpdate'
  }

  async execute(oldSticker: Sticker, newSticker: Sticker) {
    const logger = Logger.configure('Discord.onStickerUpdate')
    const guild = oldSticker.guild
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

    const updateType = this.getUpdateType(oldSticker, newSticker)

    logger.info(
      `🔄 Sticker ${updateType.toLowerCase()} updated: ${oldSticker.name} (${
        oldSticker.id
      })`
    )

    const updatedBy = await this.getUpdatedBy(newSticker)
    const author = updatedBy
      ? {
          name: `${updatedBy.username}#${updatedBy.discriminator}`,
          url: `https://discord.com/users/${updatedBy.id}`,
          icon_url: updatedBy.avatarURL() ?? updatedBy.defaultAvatarURL,
        }
      : undefined
    await channel.send({
      embeds: [
        {
          title: `:repeat: UPDATED STICKER (${updateType}) : ${newSticker.name}`,
          thumbnail: {
            url: newSticker.url,
          },
          fields: [
            {
              name: 'Before',
              value:
                updateType === 'Tags'
                  ? `:${oldSticker.tags}:`
                  : this.quoted(this.getValue(oldSticker, updateType)),
              inline: true,
            },
            {
              name: 'After',
              value:
                updateType === 'Tags'
                  ? `:${newSticker.tags}:`
                  : this.quoted(this.getValue(newSticker, updateType)),
              inline: true,
            },
          ],
          author,
          color: 0xff_a5_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  }

  async getUpdatedBy(sticker: Sticker): Promise<User | null> {
    const guild = sticker.guild
    if (!guild) return null
    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.StickerUpdate,
      limit: 5,
    })

    let user: User | null = null
    for (const log of auditLogs.entries.values()) {
      if (!log.target) continue
      if (log.target.id !== sticker.id) continue
      user = log.executor
    }

    return user
  }

  getUpdateType(oldSticker: Sticker, newSticker: Sticker): string {
    if (oldSticker.name !== newSticker.name) return 'Name'
    if (oldSticker.description !== newSticker.description) return 'Description'
    if (oldSticker.tags !== newSticker.tags) return 'Tags'
    return 'NULL'
  }

  getValue(sticker: Sticker, type: string): string {
    switch (type) {
      case 'Name': {
        return sticker.name
      }
      case 'Description': {
        return sticker.description ?? ''
      }
      case 'Tags': {
        return sticker.tags ?? ''
      }
      default: {
        return 'NULL'
      }
    }
  }

  quoted(value: string): string {
    if (value.length === 0) return ''
    if (value.includes('\n')) return `\`\`\`\n${value}\n\`\`\``
    return `\`${value}\``
  }
}
