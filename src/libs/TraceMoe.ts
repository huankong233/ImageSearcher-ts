import fetch from 'node-fetch'
import fs from 'fs'
import { fileFrom } from 'fetch-blob/from.js'
import { FormData } from 'formdata-polyfill/esm.min.js'
import { download } from './download.js'

export const BASE_URL = 'https://api.trace.moe'

interface TraceMoe {
  cutBorders: boolean
  imagePath?: string
  url?: string
}

export async function TraceMoe(req: TraceMoe) {
  const { imagePath, url } = req
  const form = new FormData()
  if (imagePath) {
    form.append('image', await fileFrom(imagePath))
    return await request(form, req)
  } else if (url) {
    //download image
    const fullPath = await download(url)
    form.append('image', await fileFrom(fullPath))
    const data = await request(form, req)
    fs.unlinkSync(fullPath)
    return data
  } else {
    throw Error('please input imagePath or url')
  }
}

interface response {
  frameCount: number
  error: string
  result: responseData[]
}

interface responseData {
  anilist: responseAnilist
  filename: string | null
  episode: number | null
  from: number
  to: number
  similarity: number
  video: string | null
  image: string | null
}

interface responseAnilist {
  id: number
  idMal: number
  title: responseAnilistTitle
  synonyms: []
  isAdult: boolean
}

interface responseAnilistTitle {
  native: string | null
  romaji: string | null
  english: string | null
}

export async function request(form: FormData, req: TraceMoe) {
  const { cutBorders } = req
  const res = (await fetch(
    `${BASE_URL}/search?anilistInfo=1${cutBorders ? '&&cutBorders=1' : ''}`,
    {
      method: 'POST',
      body: form
    }
  ).then(res => res.json())) as response
  return parse(res)
}

export function parse(res: response) {
  const { result } = res
  return result
    .map(data => {
      data.similarity *= 100
      data.from *= 1000
      data.to *= 1000
      data.image = replaceAmp(data.image)
      data.video = replaceAmp(data.video)
      return data
    })
    .filter(<T>(v: T | undefined): v is T => v !== undefined)
    .sort((a, b) => a.similarity - b.similarity)
    .reverse()
}

const replaceAmp = (str: string | null) => (str ? str.replace(new RegExp('&amp;', 'g'), '&') : null)
