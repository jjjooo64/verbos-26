/* 

This repository, while living in its original location on github, provides a live instantiation of a web app for practicing Spanish conjugations. It is built with an architecture that allows it to be easily (and, at the time of writing, cheaply) hosted with the superstatic-26 methodology ( https://github.com/jjjooo64/superstatic-26 ), but if you have no need for the benefits afforded by the superstatic-26 methodology (easy setup of multidomains and 404 rerouting to index.html), then you can easily host it anywhere, including by simply by maintaing a fork of this repository on github with github pages activated and then editing the urls in below in this readme and in the script tags of index.html.  

At any rate, to get an instance of the web app up and running, the js files in this repository (including this readme file) will need to be hosted somewhere. They can be hosted in the same or different locations. You can rename the js files when you place them on the server of your choice, or you can leave the names as they are.  This readme file defines a global variable containing urls. Once you determine where you will host the js files of this repository, you will know at what urls they will be accessible, and then you must paste, into each of the slots below, the appropriate urls. Then the skeleton html, index.html, must be edited and hosted anywhere you want. The necessary edits to index.html are to change the urls in the two script tags, such that the first tag has the url where you host this readme.js (this file), the second tag has the url where you host main.js.  After that is done, the functioning instance of the web app will be viewable by navigating to that hosted skeleton page in a web browser.

*/

window.config = {
    app_js_url : "https://jjjooo64.github.io/verbos-26/app.js" //insert the url where you hosted app.js
  , conjugations_js_url : "https://jjjooo64.github.io/verbos-26/conjugations.js" //insert the url where you hosted conjugations.js
};
