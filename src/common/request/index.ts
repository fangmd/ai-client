/**
 * axios封装
 * 请求拦截、响应拦截、错误统一处理
 */

import axios from 'axios'
import createHeader from './custom-header'
import JSONbig from 'json-bigint'
const JSONbigString = JSONbig({ storeAsString: true })

// 创建axios实例
const instance = axios.create({
  timeout: 1000 * 10,
  headers: {
    get: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    post: {
      'Content-Type': 'application/json;charset=utf-8',
    },
  },
  // 解决相应数据 bingint 精度丢失问题
  transformResponse: [
    function (data) {
      /* eslint-disable no-undef */
      try {
        return JSONbigString.parse(data)
      } catch (error) {
        return data
      }
    },
  ],
})

const getUrlFromConfig = (config) => {
  let urlStr = instance.getUri(config)
  if (!urlStr.startsWith('http')) {
    urlStr = `${window.location.origin}${urlStr}`
  }
  return urlStr
}

// add global params
// instance.defaults.params = {}
// instance.defaults.params['clienttype'] = 'WEB'

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // console.log('config', config)
    const urlStr = getUrlFromConfig(config)
    let headers = createHeader(urlStr)
    for (let i in headers) {
      config.headers[i] = (headers as any)[i]
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  // 请求成功
  (res) => {
    console.log('instance.interceptors res', res)
    if (res.status === 200) {
      return Promise.resolve(res.data)
    } else {
      return Promise.reject(res.data)
    }
  },
  // 请求失败
  (error) => {
    const { response } = error
    console.log('error', error)
    if (error.message === 'Network Error') {
      // Toast({ message: '网络异常，请重试！' })
    } else {
      // Toast({ message: '请求失败，请稍后重试！' })
    }
    return Promise.reject(response)
  }
)

export default instance
