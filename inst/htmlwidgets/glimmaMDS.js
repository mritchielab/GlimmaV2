HTMLWidgets.widget({

  name: 'glimmaMDS',

  type: 'output',

  factory: function(el, width, height) {

    // create general layout elements
    var plotContainer = document.createElement("div");
    var controlContainer = document.createElement("div");
    plotContainer.setAttribute("class", "plotContainer");
    controlContainer.setAttribute("class", "controlContainerMDS");

    var widget = document.getElementById(el.id);
    widget.appendChild(plotContainer);
    widget.appendChild(controlContainer);

    return {

      renderValue: function(x) {

        var handler = new vegaTooltip.Handler();

        // create container elements
        var mdsContainer = document.createElement("div");
        var eigenContainer = document.createElement("div");
        mdsContainer.setAttribute("class", "mdsContainer");
        eigenContainer.setAttribute("class", "eigenContainer");

        plotContainer.appendChild(mdsContainer);
        plotContainer.appendChild(eigenContainer);

        processDataMDS(x);
        var mdsData = HTMLWidgets.dataframeToD3(x.data.mdsData);
        var eigenData = HTMLWidgets.dataframeToD3(x.data.eigenData);

        /* NB: the createXXSpec functions are defined in lib/GlimmaSpecs */
        var mdsSpec = createMDSSpec(mdsData, x.data.dimlist,
                                      x.data.features,
                                      width, height, x.data.continuousColour);

        var mdsView = new vega.View(vega.parse(mdsSpec), {
          renderer: 'svg',
          container: mdsContainer,
          bind: controlContainer,
          hover: true
        });

        mdsView.tooltip(handler.call);
        mdsView.runAsync();

        var eigenSpec = createEigenSpec(eigenData, width, height);
        eigenView = new vega.View(vega.parse(eigenSpec), {
          renderer: 'svg',
          container: eigenContainer,
          hover: true
        });
        eigenView.runAsync();
        linkPlotsMDS(mdsView, eigenView);

        addColourMessage(x.data, mdsView, controlContainer);
        addSavePlotButton(controlContainer, mdsView, eigenView, text="Save Plot",
                          summaryText="MDS", expressionText="VAR");

      },

      resize: function(width, height)
      {}

    };
  }
});

function addSavePlotButton(controlContainer, mdsPlot, eigenPlot) 
{
  var dropdownDiv = document.createElement("div");
  dropdownDiv.setAttribute("class", "dropdown");

  controlContainer.appendChild(dropdownDiv);

  var dropdownButton = document.createElement("button");
  dropdownButton.setAttribute("class", "save-button");
  dropdownButton.innerHTML = "Save Plot";

  var dropdownContent = document.createElement("div");
  dropdownContent.setAttribute("class", "dropdown-content");

  dropdownDiv.appendChild(dropdownButton);
  dropdownDiv.appendChild(dropdownContent);

  const renderButton = (plot, text, type) => {
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

  var pngSummaryBtn = renderButton(mdsPlot, text="Summary plot (PNG)", type='png');
  var svgSummaryBtn = renderButton(mdsPlot, text="Summary plot (SVG)", type='svg');
  var pngExpressionBtn = renderButton(eigenPlot, text="Expression plot (PNG)", type='png');
  var svgExpressionBtn = renderButton(eigenPlot, text="Expression plot (SVG)", type='svg');

  dropdownContent.appendChild(pngSummaryBtn);
  dropdownContent.appendChild(svgSummaryBtn);
  dropdownContent.appendChild(pngExpressionBtn);
  dropdownContent.appendChild(svgExpressionBtn);

  dropdownButton.onclick = () => dropdownContent.classList.toggle("show");
  
  // setup click to fade dropdown
  window.addEventListener("click", (event) => {
    const container = event.target.closest(".dropdown");
    if (container !== null) {
      return;
    }
    dropdownContent.classList.remove("show");
  });
}


function processDataMDS(x)
{
  /* if there's only a single feature in an R vector,
    it does not become an array after data transformation to JS */
  if (!Array.isArray(x.data.features["numeric"]))
  {
    x.data.features["numeric"] = [ x.data.features["numeric"] ];
  }
  if (!Array.isArray(x.data.features["discrete"]))
  {
    x.data.features["discrete"] = [ x.data.features["discrete"] ];
  }
  // sort to get "-", " -" features loaded first
  x.data.features["numeric"].sort();
  x.data.features["discrete"].sort();
}

function linkPlotsMDS(mdsView, eigenView)
{

  // highlight variance plot when we change a signal in the MDS plot
  mdsView.addSignalListener('x_axis', function(name, value) {
    var externalSelectValue = parseInt(value.substring(3));
    eigenView.signal("external_select_x", externalSelectValue);
    eigenView.runAsync();
  });

  mdsView.addSignalListener('y_axis', function(name, value) {
    var externalSelectValue = parseInt(value.substring(3));
    eigenView.signal("external_select_y", externalSelectValue);
    eigenView.runAsync();
  });

}

function addColourMessage(data, view, container)
{
  var alertBox = document.createElement("div");
  alertBox.setAttribute("class", "alertBox invisible");
  // update the warning box when colourscheme signal changes
  view.addSignalListener('colourscheme',
    function(name, value) { updateColourMessage(data, container, view, value) });
  // update warning box when the colour_by signal changes
  view.addSignalListener('colour_by',
    function(name, value) {
      updateColourMessage(data, container, view, view.signal('colourscheme'));
    });
  container.appendChild(alertBox);
}

function updateColourMessage(data, container, view, value)
{
  var alertBox = container.getElementsByClassName("alertBox")[0];
  let schemeCount = vega.scheme(value).length;
  let colourBy = view.signal("colour_by");
  let colourCount = [...new Set(data.mdsData[colourBy])].length;
  alertBox.setAttribute("class", "alertBox invisible");

  if (data.continuousColour) return;
  if (value == "plasma" || value == "viridis") return;
  if (colourBy == "-") return;

  if (schemeCount < colourCount) {
    alertBox.innerHTML = `Warning: not enough distinct colours. ${colourCount} supported.`;

    alertBox.setAttribute("class", "alertBox warning");
  } else {
    alertBox.setAttribute("class", "alertBox invisible");
  }
}
