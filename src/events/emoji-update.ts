import { AuditLogEvent, GuildEmoji, User } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'
import { mentionEmoji } from '@/utilities'
import { ListEmojis } from '@/list-emojis'
import { EmojisCache } from '@/emojis-caches'

export class DiscordEmojiUpdateEvent extends BaseDiscordEvent {
  readonly eventName = 'emojiUpdate'

  async execute(oldEmoji: GuildEmoji, newEmoji: GuildEmoji) {
    if (!newEmoji.name) {
      throw new Error('Emoji has no name')
    }

    const guild = oldEmoji.guild
    const server = new WatchGuildServer(guild)
    if (!server.isRegistered()) {
      return
    }
    const channelId = server.getChannelId('notifier-emoji')
    const listGeneratorPromise = new ListEmojis(this.discord).generate(guild)

    if (channelId === null) {
      await listGeneratorPromise
      return
    }
    const channel = guild.channels.cache.get(channelId)
    if (!channel?.isTextBased()) {
      await listGeneratorPromise
      return
    }

    const logger = Logger.configure('Discord.onEmojiUpdate')
    logger.info(`🔄 Emoji updated: ${oldEmoji.name} (${oldEmoji.id})`)

    const updatedBy = await this.getUpdatedBy(newEmoji)
    const author = updatedBy
      ? {
          name: `${updatedBy.username}#${updatedBy.discriminator}`,
          url: `https://discord.com/users/${updatedBy.id}`,
          icon_url: updatedBy.avatarURL() ?? updatedBy.defaultAvatarURL,
        }
      : undefined

    const matchEmojis = EmojisCache.getFromEmojiName(newEmoji.name)
    const matchEmojisMention = matchEmojis.map(
      (matchEmoji) =>
        `- <:${matchEmoji.name}:${matchEmoji.id}>: ${matchEmoji.name} (${matchEmoji.guild.name})`
    )
    const matchEmojisField =
      matchEmojisMention.length > 0
        ? {
            name: 'Duplicate emojis',
            value: matchEmojisMention.join('\n'),
            inline: false,
          }
        : undefined

    const fields = matchEmojisField ? [matchEmojisField] : []

    await channel.send({
      embeds: [
        {
          title: `:repeat: UPDATED EMOJI : ${mentionEmoji(newEmoji)}`,
          thumbnail: { url: newEmoji.url },
          fields: [
            { name: 'Before', value: `\`${oldEmoji.name}\``, inline: true },
            { name: 'After', value: `\`${newEmoji.name}\``, inline: true },
            ...fields,
          ],
          author,
          color: 0xff_a5_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })

    await listGeneratorPromise
  }

  async getUpdatedBy(emoji: GuildEmoji): Promise<User | null> {
    const guild = emoji.guild
    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.EmojiUpdate,
      limit: 5,
    })

    let user: User | null = null
    for (const log of auditLogs.entries.values()) {
      if (log.target.id !== emoji.id) continue
      const executor = log.executor
      if (!executor) continue

      // is Partial User
      user = executor.partial ? await executor.fetch() : executor
      break
    }

    return user
  }
}
