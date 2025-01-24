HTMLWidgets.widget({

  name: 'glimmaXY',

  type: 'output',

  factory: function(el, width, height) 
  {

    const CLASSNAMES = Object.freeze({
      plotContainer: "glimmaXY_plotContainer",
      controlContainer: "glimmaXY_controlContainer",
      xyContainerSingle: "glimmaXY_xyContainerSingle",
      expressionContainer: "glimmaXY_expressionContainer",
      expressionPlotContainer: "glimmaXY_expressionPlotContainer",
      expressionControls: "glimmaXY_expressionControls",
      xyContainer: "glimmaXY_xyContainer",
      saveButtonBase: "glimmaXY_save-button",
      saveSelectedGenesButton: "glimmaXY_saveSelectButton",
      saveDataButton: "glimmaXY_saveSubset",
      savePlotButton: "glimmaXY_savePlot",
      clearButton: "glimmaXY_clearSubset",
      datatable: "glimmaXY_dataTable",
      buttonContainer: "glimmaXY_buttonContainer",
      dataDropdown: "glimmaXY_dataDropdown",
      plotDropdown: "glimmaXY_plotDropdown",
      show: "glimmaXY_show",
      stripeOdd: "glimmaXY_stripe1",
      stripeEven: "glimmaXY_stripe2",
      selected: "glimmaXY_selected",
      alertBox: "glimmaXY_alertBox",
      dropdownContent: "glimmaXY_dropdown-content",
      minExtentInput: "glimmaXY_min_extent_input",
      maxExtentInput: "glimmaXY_max_extent_input",
    });

    const plotContainer = document.createElement("div");
    const controlContainer = document.createElement("div");
    plotContainer.setAttribute("class", CLASSNAMES.plotContainer);
    controlContainer.setAttribute("class", CLASSNAMES.controlContainer);

    const widget = document.getElementById(el.id);
    widget.appendChild(plotContainer);
    widget.appendChild(controlContainer);

    class State {

      /**
       * Returns state machine object retaining the current set of selected genes and managing
       * whether the app is in graph selection mode or table selection mode
       * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
       * @return {State} state machine object
       */
      constructor(data) {
        this.data = data;
        this.graphMode = false;
        this._selected = [];
      }
      
      /**
       * Returns current selection of genes
       * @return {Array} Array of currently selected genes
       */
      get selected() {
        return this._selected;
      }
    
      /**
       * Sets a new array of selected genes and re-renders elements accordingly
       * @param  {Array} selected Array of genes which are currently selected
       */
      set selected(selected) {
        this._selected = selected;
        /* update save selected genes btn */
        $(this.data.controlContainer.getElementsByClassName(CLASSNAMES.saveSelectedGenesButton)[0])
          .html(`Save (${selected.length})`);
        /* update clear btn */
        $(this.data.controlContainer.getElementsByClassName(CLASSNAMES.clearButton)[0])
          .html(`Clear (${selected.length})`);
      }
      
      /**
       * Adds a gene to the selection if it's not already selected, or remove it otherwise
       * @param  {Gene} gene Gene data object which has been clicked on
       */
      async toggleGene(gene) {
        const loc = containsGene(this.selected, gene);
        this.selected = loc >= 0 ? remove(this.selected, loc) : this.selected.concat(gene);
        this._expressionUpdateHandler(loc < 0, gene);
      }
      
      /**
       * Manages updates to the expression plot based on the most recently selected gene
       * @param {Boolean} selectionOccurred True if a gene was selected, false if it was de-selected
       * @param  {Gene} gene Gene data object which has been clicked on
       */
      async _expressionUpdateHandler(selectionOccurred, gene) {
        if (!this.data.expressionView) return;
        if (selectionOccurred) {
          const countsRow = this.data.countsMatrix[gene.index];
          await updateExpressionPlot(countsRow, this.data, gene.gene);
        }
        else if (this.selected.length > 0) {
          const last = this.selected[this.selected.length-1];
          const countsRow = this.data.countsMatrix[last.index];
          await updateExpressionPlot(countsRow, this.data, last.gene);
        }
        else {
          await clearExpressionPlot(this.data);
        }
      }
    
    }

    const SaveUtils = {

      // hides save dropdowns upon hovering away from them
      hideDropdownsOnHoverAway: (controlContainer) => {
        window.addEventListener("mouseover", (event) => {
          const buttonContainer = event.target.closest(`.${CLASSNAMES.buttonContainer}`);
          if (buttonContainer !== null) {
            return;
          }
          const dropdownContents = controlContainer.getElementsByClassName(CLASSNAMES.dropdownContent);
          for (const dropdownContent of dropdownContents) {
            dropdownContent.classList.remove(CLASSNAMES.show);
          }
        });
      },

      // creates the save plot button
      addSavePlotElement: (xyPlot, expressionPlot=null, controlContainer) => {
        const dropdown = document.createElement("div");
        dropdown.classList.add(CLASSNAMES.dropdownContent);
        dropdown.classList.add(CLASSNAMES.plotDropdown);
  
        const createSavePlotButton = (plot, text, type) => {
          const saveButton = document.createElement("a");
          saveButton.setAttribute("href", "#");
          saveButton.innerText = text;
          saveButton.onclick = function(e) {
            e.preventDefault();
            plot.toImageURL(type, scaleFactor=3).then(function (url) {
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('target', '_blank');
              link.setAttribute('download', `${text}.` + type);
              link.dispatchEvent(new MouseEvent('click'));
            });
          };
          return saveButton;
        }
        const pngSummaryBtn = createSavePlotButton(xyPlot, text="Summary plot (PNG)", type='png');
        const svgSummaryBtn = createSavePlotButton(xyPlot, text="Summary plot (SVG)", type='svg');
        dropdown.appendChild(pngSummaryBtn);
        dropdown.appendChild(svgSummaryBtn);
  
        // add the expression buttons if expression plot is active
        if (expressionPlot) {
          const pngExpressionBtn = createSavePlotButton(expressionPlot, text="Expression plot (PNG)", type='png');
          const svgExpressionBtn = createSavePlotButton(expressionPlot, text="Expression plot (SVG)", type='svg');
          dropdown.appendChild(pngExpressionBtn);
          dropdown.appendChild(svgExpressionBtn);
        }
  
        const buttonContainer = controlContainer.getElementsByClassName(CLASSNAMES.savePlotButton)[0].parentElement;
        buttonContainer.appendChild(dropdown);
      },

      // creates the save data button
      addSaveDataElement: (state, data) => {
        const dropdown = document.createElement("div");
        dropdown.classList.add(CLASSNAMES.dropdownContent);
        dropdown.classList.add(CLASSNAMES.dataDropdown);

        const saveTableClickListener = (e, state, data, save_all) =>
        {
          e.preventDefault();
          if (save_all)
          {
            if (confirm(`This will save the table and counts data for all ${data.xyTable.length} genes.`)) 
            {
              /* only include counts if it is provided */
              const arr = data.countsMatrix==null ? 
                data.xyTable : data.xyTable.map( x => $.extend(x, data.countsMatrix[x.index]) );
              saveJSONArrayToCSV(arr);
            }
          }
          else
          {
            const concatData = data.countsMatrix==null ?
              state.selected : state.selected.map( x => $.extend(x, data.countsMatrix[x.index]) );
            saveJSONArrayToCSV(concatData);
          }
        }
  
        const saveSelectBtn = document.createElement("a");
        saveSelectBtn.setAttribute("href", "#");
        saveSelectBtn.setAttribute("class", CLASSNAMES.saveSelectedGenesButton);
        saveSelectBtn.innerText = `Save (0)`;
        saveSelectBtn.onclick = (e) => saveTableClickListener(e, state, data, false);
  
        const saveAllBtn = document.createElement("a");
        saveAllBtn.setAttribute("href", "#");
        saveAllBtn.innerText = `Save All`;
        saveAllBtn.onclick = (e) => saveTableClickListener(e, state, data, true);
  
        dropdown.appendChild(saveSelectBtn);
        dropdown.appendChild(saveAllBtn);
  
        const buttonContainer = data.controlContainer.getElementsByClassName(CLASSNAMES.saveDataButton)[0].parentElement;
        buttonContainer.appendChild(dropdown);
      },
    }

    /**
     * Generates datatable DOM object, state machine and assigns event listeners
     * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
     */
    function setupXYInteraction(data)
    {

      const state = new State(data);
      const datatableEl = document.createElement("TABLE");
      datatableEl.setAttribute("class", CLASSNAMES.datatable);
      data.controlContainer.appendChild(datatableEl);

      $(document).ready(function() 
      {
        const datatable = $(datatableEl).DataTable(
          {
            data: data.xyTable,
            columns: data.cols.map(el => ({"data": el, "title": el})),
            rowId: "gene",
            dom: 'Bfrtip',
            buttons: {
              dom: {
                buttonContainer: {
                  tag: 'div',
                  className: CLASSNAMES.buttonContainer
                }
              },
              buttons: [
                        {
                          text: 'Clear (0)',
                          action: () => clearTableListener(datatable, state, data),
                          attr: {class: [ CLASSNAMES.saveButtonBase, CLASSNAMES.clearButton].join(" ")}
                        },
                        { 
                          text: 'Save Data',
                          action: () => {
                            const dropdown = data.controlContainer.getElementsByClassName(CLASSNAMES.dataDropdown)[0];
                            dropdown.classList.toggle(CLASSNAMES.show);
                          },
                          attr: {class: [ CLASSNAMES.saveButtonBase, CLASSNAMES.saveDataButton].join(" ")}
                        },
                        {
                          text: 'Save Plot',
                          action: () => {
                            const dropdown = data.controlContainer.getElementsByClassName(CLASSNAMES.plotDropdown)[0];
                            dropdown.classList.toggle(CLASSNAMES.show);
                          },
                          attr: {class: [ CLASSNAMES.saveButtonBase, CLASSNAMES.savePlotButton].join(" ")}
                        }
                      ]
                    },
            scrollY: (data.height*0.33).toString() + "px",
            scroller: true,
            scrollX: false,
            orderClasses: false,
            stripeClasses: [ CLASSNAMES.stripeOdd, CLASSNAMES.stripeEven ],
          });

        datatable.on('click', 'tr', function() { tableClickListener(datatable, state, data, $(this)) } );
        data.xyView.addSignalListener('click', function(_, value) { XYSignalListener(datatable, state, value[0], data) } );

        SaveUtils.addSaveDataElement(state, data);
        SaveUtils.addSavePlotElement(data.xyView, data.expressionView, data.controlContainer);
        SaveUtils.hideDropdownsOnHoverAway(data.controlContainer);
      });
    }

    /**
     * Responds to a click on the Clear datatable button
     * @param  {Datatable} datatable datatable object
     * @param  {State} state state machine object returned by getStateMachine()
     * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
     */
    async function clearTableListener(datatable, state, data)
    {
      state.graphMode = false;
      state.selected = [];
      datatable.rows(`.${CLASSNAMES.selected}`).nodes().to$().removeClass(CLASSNAMES.selected);
      datatable.search('').columns().search('').draw();       
      data.xyView.data("selected_points", state.selected);
      data.xyView.runAsync();
      await clearExpressionPlot(data);
    }

    /**
     * Listens and responds to click events on the datatable
     * @param  {Datatable} datatable datatable object
     * @param  {State} state state machine object returned by getStateMachine()
     * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
     * @param  {Row} row row object in the table clicked on by the user
     */
    async function tableClickListener(datatable, state, data, row)
    {
      if (state.graphMode) return;
      row.toggleClass(CLASSNAMES.selected);
      const datum = datatable.row(row).data();
      await state.toggleGene(datum);
      data.xyView.data("selected_points", state.selected);
      data.xyView.runAsync();
    }

    /**
     * Listens and responds to click events on the XY plot
     * @param  {Datatable} datatable datatable object
     * @param  {State} state state machine object returned by getStateMachine()
     * @param  {Datum} datum point on the graph clicked on by the user
     * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
     */
    async function XYSignalListener(datatable, state, datum, data)
    {
      if (datum == null) return;
      if (!state.graphMode)
      {
        state.graphMode = true;
        datatable.rows(`.${CLASSNAMES.selected}`).nodes().to$().removeClass(CLASSNAMES.selected);
        state.selected = [];
      }

      await state.toggleGene(datum);

      // edge case: deselecting last point
      if (state.selected.length == 0)
        state.graphMode = false;

      data.xyView.data("selected_points", state.selected);
      data.xyView.runAsync();

      datatable.search('').columns().search('').draw();
      const regex_search = state.selected.map(x => '^' + x.gene + '$').join('|');
      datatable.columns(0).search(regex_search, regex=true, smart=false).draw();
    }

    /**
     * Resets expression plot to a blank slate
     * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
     */
    async function clearExpressionPlot(data)
    {
      if (!data.expressionView)
        return;
      data.expressionView.data("table", []);
      data.expressionView.signal("title_signal", "");
      await data.expressionView.runAsync();
      // clear axis message
      updateAxisMessage(data);
    }

    /**
     * Updates expression plot for the given gene and sample counts
     * @param  {CountsRow} countsRow Data object containing sample counts for a given gene
     * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
     * @param  {String} geneName name of gene being displayed
     */
    async function updateExpressionPlot(countsRow, data, geneName)
    {
      let groups = data.groups.group;
      const samples = data.groups.sample;
      const levels = data.levels;
      const result = [];
      for (col in countsRow) 
      {
        if (!samples.includes(col)) continue;
        const curr = {};
        group = groups[samples.indexOf(col)];
        curr["group"] = group;
        curr["sample"] = col;
        curr["count"] = countsRow[col];
        result.push(curr);
      }
      if (levels != null) {
        result.sort((a, b) => levels.indexOf(a.group) - levels.indexOf(b.group));
      }
      data.expressionView.data("table", result);
      data.expressionView.signal("title_signal", "Gene " + geneName.toString());
      await data.expressionView.runAsync();
      // expression data has changed so we might need to update axis message
      updateAxisMessage(data);
    }

    /**
     * Adds y-axis scaling message DOM objects to the expression plot
     * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
     */
    function addAxisMessage(data)
    {
      const alertBox = document.createElement("div");
      alertBox.setAttribute("class", CLASSNAMES.alertBox);
      data.expressionView.addSignalListener('min_y_input', 
        function(_, _) { updateAxisMessage(data) });
      data.expressionView.addSignalListener('max_y_input', 
        function(_, _) { updateAxisMessage(data) });
      data.expressionContainer.appendChild(alertBox);
    }

    /**
     * Updates the y-axis scaling for the expression plot
     * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
     */
    function updateAxisMessage(data)
    {
      const alertBox = data.expressionContainer.getElementsByClassName(CLASSNAMES.alertBox)[0];
      const min_extent = data.expressionView.signal("min_extent");
      const max_extent = data.expressionView.signal("max_extent");
      const minInput = data.expressionView.signal("min_y_input");
      const maxInput = data.expressionView.signal("max_y_input");
      // display warning message if Y min or Y max are out of bounds for the current plot
      if (!(minInput == null) && !(minInput == "") && (Number(minInput) > min_extent))
      {
        alertBox.innerHTML = `Y min out of bounds`;
        alertBox.classList.add(CLASSNAMES.show);
        return;
      }
      if (!(maxInput == null) && !(maxInput == "") && (Number(maxInput) < max_extent))
      {
        alertBox.innerHTML = `Y max out of bounds`;
        alertBox.classList.add(CLASSNAMES.show);
        return;
      }
      alertBox.classList.remove(CLASSNAMES.show);
    }


    /**
     * Searches an array gene data objects to determine if it contains a given gene.
     * @param  {Array} arr array of gene data objects.
     * @param  {Datum} datum given gene object
     * @return {Integer} -1 if the given gene is not found; index of the gene in arr otherwise.
     */
    function containsGene(arr, datum)
    {
      let loc = -1;
      let i;
      for (i = 0; i < arr.length; i++)
      {
        if (arr[i]['gene'] === datum['gene'])
        {
          loc = i;
          break;
        } 
      }
      return loc;
    }

    /**
     * Removes an element at the given index from an array and returns the result.
     * @param  {Array} arr array of elements.
     * @param  {Integer} i index i of element to be removed from arr.
     * @return {Array} modified array with element at index i removed.
     */
    function remove(arr, i)
    {
      const new_arr = arr.slice(0, i).concat(arr.slice(i+1))
      return new_arr;
    }

    return {

      renderValue: function(x) 
      {
        
        const handler = new vegaTooltip.Handler();

        // create container elements
        const xyContainer = document.createElement("div");
        xyContainer.setAttribute("class", CLASSNAMES.xyContainerSingle);
        plotContainer.appendChild(xyContainer);

        const xyTable = HTMLWidgets.dataframeToD3(x.data.table)
        const xySpec = createXYSpec(x.data, xyTable, width, height);
        const xyView = new vega.View(vega.parse(xySpec), {
          renderer: 'canvas',
          container: xyContainer,
          bind: controlContainer,
          hover: true
        });
        xyView.tooltip(handler.call);
        xyView.runAsync();

        let countsMatrix = null;
        let expressionView = null;
        let expressionContainer = null;
        if (x.data.counts != -1)
        {
          expressionContainer = document.createElement("div");
          expressionContainer.setAttribute("class", CLASSNAMES.expressionContainer);

          plotContainer.appendChild(expressionContainer);
          xyContainer.setAttribute("class", CLASSNAMES.xyContainer);

          const expressionPlotContainer = document.createElement("div");
          expressionPlotContainer.setAttribute("class", CLASSNAMES.expressionPlotContainer);
          expressionContainer.appendChild(expressionPlotContainer);

          const expressionControls = document.createElement("div");
          expressionControls.setAttribute("class", CLASSNAMES.expressionControls);
          expressionContainer.appendChild(expressionControls);

          countsMatrix = HTMLWidgets.dataframeToD3(x.data.counts);
          const expressionSpec = createExpressionSpec(
            width, 
            height, 
            x.data.expCols, 
            x.data.sampleColours, 
            x.data.samples,
            CLASSNAMES.minExtentInput,
            CLASSNAMES.maxExtentInput,
          );
          expressionView = new vega.View(vega.parse(expressionSpec), {
            renderer: 'canvas',
            container: expressionPlotContainer,
            bind: expressionControls,
            hover: true
          });
          expressionView.tooltip(handler.call);
          expressionView.runAsync();
        }

        const data =
        {
          xyView: xyView,
          expressionView: expressionView,
          xyTable: xyTable,
          countsMatrix: countsMatrix,
          controlContainer: controlContainer,
          height: height,
          cols: x.data.cols,
          groups: x.data.groups,
          levels: x.data.levels,
          expressionContainer: expressionContainer
        };

        setupXYInteraction(data);
        if (expressionView) {
          addAxisMessage(data);
        }
      },

      resize: function(_, _) 
      {}

    };
  }
});
