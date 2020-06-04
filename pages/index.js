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


export default function Puts(props) {
  const [symbols, setSymbols] = useLocalStorage('symbols', ['TSLA', 'AAPL', 'GE', 'MSFT'])
  // const [symbols, setSymbols] = useState(() => ['GE'])
  const move = useCallback(
    (dragIndex, hoverIndex) => {
      const dragCard = symbols[dragIndex]
      setSymbols(
        update([...symbols], {
          $splice: [
            [dragIndex, 1],
            [hoverIndex, 0, dragCard],
          ],
        }),
      )
    },
    [symbols],
  )
  return (
    <>
      <NavBar />
      <Container>
        {symbols.map((symbol, i) => (
          <Draggable key={i} moveCard={move} index={i} id={symbol+i}>
            <OptionsChainingTable
              symbol={symbol}
              removeSymbol={() => setSymbols(s => s.filter(sym => sym !== symbol))}
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

function OptionsChainingTable({ symbol, removeSymbol, editSymbol }) {
  const [discounts, setDiscounts] = useLocalStorage(`discounts-${symbol}`, [.10, .15, .20])
  const [tradeAmt, setTradeAmount] = useLocalStorage(`trade-amount-${symbol}`, '$1,000,000')
  const tradeAmount = parseFloat(String(tradeAmt).replace(/\,|\$/gi, ''))
  const { data = {} } = useSWR(`/api/ameritrade/puts?symbol=${symbol.toUpperCase()}`)
  const [open, setOpen] = useLocalStorage(`open-${symbol}`)
  
  const { currentMarketValue = 0, error, putExpDateMap = {} } = data
  const staticContractsCount = tradeAmount / (currentMarketValue * 100)
  const [isStatic, setIsStatic] = useLocalStorage(`${symbol}-is-static-#-of-contracts`, true)
  const rows = useMemo(() => discounts.map((decimalPercent, i) => {
    const percent = Math.round(decimalPercent * 100)
    const discountedStrikePrice = (1 - decimalPercent) * currentMarketValue
    const contractsCount = isStatic ? staticContractsCount : (tradeAmount / (discountedStrikePrice * 100)) // here for when we do dynamic
    const putOptionChains = Object.values(putExpDateMap).map(putsByStrikePrice => {
      const closestStrikePrice = getClosestNumber(discountedStrikePrice, putsByStrikePrice)
      // TODO: what if we have multiple puts
      const closestPut = putsByStrikePrice[closestStrikePrice]
      let closestBid = (closestPut.bid * 100 * contractsCount).toFixed(2).toLocaleString()
      if (closestBid === '0.00') closestBid = 0
      let { daysToExpiration } = closestPut || {}
      let closestBidPerDay = (closestBid / (daysToExpiration || 1)).toFixed(2).toLocaleString()
      if (closestBidPerDay === '0.00') closestBidPerDay = 0
      return {
        closestBid,
        closestBidPerDay,
        contractsCount
      }
    })
    return {
      discount: percent,
      contractsCount,
      discountedStrikePrice,
      putOptionChains
    }
  }), [discounts, putExpDateMap, isStatic, tradeAmount])

  const expirations = Object.entries(putExpDateMap).map(
    ([expDate, putsByStrikePrice]) => ({
      date: expDate,
      days: Object.values(putsByStrikePrice)[0].daysToExpiration
    })
  )
  if (error) console.error(error)

  return (
    <OptionChainTableContainer>
      <Row>
        <Col>
          <TextField
            label={moment().format('LL')}
            helperText={!expirations.length ? <Skeleton height={14} width={50} /> : <span title={`Market Price: $${currentMarketValue}`}>${currentMarketValue}</span>}
            placeholder='Add Stock Symbol'
            value={symbol}
            onChange={e => editSymbol(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          
        </Col>
        <NumberInput
          prefix='$'
          label='Trade Amount'
          customInput={TextField}
          placeholder='Add Trade Amount'
          value={tradeAmt}
          onChange={e => setTradeAmount(e.target.value)}
          thousandSeparator={true}
        />
        <Close style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={removeSymbol} />
      </Row>
      {!expirations.length ? <LoadingTable rows={discounts} /> : (
<OptionsTable size="small" aria-label="purchases">
        <TBody>
          <TR>
            <SmallCell />
            <TableCell />
            <TableCell />
            <TableCell># Of Contracts</TableCell>
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
            <TableCell>Discount %</TableCell>
            <TableCell>Discount $</TableCell>
            <TableCell>
              <NumberOfContractsToggle
                control={<Switch size='small' color='primary' checked={isStatic} onChange={() => setIsStatic(!isStatic)} />}
                label={isStatic ? 'Static' : 'Dynamic'}
              />
            </TableCell>
            {expirations.map(exp => (
              <Fragment key={exp.days}>
                <TableHead style={{ display: 'table-cell' }} className='MuiTableCell-sizeSmall' component='th' scope='col'>Total Income</TableHead>
                <TableHead style={{ display: 'table-cell' }} className='MuiTableCell-sizeSmall' component='th' scope='col'>Income/Day</TableHead>
                <TableHead style={{ display: 'table-cell' }} className='MuiTableCell-sizeSmall' component='th' scope='col'>Annual ROI %</TableHead>
              </Fragment>
            ))}
          </TR>
          {rows.map((row, i) => (
            <DiscountRow
              key={i}
              {...row}
              tradeAmount={tradeAmount}
              remove={() => setDiscounts(discounts.filter((d, j) => j !== i))}
              edit={e => {
                const copy = [...discounts]
                copy[i] = Number(parseFloat(e.target.value / 100).toFixed(2))
                setDiscounts(copy)
              }}
            />
          ))}
        </TBody>
      </OptionsTable>
      )}
      <AddCircleOutline style={{ cursor: 'pointer', margin: '8px 100% 0 0' }} onClick={() => setDiscounts([...discounts, 0.1])} />
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
const NumberOfContractsToggle = styled(FormControlLabel)`
  .MuiFormControlLabel-label {
    font-size: 12px !important;
  }
`

const DiscountRow = props => {
  const {
    contractsCount,
    edit,
    discount,
    discountedStrikePrice,
    putOptionChains,
    remove,
    tradeAmount
  } = props

  const [visibility, setVisible] = useState('hidden')
  return (
    <TableRow onMouseEnter={() => setVisible('visible')} onMouseLeave={() => setVisible('hidden')}>
      <SmallCell>
        <Close style={{ cursor: 'pointer', transition: '.1s', visibility }} onClick={remove} />
      </SmallCell>
      <TableCell scope="row">
        <PercentInput
          placeholder='add percent'
          value={discount}
          onChange={edit}
        />
      </TableCell>
      <TableCell scope="row">
        ${twoDecimalsWithCommas(discountedStrikePrice)}
      </TableCell>
      <TableCell>
        {Math.floor(contractsCount)}
      </TableCell>
      {putOptionChains.map(({ closestBid, closestBidPerDay }, j) => (
        <Fragment key={j}>
          <TableCell>${twoDecimalsWithCommas(closestBid)}</TableCell>
          <TableCell>${twoDecimalsWithCommas(closestBidPerDay)}</TableCell>
          <TableCell>{(closestBidPerDay * 365 / tradeAmount * 100).toFixed()}%</TableCell>
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