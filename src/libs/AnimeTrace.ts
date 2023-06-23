import fetch from 'node-fetch'
import { fileFrom } from 'fetch-blob/from.js'
import { FormData } from 'formdata-polyfill/esm.min.js'
import { download } from './download.js'
import fs from 'fs'

export const BASE_URL = 'https://aiapiv2.animedb.cn/ai/api/detect'

interface AnimeTrace {
  model: AnimeTraceModels
  mode: 1 | 0
  url?: string
  imagePath?: string
  preview?: boolean
}

type AnimeTraceModels =
  | 'anime'
  | 'pre_stable'
  | 'anime_model_lovelive'
  | 'game'
  | 'game_model_kirakira'

export async function AnimeTrace(req: AnimeTrace) {
  const { url, imagePath } = req
  const form = new FormData()
  if (imagePath) {
    form.append('image', await fileFrom(imagePath))
    return await request(form, req)
  } else if (url) {
    //download image
    const fullPath = await download(url)
    req.imagePath = fullPath
    form.append('image', await fileFrom(fullPath))
    const data = await request(form, req)
    fs.unlinkSync(fullPath)
    return data
  } else {
    throw Error('please input imagePath or url')
  }
}

interface response {
  code: number
  data: responseData[]
}

interface responseData {
  box: number[]
  char: responseDataChar[]
  box_id: string
  preview: string | null
}

interface responseDataChar {
  name: string
  cartoonname: string
  acc: number
}

export async function request(form: FormData, req: AnimeTrace) {
  const { model, mode } = req

  const response = (await fetch(
    `${BASE_URL}?model=${model ? model : 'anime'}&force_one=${mode ? mode : 1}`,
    {
      method: 'POST',
      body: form
    }
  ).then(res => res.json())) as response

  if (response.code === 0) {
    return await parse(response.data, req)
  } else {
    console.log(response)
    throw new Error('请求失败')
  }
}

import Jimp from 'jimp'
export async function parse(response: responseData[], req: AnimeTrace) {
  if (req.preview) {
    let image
    try {
      image = await Jimp.read(req.imagePath as string)
      const width = image.getWidth()
      const height = image.getHeight()
      for (let i = 0; i < response.length; i++) {
        const box = response[i].box
        const newImage = image.clone()
        // 裁切图片
        newImage.crop(
          width * box[0],
          height * box[1],
          width * (box[2] - box[0]),
          height * (box[3] - box[1])
        )
        response[i].preview = (await newImage.getBase64Async(Jimp.AUTO)).split(',')[1]
      }
    } catch (error) {
      for (let i = 0; i < response.length; i++) {
        response[i].preview = 'fail unsupport image type'
      }
    }
  }
  return response
}
