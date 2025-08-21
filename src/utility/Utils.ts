export function padWithZero(value: number): string {
  if (value < 10) {
    return "0" + value.toString()
  } else {
    return value.toString()
  }
}

export function parseTime(time: string): [number, number, number] {
  const regex = /^([0-9]+):([0-5][0-9]):([0-5][0-9])$/
  const result = regex.exec(time)

  const getRegexRes = (
    regexResult: RegExpExecArray | null,
    index: number,
  ): number | undefined => {
    if (!regexResult || !regexResult[index]) {
      return undefined
    }
    const parsed = parseInt(regexResult[index], 10)
    return isNaN(parsed) ? undefined : parsed
  }

  if (result) {
    const hour = getRegexRes(result, 1)
    const min = getRegexRes(result, 2)
    const sec = getRegexRes(result, 3)

    if (hour !== undefined && min !== undefined && sec !== undefined) {
      return [hour, min, sec]
    }
  }

  return [0, 0, 0]
}

export function customCompare(a: number | undefined, b: number | undefined): number {
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return a - b
}

export function addTime(tB: string, tA: string): string {
  const matchA = parseTime(tA)
  const matchB = parseTime(tB)

  const hrSum = matchA[0] + matchB[0]
  const minSum = matchA[1] + matchB[1]
  const secSum = matchA[2] + matchB[2]

  let carry = 0
  const totalSec = secSum % 60
  carry = Math.floor(secSum / 60)

  const totalMin = (minSum + carry) % 60
  carry = Math.floor((minSum + carry) / 60)

  const totalHr = hrSum + carry

  return (
    padWithZero(totalHr) +
    ":" +
    padWithZero(totalMin) +
    ":" +
    padWithZero(totalSec)
  )
}
