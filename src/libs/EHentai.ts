import axios from 'axios'
import * as cheerio from 'cheerio'
import { FormData } from 'formdata-node'
import { fileFromPath } from 'formdata-node/file-from-path'
import fs from 'fs'
import { download } from './download.js'

export const BASE_URLs = {
  eh: 'https://upld.e-hentai.org/image_lookup.php',
  ex: 'https://exhentai.org/upld/image_lookup.php'
}

export type EhentaiReq = {
  site: 'eh' | 'ex'
  cover?: boolean
  deleted?: boolean
  similar?: boolean
  EH_COOKIE?: string
} & (
  | {
      imagePath: string
    }
  | {
      url: string
    }
)

export type EhentaiRes = {
  title: string
  image: string
  link: string
  type: string
  date: string
  tags: string[]
}[]

export async function EHentai(req: EhentaiReq): Promise<EhentaiRes> {
  const form = new FormData()

  let fullPath
  if ('imagePath' in req && req.imagePath) {
    form.append('sfile', await fileFromPath(req.imagePath))
  } else if ('url' in req && req.url) {
    //download image
    fullPath = await download(req.url)
    form.append('sfile', await fileFromPath(fullPath))
  } else {
    throw Error('please input imagePath or url')
  }

  const { site, cover, deleted, similar, EH_COOKIE } = req

  form.append('f_sfile', 'search')
  if (cover) form.append('fs_covers', 'on')
  if (similar) form.append('fs_similar', 'on')
  if (deleted) form.append('fs_exp', 'on')

  let response
  if (site === 'eh') {
    response = await axios.post<string>(BASE_URLs['eh'], form)
  } else if (site === 'ex') {
    response = await axios.post<string>(BASE_URLs['ex'], form, {
      headers: { Cookie: EH_COOKIE ?? '' }
    })
  } else {
    throw Error('site must be eh or ex')
  }

  if (fullPath) fs.unlinkSync(fullPath)

  const data = response.data
  const $ = cheerio.load(data)
  return $('.gltc > tbody > tr')
    .toArray()
    .map((result, index) => {
      if (index !== 0) {
        const title = $('.glink', result),
          [image] = $('.glthumb img', result),
          [link] = $('.gl3c a', result),
          type = $('.gl1c .cn', result),
          date = $('.gl2c [id^=posted]', result).eq(0),
          tags = $('.gl3c .gt', result)

        return {
          title: title.text(),
          image: image.attribs.src,
          link: link.attribs.href,
          type: type.text().toUpperCase(),
          date: date.text(),
          tags: tags.map((index, tag) => $(tag).text()).toArray()
        }
      }
    })
    .filter((item) => item !== undefined)
}
