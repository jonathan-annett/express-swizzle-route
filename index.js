module.exports = createSwizzledRoute;

var removeRoute = require('remove-route-runtime');
var swizzled={};

function createSwizzledRoute(app,method,path,options) {
    
    method = method || "get";
    
    // remove any existing routes for the url path
    removeRoute(app,path);
    
    // establish a (quasi?) async setup callback to call for the first time the 
    // handler is called by an external browser / remote client 
    
    var doSetup = typeof options.setup === 'function' ? swizzleSetup : noSetup ;
        
    // install the temporary "first time handler for the url path"
    app[method](path,function(req,res){
        
       
        if (options.permitUndo){
            // if options.permitUndo is truthy, calls to createSwizzledRoute.undo(path) will
            // restore the path to an unswizzled state, after calling options.teardown() for if it has been defined
            
            //backup the swizzling arguments...
            if (swizzled[path]) swizzled[path].splice(0,4);
            swizzled[path]=[app,method,path,options];
        }
        
        // remove the swizzled route
        removeRoute(app,path);

        // perform any setup required for the handler's first invocation
        doSetup (options,function(){
            // once we are fully setup, remove the temp handler install the defined handler
            removeRoute(app,path);
            app[method](path,options.handler); 
            // handle the "first" request, which kicked off the setup/swizzle process
            options.handler(req,res);
            
            if (options.duplicatesHandler) {
                options.handler = options.duplicatesHandler;
            }

        });            

        
    });
    
    /*
      swizzleSetup() is invoked to provide user defined setup for the first time the request is invoked
      this could be doing anything from allocating memory, fetching data from another server or reading 
      info in from a disk file or database.
      it could also be setting up other routes that only make sense if this route exists.
      
      because it could be time expensive, and other requests may come in during the setup callback
      pending requests are stacked inside options.temp_stack, which is processed once the first
      request has been handled.
    
    */
    function swizzleSetup(options,cb) {
        // install a temporary stack to hold any requests that come in while setup is happening
        options.temp_stack=[];
        app[method](path,function(req,res){
            // push this request onto the temp stack until after the setup has completed
            options.temp_stack.push({req:req,res:res});
        });
        
        options.setup(options,function(){
            
            // now setup is complete call cb to install the new handler, and invoke it for the first request
            cb();
            
            // in most cases, temp_stack will have no entries.
            // if additional requests came in while setup was happening, 
            // they will be in temp_stack, so we handle them now.
            while (options.temp_stack.length>0) {
                var backlog = options.temp_stack.shift();
                options.handler(backlog.req,backlog.res);                
            }
            delete options.temp_stack;

        });
    } 
    
    function noSetup(options,cb) {
        // there is no setup code so just invoke callback immediately
        // note: we don't install a temp_stack.
        cb();
    }
    
}

createSwizzledRoute.undo = function undoSwizzledRoute(path) {
   var 
   args = swizzled[path],
   continue_=function() {
       createSwizzledRoute.apply(this,args);
   };
   if (args) {
       delete swizzled[path];
       var options = args[3];
       if (options.teardown) {
           options.teardown(options,continue_);
       } else {
           continue_();
       }
   }
};
createSwizzledRoute.removeRoute = removeRoute;