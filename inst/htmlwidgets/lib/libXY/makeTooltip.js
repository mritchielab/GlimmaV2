function makeVegaTooltip(columns)
{
    // generate tooltip object for embedding in spec
    let tooltipString = "{";
    columns.forEach(x => tooltipString += `'${x}':datum['${x}'],`);
    tooltipString += "}";
    var tooltip = { "signal" : tooltipString };
    return tooltip;
}