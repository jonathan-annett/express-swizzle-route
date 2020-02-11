# express-swizzle-route

setup routes in express that get replaced the first time they are requested.


    var swizzleRoute = require("express-swizzle-route");
    
    
    
    var app=express();
    
    
    // define a handler and a asyncSetup callback
    
    var late_loaded_cache;
    swizzleRoute(app,"get","/some/path",{
        handler : function (req,res) {
            res.send(late_loaded_cache.text);    
        },
        asyncSetup : function(options,cb) {
        
            fs.readFile("./some/cached/file.json",function(err,data) {
                if (err) return res.send(500); 
                late_loaded_cache = JSON.parse(data);
                cb();
            });
            
        },
    });
    
    // define handler in a syncSetup callback (can also do this in asyncSetup)
    swizzleRoute(app,"get","/some/other/path",{
        syncSetup : function(options) {
            var data = JSON.parse(fs.readFileSync("./some/cached/file.json"));
            options.handler = function(req,res) {
                res.send(data.text);    
            });
        }
    });
    
    
    // define handler in a asyncSetup callback that creates a static file 
    // on first call, swapping it out for a static route to that file thereafter
    swizzleRoute(app,"use","./some/file.html",{
        asyncSetup : function(options) {
            fs.writeFile(
            __dirname+"/my-index.html",
            "<html><body>"+(new Date().toUTCString())+"</body></html>",function(){
               option.handler = express.static(__dirname+"/my-index.html");
            });
        }
    });

    