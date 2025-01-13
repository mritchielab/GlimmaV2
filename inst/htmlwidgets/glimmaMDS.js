/* Stores classnames for reference in styles.css */
const CLASSNAMES = {
  plotContainer: "plotContainer",
  controlContainer: "controlContainer",
  mdsContainer: "mdsContainer",
  eigenContainer: "eigenContainer",
  saveContainer: "saveContainer",
  saveButton: "saveButton",
  dimmedBox: "dimmedBox",
  saveModal: "saveModal",
  show: "show",
  warningBox: "warningBox",
};

HTMLWidgets.widget({

  name: 'glimmaMDS',

  type: 'output',

  factory: function(el, width, height) {

    // create general layout elements
    const plotContainer = document.createElement("div");
    const controlContainer = document.createElement("div");
    plotContainer.setAttribute("class", CLASSNAMES.plotContainer);
    controlContainer.setAttribute("class", CLASSNAMES.controlContainer);

    const widget = document.getElementById(el.id);
    widget.appendChild(plotContainer);
    widget.appendChild(controlContainer);

    return {

      renderValue: function(x) {
        const handler = new vegaTooltip.Handler();

        // create container elements
        const mdsContainer = document.createElement("div");
        const eigenContainer = document.createElement("div");
        mdsContainer.setAttribute("class", CLASSNAMES.mdsContainer);
        eigenContainer.setAttribute("class", CLASSNAMES.eigenContainer);

        plotContainer.appendChild(mdsContainer);
        plotContainer.appendChild(eigenContainer);

        processDataMDS(x);
        const mdsData = HTMLWidgets.dataframeToD3(x.data.mdsData);
        const eigenData = HTMLWidgets.dataframeToD3(x.data.eigenData);

        /* NB: the createXXSpec functions are defined in lib/GlimmaSpecs */
        const mdsSpec = createMDSSpec(
          mdsData, 
          x.data.dimlist,
          x.data.features,
          width, 
          height, 
          x.data.continuousColour
        );

        const mdsView = new vega.View(vega.parse(mdsSpec), {
          renderer: 'svg',
          container: mdsContainer,
          bind: controlContainer,
          hover: true
        });

        mdsView.tooltip(handler.call);
        mdsView.runAsync();

        const eigenSpec = createEigenSpec(eigenData, width, height);
        const eigenView = new vega.View(vega.parse(eigenSpec), {
          renderer: 'svg',
          container: eigenContainer,
          hover: true
        });

        eigenView.runAsync();
        linkPlotsMDS(mdsView, eigenView);
        addSavePlotButton(controlContainer, mdsView, eigenView);
        addColourMessage(x.data, mdsView, controlContainer);
      },

      resize: function(_, _)
      {}

    };
  }
});

function addSavePlotButton(controlContainer, mdsPlot, eigenPlot) 
{
  const saveContainer = document.createElement("div");
  saveContainer.setAttribute("class", CLASSNAMES.saveContainer);

  controlContainer.appendChild(saveContainer);

  const button = document.createElement("button");
  button.setAttribute("class", CLASSNAMES.saveButton);
  // from assets.js
  button.innerHTML = DOWNLOAD_ICON;
  saveContainer.appendChild(button);

  const dimmedBox = document.createElement("div");
  dimmedBox.setAttribute("class", CLASSNAMES.dimmedBox);
  saveContainer.appendChild(dimmedBox);

  const saveModal = document.createElement("div");
  saveModal.setAttribute("class", CLASSNAMES.saveModal);
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
        saveModal.classList.remove(CLASSNAMES.show);
        dimmedBox.classList.remove(CLASSNAMES.show);
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
    saveModal.classList.add(CLASSNAMES.show);
    dimmedBox.classList.add(CLASSNAMES.show);
  };
  
  window.addEventListener("click", (event) => {
    if (event.target.classList.contains(CLASSNAMES.dimmedBox)) {
      saveModal.classList.remove(CLASSNAMES.show);
      dimmedBox.classList.remove(CLASSNAMES.show);
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
  const warningBox = document.createElement("div");
  warningBox.classList.add(CLASSNAMES.warningBox);
  // update the warning box when colourscheme signal changes
  view.addSignalListener('colourscheme',
    (_, value) => updateColourMessage(data, container, view, value));
  // update warning box when the colour_by signal changes
  view.addSignalListener('colour_by',
    (_, value) => updateColourMessage(data, container, view, view.signal('colourscheme'))
  );
  container.appendChild(warningBox);
}

function updateColourMessage(data, container, view, value)
{
  const warningBox = container.getElementsByClassName(CLASSNAMES.warningBox)[0];
  let schemeCount = vega.scheme(value).length;
  let colourBy = view.signal("colour_by");
  let colourCount = [...new Set(data.mdsData[colourBy])].length;
  warningBox.classList.remove(CLASSNAMES.show);

  if (data.continuousColour) return;
  if (value === "plasma" || value === "viridis") return;
  if (colourBy === "-") return;

  if (schemeCount < colourCount) {
    warningBox.innerHTML = `Warning: not enough distinct colours. ${schemeCount} supported.`;
    warningBox.classList.add(CLASSNAMES.show);
  }
}
