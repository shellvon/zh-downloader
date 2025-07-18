// 简单的日志工具，支持多级别和开关

const LOG_LEVELS = ['debug', 'log', 'info', 'warn', 'error'] as const
type LogLevel = (typeof LOG_LEVELS)[number]

// 可通过环境变量或全局变量控制日志开关
const isEnabled = (window as any)?.__ZH_LOGGER_ENABLED__ ?? true

function format(level: LogLevel, ...args: any[]) {
  const time = new Date().toISOString()
  return [`[${time}] [${level.toUpperCase()}]`, ...args]
}

const logger = {
  debug: (...args: any[]) => {
    if (isEnabled) console.debug(...format('debug', ...args))
  },
  log: (...args: any[]) => {
    if (isEnabled) console.log(...format('log', ...args))
  },
  info: (...args: any[]) => {
    if (isEnabled) console.info(...format('info', ...args))
  },
  warn: (...args: any[]) => {
    if (isEnabled) console.warn(...format('warn', ...args))
  },
  error: (...args: any[]) => {
    if (isEnabled) console.error(...format('error', ...args))
  },
  setEnabled: (enable: boolean) => {
    if (typeof window !== 'undefined') {
      ;(window as any).__ZH_LOGGER_ENABLED__ = enable
    }
  },
}

export default logger
