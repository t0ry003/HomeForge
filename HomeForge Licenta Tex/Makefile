TEX_FILE=teza.tex
PDF_FILE=$(TEX_FILE:.tex=.pdf)

.PHONY: all clean
all: $(PDF_FILE)

$(PDF_FILE): $(TEX_FILE)
	latexmk -pdf -shell-escape -interaction=nonstopmode -file-line-error -synctex=1 $(TEX_FILE)

clean: 
	latexmk -C
	rm -rf _minted-teza
	find . -type f \( -name '*.bbl-SAVE-ERROR' -o -name '*.bcf-SAVE-ERROR' -o -name '*.xdv' \) -delete


