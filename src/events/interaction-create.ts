import { Discord } from '@/discord'
import { BaseInteraction, CacheType, ClientEvents } from 'discord.js'
import { BaseDiscordEvent } from '.'

export class DiscordInteractionCreateEvent extends BaseDiscordEvent {
  get eventName(): keyof ClientEvents {
    return 'interactionCreate'
  }

  async execute(interaction: BaseInteraction<CacheType>) {
    if (!interaction.isChatInputCommand()) {
      return
    }

    if (!interaction.command || interaction.command.name !== 'watch-guilds') {
      return
    }
    const guild = interaction.guild
    if (!guild) {
      return
    }
    const command = Discord.routes.find((route) => {
      const group = interaction.options.getSubcommandGroup()
      const subcommand = interaction.options.getSubcommand()
      const definition = route.definition(guild)
      return definition && definition.name === (group ?? subcommand)
    })
    if (!command) return

    if (command.permissions) {
      const permissions = command.permissions.map((permission) => {
        if (permission.identifier) {
          switch (permission.type) {
            case 'USER': {
              return interaction.user.id === permission.identifier
            }
            case 'ROLE': {
              if (!interaction.guild) {
                return false
              }
              const user = interaction.guild.members.resolve(interaction.user)
              if (!user) return false
              return user.roles.cache.has(permission.identifier)
            }
            case 'PERMISSION': {
              if (!interaction.guild) {
                return false
              }
              const user = interaction.guild.members.resolve(interaction.user)
              if (!user) return false
              return user.permissions.has(permission.identifier)
            }
          }
        }
        return true
      })
      if (!permissions.every(Boolean)) {
        await interaction.reply({
          content: 'このコマンドを実行する権限がありません。',
          ephemeral: true,
        })
        return
      }
    }
    await command.execute(this.discord, interaction)
  }
}
