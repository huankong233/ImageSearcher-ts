import axios from 'axios'
import { FormData } from 'formdata-node'
import { fileFromPath } from 'formdata-node/file-from-path'
import fs from 'fs'
import { Jimp } from 'jimp'
import { download } from './download.js'

export const BASE_URL = 'https://aiapiv2.animedb.cn/ai/api/detect'

export type AnimeTraceReq = {
  model: AnimeTraceReqModels
  force_one?: 1 | 0
  ai_detect?: 1 | 0
  preview?: boolean
} & (
  | {
      url: string
    }
  | {
      imagePath: string
    }
)

export type AnimeTraceReqModels =
  // 通用
  | 'large_model_preview'
  // 动漫
  | 'anime'
  // 高级动画模型1
  | 'anime_model_lovelive'
  // 高级动画模型2
  | 'pre_stable'
  // galgame1
  | 'game'
  // galgame2
  | 'game_model_kirakira'

export interface AnimeTraceRes {
  ai: boolean
  code: number
  data: responseData[]
  new_code: number
}

interface responseData {
  box: [number, number, number, number, number]
  char: responseDataChar[]
  box_id: string
  preview: string | null
}

interface responseDataChar {
  name: string
  cartoonname: string
  acc: number
}

export async function AnimeTrace(req: AnimeTraceReq) {
  const form = new FormData()

  let fullPath
  if ('imagePath' in req && req.imagePath) {
    form.append('image', await fileFromPath(req.imagePath))
  } else if ('url' in req && req.url) {
    fullPath = await download(req.url)
    form.append('image', await fileFromPath(fullPath))
  } else {
    throw Error('please input imagePath or url')
  }

  const { model, force_one = 1, ai_detect = 0 } = req

  const response = await axios.post<AnimeTraceRes>(
    `${BASE_URL}?model=${model ? model : 'anime'}&force_one=${force_one}&ai_detect=${ai_detect}`,
    form
  )

  const data = response.data
  if (response.status !== 200 || data.code !== 0) throw new Error('The request failed')

  if (req.preview && fullPath) {
    try {
      const image = await Jimp.read(fs.readFileSync(fullPath))
      const width = image.width
      const height = image.height
      for (const index in data.data) {
        const item = data.data[index]
        const box = item.box
        const newImage = image.clone()
        // 裁切图片
        newImage.crop({
          x: width * box[0],
          y: height * box[1],
          w: width * (box[2] - box[0]),
          h: height * (box[3] - box[1])
        })
        const base64 = await newImage.getBase64('image/png')
        data.data[index].preview = base64.split(',')[1]
      }
    } catch (error) {
      for (const index in data.data) {
        data.data[index].preview = 'failed unsupported image type'
      }
    }
  }

  if (fullPath) fs.unlinkSync(fullPath)

  return data.data
}
