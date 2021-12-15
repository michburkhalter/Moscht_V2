import moment from 'moment';

export function time_formatter(cell, row, rowIndex, formatExtraData) {
  const format = 'DD.MM.YYYY hh:mm';
  return moment.unix(cell / 1000).format(format);
}

export function fuel_efficiency_formatter(
  cell,
  row,
  rowIndex,
  formatExtraData
) {
  if (typeof cell == 'number') {
    return cell + ' l/100km';
  } else {
    return '-';
  }
}

export function fuel_amount_formatter(cell, row, rowIndex, formatExtraData) {
  if (cell === undefined) {
    return '-';
  } else {
    return cell + ' l';
  }
}

export function odometer_formatter(cell, row, rowIndex, formatExtraData) {
  if (cell === undefined) {
    return '-';
  } else {
    return cell+' km';
  }
}

export function price_formatter(cell, row, rowIndex, formatExtraData) {
  if (cell === undefined) {
    return '-';
  } else {
    return cell + ' CHF';
  }
}
