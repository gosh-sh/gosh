export const floatDecimals = (value: number, power = 5) => {
  var log10 = value ? Math.floor(Math.log10(value)) : 0,
    div = log10 < 0 ? Math.pow(10, 1 - log10) : 10**power;

  return Math.round(value * div) / div;
  }

export default floatDecimals;