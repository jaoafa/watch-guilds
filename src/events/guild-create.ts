import { Guild } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'

export class DiscordGuildCreateEvent extends BaseDiscordEvent {
  readonly eventName = 'guildCreate'

  async execute(guild: Guild) {
    const logger = Logger.configure('Discord.onGuildCreate')
    logger.info(`🆕 Joined guild: ${guild.name} (${guild.id})`)
    await this.discord.updateCommands(guild)
  }
}
