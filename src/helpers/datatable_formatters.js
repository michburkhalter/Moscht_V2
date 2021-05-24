export function time_formatter(cell, row, rowIndex, formatExtraData) {
    const d = new Date(cell);
    const time = `${d.getDate()}.${(d.getMonth()+1)}.${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}`;
    return time;
  }

export function fuel_efficiency_formatter(cell, row, rowIndex, formatExtraData){
    if(typeof cell == 'number'){
      return cell + " l/100km"
    }else{
      return "-"
    }
  }

export function fuel_amount_formatter(cell, row, rowIndex, formatExtraData){
    if(cell === undefined){
      return "-"
    }else{
      return cell + " l"
    }
  }

export function odometer_formatter(cell, row, rowIndex, formatExtraData){
    if(cell === undefined){
      return "-"
    }else{
      var parts = cell.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
      return parts.join(".") + " km";
    }
  }

export function price_formatter(cell, row, rowIndex, formatExtraData){
    if(cell === undefined){
      return "-"
    }else{
      return cell + " CHF"
    }
  }