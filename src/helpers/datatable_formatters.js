export function time_formatter(cell, row, rowIndex, formatExtraData) {
  const d = new Date(cell);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() +1).padStart(2, '0');
  const year = String(d.getFullYear());//.padStart(4,'0');
  const hours = String(d.getHours()).padStart(2,'0');
  const minutes = String(d.getMinutes()).padStart(2,'0');

  const time = `${day}.${month}.${year} ${hours}:${minutes}`;

  return time;
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
    var parts = cell.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return parts.join('.') + ' km';
  }
}

export function price_formatter(cell, row, rowIndex, formatExtraData) {
  if (cell === undefined) {
    return '-';
  } else {
    return cell + ' CHF';
  }
}
