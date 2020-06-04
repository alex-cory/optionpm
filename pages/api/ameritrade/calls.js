import fetch from 'isomorphic-unfetch'
import { stringify } from 'query-string'
import moment from 'moment'

const apiKey = 'TWH9TZESBMMN3WLBALF5R7KPDAMRSECA'

function getClosestNumber(needle, haystack) {
  return Object.keys(haystack).reduce((prev, curr) => Math.abs(curr - needle) < Math.abs(prev - needle) ? curr : prev)
}

export default async (req, res) => {
  const { symbol, discounts, tradeAmount } = req.query
  const query = stringify({
    symbol,
    // daysToExpiration: 0,
    contractType: 'CALL',
    strategy: 'ANALYTICAL',
    // interval: 1,
    // fromDate: moment().add(2, 'days').format()
  })
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
  } catch (err) {
    console.log('ERR', err)
  }
}
