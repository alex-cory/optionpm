import fetch from 'isomorphic-unfetch'
import { stringify } from 'query-string'
import moment from 'moment'

const apiKey = 'TWH9TZESBMMN3WLBALF5R7KPDAMRSECA'

function getClosestNumber(needle, haystack) {
  return Object.keys(haystack).reduce((prev, curr) => Math.abs(curr - needle) < Math.abs(prev - needle) ? curr : prev)
}
export default async (req, res) => {
  // console.log('req.query', req.query)
  const { symbol, discounts, tradeAmount } = req.query
  const query = stringify({
    symbol,
    // daysToExpiration: 0,
    contractType: 'PUT',
    strategy: 'ANALYTICAL',
    // interval: 1,
    // fromDate: moment().add(2, 'days').format()
  })
  // console.log('RES', res)
  try {
    const response = await fetch(`https://api.tdameritrade.com/v1/marketdata/chains?apikey=${apiKey}&${query}`)
    const data = await response.json()
    if (data.error) return res.json(data)

    return res.json({
      currentMarketValue: data.underlyingPrice.toFixed(2),
      // have to pull some data out so we don't get a 413 server error
      putExpDateMap: Object.entries(data.putExpDateMap).reduce((acc, [expDate, putsByStrikePrice]) => {
        acc[expDate] = Object.entries(putsByStrikePrice).reduce((putsByStrikePriceMap, [strikePrice, [put]]) => {
          putsByStrikePriceMap[strikePrice] = {
            bid: put.bid,
            daysToExpiration: put.daysToExpiration
          }
          return putsByStrikePriceMap
        }, {})
        return acc
      }, {})
    })
    // return res.json(data)
    // return res.json({
    //   ...data,
    //   currentMarketValue,
    //   putExpDateMap: Object.entries(data.putExpDateMap).reduce((acc, [key, val], i) => i < 6 ? ({ ...acc, [key]: val }) : acc, {})
    // })
    const currentMarketValue = data.underlyingPrice.toFixed(2)
    const staticContractsCount = tradeAmount / (currentMarketValue * 100)
    if (typeof data.putExpDateMap !== 'object') {
      console.log('symbol', symbol)
      console.log('data', data)
      console.log('data.putExpDateMap!!!', data.putExpDateMap)
    } 
    const rows = discounts.map((decimalPercent, i) => {
      const percent = decimalPercent * 100
      const discountedStrikePrice = (1 - decimalPercent) * currentMarketValue
      const putOptionChains = Object.entries(data.putExpDateMap).map(([expDate, putsByStrikePrice]) => {
        const contractsCount = staticContractsCount // here for when we do dynamic
        const closestStrikePrice = getClosestNumber(discountedStrikePrice, putsByStrikePrice)
        // TODO: what if we have multiple puts
        const closestPut = putsByStrikePrice[closestStrikePrice][0]
        const closestBid = closestPut.bid * 100 * contractsCount
        let { daysToExpiration } = closestPut || {}
        return {
          closestBid,
          closestBidPerDay: closestBid / (daysToExpiration || 1),
          daysToExpiration,
          expDate
        }
      })
      return {
        percent,
        discountedStrikePrice,
        putOptionChains
      }
    })
    const expirations = Object.entries(data.putExpDateMap).map(
      ([expDate, { daysToExpiration }]) => ({
        date: expDate,
        days: daysToExpiration
      })
    )
    const formatted = {
      currentMarketValue,
      rows,
      expirations
      // putOptionChains: discounts.map((percent, i) => {

      // })
      // putExpDateMap: Object.entries(data.putExpDateMap).reduce((acc, [key, val], i) => i < 6 ? ({ ...acc, [key]: val }) : acc, {})
    }
    res.json(formatted)
  } catch (err) {
    console.log('ERR', err)
  }
}
