import { AuditLogEvent, Guild, GuildSoundboardSound, User } from 'discord.js'
import { Logger } from '@book000/node-utils'

type SoundboardAuditLogEvent =
  | AuditLogEvent.SoundboardSoundCreate
  | AuditLogEvent.SoundboardSoundUpdate
  | AuditLogEvent.SoundboardSoundDelete

/**
 * 監査ログから、サウンドを操作したユーザーを取得する。
 * 取得に失敗した場合や該当エントリがない場合は `null` を返し、例外は投げない。
 */
export async function fetchSoundboardExecutor(
  guild: Guild,
  type: SoundboardAuditLogEvent,
  soundId: string
): Promise<User | null> {
  try {
    const auditLogs = await guild.fetchAuditLogs({ type, limit: 5 })
    for (const log of auditLogs.entries.values()) {
      const target = log.target
      const targetId = 'soundId' in target ? target.soundId : target.id
      if (targetId !== soundId) continue
      const executor = log.executor
      if (!executor) continue

      return executor.partial ? await executor.fetch() : executor
    }
  } catch (error: unknown) {
    Logger.configure('Discord.fetchSoundboardExecutor').warn(
      `⚠️ Failed to fetch audit logs: ${guild.name} (${guild.id})`,
      error as Error
    )
  }
  return null
}

export function toEmbedAuthor(user: User | null) {
  if (!user) return undefined
  return {
    name: `${user.username}#${user.discriminator}`,
    url: `https://discord.com/users/${user.id}`,
    icon_url: user.avatarURL() ?? user.defaultAvatarURL,
  }
}

export function emojiText(sound: GuildSoundboardSound): string {
  // 絵文字なしのサウンドでは Emoji#toString() が null を返す
  const text: string | null = sound.emoji?.toString() ?? null
  return text ?? ''
}

export function quoted(value: string): string {
  if (value.length === 0) return '`(none)`'
  return value.includes('\n') ? `\`\`\`\n${value}\n\`\`\`` : `\`${value}\``
}
