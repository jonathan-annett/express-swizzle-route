# express-swizzle-route

setup routes in express that get replaced the first time they are requested.


    var swizzleRoute = require("express-swizzle-route");
    
    
    
    var app=express();
    
    
    // define a handler and a setup callback
    
    var late_loaded_cache;
    swizzleRoute(app,"get","/some/path",{
        handler : function (req,res) {
            res.send(late_loaded_cache.text);    
        },
        setup : function(options,cb) {
        
            fs.readFile("./some/cached/file.json",function(err,data) {
                if (err) {
                    throw err;
                }
                late_loaded_cache = JSON.parse(data);
                cb();
            });
            
        },
    });
    
    // define the handler in the setup callback
    swizzleRoute(app,"get","/some/other/path",{
        setup : function(options) {
            var data = JSON.parse(fs.readFileSync("./some/cached/file.json"));
            options.handler = function(req,res) {
                res.send(data.text);    
            });
        }
    });
    
    
    // define handler in a setup callback that creates a static file 
    // on first call, swapping it out for a static route to that file thereafter
    swizzleRoute(app,"use","/some/file.html",{
        setup : function(options) {
            fs.writeFile(
            __dirname+"/my-index.html",
            "<html><body>"+(new Date().toUTCString())+"</body></html>",function(){
               option.handler = express.static(__dirname+"/my-index.html");
            });
        }
    });

    