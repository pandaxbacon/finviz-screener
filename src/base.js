'use strict'

const axios = require('axios').default
const rateLimit = require('axios-rate-limit')
const cheerio = require('cheerio')
const selector = '#screener-table > td > table > tbody > tr > td > table > tbody > tr:not(:first-child) > td:nth-child(2)';

/**
 * @typedef {object} Options
 * @property {number?} pageLimit Maximum number of pages to fetch. Set to `0` to disable. Default is 1
 * @property {number?} requestTimeout Number of milliseconds to wait between requests. Default is 1000
 */

const defaults = {
    pageLimit: 1,
    requestTimeout: 1000,
}

/**
 * @class
 * @typicalname fv
 * @example
 * const fv = new FinVizScreener()
 *
 * const tickers = await fv
 *     .averageVolume('Over 2M')
 *     .sector('Technology')
 *     .price('Over $50')
 *     .scan()
 *
 * console.log(tickers) //=> ['AAPL', 'MSFT', 'IBM', ... ]
 */
class FinVizScreener {
    /**
     * @param {Options} options Options
     */
    constructor(options) {
        /** @type {Options} Client instance options */
        this.options = Object.assign({}, defaults, options)
        /** @private */
        this._axios = rateLimit(
            axios.create({ baseURL: 'https://finviz.com/screener.ashx?v=111' }),
            { maxRequests: 1, perMilliseconds: this.options.requestTimeout }
        )
        // console.log(axios.baseURL)
        // console.log(this._axios.defaults.baseURL); 
        /** @private */
        this._signal = ''
        /** @private */
        this._filters = []
    }

    /**
     * Scan for stocks.
     *
     * @returns {Promise<string[]>} List of stock tickers
     */
    async scan() {
        const params = { f: this._filters.join(','), s: this._signal }

        // console.log(params)

        let tickers = []
        let nextPage = ''
        let cancel = false
        let counter = 0
        // console.log(this._axios.defaults.baseURL); 
        

        do {
            cancel = this.options.pageLimit !== 0 && ++counter >= this.options.pageLimit
            // fetch tickers
            const res = await this._axios.get(nextPage, { params })
            const $ = cheerio.load(res.data)
            tickers = tickers.concat($(selector).map((i, el) => $(el).text().trim()).get())
            // find next page
            const $nextPageLink = $('.screener_pagination a.tab-link.is-next');
            nextPage = $nextPageLink.length > 0 ? $nextPageLink.prop('href') : '';
        } while(nextPage && ! cancel)

        return tickers
    } // scan()
} // class

module.exports = FinVizScreener