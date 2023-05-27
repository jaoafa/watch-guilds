import { Logger } from '@book000/node-utils'
import { Discord } from './discord'
import { WGConfiguration } from './config'

async function main() {
  const logger = Logger.configure('main')
  const config = new WGConfiguration('data/config.json')
  config.load()
  if (!config.validate()) {
    logger.error('❌ Configuration is invalid')
    logger.error(
      `💡 Missing check(s): ${config.getValidateFailures().join(', ')}`
    )
    process.exitCode = 1
    return
  }

  const discord = new Discord(config)
  process.once('SIGINT', () => {
    logger.info('👋 SIGINT signal received.')
    discord.close()

    process.exit(0)
  })
}

;(async () => {
  await main().catch((error) => {
    const logger = Logger.configure('main')
    logger.error('Error', error as Error)
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1)
  })
})()
