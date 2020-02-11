module.exports = createSwizzledRoute;

var removeRoute = require('express-remove-route');
var swizzled={};

function createSwizzledRoute(app,method,path,options) {
    
    method = method || "get";
    
    // remove any existing routes for the url path
    removeRoute(app,path);
    
    // establish a (quasi?) async setup callback to call for the first time the 
    // handler is called by an external browser / remote client 
    var doSetup = options.setup;

    if (typeof doSetup !== 'function') {
        doSetup = function(options,cb) {
            // there is no setup code so just invoke callback immedately
            cb();
        };
    }
    
    
    // install the temporary "first time handler for the url path"
    app[method](path,function(req,res){
        
        //backup the swizzling arguments...
        if (options.permitUndo){
            if (swizzled[path]) swizzled[path].splice(0,4);
            swizzled[path]=[app,method,path,options];
        }
        
        // remove the swizzled route
        removeRoute(app,path);
        
        // install a temporary stack to hold any requessts that come in while setup is happening
        options.temp_stack=[];
        app[method](path,function(req,res){
            options.temp_stack.push({req:req,res:res});
        });
        
        // perform any setup required for the handler's first invocation
        doSetup (options,function(){
            // once we are fully setup, remove the temp handler install the defined handler
            removeRoute(app,path);
            app[method](path,options.handler); 
            // handle the "first" request, which kicked off the setup/swizzle process
            options.handler(req,res);
            
            // in most cases, temp_stack will have no entries.
            // especially if there was no setup, of if setup was synchronous.
            // if however additional requests came in while setup was happening, 
            // they will be in temp_stack, so we handle them now.
            if (options.temp_stack.length>0) {
                options.temp_stack.forEach(function(backlog){
                    options.handler(backlog.req,backlog.res);                
                });
                options.temp_stack.splice(0,options.temp_stack.length);
            }
            delete options.temp_stack;

        });            

        
    });
    
}

createSwizzledRoute.undo = function undoSwizzledRoute(path) {
   var 
   args = swizzled[path],
   continue_=function() {
       createSwizzledRoute.apply(this,args);
   };
   if (args) {
       delete swizzled[path];
       if (args[3].teardown) {
           args[3].teardown(args[3],continue_);
       } else {
           continue_();
       }
   }
};
createSwizzledRoute.removeRoute = removeRoute;