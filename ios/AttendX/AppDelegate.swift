import UIKit
import React

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    self.moduleName = "AttendX"
    
    let success = super.application(application, didFinishLaunchingWithOptions: launchOptions)

    return success
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return self.bundleURL()
  }

  override func newArchEnabled() -> Bool {
    return false
  }

  override func fabricEnabled() -> Bool {
    return false
  }

  override func turboModuleEnabled() -> Bool {
    return false
  }

  override func bridgelessEnabled() -> Bool {
    return false
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return URL(string: "http://127.0.0.1:8081/index.bundle?platform=ios&dev=true&minify=false")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
