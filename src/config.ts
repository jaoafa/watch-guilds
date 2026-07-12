import { ConfigFramework } from '@book000/node-utils'

interface Config {
  discord: {
    token: string
  }
}

export class WGConfig extends ConfigFramework<Config> {
  protected validates(): Record<string, (config: Config) => boolean> {
    return {
      'discord is required': (config) => !!config.discord,
      'discord.token is required': (config) => !!config.discord.token,
      'discord.token is string': (config) =>
        typeof config.discord.token === 'string',
    }
  }
}
