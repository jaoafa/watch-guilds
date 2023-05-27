import { AuditLogEvent, ClientEvents, GuildEmoji, User } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'
import { mentionEmoji } from '@/utils'

export class DiscordEmojiUpdateEvent extends BaseDiscordEvent {
  get eventName(): keyof ClientEvents {
    return 'emojiUpdate'
  }

  async execute(oldEmoji: GuildEmoji, newEmoji: GuildEmoji) {
    const logger = Logger.configure('Discord.onEmojiUpdate')
    const guild = oldEmoji.guild

    const server = new WatchGuildServer(guild)
    const channelId = server.getChannelId('notifier-emoji')
    if (!server.isRegistered() || channelId === null) {
      return
    }
    const channel = guild.channels.cache.get(channelId)
    if (!channel || !channel.isTextBased()) {
      return
    }

    logger.info(`🔄 Emoji updated: ${oldEmoji.name} (${oldEmoji.id})`)

    const updatedBy = await this.getUpdatedBy(newEmoji)
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
          title: `:repeat:UPDATED EMOJI : ${mentionEmoji(newEmoji)}`,
          thumbnail: {
            url: newEmoji.url,
          },
          fields: [
            {
              name: 'Before',
              value: `\`${oldEmoji.name}\``,
              inline: true,
            },
            {
              name: 'After',
              value: `\`${newEmoji.name}\``,
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

  async getUpdatedBy(emoji: GuildEmoji): Promise<User | null> {
    const guild = emoji.guild
    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.EmojiUpdate,
      limit: 5,
    })

    let user: User | null = null
    for (const log of auditLogs.entries.values()) {
      if (!log.target) continue
      if (log.target.id !== emoji.id) continue
      user = log.executor
    }

    return user
  }
}
