import fs from 'fs'
import fetch from 'node-fetch'
import { fileFrom } from 'fetch-blob/from.js'
import { FormData } from 'formdata-polyfill/esm.min.js'
import { download } from './download.js'

export const BASE_URLs = {
  eh: 'https://upld.e-hentai.org/image_lookup.php',
  ex: 'https://exhentai.org/upld/image_lookup.php'
}

interface Ehentai {
  site: 'eh' | 'ex'
  cover?: boolean
  deleted?: boolean
  similar?: boolean
  EH_COOKIE?: string
  imagePath?: string
  url: string
}

export async function EHentai(req: Ehentai) {
  const { imagePath, url } = req

  const form = new FormData()
  if (imagePath) {
    form.append('sfile', await fileFrom(imagePath))
    return await request(form, req)
  } else if (url) {
    //download image
    const fullPath = await download(url)
    form.append('sfile', await fileFrom(fullPath))
    const data = await request(form, req)
    fs.unlinkSync(fullPath)
    return data
  } else {
    throw Error('please input imagePath or url')
  }
}

export async function request(form: FormData, req: Ehentai) {
  const { site, cover, deleted, similar, EH_COOKIE } = req

  form.append('f_sfile', 'search')
  if (cover) form.append('fs_covers', 'on')
  if (similar) form.append('fs_similar', 'on')
  if (deleted) form.append('fs_exp', 'on')

  let response
  if (site === 'eh') {
    response = await fetch(BASE_URLs['eh'], {
      method: 'POST',
      body: form
    }).then(res => res.text())
  }

  if (site === 'ex') {
    response = await fetch(BASE_URLs['ex'], {
      method: 'POST',
      body: form,
      headers: { Cookie: EH_COOKIE ?? '' }
    }).then(res => res.text())
  }

  return parse(response as string)
}

import * as cheerio from 'cheerio'
import _ from 'lodash'

export function parse(body: string) {
  const $ = cheerio.load(body)
  return _.map($('.gltc > tbody > tr'), (result, index) => {
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
        tags: _.map(tags, tag => $(tag).text())
      }
    }
  }).filter(<T>(v: T | undefined): v is T => v !== undefined)
}
