function createExpressionSpec(
    width, 
    height, 
    expColumns, 
    sampleColours, 
    samples, 
    minExtentInputClass, 
    maxExtentInputClass,
)
{

    let colourscheme_signal = 
    {
        "name": "colourscheme",
        "value": "category10",
        "bind": { 
                    "input": "select", 
                    "options": [ "category10", "accent", "category20", "category20b", "category20c", "dark2", "paired", "pastel1", "pastel2", "set1", "set2", "set3", "tableau10", "tableau20"],
                    "name": "colourscheme" 
                }
    };

    /* need an empty signal if sample.cols argument has been supplied */
    let samplecols_signal = { "name": "samplecols_active" };

    /* must match counts term in processExpression */
    expColumns.push("count");
    let tooltip = makeVegaTooltip(expColumns);
    return {
        "$schema": "https://vega.github.io/schema/vega/v5.json",
        "width": width*0.40,
        "height": height*0.35,
        "padding": {"left": 0, "top": 0, "right": 0, "bottom": 10},
        "autosize": {"type": "fit", "resize": true},
        "title": { "text": {"signal": "title_signal" }},
        "signals": 
                [ 
                    {
                        "name": "title_signal", 
                        "value": "" 
                    },
                    {
                        "name": "min_extent",
                        "update": "extent[0]"
                    },
                    {
                        "name": "max_extent",
                        "update": "extent[1]"
                    },
                    {
                        "name": "min_y_input", 
                        "value": null,
                        "bind": { 
                                  "input": "number",
                                  "class": minExtentInputClass,
                                  "name": "Y min",
                                },
                    },
                    {
                        "name": "max_y_input", 
                        "value": null,
                        "bind": { 
                                  "input": "number",
                                  "class": maxExtentInputClass,
                                  "name": "Y max",
                                },
                    },
                    {
                        "name": "min_y",
                        "update": " (min_y_input > extent[0]) ? null : min_y_input"
                    },
                    {
                        "name": "max_y",
                        "update": " (max_y_input < extent[1]) ? null : max_y_input"
                    },
                    {
                        "name": "jitter", 
                        "value": 0,
                        "bind": { 
                                "input": "range",
                                "name": "jitter",
                                },
                    },
                    sampleColours == -1 ? colourscheme_signal : samplecols_signal
                ],
        "data": [ 
            {   "name": "table",
                "transform": [
                    {"type": "extent", "field": "count", "signal": "extent"} 
                ]
            } 
        ],
        "scales": 
        [
            {
                "name": "x",
                "type": "band",
                "padding":1,
                "domain": {"data": "table", "field": "group"},
                "range": "width"
            },
            {
                "name": "y",
                "domain": {"data": "table", "field": "count"},
                "range": "height",
                "domainMin": {"signal": "min_y"},
                "domainMax": {"signal": "max_y"},
            },
            {
                "name": "color",
                "type": "ordinal",
                "domain": sampleColours == -1 ? { "data": "table", "field": "group" } : samples,
                "range": sampleColours == -1 ? { "scheme": { "signal": "colourscheme" } } : sampleColours
            }
        ],
        "axes": 
        [
            {
                "scale": "x",
                "orient": "bottom",
                "title": "group",
                "labelAngle": -45,
                "labelAlign": "right",
                "labelOffset": -3  
            },
            {
                "scale": "y",
                "grid": true,
                "orient": "left",
                "titlePadding": 5,
                "title": "expression"
            }
        ],
        "marks": 
        [{
                "name": "marks",
                "type": "symbol",
                "from": {"data": "table"},
                "encode": {
                    "update": {
                        "x": {"scale": "x", "field": "group"},
                        "y": {"scale": "y", "field": "count"},
                        "shape": {"value": "circle"},
                        "fill": { "scale": "color", "field": sampleColours == -1 ? "group" : "sample" },
                        "strokeWidth": {"value": 1},
                        "opacity": {"value": 0.8},
                        "size": {"value": 100},
                        "stroke": {"value": "#575757"},
                        "tooltip": tooltip
                    }
                },
                "transform": [
                    {"type": "formula", "as": "x0", "expr": "datum.x"},
                    {"type": "formula", "as": "x", "expr": "datum.x0 + (random()-0.5)*jitter"},
                ],
            }]
    };
}
