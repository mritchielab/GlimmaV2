function hideDropdownsOnHoverAway() 
{
  // set up dropdown hide when clicking elsewhere
  window.addEventListener("click", (event) => {
    if (!event.target.matches(".save-button")
      && !event.target.parentElement.matches(".save-button")      
    ) {
      var dropdownContents = document.getElementsByClassName("dropdown-content");
      for (const dropdownContent of dropdownContents) {
        if (dropdownContent.classList.contains("show")) {
          dropdownContent.classList.remove("show");
        }
      }
    }
  });
}

// creates the save plot button
function addSavePlotElement(xyPlot, expressionPlot=null) {
  let buttonContainer = document.getElementsByClassName("savePlot")[0].parentElement;

  var dropdown = document.createElement("div");
  dropdown.setAttribute("class", "dropdown-content plotDropdown");

  // add elements to container
  const createSavePlotButton = (plot, text, type) => {
    var saveButton = document.createElement("a");
    saveButton.setAttribute("href", "#");
    saveButton.innerText = text;
    saveButton.onclick = function() {
      plot.toImageURL(type, scaleFactor=3).then(function (url) {
        var link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('download', 'vega-export.' + type);
        link.dispatchEvent(new MouseEvent('click'));
      });
    };
    return saveButton;
  }
  var pngSummaryBtn = createSavePlotButton(xyPlot, text="Summary plot (PNG)", type='png');
  var svgSummaryBtn = createSavePlotButton(xyPlot, text="Summary plot (SVG)", type='svg');
  dropdown.appendChild(pngSummaryBtn);
  dropdown.appendChild(svgSummaryBtn);

  // add the expression buttons if expression plot is active
  if (expressionPlot) {
    var pngExpressionBtn = createSavePlotButton(expressionPlot, text="Expression plot (PNG)", type='png');
    var svgExpressionBtn = createSavePlotButton(expressionPlot, text="Expression plot (SVG)", type='svg');
    dropdown.appendChild(pngExpressionBtn);
    dropdown.appendChild(svgExpressionBtn);
  }

  buttonContainer.appendChild(dropdown);
} 

// creates the save data button
function addSaveDataElement(state, data, saveAllText, saveSelectText) {
  buttonContainer = document.getElementsByClassName("saveSubset")[0].parentElement;

  var dropdownContent = document.createElement("div");
  dropdownContent.setAttribute("class", "dropdown-content dataDropdown");

  var saveSelectBtn = document.createElement("a");
  saveSelectBtn.setAttribute("href", "#");
  saveSelectBtn.setAttribute("class", "saveSelectButton");
  saveSelectBtn.innerText = saveSelectText;
  saveSelectBtn.onclick = function() {
    saveTableClickListener(state, data, false);
  };

  var saveAllBtn = document.createElement("a");
  saveAllBtn.setAttribute("href", "#");
  saveAllBtn.innerText = saveAllText;
  saveAllBtn.onclick = function() {
    saveTableClickListener(state, data, true);
  };

  dropdownContent.appendChild(saveSelectBtn);
  dropdownContent.appendChild(saveAllBtn);
  buttonContainer.appendChild(dropdownContent);
} 

function saveTableClickListener(state, data, save_all)
{
  if (save_all)
  {
    if (confirm(`This will save the table and counts data for all ${data.xyTable.length} genes.`)) 
    {
      /* only include counts if it is provided */
      let arr = data.countsMatrix==null ? 
        data.xyTable : data.xyTable.map( x => $.extend(x, data.countsMatrix[x.index]) );
      saveJSONArrayToCSV(arr);
    }
  }
  else
  {
    let concatData = data.countsMatrix==null ?
      state.selected : state.selected.map( x => $.extend(x, data.countsMatrix[x.index]) );
    saveJSONArrayToCSV(concatData);
  }
}


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