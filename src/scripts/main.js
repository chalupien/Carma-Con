/**
 * TODO
 */
(function (window) {
  // TODO

  // holds array of API call JS objects
  var API = null;

  // holds the API objects and splits them into there respective categories
  var SECTIONS = {
    // "know-driver" : [array of indexes corresponding to the API array above],
    // "know-car" : ``
    // "control-car" : ``
  };

  // cache object for our template functions so they only get compiled once
  var TEMPLATES = {
    // "*filename*" : templateFn()
  };

  // the API call that is currently being previewed onscreen
  var activeAPICall = null;

  // the domain to show onscreen (isn't functional, just visual)
  var domain = "http://mafalda.hack.att.io:3000";



  // this method builds a code snippet given the passed API object model
  // the returned string will be a "glue" of the example parameters located
  // inside the API object, as well as the route and request type, in the format
  // that the AJAX function in request.js expects
  var buildCodeSnippet = function(item){

    if(item.examples.length){
      var example = null;

      for(var i=0; i<item.examples.length; i++){
        if(item.examples[i].type === "request"){
          example = item.examples[i];
          break;
        }
      }

      if(example){
        var reqObj = {};
        reqObj.type = example.verb;
        reqObj.url = example.route;
        reqObj.data = example.body;

        var snip = '';
        snip += '// ## START ' + item.id + '\n';
        snip += 'AJAX(' + JSON.stringify(reqObj, null, 2) + ');\n';
        snip += '// ## END ' + item.id + '\n\n';
        return snip;

      }

    }

    return false;

  };

  // use this method to run through all of the API calls and get a giant
  // compilation of example code snippets
  window.compileCodeSnippets = function(){
    var snippets = "";
    for(var i=0; i<API.length; i++){
      snippets += buildCodeSnippet(API[i]);
      snippets += "\n\n";
    }
    return snippets;
  };


  // sendRequest
  // this method takes in the object in activeAPICall, initiates
  // a server call, and shows the results on-screen for the user
  var sendRequest = function(item, cb, err){

    if(item.item.resourceTable['HTTP Verb']){

      // post || get || put || delete
      var reqtype = item.item.resourceTable['HTTP Verb'][0].toLowerCase();

      // the basic request params
      var reqObject = {
        type : reqtype,
        url  : item.route
      };

      if(item.params){
        reqObject.data = item.params;
      }

      // if user didnt enter any request params, make that property null
      if(typeof(reqObject.data) === "object" && Object.keys(reqObject.data).length === 0){
        reqObject.data = null;
      }

      // display the AJAX call code snippet for the user to copy
      displayAjaxCode(reqObject);

      // generic success/error methods
      reqObject.success = function(data){
          cb && cb(data);
      };
      reqObject.error = function(resp){
          err && err(resp);
      };

      // send away
      AJAX(reqObject);

    }
  };


  // show the AJAX code snippet on screen for the user to copy
  var displayAjaxCode = function(item){
    var str = JSON.stringify(item, null, 4);
    str = 'AJAX(' + str + ');';
    $('#request #ajax-code .body-details').html(str);
  };

  // show the response data from the server, if successful
  var displaySuccess = function(data){

    if(typeof(data) === "object"){
      data = JSON.stringify(data, null, 4);
    }else if(!data){
      data = "Empty Response";
    }
    $('#request #response-body .body-details').html(data);
  };

  // display any error details from the server call, if failed
  var displayError = function(resp){
    $('#request #response-body .body-details').html(resp.statusText);
  };



  // this method hides the request parameter interface and shows the request details
  // interface, which shows the result of the request
  var displayRequest = function(data){

    // set all of the detail elements to their default values
    $('#request .body-details').each(function(){
      this.innerHTML = this.getAttribute('data-default');
    });

    // set some elements with their request values
    $('#request #request-type .body-details').html(data.item.resourceTable['HTTP Verb'][0])
    $('#request #request-url .body-details').html(domain + data.route)

    // show the request body as a JSON string
    var bodyData = JSON.stringify(data.params, null, 4);
    $('#request #request-body .body-details').html(bodyData);

    // adding this class to the wrapper hides the param interface and shows
    // the request details interface
    $('#api-homepage').addClass('request-sent');

  };



  // takes a filename (which exists in /templates), loads it up
  // synchronously (just for ease, as async means taking way more into account)
  // and then caches the compiled template function for later use
  // any data you pass will be compiled with the template
  // the return value will be an HTML string of the template + any
  // interpolated variables
  var template = function(file, data){

    // if the template hasnt been loaded yet, load it
    if(!TEMPLATES[file]){
      var html = "";
      $.ajax({
        async : false,
        url   : "templates/" + file,
        success : function(data){
          html = data;
        }
      });
      // compile the template into a executable function
      TEMPLATES[file] = ejs.compile(html);
    }

    // compile the template along with the data passed
    return TEMPLATES[file](data);

  };






  // loads the sidebar template and compiles the passed
  // API call object array, then shows it onscreen
  var renderItemSidebar = function(item){
    var html = template("sidebar-item.html", item);
    $('#sidebar ul').append(html);
  };



  // this renders an API call into the main window for
  // preview. this happens onclick of any of the left
  // sidebar items
  var renderItemContent = function(item){
    // set the current API call object to get ready
    // for calling the server
    activeAPICall = {
      "item" : item,
      "params" : {},
      "response" : null,
      "route" : item.resourceTable.Route,
      "routeParams" : {}
    };

    // get the main window template, compile it, and show it
    var html = template("api-homepage.html", item);
    $('#content').html(html);

  };


  // load the category onscreen
  // this places all category API calls into the
  // left sidebar and init the first one
  var loadSection = function(sectId){
    var sect = SECTIONS[sectId];
    if(sect){
      $('#sidebar ul').html('');
      for(var i=0; i<sect.length; i++){
        var item = API[sect[i]];
        renderItemSidebar(item);
        if(i===0){
          $('#sidebar li').eq(0).click();
        }
      }
    }
  };



  // this method takes in the API array separates each API call
  // into its respective categories. the result is that the SECTIONS
  // variable will be an object with each category, which will hold
  // an array of index integers corresponding to the position of that
  // api call object in the API variable
  var parseAPIData = function(data){
    API = data;
    // loop all API object models
    for(var i=0; i<API.length; i++){
      var apiCall = API[i];
      // set its index to itself for reference
      apiCall.idx = i;
      // if the call has categories
      if(apiCall.categories.length){
        // go through each category the call is in
        for(var j=0; j<apiCall.categories.length; j++){
          var cat = apiCall.categories[j];
          // if the sections object doesnt have this category
          // in it yet, make it a blank array
          if(!SECTIONS[cat]){
            SECTIONS[cat] = [];
          }
          // push the index
          SECTIONS[cat].push(i);
        }
      }
    }
  };







  // when DOM is ready, lets add some generic handlers
  $(document).ready(function(){

    // get the data file with all of the API call models
    // Note: there are 3 different urls you can use, the local, the github, or the
    // proxy github that passes by CORS (your choice, although some may not work)
    $.ajax({
      // local data file (for ease)
      url : "http://ericsson-innovate.github.io/hackathon-portal/dist/data/specifications.json",
      // remote github version of data file (cant access right now, CORS)
      //url : "http://ericsson-innovate.github.io/hackathon-portal/dist/data/specifications.json",
      // github proxy method for data file (just slow)
      //url : "http://github-raw-cors-proxy.herokuapp.com/ericsson-innovate/hackathon-portal/gh-pages/dist/data/specifications.json",
      success : function(data){
        console.log(data);
        // parse the API data into categories
        parseAPIData(data);
        // show the know-driver section
        loadSection('know-driver');
      }
    });


    // the 3 header nav items
    var $headItems = $('#header span');

    // the left sidebar nav wrapper
    var $sidebar = $('#sidebar ul');

    // when any of the header nav items are clicked
    // show the corresponding section details
    $headItems.click(function(){
      var sectId = this.getAttribute('data-type');
      $headItems.removeAttr('active');
      this.setAttribute('active', true);
      loadSection(sectId);
    });

    // when any left sidebar items are clicked, show the
    // corresponding API call details on the right
    $sidebar.on('click', 'li', function(){
      $sidebar.children().removeAttr('active');
      this.setAttribute('active', true);
      var idx = $(this).data('idx');
      var obj = API[idx];
      renderItemContent(obj);
    });

    // this is just a nifty little scroll thing to show a box-shadow
    // below the header if content is scrolled (giving a nice visual effect)
    $('#content, #sidebar').scroll(function(){
      var $this = $(this);
      if(this.scrollTop > 10){
        $this.removeClass('at-top');
        return $this.addClass('scrolled');
      }else if(this.scrollTop === 0){
        $this.removeClass('scrolled');
        $this.addClass('at-top');
      }
    });


    $('#content')
      // on click of the send button, gather up all request parameters and make
      // the api call
      .on('click', '#send', function(){

        // TODO: loop through all params here to make sure required fields
        // are all filled in
        //
        //   var params = activeAPICall.item.parameters.requestBody;
        //   for(var i=0; i<params.length; i++){

        //   }

        // run through all route parameters and replace the route string with
        // the corresponding values
        for(var k in activeAPICall.routeParams){
          activeAPICall.route = activeAPICall.route.replace("{" + k + "}", activeAPICall.routeParams[k]);
        }

        // show the request page for this api call
        displayRequest(activeAPICall);

        // send the request
        sendRequest(activeAPICall, displaySuccess, displayError);

      })

      // on keyup and change of any request parameter, add the value
      // to the current api call config object
      .on('keyup change', 'input.req-param', function(){
        var key = this.getAttribute('data-key');
        activeAPICall.params[key] = this.value;
      })
      // same as above, but for route parameters
      .on('keyup change', 'input.route-param', function(){
        var key = this.getAttribute('data-key');
        activeAPICall.routeParams[key] = this.value;
      })
      // go back to the API call homepage
      .on('click', '#back-to-params', function(){
        $('#api-homepage').removeClass('request-sent');
      });

  });


})(window);
