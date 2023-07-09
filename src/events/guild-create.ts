import { ClientEvents, Guild } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'

export class DiscordGuildCreateEvent extends BaseDiscordEvent {
  get eventName(): keyof ClientEvents {
    return 'guildCreate'
  }

  async execute(guild: Guild) {
    const logger = Logger.configure('Discord.onGuildCreate')
    logger.info(`🆕 Joined guild: ${guild.name} (${guild.id})`)
    await this.discord.updateCommands(guild)
  }
}
