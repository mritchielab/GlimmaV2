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
        addSavePlotButton(widget, controlContainer, mdsView, eigenView, text="Save Plot",
                          summaryText="MDS", expressionText="VAR");

      },

      resize: function(width, height)
      {}

    };
  }
});

function addSavePlotButton(widget, controlContainer, mdsPlot, eigenPlot) 
{
  var saveContainer = document.createElement("div");
  saveContainer.setAttribute("class", "saveContainer");

  widget.insertBefore(saveContainer, controlContainer);

  var button = document.createElement("button");
  button.setAttribute("class", "saveButtonMDS");
  const DOWNLOAD_ICON = 
  `<svg class="downloadSVG" width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.7928932,11.5 L11.6464466,8.35355339 C11.4511845,8.15829124 11.4511845,7.84170876 11.6464466,7.64644661 C11.8417088,7.45118446 12.1582912,7.45118446 12.3535534,7.64644661 L16.3535534,11.6464466 C16.5488155,11.8417088 16.5488155,12.1582912 16.3535534,12.3535534 L12.3535534,16.3535534 C12.1582912,16.5488155 11.8417088,16.5488155 11.6464466,16.3535534 C11.4511845,16.1582912 11.4511845,15.8417088 11.6464466,15.6464466 L14.7928932,12.5 L4,12.5 C3.72385763,12.5 3.5,12.2761424 3.5,12 C3.5,11.7238576 3.72385763,11.5 4,11.5 L14.7928932,11.5 Z M16,4.5 C15.7238576,4.5 15.5,4.27614237 15.5,4 C15.5,3.72385763 15.7238576,3.5 16,3.5 L19,3.5 C20.3807119,3.5 21.5,4.61928813 21.5,6 L21.5,18 C21.5,19.3807119 20.3807119,20.5 19,20.5 L16,20.5 C15.7238576,20.5 15.5,20.2761424 15.5,20 C15.5,19.7238576 15.7238576,19.5 16,19.5 L19,19.5 C19.8284271,19.5 20.5,18.8284271 20.5,18 L20.5,6 C20.5,5.17157288 19.8284271,4.5 19,4.5 L16,4.5 Z" transform="rotate(90 12.5 12)"/>
  </svg>`;
  button.innerHTML = DOWNLOAD_ICON;

  saveContainer.appendChild(button);

  const dimmedBox = document.createElement("div");
  dimmedBox.setAttribute("class", "dimmedBox");
  saveContainer.appendChild(dimmedBox);

  const saveModal = document.createElement("div");
  saveModal.setAttribute("class", "saveModalMDS");
  saveContainer.appendChild(saveModal);

  const renderButton = (plot, text, type) => {
    var saveButton = document.createElement("a");
    saveButton.setAttribute("href", "#");
    saveButton.innerText = text;
    saveButton.onclick = (e) => {
      e.preventDefault();
      plot.toImageURL(type, scaleFactor=3).then(function (url) {
        var link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('download', text);
        link.dispatchEvent(new MouseEvent('click'));
        saveModal.classList.remove("show");
        dimmedBox.classList.remove("show");
      });
    };
    return saveButton;
  }

  var pngMDS = renderButton(mdsPlot, text="MDS plot (PNG)", type='png');
  var svgMDS = renderButton(mdsPlot, text="MDS plot (SVG)", type='svg');
  var pngVariance = renderButton(eigenPlot, text="Variance explained (PNG)", type='png');
  var svgVariance = renderButton(eigenPlot, text="Variance explained (SVG)", type='svg');

  saveModal.appendChild(pngMDS);
  saveModal.appendChild(svgMDS);
  saveModal.appendChild(pngVariance);
  saveModal.appendChild(svgVariance);

  button.onclick = () => {
    saveModal.classList.add("show");
    dimmedBox.classList.add("show");
  };
  
  window.addEventListener("click", (event) => {
    if (event.target.classList.contains("dimmedBox")) {
      saveModal.classList.remove("show");
      dimmedBox.classList.remove("show");
    }
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
