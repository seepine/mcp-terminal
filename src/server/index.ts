import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import systeminformation from 'systeminformation'
import { spawn } from 'node:child_process'

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'Terminal Mcp Server',
    version: '0.1.0',
  })

  const getSysteminfoOutputSchema = z.object({
    osInfo: z
      .object({
        platform: z.string().describe('os platform').optional(),
        distro: z.string().describe('os distro').optional(),
        codename: z.string().describe('os codename').optional(),
        release: z.string().describe('os release').optional(),
        arch: z.string().describe('os arch').optional(),
        hostname: z.string().describe('os hostname').optional(),
      })
      .optional(),
    cpu: z
      .object({
        speed: z.number().describe('cpu speed').optional(),
        cores: z.number().describe('cpu cores').optional(),
        manufacturer: z.string().describe('cpu manufacturer').optional(),
        brand: z.string().describe('cpu brand').optional(),
        currentLoad: z.string().describe('cpu current load, like 10.0%').optional(),
      })
      .optional(),
    mem: z
      .object({
        total: z.number().describe('mem total').optional(),
        free: z.number().describe('mem free').optional(),
        used: z.number().describe('mem used').optional(),
        active: z.number().describe('mem active').optional(),
        available: z.number().describe('mem available').optional(),
        buffers: z.number().describe('mem buffers').optional(),
        cached: z.number().describe('mem cached').optional(),
      })
      .optional(),
  })
  server.registerTool(
    'get_systeminfo',
    {
      description: 'get system info, about osInfo, cpuInfo and memInfo',
      inputSchema: z.object({
        fields: z
          .array(z.enum(['os', 'memory', 'cpu']))
          .describe('fields to get, default is all')
          .optional(),
      }),
      outputSchema: getSysteminfoOutputSchema,
    },
    async ({ fields = ['os', 'memory', 'cpu'] }) => {
      // 获取系统信息
      const systemInfo: z.infer<typeof getSysteminfoOutputSchema> = {}
      const task: (() => Promise<void>)[] = []
      if (fields.includes('os')) {
        task.push(async () => {
          systemInfo.osInfo = {
            ...(await systeminformation.osInfo()),
          }
        })
      }
      // 获取内存信息
      if (fields.includes('memory')) {
        task.push(async () => {
          systemInfo.mem = {
            ...(await systeminformation.mem()),
          }
        })
      }
      // 获取cpu信息
      if (fields.includes('cpu')) {
        task.push(async () => {
          systemInfo.cpu = {
            ...(await systeminformation.cpu()),
            currentLoad: (await systeminformation.currentLoad()).currentLoad.toFixed(2) + '%',
          }
        })
      }
      await Promise.all(task.map((t) => t()))
      const result = getSysteminfoOutputSchema.parse(systemInfo)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      }
    },
  )

  server.registerTool(
    'exec_command',
    {
      description: 'exec command in terminal',
      inputSchema: z.object({
        command: z.string().describe('command to exec, like ls'),
        args: z.array(z.string()).describe('args to exec').optional(),
        cwd: z.string().describe('exec command in this directory').optional(),
        timeout: z.number().describe('timeout in ms, default is 10000').optional(),
        env: z.record(z.string(), z.string()).describe('env to exec').optional(),
      }),
    },
    async ({ command, args = [], timeout = 10000, env, cwd }) => {
      const func = new Promise<string>((resolve, reject) => {
        const ls = spawn(command, args, {
          timeout,
          cwd: cwd || process.env['DEFAULT_CWD'] || process.cwd(),
          shell: true,
          env: {
            ...process.env,
            ...env,
          },
        })
        let text = ''
        ls.stdout.on('data', (data) => {
          text += `${data}`
        })
        ls.stderr.on('data', (data) => {
          text += `${data}`
        })
        ls.on('error', (error) => {
          text += `[error]\n${error}`
        })
        ls.on('close', (code) => {
          if (code === 0) {
            resolve(text)
          } else {
            reject(`${text}\n[exit_code]: ${code}`)
          }
        })
      })
      try {
        const text = await func
        return {
          content: [{ type: 'text', text }],
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        }
      }
    },
  )

  return server
}
