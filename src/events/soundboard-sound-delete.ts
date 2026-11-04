import {
  AuditLogEvent,
  GuildSoundboardSound,
  PartialSoundboardSound,
} from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'
import {
  fetchSoundboardExecutor,
  quoted,
  toEmbedAuthor,
} from './soundboard-sound-utils'

export class DiscordSoundboardSoundDeleteEvent extends BaseDiscordEvent {
  readonly eventName = 'guildSoundboardSoundDelete'

  async execute(sound: GuildSoundboardSound | PartialSoundboardSound) {
    const logger = Logger.configure('Discord.onSoundboardSoundDelete')
    const guild = sound.guild
    if (!guild) return

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
      `🗑️ Soundboard sound deleted: ${sound.name ?? ''} (${sound.soundId}) in ${guild.name} (${guild.id})`
    )

    const deletedBy = await fetchSoundboardExecutor(
      guild,
      AuditLogEvent.SoundboardSoundDelete,
      sound.soundId
    )

    const title = sound.name
      ? `:wave: DELETED SOUNDBOARD SOUND : ${quoted(sound.name)}`
      : ':wave: DELETED SOUNDBOARD SOUND'

    try {
      await channel.send({
        embeds: [
          {
            title,
            author: toEmbedAuthor(deletedBy),
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
