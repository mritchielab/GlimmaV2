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

// https://vega.github.io/vega/docs/api/view/
interface VegaView {
  addSignalListener: any;
  signal: any;
  runAsync: any;
  toImageURL: any;
};

// @ts-ignore
HTMLWidgets.widget({

  name: 'glimmaMDS',

  type: 'output',

  factory: function (el: any, width: number, height: number) {

    // create general layout elements
    const plotContainer = document.createElement("div");
    const controlContainer = document.createElement("div") as HTMLDivElement;
    plotContainer.setAttribute("class", CLASSNAMES.plotContainer);
    controlContainer.setAttribute("class", CLASSNAMES.controlContainer);

    const widget = document.getElementById(el.id);
    widget?.appendChild(plotContainer);
    widget?.appendChild(controlContainer);

    // adds download button for the two plots
    const addSavePlotButton = (params: {
      controlContainer: HTMLDivElement,
      mdsView: VegaView,
      eigenView: VegaView
    }) => {
      const saveContainer = document.createElement("div");
      saveContainer.setAttribute("class", CLASSNAMES.saveContainer);

      params.controlContainer.appendChild(saveContainer);

      const button = document.createElement("button");
      button.setAttribute("class", CLASSNAMES.saveButton);
      // from assets.js
      // @ts-ignore
      button.innerHTML = DOWNLOAD_ICON;
      saveContainer.appendChild(button);

      const dimmedBox = document.createElement("div");
      dimmedBox.setAttribute("class", CLASSNAMES.dimmedBox);
      saveContainer.appendChild(dimmedBox);

      const saveModal = document.createElement("div");
      saveModal.setAttribute("class", CLASSNAMES.saveModal);
      saveContainer.appendChild(saveModal);

      const renderButton = (params: {
        view: VegaView,
        text: string,
        type: 'png' | 'svg'
      }
      ) => {
        const saveButton = document.createElement("a");
        saveButton.setAttribute("href", "#");
        saveButton.innerText = params.text;
        saveButton.onclick = (e) => {
          e.preventDefault();
          params.view.toImageURL(params.type, 3).then(function (url: string) {
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('target', '_blank');
            link.setAttribute('download', params.text);
            link.dispatchEvent(new MouseEvent('click'));
            saveModal.classList.remove(CLASSNAMES.show);
            dimmedBox.classList.remove(CLASSNAMES.show);
          });
        };
        return saveButton;
      }

      const pngMDS = renderButton({ view: params.mdsView, text: "MDS plot (PNG)", type: 'png' });
      const svgMDS = renderButton({ view: params.mdsView, text: "MDS plot (SVG)", type: 'svg' });
      const pngVariance = renderButton({ view: params.eigenView, text: "Variance explained (PNG)", type: 'png' });
      const svgVariance = renderButton({ view: params.eigenView, text: "Variance explained (SVG)", type: 'svg' });

      saveModal.appendChild(pngMDS);
      saveModal.appendChild(svgMDS);
      saveModal.appendChild(pngVariance);
      saveModal.appendChild(svgVariance);

      button.onclick = () => {
        saveModal.classList.add(CLASSNAMES.show);
        dimmedBox.classList.add(CLASSNAMES.show);
      };

      window.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof HTMLElement &&
          target.classList.contains(CLASSNAMES.dimmedBox)) {
          saveModal.classList.remove(CLASSNAMES.show);
          dimmedBox.classList.remove(CLASSNAMES.show);
        }
      });
    }

    // preprocess function for MDS data, to 
    const processDataMDS = ({x} : { x: any }) => {
      /* if there's only a single feature in an R vector,
        it does not become an array after data transformation to JS */
      if (!Array.isArray(x.data.features["numeric"])) {
        x.data.features["numeric"] = [x.data.features["numeric"]];
      }
      if (!Array.isArray(x.data.features["discrete"])) {
        x.data.features["discrete"] = [x.data.features["discrete"]];
      }
      // sort to get "-", " -" features loaded first
      x.data.features["numeric"].sort();
      x.data.features["discrete"].sort();
    }

    // add interaction between the two plots
    const linkPlotsMDS = (params: {
      mdsView: VegaView,
      eigenView: VegaView
    }) => {
      // highlight variance plot when we change a signal in the MDS plot
      params.mdsView.addSignalListener('x_axis', function (_: string, value: string) {
        const externalSelectValue = parseInt(value.substring(3));
        params.eigenView.signal("external_select_x", externalSelectValue);
        params.eigenView.runAsync();
      });
      params.mdsView.addSignalListener('y_axis', function (_: string, value: string) {
        const externalSelectValue = parseInt(value.substring(3));
        params.eigenView.signal("external_select_y", externalSelectValue);
        params.eigenView.runAsync();
      });
    }

    // adds a warning message if the number of colours in the palette
    // is not sufficient for the data needing to be displayed
    function addWarningMessage(
      params: {
        data: any,
        mdsPlot: VegaView,
        controlContainer: HTMLDivElement
      }) {
      const warningBox = document.createElement("div");
      warningBox.classList.add(CLASSNAMES.warningBox);
      controlContainer.appendChild(warningBox);

      const updateWarningMessage = (params: {
        data: any,
        controlContainer: HTMLDivElement,
        mdsPlot: VegaView
      }) => {
        const warningBox = controlContainer.getElementsByClassName(CLASSNAMES.warningBox)[0];
        warningBox.classList.remove(CLASSNAMES.show);

        const colourBy = params.mdsPlot.signal("colour_by");
        const colourScheme = params.mdsPlot.signal("colourscheme");

        // @ts-ignore
        const schemeCount = vega.scheme(colourScheme).length;
        const colourCount = [...new Set(params.data.mdsData[colourBy])].length;

        if (params.data.continuousColour) return;
        if (colourScheme === "plasma" || colourScheme === "viridis") return;
        if (colourBy === "-") return;
        if (schemeCount < colourCount) {
          warningBox.innerHTML = `Warning: not enough distinct colours. ${schemeCount} supported.`;
          warningBox.classList.add(CLASSNAMES.show);
        }
      }

      params.mdsPlot.addSignalListener('colourscheme',
        () => updateWarningMessage({ data: params.data, controlContainer, mdsPlot: params.mdsPlot }));

      params.mdsPlot.addSignalListener('colour_by',
        () => updateWarningMessage({ data: params.data, controlContainer, mdsPlot: params.mdsPlot }));
    }

    return {

      renderValue: function (x: any) {
        // @ts-ignore
        const handler = new vegaTooltip.Handler();

        // create container elements
        const mdsContainer = document.createElement("div");
        const eigenContainer = document.createElement("div");
        mdsContainer.setAttribute("class", CLASSNAMES.mdsContainer);
        eigenContainer.setAttribute("class", CLASSNAMES.eigenContainer);

        plotContainer.appendChild(mdsContainer);
        plotContainer.appendChild(eigenContainer);

        processDataMDS({x});
        // @ts-ignore
        const mdsData = HTMLWidgets.dataframeToD3(x.data.mdsData);
        // @ts-ignore
        const eigenData = HTMLWidgets.dataframeToD3(x.data.eigenData);

        /* NB: the createXXSpec functions are defined in lib/GlimmaSpecs */
        // @ts-ignore
        const mdsSpec = createMDSSpec(
          mdsData,
          x.data.dimlist,
          x.data.features,
          width,
          height,
          x.data.continuousColour
        );

        // @ts-ignore
        const mdsView = new vega.View(vega.parse(mdsSpec), {
          renderer: 'svg',
          container: mdsContainer,
          bind: controlContainer,
          hover: true
        });

        mdsView.tooltip(handler.call);
        mdsView.runAsync();

        // @ts-ignore
        const eigenSpec = createEigenSpec(eigenData, width, height);
        // @ts-ignore
        const eigenView = new vega.View(vega.parse(eigenSpec), {
          renderer: 'svg',
          container: eigenContainer,
          hover: true
        });
        eigenView.runAsync();

        linkPlotsMDS({ mdsView, eigenView });
        addSavePlotButton({ controlContainer, mdsView, eigenView });
        addWarningMessage({ data: x.data, mdsPlot: mdsView, controlContainer });
      },

      resize: function (_: any) { }

    };
  }
});
