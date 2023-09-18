import { AuditLogEvent, ClientEvents, GuildEmoji, User } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'
import { ListEmojis } from '@/list-emojis'
import { Discord } from '@/discord'

export class DiscordEmojiDeleteEvent extends BaseDiscordEvent {
  get eventName(): keyof ClientEvents {
    return 'emojiDelete'
  }

  async execute(emoji: GuildEmoji) {
    const logger = Logger.configure('Discord.onEmojiDelete')
    const guild = emoji.guild

    const server = new WatchGuildServer(guild)
    const channelId = server.getChannelId('notifier-emoji')
    if (!server.isRegistered()) {
      return
    }
    const listGeneratorPromise = new ListEmojis(this.discord).generate(guild)

    if (channelId === null) {
      await listGeneratorPromise
      return
    }
    const channel = guild.channels.cache.get(channelId)
    if (!channel || !channel.isTextBased()) {
      await listGeneratorPromise
      return
    }

    logger.info(
      `🗑️ Emoji deleted: ${emoji.name} (${emoji.id}) in ${guild.name} (${guild.id})`
    )

    const deletedBy = await this.getDeletedBy(emoji)
    const author = deletedBy
      ? {
          name: `${deletedBy.username}#${deletedBy.discriminator}`,
          url: `https://discord.com/users/${deletedBy.id}`,
          icon_url: deletedBy.avatarURL() ?? deletedBy.defaultAvatarURL,
        }
      : undefined

    const normalEmojiCount = await Discord.getNormalEmojiCount(guild)
    const animatedEmojiCount = await Discord.getAnimatedEmojiCount(guild)
    const maxEmojiCount = Discord.getMaxEmojiCount(guild)

    const emojiCountField = {
      name: 'Can be add emoji count',
      value: `Normal: ${normalEmojiCount} / ${maxEmojiCount}\nAnimated: ${animatedEmojiCount} / ${maxEmojiCount}`,
    }

    await channel.send({
      embeds: [
        {
          title: `:wave:DELETED EMOJI : \`${emoji.name}\``,
          thumbnail: {
            url: emoji.url,
          },
          author,
          fields: [emojiCountField],
          color: 0xff_00_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })

    await listGeneratorPromise
  }

  async getDeletedBy(emoji: GuildEmoji): Promise<User | null> {
    const guild = emoji.guild
    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.EmojiDelete,
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
