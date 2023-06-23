import fetch from 'node-fetch'

export const BASE_URL = 'https://yandex.com/'

interface Yandex {
  url?: string
  cookie?: string
}

export async function Yandex(req: Yandex) {
  const { url, cookie } = req

  if (!url) throw Error('please input url')

  const requestUrl = `${BASE_URL}images/search?cbir_page=similar&rpt=imageview&url=${url}`

  const response = await fetch(requestUrl, { headers: { cookie: cookie ?? '' } }).then(res =>
    res.text()
  )

  if (response.search('Please confirm that you and not a robot are sending requests') !== -1) {
    throw new Error(`request failed,request URL:${requestUrl}`)
  }

  return parse(response)
}

import * as cheerio from 'cheerio'
import _ from 'lodash'

export function parse(body: string) {
  const $ = cheerio.load(body, { decodeEntities: true })
  return _.map($('.serp-list .serp-item'), item => {
    return JSON.parse(item.attribs['data-bem'])['serp-item']
  }).filter(<T>(v: T | undefined): v is T => v !== undefined)
}
