#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Register the plugin + its methods with the Capacitor runtime so the JS
// bridge can dispatch to WidgetSyncPlugin.write.
CAP_PLUGIN(WidgetSyncPlugin, "WidgetSync",
    CAP_PLUGIN_METHOD(write, CAPPluginReturnPromise);
)
