import { AuditLogEvent, GuildSoundboardSound } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'
import {
  emojiText,
  fetchSoundboardExecutor,
  quoted,
  toEmbedAuthor,
} from './soundboard-sound-utils'

export class DiscordSoundboardSoundCreateEvent extends BaseDiscordEvent {
  readonly eventName = 'guildSoundboardSoundCreate'

  async execute(sound: GuildSoundboardSound) {
    const logger = Logger.configure('Discord.onSoundboardSoundCreate')
    const guild = sound.guild

    const server = new WatchGuildServer(guild)
    const channelId = server.getChannelId('notifier-sound-board')
    if (channelId === null || !server.isRegistered()) {
      return
    }
    const channel = guild.channels.cache.get(channelId)
    if (!channel?.isTextBased()) {
      return
    }

    logger.info(
      `🆕 Soundboard sound created: ${sound.name} (${sound.soundId}) in ${guild.name} (${guild.id})`
    )

    const user =
      sound.user ??
      (await fetchSoundboardExecutor(
        guild,
        AuditLogEvent.SoundboardSoundCreate,
        sound.soundId
      ))

    const fields = [
      {
        name: 'Volume',
        value: `${Math.round(sound.volume * 100)}%`,
        inline: true,
      },
      ...(emojiText(sound)
        ? [{ name: 'Emoji', value: emojiText(sound), inline: true }]
        : []),
      { name: 'URL', value: sound.url },
    ]

    try {
      await channel.send({
        embeds: [
          {
            title: `:new: NEW SOUNDBOARD SOUND : ${quoted(sound.name)}`,
            fields,
            author: toEmbedAuthor(user),
            color: 0x00_ff_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
    } catch (error: unknown) {
      logger.error(
        `❌ Failed to send notification: ${guild.name} (${guild.id})`,
        error as Error
      )
    }
  }
}
