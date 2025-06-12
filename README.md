<p align="center">
  <img src="https://github.com/hasaru-k/GlimmaV2-docs/blob/master/documentation/glimma_des1.png">
</p>

[![Build Status](https://travis-ci.org/hasaru-k/GlimmaV2.svg?branch=master)](https://travis-ci.org/hasaru-k/GlimmaV2)
[![codecov](https://codecov.io/gh/hasaru-k/GlimmaV2/branch/master/graph/badge.svg)](https://codecov.io/gh/hasaru-k/GlimmaV2)
# 
Glimma 2,0 is an interactive R widget for creating plots for differential expression analysis, created using the [Vega](https://vega.github.io/vega/) and [htmlwidgets](https://www.htmlwidgets.org/) frameworks. It's an update/reimplementation of [Glimma 1.0](https://github.com/Shians/Glimma)! New features include:
- 🧬 multiple gene selections
- 📓 full integration with R markdown
- 🖼 exporting plots to PNG/SVG/CSV formats

#### Available on [Bioconductor](https://bioconductor.org/packages/release/bioc/html/Glimma.html).

Feedback is welcome, please feel free to open an issue for any enhancements you would like to see in future.
## *glimmaMA*: MA plot
<img src="https://github.com/hasaru-k/GlimmaV2-docs/blob/master/documentation/MA.gif" width="900px"/>'

## *glimmaVolcano*: Volcano plot
<img src="https://github.com/hasaru-k/GlimmaV2-docs/blob/master/documentation/volcano.gif" width="900px"/>

## *glimmaMDS*: Multidimensional scaling plot
<img src="https://github.com/hasaru-k/GlimmaV2-docs/blob/master/documentation/MDS.png" width="900px"/>

## Installation
You can install the development version of GlimmaV2 using devtools from the R command line.
```R
devtools::install_github("mritchielab/GlimmaV2")
```
## Features

### Expression plot controls

You can **fix** the **y-axis** when switching between genes by specifying ```Y min``` and ```Y max``` values:

<img src="https://github.com/hasaru-k/GlimmaV2-docs/blob/master/documentation/axis.gif" width="500px"/>

**Jitter** can also be interactively applied when samples are overlying each other:

<img src="https://github.com/hasaru-k/GlimmaV2-docs/blob/master/documentation/jitter.gif" width="500px"/>

### Plot Colouring (MA/Volcano/XY)
The default mapping between the status vector and color of the gene is given below:
```
-1 (downreg)   =>  blue
 0 (not DE)    =>  silver
 1 (upreg)     =>  red
```
Accordingly, the default status.colours argument is ```c("dodgerblue", "silver", "firebrick")```. If no status vector is provided, all genes are given a status value of 0. The colour mapping can be changed by varying the status.colours argument which must be a vector of three valid CSS strings (for example: ```#f304d3```, ```#fff```, ```rgb(253, 12, 134)```, ```steelblue```):
```R
glimmaMA(fit, dge=rnaseq, status.colours=c("#3977db","#3d3f42","#db0d4e"))
```
```R
glimmaVolcano(fit, dge=rnaseq, status.colours=c("blue", "darkgrey", "red"))
```
```R
glimmaXY(x=fit$coef, y=fit$lod, dge=rnaseq, status=dtFit, status.colours=c("cyan", "grey", "hotpink"))
```
### Gene Symbol Text (MA/Volcano/XY)
Gene symbol text will be displayed above selected points if there is a ```symbol``` column (case-insensitive) within the gene annotation supplied as per the example plots shown above. The gene annotation is the ```anno``` argument. 

- for the glimmaVolcano and glimmaMA functions, ```anno``` defaults to ```x$genes``` for DGELRT/DGEExact and MArrayLM objects and defaults to ```NULL``` for DESeqDataSet objects - see ```?glimmaMA```, ```?glimmaVolcano``` for further detail
- for glimmaXY, ```anno``` is always ```NULL``` by default


### MDS Options
The ```scale_by``` dropdown menu contains *numeric* features provided the ```groups``` dataframe, while the ```shape_by``` dropdown contains *discrete* features provided by the ```groups``` dataframe. The ```colour_by``` dropdown contains discrete features by default but can be altered to take numeric features such as library size by setting ```continuous.colour=TRUE```:
```R
glimmaMDS(rnaseq, groups=groups, continuous.colour=TRUE)
```
The test used to distinguish numeric vs discrete features in the groups dataframe is ```sapply(groups, is.numeric)```, so the appropriate coercions can be used toggle ambiguous features between numeric/discrete.

### Exporting Standalone HTML

Specifying a filename using the ```html``` argument (*including the extension*) in any of the GlimmaV2 functions will export the widget to a standalone single HTML file, rather than displaying/returning the widget in R Markdown.

```R
glimmaMA(fit, dge=rnaseq, html="MA_plot.html")
```
If more flexibility is required (ex. varying the background colour, whether or not the file should be standalone), the user can call ```htmlwidgets::saveWidget()``` on instantiated widgets which has [further options](https://rdrr.io/cran/htmlwidgets/man/saveWidget.html).
```R
glMA <- glimmaMA(fit, dge=rnaseq)
htmlwidgets::saveWidget(glMA, file="glimmaV2Example.html")
```

### Sizing
The width and height parameters can be adjusted to change the dimensions of the widget in pixels in the RStudio viewer and in knitted HTML:
```R
glimmaMA(fit, dge=rnaseq, width=1200, height=1200)
```
All GlimmaV2 functions take optional width/height arguments. The default glimmaMA/glimmaXY width and height are both 920px, so they should be modified in a 1:1 ratio if preserving the original scale is desired.
