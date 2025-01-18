/* Stores classnames for reference in styles.css */
const CLASSNAMES = {
  plotContainer: "glimmaMDS_plotContainer",
  controlContainer: "glimmaMDS_controlContainer",
  mdsContainer: "glimmaMDS_mdsContainer",
  eigenContainer: "glimmaMDS_eigenContainer",
  saveContainer: "glimmaMDS_saveContainer",
  saveButton: "glimmaMDS_saveButton",
  dimmedBox: "glimmaMDS_dimmedBox",
  saveModal: "glimmaMDS_saveModal",
  show: "glimmaMDS_show",
  warningBox: "glimmaMDS_warningBox",
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

    // adds download button for the two plots
    const addSavePlotButton = (controlContainer, mdsPlot, eigenPlot) =>
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
        const saveButton = document.createElement("a");
        saveButton.setAttribute("href", "#");
        saveButton.innerText = text;
        saveButton.onclick = (e) => {
          e.preventDefault();
          plot.toImageURL(type, scaleFactor=3).then(function (url) {
            const link = document.createElement('a');
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
    
      const pngMDS = renderButton(mdsPlot, text="MDS plot (PNG)", type='png');
      const svgMDS = renderButton(mdsPlot, text="MDS plot (SVG)", type='svg');
      const pngVariance = renderButton(eigenPlot, text="Variance explained (PNG)", type='png');
      const svgVariance = renderButton(eigenPlot, text="Variance explained (SVG)", type='svg');
    
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
    
    // preprocess function for MDS data, to 
    const processDataMDS = (x) =>
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
    
    // add interaction between the two plots
    const linkPlotsMDS = (mdsView, eigenView) =>
    {
      // highlight variance plot when we change a signal in the MDS plot
      mdsView.addSignalListener('x_axis', function(name, value) {
        const externalSelectValue = parseInt(value.substring(3));
        eigenView.signal("external_select_x", externalSelectValue);
        eigenView.runAsync();
      });
      mdsView.addSignalListener('y_axis', function(name, value) {
        const externalSelectValue = parseInt(value.substring(3));
        eigenView.signal("external_select_y", externalSelectValue);
        eigenView.runAsync();
      });
    }
    
    // adds a warning message if the number of colours in the palette
    // is not sufficient for the data needing to be displayed
    function addWarningMessage(data, mdsPlot, controlContainer)
    {
      const warningBox = document.createElement("div");
      warningBox.classList.add(CLASSNAMES.warningBox);
      controlContainer.appendChild(warningBox);

      const updateWarningMessage = (data, controlContainer, mdsPlot) =>
      {
        const warningBox = controlContainer.getElementsByClassName(CLASSNAMES.warningBox)[0];
        warningBox.classList.remove(CLASSNAMES.show);
  
        const colourBy = mdsPlot.signal("colour_by");
        const colourScheme = mdsPlot.signal("colourscheme");
  
        const schemeCount = vega.scheme(colourScheme).length;
        const colourCount = [...new Set(data.mdsData[colourBy])].length;
  
        if (data.continuousColour) return;
        if (colourScheme === "plasma" || colourScheme === "viridis") return;
        if (colourBy === "-") return;
        if (schemeCount < colourCount) {
          warningBox.innerHTML = `Warning: not enough distinct colours. ${schemeCount} supported.`;
          warningBox.classList.add(CLASSNAMES.show);
        }
      }    

      // update the warning box when colourscheme signal changes
      mdsPlot.addSignalListener('colourscheme',
        (_) => updateWarningMessage(data, controlContainer, mdsPlot));
        
      // update warning box when the colour_by signal changes
      mdsPlot.addSignalListener('colour_by',
        (_) => updateWarningMessage(data, controlContainer, mdsPlot));
    }

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
        addWarningMessage(x.data, mdsView, controlContainer);
      },

      resize: function(_, _)
      {}

    };
  }
});
