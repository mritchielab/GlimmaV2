
// parametrise graph encoding for MDS plot
function createMDSSpec(mdsData, dimList, features, width, height, continuousColour) 
{

  // generate tooltip object for embedding in spec
  var tooltipString = "{'x':datum[x_axis], 'y':datum[y_axis]";
  features["all"].forEach(function(x) 
  {
    // don't include dummy features in tooltip
    if (x != "-" && x != "- ")
    {
      tooltipString += `,'${x}':datum['${x}']`;
    }  
  });
  tooltipString += "}";
  var tooltip = { "signal" : tooltipString };
  
  // generate colorscheme options
  var colourschemes = continuousColour ? ["reds", "blues", "tealblues", "teals", "greens", "browns", "oranges", "reds", "purples", "warmgreys", "greys", "viridis", "plasma", "blueorange", "redblue"]
            : ["accent", "category10", "category20", "category20b", "category20c", "dark2", "paired", "pastel1", "pastel2", "set1", "set2", "set3", "tableau10", "tableau20"]
  //        : [ "tableau20", "tableau10", "category20", "category20b", "category20c", "set1", "set2", "set3", "pastel1", "pastel2", "paired", "dark2", "category10", "accent", "viridis", "plasma"];
  return {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    "description": "Testing ground for GlimmaV2",
    "width": width * 0.5,
    "height": height * 0.8,
    "padding": 0,
    "autosize": {"type": "fit", "resize": true},
    "title": { "text": "MDS Plot"},
    "signals":
      [
        {
          "name": "x_axis",
          "value": dimList[0],
          "bind": { "input": "select", "options": dimList }
        },
        {
          "name": "y_axis",
          "value": dimList[1],
          "bind": { "input": "select", "options": dimList }
        },
        {
          "name": "scale_by",
          "value": features["numeric"][0],
          "bind": { "input": "select", "options": features["numeric"] }
        },
        {
          "name": "colour_by",
          "value": features["discrete"][0],
          "bind": { "input": "select", "options": continuousColour ? features["numeric"] : features["discrete"] }
        },
        {
          "name": "shape_by",
          "value": features["discrete"][0],
          "bind": { "input": "select", "options": features["discrete"] }
        },
        {
          "name": "colourscheme",
          "value": colourschemes[1],
          "bind": { "input": "select", "options": colourschemes }
        }
      ],
    "data": 
      [
        {
          "name": "source",
          "values": mdsData,
          "transform": [{
            "type": "formula",
            "expr": "datum.x",
            "as": "tooltip"
          }]
        }
      ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "round": true,
        "nice": true,
        "zero": true,
        "domain": { "data": "source", "field": { "signal": "x_axis" } },
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "round": true,
        "nice": true,
        "zero": true,
        "domain": { "data": "source", "field": { "signal": "y_axis" } },
        "range": "height"
      },
      {
        "name": "size",
        "type": "linear",
        "round": true,
        "nice": false,
        "zero": true,
        "domain": { "data": "source", "field": { "signal": "scale_by" } },
        "range": [5, 350]
      },
      {
        "name": "color",
        "type": continuousColour ? "linear" : "ordinal",
        "domain": { "data": "source", "field": { "signal": "colour_by" } },
        "range": { "scheme": { "signal": "colourscheme" } }
      },
      {
        "name": "shape",
        "type": "ordinal",
        "domain": { "data": "source", "field": { "signal": "shape_by" } },
        "range": ["circle","square","diamond","triangle", "triangle-up", "cross"]
      }
    ],

    "axes": [
      {
        "scale": "x",
        "grid": true,
        "domain": false,
        "orient": "bottom",
        "tickCount": 5,
        "title": { "signal": "x_axis" }
      },
      {
        "scale": "y",
        "grid": true,
        "domain": false,
        "orient": "left",
        "titlePadding": 5,
        "title": { "signal": "y_axis" }
      }
    ],

    "legends": [
      {
        "size": "size",
        "title": "Scale",
        "format": "s",
        "symbolStrokeColor": "black",
        "symbolStrokeWidth": 0.5,
        "symbolOpacity": 0.9,
        "symbolType": "circle"
      },
      {
        "fill": "color",
        "title": "Colour",
        "symbolStrokeColor": "black",
        "symbolStrokeWidth": 0.5,
        "symbolOpacity": 0.9,
        "symbolType": "circle"
      },
      {
        "shape": "shape",
        "title": "Shape",
        "symbolStrokeColor": "black",
        "symbolStrokeWidth": 0.5,
        "symbolOpacity": 0.9,
      },
    ],

    "marks": [
      {
        "name": "marks",
        "type": "symbol",
        "from": { "data": "source" },
        "encode": {
          "update": {
            "x": { "scale": "x", "field": { "signal": "x_axis" } },
            "y": { "scale": "y", "field": { "signal": "y_axis" } },
            "size": { "scale": "size", "field": { "signal": "scale_by" }},
            "shape": { "scale": "shape", "field": { "signal": "shape_by" } },
            "fill": { "scale": "color", "field": { "signal": "colour_by" } },
            "strokeWidth": { "value": 0.5 },
            "opacity": { "value": 0.9 },
            "stroke": { "value": "black" },
            "tooltip": tooltip
          }
        }
      }
    ]
  };
}

// parametrise graph encoding for variance plot
function createEigenSpec(eigenData, width, height) 
{
  return {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    "description": "A basic bar chart example, with value labels shown upon mouse hover.",
    "width": width * 0.35,
    "height": height * 0.6,
    "padding": 0,
    "title": {
      "text": "Variance Explained"
    },
    "data": [
      {
        "name": "table",
        "values": eigenData
      }
    ],
  
    "signals": [
      {
        "name": "tooltip",
        "value": {},
        "on": 
        [
          {"events": "rect:mouseover", "update": "datum"},
          {"events": "rect:mouseout",  "update": "{}"}
        ]
      },
      {
        "name": "external_select_x",
        "value": 1
      },
      {
        "name": "external_select_y",
        "value": 2
      }
    ],
  
    "scales": [
      {
        "name": "xscale",
        "type": "band",
        "domain": {"data": "table", "field": "name"},
        "range": "width",
        "padding": 0.05,
        "round": true
      },
      {
        "name": "yscale",
        "domain": {"data": "table", "field": "eigen"},
        "range": "height"
      }
    ],
  
    "axes": [
      { "orient": "bottom", "scale": "xscale" },
      { "orient": "left", "scale": "yscale" }
    ],
  
    "marks": [
      {
        "type": "rect",
        "from": {"data":"table"},
        "encode": {
          "enter": {
            "x": {"scale": "xscale", "field": "name"},
            "width": {"scale": "xscale", "band": 1},
            "y": {"scale": "yscale", "field": "eigen"},
            "y2": {"scale": "yscale", "value": 0}
          },
          "update": {
            "fill": [ {"test": "datum.name == external_select_x || datum.name == external_select_y", "value": "#3d3f46"}, {"value":  "#afafaf"} ]
          }
        }
      },
      {
        "type": "text",
        "from": {"data":"table"},
        "encode": {
          "enter": {
            "align": {"value": "center"},
            "baseline": {"value": "bottom"},
            "fill": {"value": "#333"}
          },
          "update": {
            "x": {"scale": "xscale", "field": "name", "band": 0.5},
            "y": {"scale": "yscale", "field": "eigen", "offset": -2},
            "text": {"field": "eigen"},
            "fillOpacity": [
              {"test": "datum.name == external_select_x || datum.name == external_select_y", "value": 1},
              {"value": 0}
            ]
          }
        }
      }
    ]
  };
}