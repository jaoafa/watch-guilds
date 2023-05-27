import { ConfigFramework } from '@book000/node-utils'

interface Configuration {
  discord: {
    token: string
  }
}

export class WGConfiguration extends ConfigFramework<Configuration> {
  protected validates(): { [key: string]: (config: Configuration) => boolean } {
    return {
      'discord is required': (config) => !!config.discord,
      'discord.token is required': (config) => !!config.discord.token,
      'discord.token is string': (config) =>
        typeof config.discord.token === 'string',
    }
  }
}
