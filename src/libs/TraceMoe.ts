import axios from 'axios'
import { FormData } from 'formdata-node'
import { fileFromPath } from 'formdata-node/file-from-path'
import fs from 'fs'
import { download } from './download.js'

export const BASE_URL = 'https://api.trace.moe'

export type TraceMoeReq = {
  cutBorders?: boolean
} & (
  | {
      imagePath: string
    }
  | {
      url: string
    }
)

export interface TraceMoeApiRes {
  frameCount: number
  error: string
  result: TraceMoeRes[]
}

export interface TraceMoeRes {
  anilist: number
  filename: string | null
  episode: number | null
  from: number
  to: number
  similarity: number
  video: string
  image: string
}

export async function TraceMoe(req: TraceMoeReq) {
  const form = new FormData()

  let fullPath
  if ('imagePath' in req && req.imagePath) {
    fullPath = req.imagePath
    form.append('image', await fileFromPath(req.imagePath))
  } else if ('url' in req && req.url) {
    fullPath = await download(req.url)
    form.append('image', await fileFromPath(fullPath))
  } else {
    throw Error('please input imagePath or url')
  }

  const { cutBorders } = req
  const res = await axios.post<TraceMoeApiRes>(
    `${BASE_URL}/search?cutBorders${cutBorders ? '&cutBorders=1' : ''}`,
    form
  )

  if ('url' in req && fullPath) fs.unlinkSync(fullPath)

  const data = res.data
  if (data.error !== '') throw new Error(data.error)

  return data.result
    .map((data) => {
      data.similarity *= 100
      data.from *= 1000
      data.to *= 1000
      data.image = decodeURIComponent(data.image ?? '')
      data.video = decodeURIComponent(data.video ?? '')
      return data
    })
    .filter((v) => v !== undefined)
    .sort((a, b) => b.similarity - a.similarity)
}
