module.exports = createSwizzledRoute;

var removeRoute = require('express-remove-route');

function createSwizzledRoute(app,method,path,handler,asyncSetup,syncSetup) {
    
    method = method || "get";
    
    // remove any existing routes for the url path
    removeRoute(app,path);
    
    // establish a (quasi?) async setup callback to call for the first time the 
    // handler is called by an external browser / remote client 
    var doSetup = asyncSetup;
    
    if (typeof syncSetup==='function') {
        doSetup = function(cb) {
            // the setup code is sync,call it and immediately invoke callback
            syncSetup();
            cb();
        };
    }
    
    if (typeof doSetup !== 'function') {
        doSetup = function(cb) {
            // there is no setup code so just invoke callback immedately
            cb();
        };
    }
    
    
    // install the temporary "first time handler for the url path"
    app[method](path,function(req,res){
        
        // remove the swizzled route
        removeRoute(app,path);
        
        // install a temporary stack to hold any requessts that come in while setup is happening
        var temp_stack=[];
        app[method](path,function(req,res){
            temp_stack.push({req:req,res:res});
        });
        
        // perform any setup required for the handler's first invocation
        doSetup (function(){
            // once we are fully setup, remove the temp handler install the defined handler
            removeRoute(app,path);
            app[method](path,handler); 
            // handle the "first" request, which kicked off the setup/swizzle process
            handler(req,res);
            
            // in most cases, temp_stack will have no entries.
            // especially if there was no setup, of if setup was synchronous.
            // if however additional requests came in while setup was happening, 
            // they will be in temp_stack, so we handle them now.
            temp_stack.forEach(function(backlog){
                handler(backlog.req,backlog.res);                
            });
            
            temp_stack=null;

        });            

        
    });
    
}

