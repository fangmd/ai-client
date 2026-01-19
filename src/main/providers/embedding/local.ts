// 在导入之前设置环境变量，强制使用 WebAssembly 后端
// 避免在 Electron 中加载 onnxruntime-node（原生模块在 Electron 中可能无法正常工作）
if (typeof process !== 'undefined') {
  // 设置环境变量，让 @xenova/transformers 强制使用 WebAssembly
  process.env.USE_WASM = '1'
  // 禁用 Node.js 后端，强制使用 WASM
  process.env.USE_ONNXRUNTIME_NODE = '0'
  // 阻止加载本地模型文件
  process.env.ALLOW_LOCAL_MODELS = '0'
}

import { pipeline, env } from '@xenova/transformers'
import { logError, logInfo } from '@/main/utils'

// 配置 WebAssembly 后端
// 禁用 Node.js 后端，强制使用 WASM
env.backends.onnx.node = false
env.backends.onnx.wasm.numThreads = 1
// 禁用本地模型，强制使用 WASM
env.allowLocalModels = false
// 设置缓存目录（可选，但有助于性能）
if (typeof process !== 'undefined' && process.env.HOME) {
  env.cacheDir = `${process.env.HOME}/.cache/xenova-transformers`
  logInfo('Embedding cache directory set to', { cacheDir: env.cacheDir })
}

// 修改远程主机地址为国内镜像
env.remoteHost = 'https://hf-mirror.com';
const MODEL_NAME = 'Xenova/bge-small-zh-v1.5'

type EmbeddingOutput =
  | { data: Float32Array | number[]; dims: number[] }
  | Array<Float32Array | number[]>

let embeddingPipeline: any | null = null
let pipelineInitializing: Promise<any> | null = null

async function getPipeline(): Promise<any> {
  if (embeddingPipeline) return embeddingPipeline
  if (!pipelineInitializing) {
    pipelineInitializing = pipeline('feature-extraction', MODEL_NAME)
  }
  embeddingPipeline = await pipelineInitializing
  return embeddingPipeline
}

function normalizeEmbeddingOutput(output: EmbeddingOutput): Float32Array[] {
  if (Array.isArray(output)) {
    return output.map((item) => (item instanceof Float32Array ? item : new Float32Array(item)))
  }

  const data = output.data instanceof Float32Array ? output.data : new Float32Array(output.data)
  if (output.dims.length === 1) {
    return [data]
  }

  if (output.dims.length === 2) {
    const [batch, dim] = output.dims
    const results: Float32Array[] = []
    for (let i = 0; i < batch; i += 1) {
      const start = i * dim
      const end = start + dim
      results.push(data.slice(start, end))
    }
    return results
  }

  return [data]
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return []
  try {
    const extractor = await getPipeline()
    const output = (await extractor(texts, {
      pooling: 'mean',
      normalize: true
    })) as EmbeddingOutput
    return normalizeEmbeddingOutput(output)
  } catch (error) {
    logError('Embedding failed', { error })
    throw error
  }
}

export async function warmupEmbeddingModel(): Promise<void> {
  try {
    await getPipeline()
    logInfo('Embedding model loaded', { model: MODEL_NAME })
  } catch (error) {
    logError('Failed to load embedding model', { error })
    throw error
  }
}
