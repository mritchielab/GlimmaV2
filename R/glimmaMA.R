#' Glimma MA Plot
#'

#' Generic function for drawing a two-panel interactive MA plot, a special case of the
#' glimmaXY plot.

#' The function invokes the following methods which depend on the class of the first argument:
#' \itemize{
#'   \item \code{\link{glimmaMA.MArrayLM}} for limma analysis
#'   \item \code{\link{glimmaMA.DGEExact}} for edgeR analysis, produced from \code{\link{exactTest}}
#'   \item \code{\link{glimmaMA.DGELRT}} for edgeR analysis, produced from \code{\link{glmLRT}}
#'   \item \code{\link{glimmaMA.DESeqDataSet}} for DESeq2 analysis }

#' glimmaMD is an alias for glimmaMA.
#'
#' @param x the DE object to plot.
#' @param ... additional arguments affecting the plots produced. See specific methods for detailed arguments.
#'
#' @eval MA_details()
#'
#' @examples
#' methods(glimmaMA) # show methods for glimmaMA
#'
#' @export
glimmaMA <- function(x, ...)
{
  UseMethod("glimmaMA")
}

#' @rdname glimmaMA
#' @export
glimmaMD <- function(x, ...) {
  glimmaMA(x, ...)
}

#' Glimma MA Plot
#'
#' Draws a two-panel interactive MA plot from an MArrayLM object. This is a special case of the
#' \code{glimmaXY} plot.
#'
#' @param x \code{MArrayLM} object from which summary statistics are extracted from to create
#' summary (left) plot.
#'
#' @param dge \code{DGEList} object with \code{nrow(x)} rows from which expression values are
#' extracted from to create expression (right) plot. Gene counts are taken from \code{dge$counts}
#' and sample groups from \code{dge$samples$group}. By default raw counts are transformed to
#' log-cpm values (see more in the \code{transform.counts} argument).
#'
#' @param counts numeric matrix with \code{nrow(x)} rows containing gene expression values.
#' This can be used to replace the gene counts from \code{dge$counts}, i.e. you may have
#' log-rpkm values stored in a different object that you wish to use.
#'
#' @param groups vector of length \code{ncol(dge)} representing categorisation of samples in
#' expression plot.
#'
#' @param coef integer indicating the column in \code{x} from the summary plot is created.
#'
#' @param status vector of length \code{nrow(x)} indicating the status of each gene.
#' By default genes in the summary plot are coloured based on its differential expression status
#' using an adjusted p-value cutoff of 5\% by calling the \code{limma::decideTests} function, where
#' the value of -1 marks down-regulated genes, 0 marks genes with no expression difference, and
#' 1 marks up-regulated genes.
#'
#' @param anno dataframe with \code{nrow(x)} rows containing gene annotations.
#'
#' @param display.columns character vector containing names of columns from \code{anno} from
#' which to display in mouseover tooltips and table.
#'
#' @param status.cols vector of length 3 containing valid CSS strings for colours associated
#' with \code{status}  in the order of -1, 0 and 1.
#'
#' @param sample.cols character vector of length \code{ncol(counts)} containing valid CSS strings
#' for colours associated with each sample to be displayed on the expression plot. If left
#' unspecified, samples will be coloured according to \code{groups}.
#'
#' @param p.adj.method character string specifying p-value adjustment method.
#' @param transform.counts the type of transformation used on the counts - "logcpm" for using \code{edgeR::cpm(counts, log=TRUE)};
#' "cpm" for \code{edgeR::cpm(counts)}; "rpkm" for \code{edgeR::rpkm(counts)}; "logrpkm" for \code{edgeR::rpkm(counts, log=TRUE)}; and "none" for no transformation). Defaults to "logcpm".
#'
#' @param main character string for the main title of summary plot.
#' @param xlab character string for the x-axis label of summary plot.
#' @param ylab character string for the y-axis label of summary plot.
#' @param html character string for naming HTML file for exportation of widget. The extension
#' should be included in the file name e.g. "file.html".
#' @param width numeric value indicating width of widget in pixels.
#' @param height numeric value indicating width of height in pixels.
#' @param ... additional unused arguments.
#' @seealso \code{\link{glimmaMA}}, \code{\link{glimmaMA.DGEExact}}, \code{\link{glimmaMA.DGELRT}}, \code{\link{glimmaMA.DESeqDataSet}}
#' @eval MA_details()
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
#' glimmaMA(efit, dge = dge)
#' @importFrom limma decideTests
#' @export
glimmaMA.MArrayLM <- function(
  x,
  dge = NULL,
  counts=dge$counts,
  groups=dge$samples$group,
  coef=ncol(x$coefficients),
  status=limma::decideTests(x, adjust.method=p.adj.method),
  anno=x$genes,
  display.columns = NULL,
  status.cols=c("#1052bd", "silver", "#cc212f"),
  sample.cols=NULL,
  p.adj.method = "BH",
  transform.counts = c("logcpm", "cpm", "rpkm", "logrpkm", "none"),
  main=colnames(x)[coef],
  xlab="logCPM",
  ylab="logFC",
  html=NULL,
  width = 920,
  height = 920,
  ...)
{

  # check if user counts are given
  if (is.null(dge) && !is.null(counts)) {
    message("External counts supplied using counts argument will be transformed to log-cpm by default. Specify transform.counts='none' to override transformation.")
  }

  transform.counts <- match.arg(transform.counts)
  # check if the number of rows of x and the dge object are equal
  if (!is.null(dge) && nrow(x) != nrow(dge)) stop("MArrayLM object must have equal rows/genes to DGEList.")

  # create initial table with logCPM and logFC features
  create_table <- function(coef) {
    table <- data.frame(signif(unname(x$Amean), digits=4),
                        signif(unname(x$coefficients[, coef]), digits=4))
    names(table) <- c(xlab, ylab)
    AdjPValue <- signif(stats::p.adjust(x$p.value[, coef], method=p.adj.method), digits=4)
    table <- cbind(table, PValue=signif(x$p.value[, coef], digits=4), AdjPValue=AdjPValue)
    if (!any(colnames(anno) == "gene")) {
      table <- cbind(gene=rownames(x), table)
    } else {
      table <- cbind(gene=anno$gene, table)
      table$gene[is.na(table$gene)] <- "N/A"
      anno$gene <- NULL
    }
    if (is.matrix(status)) status <- status[, coef]
    # transform status column to (downReg, nonDE, upReg)
    status <- sapply(status, function (x) {
      switch(as.character(x), "-1"="downReg", "0"="nonDE", "1"="upReg")
    })
    if (length(status)!=nrow(table)) stop("Status vector
      must have the same number of genes as the main arguments.")
    table <- cbind(table, status=as.vector(status))
    if (!is.null(anno))
    {
      table <- cbind(table, anno)
    }
    table <- data.frame(index=0:(nrow(table)-1), table)
    return(table)
  }

  # preprocess counts
  if (is.null(counts)) {
    counts <- -1
    level <- NULL
  } else {
    # df format for serialisation
    if (transform.counts != "none") {
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

    counts <- data.frame(counts)
    #if (is.null(groups)) stop("If counts arg is supplied, groups arg must be non-null.")
    if (is.null(groups)) {
      groups <- factor("group")
    } else {
      if (ncol(counts) != length(groups)) stop("Length of groups must be equal to the number of columns in counts.\n")
    }

    level <- levels(groups)
    groups <- data.frame(group=groups)
    groups <- cbind(groups, sample=colnames(counts))
  }

  tables <- lapply(1:ncol(x), function (coef) {
    create_table(coef)
  })

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

  xData <- list(data=list(x=xlab,
                          y=ylab,
                          table=tables[[1]],
                          tables=tables,
                          cols=display.columns,
                          counts=counts,
                          groups=groups,
                          levels=level,
                          expCols=colnames(groups),
                          annoCols= if (is.null(anno)) {-1} else {colnames(anno)},
                          statusColours=status.cols,
                          sampleColours= if (is.null(sample.cols)) {-1} else {sample.cols},
                          samples=colnames(counts),
                          title=main))
  return(glimmaXYWidget(xData, width, height, html))
}

#' Glimma MA Plot
#'
#' Draws a two-panel interactive MA plot from an DGEExact object. This is a special case of the
#' \code{glimmaXY} plot.
#'
#' @inheritParams glimmaMA.MArrayLM
#' @param x DGEExact object from which summary statistics are extracted from to create summary (left) plot.
#' @param status vector of length nrow(x) indicating the status of each gene. By default genes in the summary plot are
#' coloured based on its differential expression status using an adjusted p-value cutoff of 0.05
#' by calling the \code{edgeR::decideTests()} function, where the value of -1 marks down-regulated genes, 0 marks genes with no
#' expression difference, and 1 marks up-regulated genes.
#'
#' @seealso \code{\link{glimmaMA}}, \code{\link{glimmaMA.MArrayLM}}, \code{\link{glimmaMA.DGELRT}}, \code{\link{glimmaMA.DESeqDataSet}}
#' @eval MA_details()
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
#' glimmaMA(glrt, dge = dge)
#'
#' @importFrom edgeR decideTests.DGELRT
#' @importFrom stats p.adjust
#' @export
glimmaMA.DGEExact <- function(
  x,
  dge=NULL,
  counts=dge$counts,
  groups=dge$samples$group,
  status=edgeR::decideTests.DGEExact(x, adjust.method=p.adj.method),
  anno=x$genes,
  display.columns = NULL,
  status.cols=c("#1052bd", "silver", "#cc212f"),
  sample.cols=NULL,
  p.adj.method = "BH",
  transform.counts = c("logcpm", "cpm", "rpkm", "logrpkm", "none"),
  main=paste(x$comparison[2],"vs",x$comparison[1]),
  xlab="logCPM",
  ylab="logFC",
  html=NULL,
  width = 920,
  height = 920,
  ...)
{

  # check if user counts are given
  if (is.null(dge) && !is.null(counts)) {
    message("External counts supplied using counts argument will be transformed to log-cpm by default. Specify transform.counts='none' to override transformation.")
  }

  transform.counts <- match.arg(transform.counts)
  # check if the number of rows of x and the dge object are equal
  if (!is.null(dge) && nrow(x) != nrow(dge)) stop("DGEExact/DGELRT object must have equal rows/genes to DGEList.")

  table <- data.frame(signif(x$table$logCPM, digits=4),
                      signif(x$table$logFC, digits=4))

  names(table) <- c(xlab, ylab)
  AdjPValue <- signif(stats::p.adjust(x$table$PValue, method=p.adj.method), digits=4)
  table <- cbind(table, PValue=signif(x$table$PValue, digits=4), AdjPValue=AdjPValue)
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

#' Glimma MA Plot
#'
#' Draws a two-panel interactive MA plot from an DGELRT object. This is a special case of the
#' \code{glimmaXY} plot.
#'
#' @inheritParams glimmaMA.DGEExact
#' @param x DGELRT object from which summary statistics are extracted from to create summary (left) plot.
#' @seealso \code{\link{glimmaMA}}, \code{\link{glimmaMA.MArrayLM}}, \code{\link{glimmaMA.DGEExact}}, \code{\link{glimmaMA.DESeqDataSet}}
#' @eval MA_details()
#' @importFrom edgeR decideTests.DGELRT
#' @importFrom stats p.adjust
#' @export
glimmaMA.DGELRT <- glimmaMA.DGEExact

#' Glimma MA Plot
#'
#' Draws a two-panel interactive MA plot from an DESeqDataSet object. This is a special case of the
#' \code{glimmaXY} plot.
#'
#' @inheritParams glimmaMA.MArrayLM
#' @param x DESeqDataSet object from which summary statistics are extracted from to create summary (left) plot.
#' @param status vector of length nrow(x) indicating the status of each gene.
#' @param counts numeric matrix with nrow(x) rows containing gene expression values.
#' @param groups vector/factor representing the experimental group for each sample; see \code{\link{extractGroups}} for default value.
#' @seealso \code{\link{glimmaMA}}, \code{\link{glimmaMA.MArrayLM}}, \code{\link{glimmaMA.DGEExact}}, \code{\link{glimmaMA.DGELRT}}
#' @eval MA_details()
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
#' glimmaMA(dds)
#'
#' @importFrom DESeq2 results counts
#' @importFrom stats complete.cases
#' @importFrom SummarizedExperiment colData
#' @export
glimmaMA.DESeqDataSet  <- function(
  x,
  counts=DESeq2::counts(x),
  groups=extractGroups(colData(x)),
  status=NULL,
  anno=NULL,
  display.columns = NULL,
  status.cols=c("#1052bd", "silver", "#cc212f"),
  sample.cols=NULL,
  transform.counts = c("logcpm", "cpm", "rpkm", "logrpkm", "none"),
  main="MA Plot",
  xlab="logCPM",
  ylab="logFC",
  html=NULL,
  width = 920,
  height = 920,
  ...)
{
  transform.counts <- match.arg(transform.counts)
  res.df <- as.data.frame(DESeq2::results(x, ...))
  # filter out genes that have missing data
  complete_genes <- complete.cases(res.df)
  res.df <- res.df[complete_genes, ]
  x <- x[complete_genes, ]

  total_genes <- length(complete_genes)
  filtered_genes <- sum(!complete_genes)
  if (filtered_genes > 0)
    message(filtered_genes, " of ", total_genes, " genes were filtered out in DESeq2 tests")

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

  # create initial table with logCPM and logFC features
  table <- data.frame(signif(log(res.df$baseMean + 0.5), digits=4),
                      signif(res.df$log2FoldChange, digits=4))
  colnames(table) <- c(xlab, ylab)
  table <- cbind(table, PValue=signif(res.df$pvalue, digits=4), AdjPValue=signif(res.df$padj, digits=4))
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
