onmessage = function (e) {

  const dateRegex = /((((31)?(?!\s+(Feb(ruary)?|Apr(il)?|June?|(Sep(?=\b|t)t?|Nov)(ember)?)))|((30|29)?(?!\s+Feb(ruary)?))|((29)?(?=\s+Feb(ruary)?\s+(((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|((16|[2468][048]|[3579][26])00)))))|(0?[1-9])|1\d|2[0-8])\s+(Jan(uary)?|Feb(ruary)?|Ma(r(ch)?|y)|Apr(il)?|Ju((ly?)|(ne?))|Aug(ust)?|Oct(ober)?|(Sep(?=\b|t)t?|Nov|Dec)(ember)?),?\s+((1[6-9]|[2-9]\d)\d{2}))/gmi;

  const textExists = (text, findText, loose, wholeWord) => {
    if(loose) {
      return text.toLowerCase().indexOf(findText.toLowerCase()) !== -1;
    } else if (!wholeWord) {
      return text.toLowerCase().startsWith(findText.toLowerCase());
    } else {
      return text.toLowerCase().trim() === findText.toLowerCase().trim();
    }
    
  };

  const { facetData, caseData } = JSON.parse(e.data);

  const boundingBoxes = [];

  caseData.forEach((c) => {
    const currentPage = [];

    if (facetData.id === "search" && facetData.searchQuery.length > 0) {
    

      let allWords = [];
      
      c.lines.forEach(l => {
        allWords = allWords.concat(l.words);
      });

      let found = false;

      let amArr = facetData.searchQuery.split(/\s+/g).filter(f => f !== "");

      let len = allWords.length;

      let currentSearchIndex = 0;
      let composition = [];
      let compositionWords = [];

      for (let i = 0; i < len; i++) {
        
        const word = allWords.shift();
        const wordText = word.text;
        let searchAhead = true;

        
        if(wordText.toLowerCase().trim().startsWith(amArr[currentSearchIndex].toLowerCase().trim())) {
          composition.push(amArr[currentSearchIndex]);
          compositionWords.push(word);


          if(amArr.length == 1) {

            if(composition.join("_") == amArr.join("_")) {
              
              compositionWords.forEach(w => {
                currentPage.push({
                  boxes: w.boundingBox.map((b) => b * 72)
                });
              })
              
              found = true;
              searchAhead = false;

            }
          
          } else {

          while(searchAhead) {

            currentSearchIndex++;
            
            if(amArr[currentSearchIndex] && allWords[currentSearchIndex - 1].text.toLowerCase().includes(amArr[currentSearchIndex].toLowerCase())) {
              composition.push(amArr[currentSearchIndex]);
              compositionWords.push(allWords[currentSearchIndex - 1]);
              if(composition.join("_") == amArr.join("_")) {
                
                compositionWords.forEach(w => {
                  currentPage.push({
                    boxes: w.boundingBox.map((b) => b * 72)
                  });
                })
                
                found = true;
                searchAhead = false;
              }
            } else {
              currentSearchIndex = 0;
              composition = [];
              compositionWords = [];
              searchAhead = false;
            }
            
          }

        }

        }
        
        

      }

    }

    else if (facetData.type === "boolean") {
      c.lines.forEach((l) => {
        // Find if it exists in the line text
        // If it does, look in the words

        facetData.options.forEach((f) => {
          if (textExists(l.text, f.value, true)) {
            l.words.forEach((w) => {
              if (textExists(w.text, f.value, false, f.wholeWord)) {
                currentPage.push({
                  boxes: w.boundingBox.map((b) => b * 72)
                });
              }
            });
          }
        });
      });
    } else if (facetData.type === "date") {
      
      let caseText = "";
      for (let lineIndex in c.lines) {
        const line = c.lines[lineIndex];
        caseText += line.text + "\n";
      }

      let arrayMatches = [...caseText.matchAll(dateRegex)].map(a => a[0]);
      
      let allWords = [];
      
      c.lines.forEach(l => {
        allWords = allWords.concat(l.words);
      });

      arrayMatches.forEach(aM => {

        let found = false;


        let amArr = aM.split(/\s+/).filter(f => f !== "");
        let len = allWords.length;

        let currentSearchIndex = 0;
        let composition = [];
        let compositionWords = [];

        for (let i = 0; i < len; i++) {
          
          const word = allWords.shift();
          const wordText = word.text;
          let searchAhead = true;

          
          if(wordText.toLowerCase().includes(amArr[currentSearchIndex].toLowerCase())) {
            composition.push(amArr[currentSearchIndex]);
            compositionWords.push(word);

            while(searchAhead) {

              currentSearchIndex++;

              if(allWords[currentSearchIndex - 1].text.toLowerCase().includes(amArr[currentSearchIndex].toLowerCase())) {
                composition.push(amArr[currentSearchIndex]);
                compositionWords.push(allWords[currentSearchIndex - 1]);
                if(composition.join("_") == amArr.join("_")) {

                  compositionWords.forEach(w => {
                    currentPage.push({
                      optionValue: aM,
                      boxes: w.boundingBox.map((b) => b * 72)
                    });
                  })

                  found = true;
                  searchAhead = false;
                }
              } else {
                currentSearchIndex = 0;
                composition = [];
                compositionWords = [];
                searchAhead = false;
              }
              
            }

          }
          
          if(found) {
            break;
          }

        }

      });

    } else {
      throw new Error("Unknown facet type");
    }

    boundingBoxes.push(currentPage);
  });

  postMessage({
    id: facetData.id,
    boundingBoxes,
  });
};
