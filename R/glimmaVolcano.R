#' Glimma Volcano Plot
#'
#' Generic function for drawing a two-panel interactive volcano plot, a special case of the
#' glimmaXY plot.
#' The function invokes the following methods which depend on the class of the first argument:
#' \itemize{
#'   \item \code{\link{glimmaVolcano.MArrayLM}} for limma analysis
#'   \item \code{\link{glimmaVolcano.DGEExact}} for edgeR analysis, produced from \code{\link{exactTest}}
#'   \item \code{\link{glimmaVolcano.DGELRT}} for edgeR analysis, produced from \code{\link{glmLRT}}
#'   \item \code{\link{glimmaVolcano.DESeqDataSet}} for DESeq2 analysis }
#'
#' @param x the DE object to plot.
#' @param ... additional arguments affecting the plots produced. See specific methods for detailed arguments.
#' @eval volcano_details()
#'
#' @examples
#' dge <- readRDS(
#'   system.file("RNAseq123/dge.rds", package = "Glimma"))
#' design <- readRDS(
#'   system.file("RNAseq123/design.rds", package = "Glimma"))
#' contr.matrix <- readRDS(
#'   system.file("RNAseq123/contr.matrix.rds", package = "Glimma"))
#'
#' v <- limma::voom(dge, design)
#' vfit <- limma::lmFit(v, design)
#' vfit <- limma::contrasts.fit(vfit, contrasts = contr.matrix)
#' efit <- limma::eBayes(vfit)
#'
#' glimmaVolcano(efit, dge = dge)
#'
#' @export
glimmaVolcano <- function(x, ...)
{
  UseMethod("glimmaVolcano")
}

#' Glimma Volcano Plot
#'
#' Draws a two-panel interactive volcano plot from an MArrayLM object. This is a special case of the
#' \code{glimmaXY} plot.
#'
#' @inheritParams glimmaMA.MArrayLM
#' @seealso \code{\link{glimmaVolcano}}, \code{\link{glimmaVolcano.DGEExact}}, \code{\link{glimmaVolcano.DGELRT}}, \code{\link{glimmaVolcano.DESeqDataSet}}
#' @eval volcano_details()
#' @importFrom limma decideTests
#' @export
glimmaVolcano.MArrayLM <- function(
  x,
  dge = NULL,
  counts=dge$counts,
  groups=dge$samples$group,
  coef=ncol(x$coefficients),
  status=limma::decideTests(x),
  anno=x$genes,
  display.columns = NULL,
  status.cols=c("#1052bd", "silver", "#cc212f"),
  sample.cols=NULL,
  p.adj.method = "BH",
  transform.counts = c("logcpm", "cpm", "rpkm", "none"),
  main=colnames(x)[coef],
  xlab="logFC",
  ylab="negLog10PValue",
  html=NULL,
  width = 920,
  height = 920,
  ...)
{

  # check if user counts are given
  if (is.null(dge) && !is.null(counts)) {
    message("External counts supplied using counts argument will be transformed to log-cpm by default. Specify transform.counts='none' to override transformation.")
  }

  if (!is.null(dge) && nrow(x) != nrow(dge)) stop("MArrayLM object must have equal rows/genes to DGEList.")

  transform.counts <- match.arg(transform.counts)

  # create initial table with the following features:
  # - logFC (x axis)
  # - -log10(PValue) (y axis)
  # - logCPM
  # - Adjusted P values
  # - gene
  # - status
  # - annotation columns (optional, user-provided)
  # - index column
  create_table <- function(coef) {
    # unname gets rid of gene names, creating an indexed vector
    logfc <- unname(x$coefficients[, coef])  # x axis
    negLog10PValue <- -log10(x$p.value[, coef]) # y axis
  
    table <- data.frame(signif(logfc, digits=4),
                        signif(negLog10PValue, digits=4))
    names(table) <- c(xlab, ylab)
    # add adjusted P value and logcpm to the table
    logcpm <- signif(unname(x$Amean), digits=4)
    AdjPValue <- signif(stats::p.adjust(x$p.value[, coef], method=p.adj.method), digits=4)
    table <- cbind(table, logCPM=logcpm, AdjPValue=AdjPValue)
    # use user-provided gene column in annotations; otherwise use rownames from the limma object
    if (!any(colnames(anno) == "gene")) {
      table <- cbind(gene=rownames(x), table)
    } else {
      table <- cbind(gene=anno$gene, table)
      table$gene[is.na(table$gene)] <- "N/A"
      anno$gene <- NULL
    }
    if (is.matrix(status)) status <- status[, coef]
    # transform status column to (downReg, nonDE, upReg)
    status <- sapply(status, function (value) {
      switch(as.character(value), "-1"="downReg", "0"="nonDE", "1"="upReg")
    })
    if (length(status) != nrow(table)) stop("Status vector
      must have the same number of genes as the main arguments.")
    table <- cbind(table, status=as.vector(status))
    if (!is.null(anno))
    {
      table <- cbind(table, anno)
    }
    index <- 0:(nrow(table)-1)
    table <- data.frame(index, table)
    return(table)
  }

  # create a list of tables for every coefficient
  tables <- lapply(1:ncol(x), function (coef) {
    create_table(coef)
  })

  # preprocess counts
  if (is.null(counts)) {
    counts <- -1
    level <- NULL
  } else {
    if (transform.counts != "none") {
      # check that counts are all integers
      if (!isTRUE(all.equal(counts, round(counts)))) {
        warning("count transform requested but not all count values are integers.")
      }
      if (transform.counts == "logcpm") {
        counts <- edgeR::cpm(counts, log=TRUE)
      } else if (transform.counts == "cpm") {
        counts <- edgeR::cpm(counts, log=FALSE)
      } else if (transform.counts == "rpkm" || transform.counts == "logrpkm") {
        if (is.null(anno$length)) {
          stop("no 'length' column in gene annotation, rpkm cannot be computed")
        }

        if (!is.numeric(anno$length)) {
          stop("'length' column of gene annotation must be numeric values")
        }

        if (transform.counts == "rpkm") {
          counts <- edgeR::rpkm(counts, gene.length = anno$length)
        } else {
          counts <- edgeR::rpkm(counts, gene.length = anno$length, log = TRUE)
        }
      }
    }

    # df format for serialisation
    counts <- data.frame(counts)
    if (is.null(groups)) {
      groups <- factor("group")
    } else {
      if (ncol(counts) != length(groups)) stop("Length of groups must be equal to the number of columns in counts.\n")
    }

    level <- levels(groups)
    groups <- data.frame(group=groups)
    groups <- cbind(groups, sample=colnames(counts))
  }

  if (is.null(display.columns)) {
    display.columns <- colnames(tables[[1]])
  } else {
    # if it's specified, make sure at least x, y, gene are displayed in the table and tooltips
    if (!(xlab %in% display.columns)) display.columns <- c(display.columns, xlab)
    if (!(ylab %in% display.columns)) display.columns <- c(display.columns, ylab)
    if (!("gene" %in% display.columns)) display.columns <- c("gene", display.columns)
  }

  if (length(status.cols) != 3) stop("status.cols
          arg must have exactly 3 elements for [downreg, notDE, upreg]")

  # must match schema in glimmaXY.ts (XYSchema)
  xData <- list(data=list(x=xlab,
                          y=ylab,
                          tables=tables,
                          titles=colnames(x),
                          cols=display.columns,
                          counts=counts,
                          groups=groups,
                          levels=level,
                          expCols=colnames(groups),
                          annoCols= if (is.null(anno)) {-1} else {colnames(anno)},
                          statusColours=status.cols,
                          sampleColours= if (is.null(sample.cols)) {-1} else {sample.cols},
                          samples=colnames(counts)
                          ))
  return(glimmaXYWidget(xData, width, height, html))
}

#' Glimma Volcano Plot
#'
#' Draws a two-panel interactive volcano plot from an DGEExact object. This is a special case of the
#' \code{glimmaXY} plot.
#'
#' @inheritParams glimmaMA.DGEExact
#' @seealso \code{\link{glimmaVolcano}}, \code{\link{glimmaVolcano.MArrayLM}}, \code{\link{glimmaVolcano.DGELRT}}, \code{\link{glimmaVolcano.DESeqDataSet}}
#' @eval volcano_details()
#'
#' @examples
#' dge <- readRDS(
#'   system.file("RNAseq123/dge.rds", package = "Glimma"))
#' design <- readRDS(
#'   system.file("RNAseq123/design.rds", package = "Glimma"))
#' contr.matrix <- readRDS(
#'   system.file("RNAseq123/contr.matrix.rds", package = "Glimma"))
#'
#' dge <- edgeR::estimateDisp(dge, design)
#' gfit <- edgeR::glmFit(dge, design)
#' glrt <- edgeR::glmLRT(gfit, design, contrast = contr.matrix)
#'
#' glimmaVolcano(glrt, dge = dge)
#'
#' @importFrom edgeR decideTests.DGELRT
#' @importFrom stats p.adjust
#' @export
glimmaVolcano.DGEExact <- function(
  x,
  dge=NULL,
  counts=dge$counts,
  groups=dge$samples$group,
  status=edgeR::decideTests.DGEExact(x),
  anno=x$genes,
  display.columns = NULL,
  status.cols=c("#1052bd", "silver", "#cc212f"),
  sample.cols=NULL,
  p.adj.method = "BH",
  transform.counts = c("logcpm", "cpm", "rpkm", "none"),
  main=paste(x$comparison[2],"vs",x$comparison[1]),
  xlab="logFC",
  ylab="negLog10PValue",
  html=NULL,
  width = 920,
  height = 920,
  ...)
{

  # check if user counts are given
  if (is.null(dge) && !is.null(counts)) {
    message("External counts supplied using counts argument will be transformed to log-cpm by default. Specify transform.counts='none' to override transformation.")
  }

  if (!is.null(dge) && nrow(x) != nrow(dge)) stop("DGEExact/DGELRT object must have equal rows/genes to DGEList.")

  transform.counts <- match.arg(transform.counts)
  # create initial table with -log10(pvalue) and logFC features
  table <- data.frame(signif(x$table$logFC, digits=4),
                      signif(-log10(x$table$PValue), digits=4))
  colnames(table) <- c(xlab, ylab)
  AdjPValue <- signif(stats::p.adjust(x$table$PValue, method=p.adj.method), digits=4)
  logCPM <- signif(x$table$logCPM, digits=4)
  table <- cbind(table, logCPM=logCPM, AdjPValue=AdjPValue)
  if (!any(colnames(anno) == "gene")) {
    table <- cbind(gene=rownames(x), table)
  } else {
    table <- cbind(gene=anno$gene, table)
    table$gene[is.na(table$gene)] <- "N/A"
    anno$gene <- NULL
  }
  xData <- buildXYData(table, status, main, display.columns, anno, counts, xlab, ylab, status.cols, sample.cols, groups, transform.counts)
  return(glimmaXYWidget(xData, width, height, html))
}

#' Glimma Volcano Plot
#'
#' Draws a two-panel interactive volcano plot from an DGELRT object. This is a special case of the
#' \code{glimmaXY} plot.
#'
#' @inheritParams glimmaMA.DGELRT
#' @seealso \code{\link{glimmaVolcano}}, \code{\link{glimmaVolcano.MArrayLM}}, \code{\link{glimmaVolcano.DGEExact}}, \code{\link{glimmaVolcano.DESeqDataSet}}
#' @eval volcano_details()
#' @importFrom edgeR decideTests.DGELRT
#' @importFrom stats p.adjust
#' @export
glimmaVolcano.DGELRT <- glimmaVolcano.DGEExact

#' Glimma Volcano Plot
#'
#' Draws a two-panel interactive volcano plot from an DESeqDataSet object. This is a special case of the
#' \code{glimmaXY} plot.
#'
#' @inheritParams glimmaMA.DESeqDataSet
#' @param groups vector/factor representing the experimental group for each sample; see \code{\link{extractGroups}} for default value.
#' @seealso \code{\link{glimmaVolcano}}, \code{\link{glimmaVolcano.MArrayLM}}, \code{\link{glimmaVolcano.DGEExact}}, \code{\link{glimmaVolcano.DGELRT}}
#' @eval volcano_details()
#'
#' @examples
#' dge <- readRDS(
#'   system.file("RNAseq123/dge.rds", package = "Glimma"))
#'
#' dds <- DESeq2::DESeqDataSetFromMatrix(
#'   countData = dge$counts,
#'   colData = dge$samples,
#'   rowData = dge$genes,
#'   design = ~group
#' )
#'
#' dds <- DESeq2::DESeq(dds, quiet=TRUE)
#' glimmaVolcano(dds)
#'
#' @importFrom DESeq2 results counts
#' @importFrom SummarizedExperiment colData
#' @export
glimmaVolcano.DESeqDataSet  <- function(
  x,
  counts=DESeq2::counts(x),
  groups=extractGroups(colData(x)),
  status=NULL,
  anno=NULL,
  display.columns = NULL,
  status.cols=c("#1052bd", "silver", "#cc212f"),
  sample.cols=NULL,
  transform.counts = c("logcpm", "cpm", "rpkm", "none"),
  main="Volcano Plot",
  xlab="logFC",
  ylab="negLog10PValue",
  html=NULL,
  width = 920,
  height = 920,
  ...)
{
  transform.counts <- match.arg(transform.counts)
  res.df <- as.data.frame(DESeq2::results(x))

  # filter out genes that have missing data
  complete_genes <- complete.cases(res.df)
  res.df <- res.df[complete_genes, ]
  x <- x[complete_genes, ]

  # extract status if it is not given
  if (is.null(status))
  {
    status <- ifelse(
      res.df$padj < 0.05,
      ifelse(res.df$log2FoldChange < 0, -1, 1),
      0
    )
  }
  else
  {
    if (length(status)!=length(complete_genes)) stop("Status vector
      must have the same number of genes as the main arguments.")
    status <- status[complete_genes]
  }

  # create initial table with logFC and -log10(pvalue) features
  table <- data.frame(signif(res.df$log2FoldChange, digits=4),
                      signif(-log10(res.df$pvalue), digits=4))
  colnames(table) <- c(xlab, ylab)
  table <- cbind(table, logCPM=signif(log(res.df$baseMean + 0.5), digits=4),
                        AdjPValue=signif(res.df$padj, digits=4))
  if (!any(colnames(anno) == "gene")) {
    table <- cbind(gene=rownames(x), table)
  } else {
    table <- cbind(gene=anno$gene, table)
    table$gene[is.na(table$gene)] <- "N/A"
    anno$gene <- NULL
  }
  xData <- buildXYData(table, status, main, display.columns, anno, counts, xlab, ylab, status.cols, sample.cols, groups, transform.counts)
  return(glimmaXYWidget(xData, width, height, html))
}
