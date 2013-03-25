var http = require('http')
  , util = require('util')
  , mu   = require('mu2')
  , db = require('./db')
  , express = require('express')
  , app = express();

//Let the nice System Admin know the server is running.
console.log('Goblin Lives.')

//Configure Body Parser
app.configure(function(){
  app.use(express.bodyParser());
});

mu.root = __dirname + '/templates';

function routesGetandSet(data) {
  /*
   This loops through a key value set and builds routes to all needed pages
  */

  for (key in data) {
    //Create a Closure because Javascript is strange, dude!
    (function(key1) {
      //In the looping, make sure you don't take the ID or Revision Number from the DB
      if (key1 !== "_id" && key1 !== "_rev") {
        //Set route for value
        app.get('/' + data[key1], function(req, res) {
          //Go into the DB and get that information, man!
           db.get(key1, function (err, doc) {
            var stream = mu.compileAndRender('page.gob', doc);
            util.pump(stream, res);
          });
        });
      }
     }
    )(key)
  }
}

function deleteRoute(url) {

  /*
   This deletes a specific route from express route mapping.
  */

  for (var i = app.routes.get.length - 1; i >= 0; i--) {
    if (app.routes.get[i].path === "/" + url) {
      app.routes.get.splice(i, 1);
    }
  }
}

//Run the Loop and Set Up all Pages
db.get('pages_routes', function (err, doc) {
      routesGetandSet(doc.pure_routes);
  });;

//Set up the Index Page, by Default.
app.get('/', function(req, res) {
  db.get('SG9tZQ==', function (err, doc) {
      var stream = mu.compileAndRender('page.gob', doc);
      util.pump(stream, res);
    });
});

//Set up Static File for Components
app.use(express.static(__dirname + '/components'));

//Ajax Calls and Responses
app.post('/admin-save.json', function(req, res) {

  db.get(req.body.page_id, function (err, doc) {
      if (doc === undefined) {
        //The document doesn't exist.

        //Add it to the page_routes
        db.get('pages_routes', function (err, doc) {
          var page_routes_data = doc.pure_routes;
          
          page_routes_data[req.body.page_id] = req.body.page_url;

          db.merge("pages_routes", {
                pure_routes: page_routes_data
              }, function (err, res) {
                console.log('New Page Routes Saved')
            });

        });

        //Then make a document and add the new info, bro.
        db.save(req.body.page_id, {
            page_title: req.body.page_title,
            page_content: req.body.page_content,
            page_url: req.body.page_url,
            meta_description: req.body.meta_description,
            meta_keywords: req.body.meta_keywords
        }, function (err, res) {

            //Create variables to be able to pass them nicely.
            var new_page_url = req.body.page_url;
            var new_page_id = req.body.page_id;

            //Add new route!
            app.get('/' + new_page_url, function(req, res) {
              db.get(new_page_id, function (err, doc) {
                  var stream = mu.compileAndRender('page.gob', doc);
                  util.pump(stream, res);
                });
            });
        });

        
      } else {
        //It exists, so just merge the new info
         db.merge(req.body.page_id, {
            page_title: req.body.page_title,
            page_content: req.body.page_content,
            page_url: req.body.page_url,
            meta_description: req.body.meta_description,
            meta_keywords: req.body.meta_keywords
          }, function (err, res) {
            console.log(' ajax post successful')
        });
      }
  });

   
  res.contentType('json');
  res.send({ some: JSON.stringify({response:'json'}) });
});

app.post('/page-edit.json', function(req, res) {
    db.get(req.body.page_id, function (err, doc) {
      res.contentType('json');
      res.send(doc);
    });
 });

app.post('/get-pages.json', function(req, res) {
    db.get('pages_routes', function (err, doc) {
      res.contentType('json');
      res.send(doc.pure_routes);
    });
 });

app.post('/admin-delete.json', function(req, res) {
    var page_id = req.body.page_id;
    var page_url = req.body.page_url;

    //Remove reference to it in Page Routes
    db.get('pages_routes', function (err, doc) {
      var page_routes_data = doc.pure_routes;
      
      delete page_routes_data[page_id];

      db.merge("pages_routes", {
          pure_routes: page_routes_data
        }, function (err, res) {
          console.log('New Page Routes Saved')
      });

    });

    //Get the Database revision number so we can properly remove it
    db.get(req.body.page_id, function (err, doc) {
      //Remove the document, man!
      db.remove(req.body.page_id, doc._rev, function (err, res) {
        console.log('document removed')
      });

    });
    
    console.log(page_url)
    //Delete Route to that Page from Express
    deleteRoute(page_url);

    res.contentType('json');
    res.send({ some: JSON.stringify({response:'json'}) });
 });

//Config Page
app.post('/config-page.json', function(req, res) {
    db.get("admin_config", function (err, doc) {
      res.contentType('json');
      res.send(doc);
    });
 });

//Save to all Pages
function saveToAllPages(field, data) {
      db.get('pages_routes', function (err, doc) {
          for (key in doc.pure_routes) {
            //Create a Closure because Javascript is strange, dude!
            (function(key1) {
              console.log(key1)
                //Go into the DB and get that information, man!
                console.log(field);
                console.log(data);
                 db.merge(key1, {
                  field : data
                }, function (err, res) {
                    console.log('Google Info Saved');
                });
             }
            )(key)
          }
    });
}

//Config Save
app.post('/config-save.json', function(req, res) {

    var ga_id_req = req.body.ga_id;

    db.merge('admin_config', {
        ga_id: ga_id_req
      }, function (err, res) {
        console.log('Google Info Saved');
    });

    //saveToAllPages('ga_id', ga_id_req)

    //Send Response
    res.contentType('json');
    res.send({ some: JSON.stringify({response:'json'}) });
 });

app.listen(8000);