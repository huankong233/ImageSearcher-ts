import fetch from 'node-fetch'
import { fileFrom } from 'fetch-blob/from.js'
import { FormData } from 'formdata-polyfill/esm.min.js'

export const BASE_URL = 'https://iqdb.org/'

interface IqDB {
  discolor: boolean
  services: servicesKeys[]
  imagePath?: string
  url?: string
}

type servicesKeys =
  | 'danbooru'
  | 'konachan'
  | 'yandere'
  | 'gelbooru'
  | 'sankaku_channel'
  | 'e_shuushuu'
  | 'zerochan'
  | 'anime_pictures'

export async function IqDB(req: IqDB) {
  const { services, discolor, imagePath, url } = req
  const form = new FormData()
  if (imagePath) {
    form.append('file', await fileFrom(imagePath))
  } else if (url) {
    form.append('url', url)
  } else {
    throw Error('please input imagePath or url')
  }

  if (services) services.forEach((s, index) => form.append(`service.${index}`, s.toString()))
  if (discolor) form.append('forcegray', 'on')

  const response = await fetch(BASE_URL, { method: 'POST', body: form }).then(res => res.text())

  return parse(response)
}

import * as cheerio from 'cheerio'
import _ from 'lodash'

export function parse(body: string) {
  const $ = cheerio.load(body)
  return _.map($('table'), result => {
    const content = $(result).text(),
      [link] = $('td.image > a', result),
      [image] = $('td.image img', result)

    if (!link) return

    const [, similarity] = content.match(/(\d+%)\s*similarity/) ?? [],
      [, level] = content.match(/\[(\w+)\]/) ?? [],
      [, resolution] = content.match(/(\d+×\d+)/) ?? []

    return {
      url: new URL(link.attribs.href, BASE_URL).toString(),
      image: new URL(image.attribs.src, BASE_URL).toString(),
      similarity: parseFloat(similarity),
      resolution,
      level: level.toLowerCase()
    }
  })
    .filter(<T>(v: T | undefined): v is T => v !== undefined)
    .sort((a, b) => a.similarity - b.similarity)
    .reverse()
}
