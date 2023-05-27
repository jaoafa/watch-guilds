import { AuditLogEvent, ClientEvents, Sticker, User } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'

export class DiscordStickerDeleteEvent extends BaseDiscordEvent {
  get eventName(): keyof ClientEvents {
    return 'stickerDelete'
  }

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
    if (!channel || !channel.isTextBased()) {
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
    await channel.send({
      embeds: [
        {
          title: `:wave:DELETED STICKER : \`${sticker.name}\``,
          thumbnail: {
            url: sticker.url,
          },
          author,
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
      if (!log.target) continue
      if (log.target.id !== sticker.id) continue
      user = log.executor
    }

    return user
  }
}
