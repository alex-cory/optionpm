import { useEffect, useState, useMemo, useReducer, useRef, Fragment, useCallback } from 'react'
import { Button, Switch, FormControlLabel, Table, TableRow, TableBody, TableCell, TableHead, TextField } from '@material-ui/core'
import { Close, AddCircleOutline } from '@material-ui/icons'
import { Skeleton } from '@material-ui/lab'
import styled, { css } from 'styled-components'
import moment from 'moment'
// import useFetch from 'uf'
import useSWR from 'swr'
import NumberInput from 'react-number-format'
import { useLocalStorage } from 'react-use'
import PercentInput from '../components/PercentInput'
import NavBar from '../components/NavBar'
import Draggable from '../components/Draggable'
import update from 'immutability-helper'
import { getClosestNumber, twoDecimalsWithCommas } from '../libs'

const toNumber = x => parseFloat(String(x).replace(/\,|\$/gi, ''))

export default function Calls(props) {
  const [symbols, setSymbols] = useLocalStorage('call-symbols', ['TSLA', 'AAPL', 'GE', 'MSFT'])
  // const [symbols, setSymbols] = useState(() => ['GE'])
  const move = useCallback(
    (dragIndex, hoverIndex) => {
      const dragCard = symbols[dragIndex]
      const updated = update([...symbols], {
          $splice: [
            [dragIndex, 1],
            [hoverIndex, 0, dragCard],
          ],
        })
        // console.log('updated', updated)
      setSymbols(updated)
    },
    [symbols],
  )

  return (
    <>
      <NavBar />
      <Container>
        {symbols.map((symbol, i) => (
          <Draggable key={i} moveCard={move} index={i} id={symbol}>
            <OptionsChainingTable
              symbol={symbol}
              removeSymbol={() => setSymbols(symbols.filter(sym => sym !== symbol))}
              editSymbol={v => {
                const temp = [...symbols]
                temp[i] = v
                setSymbols(temp)
              }}
            />
          </Draggable>
        ))}
        <Button
          color='primary'
          variant='contained'
          style={{ margin: '0 auto 12px 0' }}
          onClick={() => setSymbols([...symbols, ''])}
        >
          Add Symbol
        </Button>
      </Container>
    </>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 12px;
`

const NumberInput2 = styled(NumberInput)`
  width: 100px;
  & > div > input {
    color: ${props => !props.isBlue ? '#CACACA' : 'inherit'};
  }
  & > p {
    color: ${props => !props.isBlue ? '#CACACA' : 'inherit'};
  }
`

function OptionsChainingTable({ symbol, removeSymbol, editSymbol }) {
  const [premiums, setPremiums] = useLocalStorage(`call-premiums-${symbol}`, [.10, .15, .20])
  // console.log(`(${symbol}) premiums`, premiums)
  const [purchasePrice, setPurchasePrice] = useLocalStorage(`call-purchase-price${symbol}`, 10)
  const [withPurchasePrice, setWithPurchasePrice] = useLocalStorage(`call-with-purchase-price${symbol}`, false)
  const [numberOfContracts, setNumberOfContracts] = useLocalStorage(`call-#-of-contracts-${symbol}`, 10)
  const contractsCount = toNumber(numberOfContracts)
  const { data = {} } = useSWR(`/api/ameritrade/calls?symbol=${symbol.toUpperCase()}`, k => fetch(k).then(r => r.json()))
  
  const { currentMarketValue = 0, error, callExpDateMap = {} } = data
  const price = withPurchasePrice ? toNumber(purchasePrice) : currentMarketValue
  const tradeAmount = contractsCount * price * 100
  const rows = useMemo(() => premiums.map((decimalPercent, i) => {
    const premiumStrikePrice = (1 + decimalPercent) * price
    const callOptionChains = Object.values(callExpDateMap).map(callsByStrikePrice => {
      const closestStrikePrice = getClosestNumber(premiumStrikePrice, callsByStrikePrice)
      // TODO: what if we have multiple calls
      const closestCall = callsByStrikePrice[closestStrikePrice] || {}
      let totalIncome = (closestCall.bid * 100 * contractsCount)
      let incomePerDay = (totalIncome / (closestCall.daysToExpiration || 1))
      const annualROI = incomePerDay * 365 / tradeAmount * 100
      return {
        totalIncome: twoDecimalsWithCommas(totalIncome),
        incomePerDay: twoDecimalsWithCommas(incomePerDay),
        annualROI: annualROI.toFixed()
      }
    })
    return {
      id: '_' + Math.random().toString(36).substr(2, 9),
      premiumPercent: Math.round(decimalPercent * 100),
      contractsCount,
      premiumStrikePrice,
      callOptionChains
    }
  }), [premiums, callExpDateMap, numberOfContracts, tradeAmount])
  // console.log('rerendered', symbol, rows.length)

  const expirations = Object.entries(callExpDateMap).map(
    ([expDate, callsByStrikePrice]) => ({
      date: expDate,
      days: Object.values(callsByStrikePrice)[0].daysToExpiration
    })
  )
  if (error) console.error(error)
  return (
    <OptionChainTableContainer>
      <Row>
        <Col>
          <TextField
            label={moment().format('LL')}
            placeholder='Add Stock Symbol'
            value={symbol}
            onChange={e => editSymbol(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          
        </Col>
        <NumberInput
          label='# of Contracts'
          customInput={TextField}
          placeholder='add # of contracts'
          value={numberOfContracts}
          onChange={e => setNumberOfContracts(e.target.value)}
          thousandSeparator={true}
        />
        <Close style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={removeSymbol} />
      </Row>
      <Row>
        <NumberInput2
          prefix='$'
          helperText='Market Price'
          onFocus={(e) => e.target.blur()}
          isBlue={!withPurchasePrice}
          customInput={TextField}
          value={currentMarketValue}
          thousandSeparator={true}
        />
        {!expirations.length ? <Center style={{ height: 50, margin: '0 12px' }}><Skeleton width={20} height={12} /></Center> : (
          <PurchasePriceToggle
            control={<Switch size='small' color='primary' checked={withPurchasePrice} onChange={() => setWithPurchasePrice(!withPurchasePrice)} />}
          />
        )}
        {!expirations.length ? <Col>
          <Skeleton height={32} width={64} />
          <Skeleton height={2} width={100} />
          <Skeleton height={12} width={90} />
        </Col> : (
          <NumberInput2
            isBlue={withPurchasePrice}
            prefix='$'
            helperText='Purchase Price'
            customInput={TextField}
            placeholder='add purchase price'
            value={purchasePrice}
            onChange={e => setPurchasePrice(e.target.value)}
            thousandSeparator={true}
          />
        )}
      </Row>
      {!expirations.length ? <LoadingTable rows={premiums} /> : (
        <OptionsTable size="small" aria-label="purchases">
          <TBody>
            <TR>
              <SmallCell />
              <TableCell />
              <TableCell />
              {expirations.map(exp => (
                <TableHead
                  component='th'
                  colSpan='3'
                  scope='colgroup'
                  style={{ display: 'table-cell' }}
                  className='MuiTableCell-sizeSmall' 
                  key={exp.days}
                >
                  {moment(exp.date, 'YYYY-MM-DD').format('LL')} - {exp.days} DTE (days to expiry)
                </TableHead>
              ))}
            </TR>
            <TR>
              <SmallCell />
              <TableCell>Premium %</TableCell>
              <TableCell>Premium $</TableCell>
              {expirations.map(exp => (
                <Fragment key={exp.days}>
                  <TableHead style={{ display: 'table-cell' }} className='MuiTableCell-sizeSmall' component='th' scope='col'>Total Income</TableHead>
                  <TableHead style={{ display: 'table-cell' }} className='MuiTableCell-sizeSmall' component='th' scope='col'>Income/Day</TableHead>
                  <TableHead style={{ display: 'table-cell' }} className='MuiTableCell-sizeSmall' component='th' scope='col'>Annual ROI %</TableHead>
                </Fragment>
              ))}
            </TR>
            {rows.map((row, i) => (
              <PremiumRow
                key={i}
                {...row}
                tradeAmount={tradeAmount}
                remove={() => setPremiums(premiums.filter((d, j) => j !== i))}
                edit={e => {
                  const copy = [...premiums]
                  copy[i] = Number(parseFloat(e.target.value / 100).toFixed(2))
                  setPremiums(copy)
                }}
              />
            ))}
          </TBody>
        </OptionsTable>
      )}
      <div style={{ display: 'flex' }}>
        <Center style={{ margin: '8px 0 0 0', cursor: 'pointer', fontSize: 12 }} onClick={() => setPremiums([...premiums, 0.1])} >
          <AddCircleOutline style={{ marginRight: 4 }} />
          Add Premium
        </Center>
      </div>
    </OptionChainTableContainer>
  )
}
const TR = styled(TableRow).attrs(() => ({
  component: 'tr',
  className: 'MuiTableCell-root'
}))`
  display: table-row !important;
`
const SmallCell = styled(TableCell)`
  padding: 0 !important;
  width: 32px !important;
`
const PurchasePriceToggle = styled(FormControlLabel)`
  margin-left: 10px !important;
  margin-right: 8px !important;
  .MuiFormControlLabel-root {
    font-size: 12px !important;
    margin-left: 10px !important;
  }
`
const Center = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`

const PremiumRow = props => {
  const {
    contractsCount,
    edit,
    premiumPercent,
    premiumStrikePrice,
    callOptionChains,
    remove,
    tradeAmount
  } = props

  const [visibility, setVisible] = useState('hidden')
  return (
    <TableRow onMouseEnter={() => setVisible('visible')} onMouseLeave={() => setVisible('hidden')}>
      <SmallCell>
        <Center>
          <Close style={{ cursor: 'pointer', transition: '.1s', visibility }} onClick={remove} />
        </Center>
      </SmallCell>
      <TableCell scope="row">
        <PercentInput
          placeholder='add percent'
          value={premiumPercent}
          onChange={edit}
        />
      </TableCell>
      <TableCell scope="row">
        ${twoDecimalsWithCommas(premiumStrikePrice)}
      </TableCell>
      {callOptionChains.map(({ totalIncome, incomePerDay, annualROI }, j) => (
        <Fragment key={j}>
          <TableCell>${totalIncome}</TableCell>
          <TableCell>${incomePerDay}</TableCell>
          <TableCell>{annualROI}%</TableCell>
        </Fragment>
      ))}
    </TableRow>
  )
}

const TBody = styled(TableBody)`
  & > tr:last-child > th {
    border-bottom: none !important;
  }
`
const FakeCell = styled.div.attrs(() => ({
  className: 'MuiTableCell-root MuiTableCell-body MuiTableCell-sizeSmall'
}))`
  ${({ width, minWidth }) => css`
    min-width: ${minWidth + 'px' || 'initial'};
    width: ${width + 'px' || 'initial'};
  `}
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  border-bottom: none !important;
`
const FakeTableHeader = styled.div.attrs(() => ({
  className: 'MuiTableCell-root MuiTableCell-body MuiTableCell-sizeSmall'
}))`
  border-bottom: none !important;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
`
const OptionsTable = styled(Table)`
  display: block !important;
  overflow-x: auto;
  white-space: nowrap;
`

const OptionChainTableContainer = styled.div`
  overflow: hidden;
  white-space: nowrap;
  margin-top: 8px;
`

const Row = styled.div`
  display: flex;
  text-align: left;
`

const LoadingTable = ({ rows }) => (
  <>
    <Skeleton height={32} width='calc(100% - 12px)' />
    <Skeleton height={37} width='calc(100% - 12px)' />
    {Object.keys(rows).map(i => (
      <Skeleton key={i} height={45} width='calc(100% - 12px)' />
    ))}
  </>
)