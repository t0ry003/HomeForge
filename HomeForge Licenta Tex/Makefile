TEX_FILE=teza.tex
PDF_FILE=$(BUILD_DIR)/$(TEX_FILE:.tex=.pdf)
BUILD_DIR=build
SCRIPT_DIR=scripts

.PHONY: all clean bib-unused bib-prune
all: $(PDF_FILE)

$(PDF_FILE): $(TEX_FILE)
	mkdir -p $(BUILD_DIR)
	mkdir -p $(BUILD_DIR)/capitole $(BUILD_DIR)/_minted-teza $(BUILD_DIR)/svg-inkscape
	latexmk -pdf -shell-escape -interaction=nonstopmode -file-line-error -synctex=1 -outdir=$(BUILD_DIR) -auxdir=$(BUILD_DIR) $(TEX_FILE)

clean: 
	latexmk -C -outdir=$(BUILD_DIR) -auxdir=$(BUILD_DIR) $(TEX_FILE)
	rm -rf $(BUILD_DIR) _minted-teza svg-inkscape
	find . -maxdepth 2 -type f \( -name '*.aux' -o -name '*.bbl' -o -name '*.bcf' -o -name '*.blg' -o -name '*.fdb_latexmk' -o -name '*.fls' -o -name '*.lof' -o -name '*.log' -o -name '*.lot' -o -name '*.out' -o -name '*.run.xml' -o -name '*.synctex.gz' -o -name '*.toc' \) -delete

bib-unused:
	python3 $(SCRIPT_DIR)/bib_unused.py --tex-root . --bib referinte/referinte.bib

bib-prune:
	mkdir -p $(BUILD_DIR)
	python3 $(SCRIPT_DIR)/bib_unused.py --tex-root . --bib referinte/referinte.bib --prune $(BUILD_DIR)/referinte.pruned.bib


