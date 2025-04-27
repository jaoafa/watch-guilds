import { AuditLogEvent, Sticker, User } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'
import { Discord } from '@/discord'

export class DiscordStickerDeleteEvent extends BaseDiscordEvent {
  readonly eventName = 'stickerDelete'

  async execute(sticker: Sticker) {
    const logger = Logger.configure('Discord.onStickerDelete')
    const guild = sticker.guild
    if (!guild) return

    const server = new WatchGuildServer(guild)
    const channelId = server.getChannelId('notifier-sticker')
    if (!server.isRegistered() || channelId === null) {
      return
    }
    const channel = guild.channels.cache.get(channelId)
    if (!channel?.isTextBased()) {
      return
    }

    logger.info(
      `🗑️ Sticker deleted: ${sticker.name} (${sticker.id}) in ${guild.name} (${guild.id})`
    )

    const deletedBy = await this.getDeletedBy(sticker)
    const author = deletedBy
      ? {
          name: `${deletedBy.username}#${deletedBy.discriminator}`,
          url: `https://discord.com/users/${deletedBy.id}`,
          icon_url: deletedBy.avatarURL() ?? deletedBy.defaultAvatarURL,
        }
      : undefined

    const stickerCount = await Discord.getStickerCount(guild)
    const maxStickerCount = Discord.getMaxStickerCount(guild)

    await channel.send({
      embeds: [
        {
          title: `:wave: DELETED STICKER : \`${sticker.name}\``,
          thumbnail: { url: sticker.url },
          author,
          fields: [
            {
              name: 'Available Sticker Slots',
              value: `${stickerCount} / ${maxStickerCount}`,
            },
          ],
          color: 0x00_ff_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  }

  async getDeletedBy(sticker: Sticker): Promise<User | null> {
    const guild = sticker.guild
    if (!guild) return null
    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.StickerDelete,
      limit: 5,
    })

    let user: User | null = null
    for (const log of auditLogs.entries.values()) {
      if (log.target.id !== sticker.id) continue
      const executor = log.executor
      if (!executor) continue

      // is Partial User
      user = executor.partial ? await executor.fetch() : executor
      break
    }

    return user
  }
}
