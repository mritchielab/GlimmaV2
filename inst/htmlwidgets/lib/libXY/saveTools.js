function saveJSONArrayToCSV(jsonArray)
{
  let csvData = JSONArrayToCSV(jsonArray);
  var blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
  saveAs(blob, "glimmaTable.csv");
}


/* credit: https://stackoverflow.com/questions/8847766/how-to-convert-json-to-csv-format-and-store-in-a-variable */
function JSONArrayToCSV(array)
{
  var fields = Object.keys(array[0])
  var replacer = function(key, value) { return value === null ? '' : value } 
  var csv = array.map(function(row){
    return fields.map(function(fieldName){
      return JSON.stringify(row[fieldName], replacer)
    }).join(',')
  })
  csv.unshift(fields.join(',')) // add header column
  csv = csv.join('\r\n');
  return csv;
}