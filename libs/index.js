
export function getClosestNumber(needle, haystack) {
  return Object.keys(haystack).reduce((prev, curr) => Math.abs(curr - needle) < Math.abs(prev - needle) ? curr : prev)
}

export function twoDecimalsWithCommas(amount) {
  return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}