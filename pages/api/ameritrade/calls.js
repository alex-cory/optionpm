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
    contractType: 'CALL',
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
      callExpDateMap: Object.entries(data.callExpDateMap).reduce((acc, [expDate, callsByStrikePrice]) => {
        acc[expDate] = Object.entries(callsByStrikePrice).reduce((callsByStrikePriceMap, [strikePrice, [call]]) => {
          callsByStrikePriceMap[strikePrice] = {
            bid: call.bid,
            daysToExpiration: call.daysToExpiration
          }
          return callsByStrikePriceMap
        }, {})
        return acc
      }, {})
    })
    // return res.json(data)
    // return res.json({
    //   ...data,
    //   currentMarketValue,
    //   callExpDateMap: Object.entries(data.callExpDateMap).reduce((acc, [key, val], i) => i < 6 ? ({ ...acc, [key]: val }) : acc, {})
    // })
    const currentMarketValue = data.underlyingPrice.toFixed(2)
    const staticContractsCount = tradeAmount / (currentMarketValue * 100)
    if (typeof data.callExpDateMap !== 'object') {
      console.log('symbol', symbol)
      console.log('data', data)
      console.log('data.callExpDateMap!!!', data.callExpDateMap)
    } 
    const rows = discounts.map((decimalPercent, i) => {
      const percent = decimalPercent * 100
      const discountedStrikePrice = (1 - decimalPercent) * currentMarketValue
      const callOptionChains = Object.entries(data.callExpDateMap).map(([expDate, callsByStrikePrice]) => {
        const contractsCount = staticContractsCount // here for when we do dynamic
        const closestStrikePrice = getClosestNumber(discountedStrikePrice, callsByStrikePrice)
        // TODO: what if we have multiple calls
        const closestCall = callsByStrikePrice[closestStrikePrice][0]
        const closestBid = closestCall.bid * 100 * contractsCount
        let { daysToExpiration } = closestCall || {}
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
        callOptionChains
      }
    })
    const expirations = Object.entries(data.callExpDateMap).map(
      ([expDate, { daysToExpiration }]) => ({
        date: expDate,
        days: daysToExpiration
      })
    )
    const formatted = {
      currentMarketValue,
      rows,
      expirations
      // callOptionChains: discounts.map((percent, i) => {

      // })
      // callExpDateMap: Object.entries(data.callExpDateMap).reduce((acc, [key, val], i) => i < 6 ? ({ ...acc, [key]: val }) : acc, {})
    }
    res.json(formatted)
  } catch (err) {
    console.log('ERR', err)
  }
}
