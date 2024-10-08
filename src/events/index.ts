import { Discord } from '@/discord'
import { ClientEvents } from 'discord.js'

export abstract class BaseDiscordEvent {
  protected readonly discord: Discord

  constructor(discord: Discord) {
    this.discord = discord
  }

  abstract get eventName(): keyof ClientEvents

  register(): void {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.discord.client.on(this.eventName, this.execute.bind(this))
  }

  abstract execute(...args: any[]): Promise<void>
}
